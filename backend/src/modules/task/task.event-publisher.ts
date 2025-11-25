import eventHandler from "@task-manager/event-lib";
import { TASK_EVENTS } from "./task.constants";
import { TaskEventData, TaskResponse, TaskEvent } from "./task.types";

const EVENT_FILE_MAP: Partial<Record<TaskEvent, string>> = {
  [TASK_EVENTS.CREATED]: "create-task-event",
  [TASK_EVENTS.STARTED]: "task-start-event",
  [TASK_EVENTS.COMPLETED]: "task-end-event",
  [TASK_EVENTS.RESCHEDULED]: "task-reschedule-event",
  [TASK_EVENTS.ESCALATED]: "task-escalation-event"
};

interface PublishedTaskPayload {
  taskId: number;
  title?: string;
  statusId?: number;
  priorityId?: number;
  dueDate?: string | Date | null;
  dueTime?: string | Date | null;
  startDate?: string | Date | null;
  startTime?: string | Date | null;
  recurrenceId?: number | null;
  escalationLevel?: number;
  parentTaskId?: number | null;
  assignees?: Array<{ Id: number; Name: string; Email: string }>;
  groups?: Array<{ GroupId: number; GroupName: string }>;
}

export async function publishTaskEvent(
  eventData: TaskEventData,
  task?: TaskResponse | null
): Promise<void> {
  const configFile = EVENT_FILE_MAP[eventData.event];

  if (!configFile) {
    return;
  }

  const taskPayload: PublishedTaskPayload = {
    taskId: task?.Id ?? eventData.taskId,
    title: task?.Title,
    statusId: task?.StatusId,
    priorityId: task?.PriorityId,
    dueDate: task?.DueDate ?? null,
    dueTime: task?.DueTime ?? null,
    startDate: task?.StartDate ?? null,
    startTime: task?.StartTime ?? null,
    recurrenceId: task?.RecurrenceId ?? null,
    escalationLevel: task?.EscalationLevel,
    parentTaskId: task?.ParentTaskId ?? null,
    assignees: task?.assignees?.map(assignee => ({
      Id: assignee.Id,
      Name: assignee.Name,
      Email: assignee.Email
    })),
    groups: task?.groups?.map(group => ({
      GroupId: group.GroupId,
      GroupName: group.GroupName
    }))
  };

  const payload = {
    event: eventData.event,
    timestamp: (eventData.timestamp ?? new Date()).toISOString(),
    triggeredBy: eventData.userId ?? null,
    data: {
      task: taskPayload,
      change: {
        oldValue: eventData.oldValue ?? null,
        newValue: eventData.newValue ?? null,
        metadata: eventData.metadata ?? null
      }
    }
  };

  try {
    await eventHandler(payload, configFile);
  } catch (error) {
    console.error(`Failed to publish task event ${eventData.event}:`, error);
  }
}
