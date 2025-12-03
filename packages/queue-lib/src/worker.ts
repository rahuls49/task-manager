import { Worker } from 'bullmq';
import connection from './redis';
import 'dotenv/config';

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
