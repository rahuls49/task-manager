import { Worker } from 'bullmq';
import connection from './redis';
import 'dotenv/config';
import axios from 'axios';
import { PrismaClient } from '@task-manager/prisma-client';

const prisma = new PrismaClient();

console.log("Worker starting...");

const BACKEND_API_BASE_URL = process.env.BACKEND_API_BASE_URL || 'http://localhost:5000';

const worker = new Worker('taskQueue', async job => {
  const task = job.data;
  const scheduledAt = task.__scheduledAt || 'unknown';
  const actualProcessingTime = new Date().toLocaleString();
  const eventType = task.__eventType || (job.name === 'startTask' ? 'task_started' : 'task_overdue');

  console.log(`🚀 Processing job: ${job.name} for task "${task.Title}" (ID: ${task.Id})`);
  console.log(`⏰ Scheduled at: ${new Date(scheduledAt).toLocaleString()}, Processing at: ${actualProcessingTime}`);
  console.log(`📋 Task details:`, {
    Id: task.Id,
    Title: task.Title,
    DueDate: task.DueDate,
    DueTime: task.DueTime,
    StartDate: task.StartDate,
    StartTime: task.StartTime,
    EventType: eventType
  });

  try {
    // Trigger API actions based on event type
    if (eventType === 'task_started') {
      console.log(`🔔 Triggering task_started actions for task ${task.Id}`);
      await triggerTaskActions(task.Id, 'task_started', task);
      console.log(`✅ task_started API actions triggered for task ${task.Id}`);
    } else {
      // For due/overdue tasks, trigger task_overdue
      console.log(`🔔 Triggering task_overdue actions for task ${task.Id}`);
      await triggerTaskActions(task.Id, 'task_overdue', task);
      console.log(`✅ task_overdue API actions triggered for task ${task.Id}`);

      const res = await sendWhatsappMessage(job);
      console.log('✅ WhatsApp message sent successfully:', res.status);
    }

    return { success: true, processedAt: actualProcessingTime, eventType };
  } catch (error) {
    console.error('❌ Failed to process task:', error);
    throw error;
  }
}, { connection });

console.log("Worker created");

worker.on('completed', job => {
  console.log(`Job ${job.id} completed, complete event recieved`);
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed with ${err.message}`);
});

worker.on('error', (err) => {
  console.error('Worker error:', err);
});

const specificHooksWorker = new Worker('specific-hooks', async job => {
  const BACKEND_API_BASE_URL = process.env.BACKEND_API_BASE_URL || 'http://localhost:5000';
  const { apiDefinitionId, taskId, event, taskData } = job.data || {};
  try {
    const response = await fetch(`${BACKEND_API_BASE_URL}/system/actions/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.BACKEND_INTERNAL_API_KEY || 'secret-key'
      },
      body: JSON.stringify({ apiDefinitionId, taskId, event, taskData })
    });
    const result: any = await response.json();
    if (!result?.success) {
      throw new Error(result?.message || 'Execution failed');
    }
    return result;
  } catch (err) {
    throw err;
  }
}, { connection, concurrency: 50 });

specificHooksWorker.on('completed', job => {
  console.log(`Specific hook job ${job.id} completed`);
});

specificHooksWorker.on('failed', (job, err) => {
  console.error(`Specific hook job ${job?.id} failed with ${err.message}`);
});

specificHooksWorker.on('error', (err) => {
  console.error('Specific hooks worker error:', err);
});

const apiExecutionWorker = new Worker('api-execution', async job => {
  const { actionDefinitionId, contextData } = job.data;

  try {
    // Fetch the full ApiActionDefinition
    const definition = await prisma.apiActionDefinition.findUnique({
      where: { id: actionDefinitionId },
    });

    if (!definition) {
      throw new Error(`ApiActionDefinition with id ${actionDefinitionId} not found`);
    }

    // Perform variable substitution in payloadTemplate
    let payload = definition.payloadTemplate;
    if (payload) {
      payload = replaceTemplateVariables(payload, contextData);
    }

    // Construct the HTTP request
    const config: any = {
      method: definition.method,
      url: definition.url,
      headers: definition.headers || {},
    };

    if (['POST', 'PUT', 'PATCH'].includes(definition.method) && payload) {
      config.data = payload;
    } else if (['GET', 'DELETE'].includes(definition.method) && payload) {
      config.params = payload;
    }

    const startTime = Date.now();

    // Make the request
    const response = await axios(config);
    const durationMs = Date.now() - startTime;

    // Log success
    await prisma.apiExecutionLog.create({
      data: {
        apiActionDefinitionId: definition.id,
        executedAt: new Date(),
        durationMs,
        responseStatus: response.status,
        responseBody: response.data,
        status: 'SUCCESS',
      },
    });

    console.log(`✅ API execution successful for definition ${actionDefinitionId}, status: ${response.status}`);
    return { success: true, status: response.status, data: response.data };

  } catch (error: any) {
    const durationMs = 0; // Could calculate if needed

    // Log failure
    await prisma.apiExecutionLog.create({
      data: {
        apiActionDefinitionId: actionDefinitionId,
        executedAt: new Date(),
        durationMs,
        responseStatus: error.response?.status || null,
        responseBody: error.response?.data || null,
        status: 'FAILURE',
      },
    });

    console.error(`❌ API execution failed for definition ${actionDefinitionId}:`, error.message);
    throw error; // Re-throw for BullMQ retry
  }
}, { connection, concurrency: 10 });

apiExecutionWorker.on('completed', job => {
  console.log(`API execution job ${job.id} completed`);
});

apiExecutionWorker.on('failed', (job, err) => {
  console.error(`API execution job ${job?.id} failed with ${err.message}`);
});

apiExecutionWorker.on('error', (err) => {
  console.error('API execution worker error:', err);
});
async function triggerTaskActions(taskId: number, event: string, taskData: any) {
  try {
    const response = await fetch(`${BACKEND_API_BASE_URL}/system/tasks/trigger-actions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.BACKEND_INTERNAL_API_KEY || 'secret-key'
      },
      body: JSON.stringify({
        taskId,
        event,
        taskData
      })
    });

    const result = await response.json() as { success: boolean; message?: string };

    if (!result.success) {
      console.warn(`⚠️ API actions trigger returned non-success:`, result);
    }

    return result;
  } catch (error) {
    console.error(`❌ Failed to trigger API actions for task ${taskId}:`, error);
    // Don't throw - we don't want to fail the job if API actions fail
  }
}

async function sendWhatsappMessage(job: any) {
  return await fetch("https://wassraipur.apps.shreeshivam.net:9006/send/message", {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      "phone": "917999800869",
      "message": `This task is overdue: ${job.data.Title}`
    })
  })
}

function replaceTemplateVariables(template: any, data: any): any {
  if (typeof template === 'string') {
    return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, path) => {
      const value = getNestedValue(data, path);
      return value !== undefined ? String(value) : match;
    });
  }
  if (Array.isArray(template)) return template.map(item => replaceTemplateVariables(item, data));
  if (typeof template === 'object' && template !== null) {
    const result: any = {};
    for (const key in template) result[key] = replaceTemplateVariables(template[key], data);
    return result;
  }
  return template;
}

function getNestedValue(obj: any, path: string) {
  return path.split('.').reduce((current: any, key: string) => current && current[key] !== undefined ? current[key] : undefined, obj);
}
