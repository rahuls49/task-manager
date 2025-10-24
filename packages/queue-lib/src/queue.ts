import { Queue } from 'bullmq';
import connection from './redis';

export const taskQueue = new Queue('taskQueue', { connection });

export async function addTaskToQueue(task: any) {
  // Helper: derive a numeric due timestamp (ms since epoch) from different task shapes.
  function getDueTimestamp(t: any): number | undefined {
    // 1) Separate date and time fields (e.g., DueDate (date-only) + DueTime)
    if (t?.DueDate && t?.DueTime) {
      // Try to combine them into an ISO-ish string
      try {
        const combined = new Date(`${t.DueDate.split('T')[0]}T${t.DueTime}`);
        if (!Number.isNaN(combined.getTime())) return combined.getTime();
      } catch (e) {
        // fallthrough
      }
    }

    // 2) numeric `dueTime` (already a timestamp)
    if (typeof t?.dueTime === 'number' && Number.isFinite(t.dueTime)) return t.dueTime;

    // 3) string numeric `dueTime`
    if (typeof t?.dueTime === 'string') {
      const n = Number(t.dueTime);
      if (!Number.isNaN(n) && Number.isFinite(n)) return n;
    }

    // 4) ISO date string: `DueDate` or `dueDate`
    const iso = t?.DueDate ?? t?.dueDate ?? t?.due_time ?? t?.dueDate;
    if (typeof iso === 'string') {
      const parsed = Date.parse(iso);
      if (!Number.isNaN(parsed)) return parsed;
    }

    // 5) If nothing matched, return undefined
    return undefined;
  }

  const dueTs = getDueTimestamp(task);
  let delay: number;
  if (typeof dueTs === 'number' && Number.isFinite(dueTs)) {
    delay = Math.max(dueTs - Date.now(), 0);
  } else {
    // Fallback: schedule immediately but warn
    delay = 0;
    console.warn('⚠️ addTaskToQueue: could not determine a valid due timestamp for task, scheduling immediately. Task:', task);
  }

  // Final safety: ensure delay is finite integer
  if (!Number.isFinite(delay) || Number.isNaN(delay)) {
    console.warn('⚠️ Computed delay was not finite; falling back to 0. Raw value:', delay);
    delay = 0;
  }

  try {
    await taskQueue.add('dueTask', { ...task, __scheduledAt: Date.now() }, { delay });
    console.log(`✅ Task "${task?.Title ?? task?.title ?? task?.Id ?? 'unknown'}" scheduled to run in ${Math.round(delay / 1000)} sec`);
  } catch (error) {
    console.error('❌ Failed to add task to queue:', error);
  }
}