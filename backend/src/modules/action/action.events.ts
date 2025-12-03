/**
 * Task Action Events
 * 
 * These events can be used to trigger API call actions when specific task events occur.
 * Each event represents a specific point in the task lifecycle where an action can be triggered.
 */

export enum TaskActionEvent {
  // Task Lifecycle Events
  TASK_CREATED = 'task_created',
  TASK_UPDATED = 'task_updated',
  TASK_DELETED = 'task_deleted',

  // Task Status Events
  TASK_STARTED = 'task_started',
  TASK_COMPLETED = 'task_completed',
  TASK_REOPENED = 'task_reopened',
  TASK_STATUS_CHANGED = 'task_status_changed',

  // Task Assignment Events
  TASK_ASSIGNED = 'task_assigned',
  TASK_UNASSIGNED = 'task_unassigned',

  // Task Priority Events
  TASK_PRIORITY_CHANGED = 'task_priority_changed',

  // Task Due Date/Time Events
  TASK_DUE_DATE_CHANGED = 'task_due_date_changed',
  TASK_DUE_TIME_CHANGED = 'task_due_time_changed',
  TASK_OVERDUE = 'task_overdue',

  // Task Start Date/Time Events
  TASK_START_DATE_CHANGED = 'task_start_date_changed',
  TASK_START_TIME_CHANGED = 'task_start_time_changed',

  // Task Recurrence Events
  TASK_RECURRENCE_MODIFIED = 'task_recurrence_modified',
  TASK_RESCHEDULED = 'task_rescheduled',

  // Task Escalation Events
  TASK_ESCALATED = 'task_escalated',

  // Subtask Events
  SUBTASK_ADDED = 'subtask_added',
  SUBTASK_REMOVED = 'subtask_removed',
}

export const TaskActionEventLabels: Record<TaskActionEvent, string> = {
  [TaskActionEvent.TASK_CREATED]: 'Task Created',
  [TaskActionEvent.TASK_UPDATED]: 'Task Updated',
  [TaskActionEvent.TASK_DELETED]: 'Task Deleted',
  [TaskActionEvent.TASK_STARTED]: 'Task Started',
  [TaskActionEvent.TASK_COMPLETED]: 'Task Completed',
  [TaskActionEvent.TASK_REOPENED]: 'Task Reopened',
  [TaskActionEvent.TASK_STATUS_CHANGED]: 'Task Status Changed',
  [TaskActionEvent.TASK_ASSIGNED]: 'Task Assigned',
  [TaskActionEvent.TASK_UNASSIGNED]: 'Task Unassigned',
  [TaskActionEvent.TASK_PRIORITY_CHANGED]: 'Task Priority Changed',
  [TaskActionEvent.TASK_DUE_DATE_CHANGED]: 'Task Due Date Changed',
  [TaskActionEvent.TASK_DUE_TIME_CHANGED]: 'Task Due Time Changed',
  [TaskActionEvent.TASK_OVERDUE]: 'Task Overdue',
  [TaskActionEvent.TASK_START_DATE_CHANGED]: 'Task Start Date Changed',
  [TaskActionEvent.TASK_START_TIME_CHANGED]: 'Task Start Time Changed',
  [TaskActionEvent.TASK_RECURRENCE_MODIFIED]: 'Task Recurrence Modified',
  [TaskActionEvent.TASK_RESCHEDULED]: 'Task Rescheduled',
  [TaskActionEvent.TASK_ESCALATED]: 'Task Escalated',
  [TaskActionEvent.SUBTASK_ADDED]: 'Subtask Added',
  [TaskActionEvent.SUBTASK_REMOVED]: 'Subtask Removed',
};

export const TaskActionEventDescriptions: Record<TaskActionEvent, string> = {
  [TaskActionEvent.TASK_CREATED]: 'Triggered when a new task is created',
  [TaskActionEvent.TASK_UPDATED]: 'Triggered when a task is updated',
  [TaskActionEvent.TASK_DELETED]: 'Triggered when a task is deleted',
  [TaskActionEvent.TASK_STARTED]: 'Triggered when a task is started (status changed to In Progress)',
  [TaskActionEvent.TASK_COMPLETED]: 'Triggered when a task is marked as completed',
  [TaskActionEvent.TASK_REOPENED]: 'Triggered when a completed task is reopened',
  [TaskActionEvent.TASK_STATUS_CHANGED]: 'Triggered when task status is changed',
  [TaskActionEvent.TASK_ASSIGNED]: 'Triggered when a task is assigned to user(s) or group(s)',
  [TaskActionEvent.TASK_UNASSIGNED]: 'Triggered when a task is unassigned from user(s) or group(s)',
  [TaskActionEvent.TASK_PRIORITY_CHANGED]: 'Triggered when task priority is changed',
  [TaskActionEvent.TASK_DUE_DATE_CHANGED]: 'Triggered when task due date is changed',
  [TaskActionEvent.TASK_DUE_TIME_CHANGED]: 'Triggered when task due time is changed',
  [TaskActionEvent.TASK_OVERDUE]: 'Triggered when a task becomes overdue',
  [TaskActionEvent.TASK_START_DATE_CHANGED]: 'Triggered when task start date is changed',
  [TaskActionEvent.TASK_START_TIME_CHANGED]: 'Triggered when task start time is changed',
  [TaskActionEvent.TASK_RECURRENCE_MODIFIED]: 'Triggered when task recurrence settings are modified',
  [TaskActionEvent.TASK_RESCHEDULED]: 'Triggered when a task is rescheduled',
  [TaskActionEvent.TASK_ESCALATED]: 'Triggered when a task is escalated',
  [TaskActionEvent.SUBTASK_ADDED]: 'Triggered when a subtask is added to a task',
  [TaskActionEvent.SUBTASK_REMOVED]: 'Triggered when a subtask is removed from a task',
};

// HTTP Methods for API calls
export enum HttpMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  PATCH = 'PATCH',
  DELETE = 'DELETE',
}

export const HttpMethodLabels: Record<HttpMethod, string> = {
  [HttpMethod.GET]: 'GET',
  [HttpMethod.POST]: 'POST',
  [HttpMethod.PUT]: 'PUT',
  [HttpMethod.PATCH]: 'PATCH',
  [HttpMethod.DELETE]: 'DELETE',
};

// Action Types
export enum ActionType {
  API_CALL = 'API_CALL',
  // Future action types can be added here
  // WEBHOOK = 'WEBHOOK',
  // EMAIL = 'EMAIL',
  // SMS = 'SMS',
}

export const ActionTypeLabels: Record<ActionType, string> = {
  [ActionType.API_CALL]: 'API Call',
};

// Get all action events as array for frontend use
export function getAllActionEvents(): Array<{ value: TaskActionEvent; label: string; description: string }> {
  return Object.values(TaskActionEvent).map((event) => ({
    value: event,
    label: TaskActionEventLabels[event],
    description: TaskActionEventDescriptions[event],
  }));
}

// Get all HTTP methods as array for frontend use
export function getAllHttpMethods(): Array<{ value: HttpMethod; label: string }> {
  return Object.values(HttpMethod).map((method) => ({
    value: method,
    label: HttpMethodLabels[method],
  }));
}

// Get all action types as array for frontend use
export function getAllActionTypes(): Array<{ value: ActionType; label: string }> {
  return Object.values(ActionType).map((type) => ({
    value: type,
    label: ActionTypeLabels[type],
  }));
}
