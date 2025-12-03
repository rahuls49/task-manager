// ============================================================================
// TASK ACTION EVENTS
// ============================================================================

export enum TaskActionEvent {
  TASK_CREATED = 'task_created',
  TASK_UPDATED = 'task_updated',
  TASK_DELETED = 'task_deleted',
  TASK_STARTED = 'task_started',
  TASK_COMPLETED = 'task_completed',
  TASK_REOPENED = 'task_reopened',
  TASK_STATUS_CHANGED = 'task_status_changed',
  TASK_ASSIGNED = 'task_assigned',
  TASK_UNASSIGNED = 'task_unassigned',
  TASK_PRIORITY_CHANGED = 'task_priority_changed',
  TASK_DUE_DATE_CHANGED = 'task_due_date_changed',
  TASK_DUE_TIME_CHANGED = 'task_due_time_changed',
  TASK_OVERDUE = 'task_overdue',
  TASK_START_DATE_CHANGED = 'task_start_date_changed',
  TASK_START_TIME_CHANGED = 'task_start_time_changed',
  TASK_RECURRENCE_MODIFIED = 'task_recurrence_modified',
  TASK_RESCHEDULED = 'task_rescheduled',
  TASK_ESCALATED = 'task_escalated',
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

// ============================================================================
// HTTP METHODS
// ============================================================================

export enum HttpMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  PATCH = 'PATCH',
  DELETE = 'DELETE',
}

// ============================================================================
// API DEFINITION TYPES
// ============================================================================

export interface ApiDefinition {
  Id: number;
  Name: string;
  Description?: string;
  Endpoint: string;
  HttpMethod: HttpMethod;
  Headers?: Record<string, string>;
  Body?: Record<string, unknown>;
  IsActive: boolean;
  CreatedAt: string;
  UpdatedAt: string;
}

export interface CreateApiDefinitionDto {
  name: string;
  description?: string;
  endpoint: string;
  httpMethod: HttpMethod;
  headers?: Record<string, string>;
  body?: Record<string, unknown>;
  isActive?: boolean;
}

// ============================================================================
// TASK API ACTION TYPES
// ============================================================================

export interface TaskApiAction {
  Id: number;
  TaskId: number;
  ApiDefinitionId: number;
  TriggerEvent: TaskActionEvent;
  IsActive: boolean;
  CreatedAt: string;
  UpdatedAt: string;
  ApiDefinition?: ApiDefinition;
}

// For creating API actions inline with task creation
export interface InlineApiActionDto {
  // Either use existing API definition
  apiDefinitionId?: number;
  // Or create a new one inline
  apiDefinition?: CreateApiDefinitionDto;
  // Required: which event triggers this action
  triggerEvent: TaskActionEvent;
  isActive?: boolean;
}

// ============================================================================
// API CALL TYPES (for logging)
// ============================================================================

export interface ApiCall {
  Id: number;
  ApiDefinitionId: number;
  TaskId?: number;
  TriggerEvent: string;
  RequestUrl: string;
  RequestMethod: HttpMethod;
  RequestHeaders?: Record<string, string>;
  RequestBody?: Record<string, unknown>;
  ResponseStatus?: number;
  ResponseBody?: unknown;
  ErrorMessage?: string;
  ExecutedAt: string;
  DurationMs?: number;
  IsSuccess: boolean;
  ApiDefinition?: ApiDefinition;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function getAllActionEvents(): Array<{ value: TaskActionEvent; label: string }> {
  return Object.values(TaskActionEvent).map((event) => ({
    value: event,
    label: TaskActionEventLabels[event],
  }));
}

export function getAllHttpMethods(): Array<{ value: HttpMethod; label: string }> {
  return Object.values(HttpMethod).map((method) => ({
    value: method,
    label: method,
  }));
}
