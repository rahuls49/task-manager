import cron from 'node-cron';
import { addTaskToQueue } from "../../queue-lib/src/queue";

//
// Mock API call - replace with actual API call
async function fetchOverdueTasks() {
  // Example actual data structure
  return {
    success: true,
    message: "Overdue tasks fetched successfully",
    data: [
      {
        Id: 9,
        ParentTaskId: null,
        Title: "Send Whatsapp to yogesh daga",
        Description: "Write comprehensive documentation for the task management system",
        DueDate: "2025-10-24T18:30:00.000Z", // Updated to today's date
        DueTime: "19:13:00", // Future time
        IsRecurring: 0,
        RecurrenceId: null,
        StatusId: 1,
        PriorityId: 2,
        IsEscalated: 0,
        EscalationLevel: 0,
        EscalatedAt: null,
        EscalatedBy: null,
        IsDeleted: 0,
        DeletedAt: null,
        CreatedAt: "2025-10-24T12:11:25.000Z",
        UpdatedAt: "2025-10-24T12:11:25.000Z",
        assignees: [],
        groups: [],
        subtasks: []
      },
      {
        Id: 10,
        ParentTaskId: null,
        Title: "Send Whatsapp to Rahul Sahu",
        Description: "Write comprehensive documentation for the task management system",
        DueDate: "2025-10-24T18:30:00.000Z", // Updated to today's date
        DueTime: "19:14:00", // Future time
        IsRecurring: 0,
        RecurrenceId: null,
        StatusId: 1,
        PriorityId: 2,
        IsEscalated: 0,
        EscalationLevel: 0,
        EscalatedAt: null,
        EscalatedBy: null,
        IsDeleted: 0,
        DeletedAt: null,
        CreatedAt: "2025-10-24T12:12:02.000Z",
        UpdatedAt: "2025-10-24T12:12:02.000Z",
        assignees: [],
        groups: [],
        subtasks: []
      }
    ]
  };
}

const scheduledTasks = new Set<number>();

cron.schedule('*/2 * * * *', async () => {
  console.log("⏰ Running hourly cron at", new Date().toLocaleString());

  const res = await fetchOverdueTasks();
  if (res.success && res.data.length > 0) {
    for (const task of res.data) {
      if (!scheduledTasks.has(task.Id)) {
        // Check if due time is in the future
        const dueTs = getDueTimestamp(task);
        const delay = dueTs ? Math.max(dueTs - Date.now(), 0) : 0;
        console.log({delay})
        if (delay > 0) {
          await addTaskToQueue(task);
          scheduledTasks.add(task.Id);
        }
      }
    }
  } else {
    console.log("No due tasks found this hour.");
  }
});

function getDueTimestamp(task: any): number | undefined {
  // Try combined first to use DueDate date + DueTime time
  if (task?.DueDate && task?.DueTime) {
    try {
      const combined = new Date(`${task.DueDate.split('T')[0]}T${task.DueTime}`);
      if (!Number.isNaN(combined.getTime())) return combined.getTime();
    } catch (e) {}
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

console.log("🧠 Scheduler started. Waiting for next hourly run...");