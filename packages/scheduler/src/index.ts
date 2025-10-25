import cron from 'node-cron';
import { addTaskToQueue } from "../../queue-lib/src/queue";
import 'dotenv/config'

// Configurable scheduler settings
const SCHEDULER_CRON = process.env.SCHEDULER_CRON || '*/2 * * * *';
const MAX_SCHEDULING_DELAY_MS = parseInt(process.env.MAX_SCHEDULING_DELAY_MS || '1800000'); // 30 minutes default

interface dueTasksResponse {
  success: boolean;
  message: string;
  data?: any[];
}

async function fetchDueTasks(): Promise<dueTasksResponse> {
  const res = await fetch(`${process.env.BACKEND_API_BASE_URL}/system/tasks/due`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  }).then(res => res.json());
  console.log("Result from scheduler api call: ", res)
  return res as dueTasksResponse;
}

const scheduledTasks = new Set<number>();

try {
  cron.schedule(SCHEDULER_CRON, async () => {
    console.log("⏰ Running scheduler at", new Date().toLocaleString());

    const res = await fetchDueTasks();
    if (res.success && res.data && res.data.length > 0) {
      console.log(`📋 Found ${res.data.length} due task(s)`);
      
      for (const task of res.data) {
        if (!scheduledTasks.has(task.Id)) {
          // Get the due timestamp
          const dueTs = getDueTimestamp(task);
          const now = Date.now();
          const delay = dueTs ? Math.max(dueTs - now, 0) : 0;
          
          console.log(`🔍 Task ${task.Id} "${task.Title}": Due at ${dueTs ? new Date(dueTs).toLocaleString() : 'unknown'}, Current time: ${new Date(now).toLocaleString()}, Delay: ${Math.round(delay / 1000)}s`);
          
          // Only add to queue if task is due within the configured max delay
          if (delay <= MAX_SCHEDULING_DELAY_MS) {
            await addTaskToQueue(task);
            scheduledTasks.add(task.Id);
            console.log(`✅ Task ${task.Id} added to queue with ${Math.round(delay/1000)}s delay`);
          } else {
            console.log(`⏳ Task ${task.Id} not yet due (${Math.round(delay/1000)}s remaining, max: ${Math.round(MAX_SCHEDULING_DELAY_MS/1000)}s), skipping`);
          }
        } else {
          console.log(`🔄 Task ${task.Id} already scheduled, skipping`);
        }
      }
    } else {
      console.log("📭 No due tasks found.");
    }
  });
  console.log(`🧠 Scheduler started with cron schedule: ${SCHEDULER_CRON}`);
  console.log(`📋 Max scheduling delay: ${Math.round(MAX_SCHEDULING_DELAY_MS/1000/60)} minutes`);
  console.log("⏰ Waiting for next scheduled run...");
} catch (error) {
  console.error("❌ Error starting scheduler:", error);
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