import cron, { ScheduledTask } from 'node-cron';
import { addTaskToQueue } from "../../queue-lib/src/queue";
import 'dotenv/config'

interface DueTasksResponse {
  success: boolean;
  message: string;
  data?: any[];
}

interface SchedulerApiResponse {
  success: boolean;
  data?: {
    dueTimeInterval: { value: number; unit: string };
    dueTasksWindow: { value: number; unit: string };
    dueTasksBuffer: { value: number; unit: string };
    maxSchedulingDelayMs: number;
    cronSchedule: string;
    escalationCron: string;
  };
}

const BACKEND_API_BASE_URL = process.env.BACKEND_API_BASE_URL || 'http://localhost:4999';
const CONFIG_REFRESH_INTERVAL_MS = parseInt(process.env.SCHEDULER_CONFIG_REFRESH_MS || '300000', 10);

let schedulerCron = process.env.SCHEDULER_CRON || '*/2 * * * *';
let escalationCron = process.env.ESCALATION_CRON || '*/10 * * * *';
let maxSchedulingDelayMs = parseInt(process.env.MAX_SCHEDULING_DELAY_MS || '1800000', 10);

let dueTaskJob: ScheduledTask | null = null;
let escalationJob: ScheduledTask | null = null;
const scheduledTasks = new Set<number>();

bootstrap().catch(error => {
  console.error('❌ Failed to bootstrap scheduler:', error);
});

async function bootstrap() {
  await refreshSchedulerConfig();
  startDueTaskJob();
  startEscalationJob();

  setInterval(() => {
    refreshSchedulerConfig().catch(error => console.error('⚠️  Config refresh failed:', error));
  }, CONFIG_REFRESH_INTERVAL_MS).unref();

  console.log(`🧠 Scheduler started with cron schedule: ${schedulerCron}`);
  console.log(`📋 Max scheduling delay: ${Math.round(maxSchedulingDelayMs/1000/60)} minutes`);
  console.log(`🚨 Escalation cron: ${escalationCron}`);

  // Kick off immediate checks on startup
  await runDueTaskSweep();
  await runEscalationSweep();
}

async function refreshSchedulerConfig() {
  try {
    const response = await fetch(`${BACKEND_API_BASE_URL}/system/scheduler/config`);
    const res = await response.json() as SchedulerApiResponse;
    if (!res.success || !res.data) {
      return;
    }

    const { cronSchedule, escalationCron: remoteEscalationCron, maxSchedulingDelayMs: remoteDelay } = res.data;

    if (typeof remoteDelay === 'number' && remoteDelay !== maxSchedulingDelayMs) {
      maxSchedulingDelayMs = remoteDelay;
      console.log(`⚙️  Updated max scheduling delay: ${Math.round(maxSchedulingDelayMs / 1000)}s`);
    }

    if (cronSchedule && cronSchedule !== schedulerCron) {
      schedulerCron = cronSchedule;
      startDueTaskJob();
      console.log(`🔁 Scheduler cron updated to ${schedulerCron}`);
    }

    if (remoteEscalationCron && remoteEscalationCron !== escalationCron) {
      escalationCron = remoteEscalationCron;
      startEscalationJob();
      console.log(`🚨 Escalation cron updated to ${escalationCron}`);
    }
  } catch (error) {
    console.error('⚠️  Failed to fetch scheduler config:', error);
  }
}

function startDueTaskJob() {
  if (dueTaskJob) {
    dueTaskJob.stop();
  }
  dueTaskJob = cron.schedule(schedulerCron, () => {
    runDueTaskSweep().catch(error => console.error('❌ Due task sweep failed:', error));
  });
}

function startEscalationJob() {
  if (escalationJob) {
    escalationJob.stop();
  }
  escalationJob = cron.schedule(escalationCron, () => {
    runEscalationSweep().catch(error => console.error('❌ Escalation sweep failed:', error));
  });
}

async function runDueTaskSweep() {
  console.log('⏰ Running due-task sweep at', new Date().toLocaleString());

  const res = await fetchDueTasks();
  if (!res.success || !res.data || res.data.length === 0) {
    console.log('📭 No due tasks found.');
    return;
  }

  console.log(`📋 Found ${res.data.length} due task(s)`);
  for (const task of res.data) {
    if (scheduledTasks.has(task.Id)) {
      console.log(`🔄 Task ${task.Id} already scheduled, skipping`);
      continue;
    }

    const dueTs = getDueTimestamp(task);
    const now = Date.now();
    const delay = dueTs ? Math.max(dueTs - now, 0) : 0;

    console.log(`🔍 Task ${task.Id} "${task.Title}": Due ${dueTs ? new Date(dueTs).toLocaleString() : 'unknown'} | Delay ${Math.round(delay/1000)}s`);

    if (delay <= maxSchedulingDelayMs) {
      await addTaskToQueue(task);
      scheduledTasks.add(task.Id);
      console.log(`✅ Task ${task.Id} queued with ${Math.round(delay/1000)}s delay`);
    } else {
      console.log(`⏳ Task ${task.Id} not yet due (${Math.round(delay/1000)}s remaining, max ${Math.round(maxSchedulingDelayMs/1000)}s)`);
    }
  }
}

async function runEscalationSweep() {
  console.log('🚨 Running escalation sweep at', new Date().toLocaleString());
  try {
    const response = await fetch(`${BACKEND_API_BASE_URL}/system/tasks/escalations/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const res = await response.json() as { success: boolean };

    if (res.success) {
      console.log('✅ Escalation sweep completed');
    } else {
      console.warn('⚠️  Escalation sweep returned non-success response:', res);
    }
  } catch (error) {
    console.error('❌ Failed to trigger escalation sweep:', error);
  }
}

async function fetchDueTasks(): Promise<DueTasksResponse> {
  const response = await fetch(`${BACKEND_API_BASE_URL}/system/tasks/due`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  });
  return await response.json() as DueTasksResponse;
}

function getDueTimestamp(task: any): number | undefined {
  // Try combined first to use DueDate date + DueTime time
  if (task?.DueDate && task?.DueTime) {
    try {
      // Extract just the date part (YYYY-MM-DD)
      const dateStr = task.DueDate.split('T')[0];
      // Ensure DueTime is in HH:MM:SS format
      let timeStr = task.DueTime;
      if (timeStr.length === 5) { // HH:MM format
        timeStr = timeStr + ':00'; // Convert to HH:MM:SS
      }
      
      // Combine date and time into a proper UTC ISO string
      const combinedStr = `${dateStr}T${timeStr}Z`; // Adding Z to indicate UTC
      const combined = new Date(combinedStr);
      
      if (!Number.isNaN(combined.getTime())) {
        console.log(`📅 Parsed due time (UTC): ${combinedStr} -> ${combined.toLocaleString()} (${combined.toISOString()})`);
        return combined.getTime();
      }
    } catch (e) {
      console.error('Error parsing date/time:', e);
    }
  }
  
  // Then check for dueTime as number or string
  if (typeof task?.dueTime === 'number' && Number.isFinite(task.dueTime)) return task.dueTime;
  if (typeof task?.dueTime === 'string') {
    const n = Number(task.dueTime);
    if (!Number.isNaN(n) && Number.isFinite(n)) return n;
  }
  
  // Then ISO date string
  const iso = task?.DueDate ?? task?.dueDate ?? task?.due_time ?? task?.dueDate;
  if (typeof iso === 'string') {
    const parsed = Date.parse(iso);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return undefined;
}