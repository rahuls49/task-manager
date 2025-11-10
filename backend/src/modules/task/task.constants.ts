// Task field mappings for database operations
export const EDITABLE_TASK_FIELDS = [
  'title', 'description', 'startDate', 'startTime', 'dueDate', 'dueTime', 
  'statusId', 'priorityId', 'parentTaskId', 'isRecurring', 'recurrenceId'
];

// Default task statuses
export const DEFAULT_TASK_STATUSES = [
  { StatusName: 'To Do' },
  { StatusName: 'In Progress' },
  { StatusName: 'Completed' },
  { StatusName: 'Blocked' },
  { StatusName: 'Cancelled' },
  { StatusName: 'On Hold' },
  { StatusName: 'Under Review' }
];

// Default task priorities
export const DEFAULT_TASK_PRIORITIES = [
  { PriorityName: 'Low' },
  { PriorityName: 'Medium' },
  { PriorityName: 'High' },
  { PriorityName: 'Critical' },
  { PriorityName: 'Urgent' }
];

// Task status constants
export const TASK_STATUS = {
  TODO: 1,
  IN_PROGRESS: 2,
  COMPLETED: 3,
  BLOCKED: 4,
  CANCELLED: 5,
  ON_HOLD: 6,
  UNDER_REVIEW: 7
} as const;

// Task priority constants
export const TASK_PRIORITY = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4,
  URGENT: 5
} as const;

// Recurrence frequency options
export const RECURRENCE_FREQUENCIES = [
  'daily', 'weekly', 'monthly', 'yearly'
] as const;

// Days of week for recurrence
export const DAYS_OF_WEEK = [
  'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'
] as const;

// Escalation condition types
export const ESCALATION_CONDITIONS = {
  OVERDUE: 'overdue',
  INACTIVE: 'inactive',
  SLA_BREACH: 'sla_breach',
  PRIORITY: 'priority'
} as const;

// Escalation action types
export const ESCALATION_ACTIONS = {
  NOTIFY: 'notify',
  REASSIGN: 'reassign',
  STATUS_CHANGE: 'status_change'
} as const;

// Task validation rules
export const VALIDATION_RULES = {
  TITLE_MIN_LENGTH: 1,
  TITLE_MAX_LENGTH: 255,
  DESCRIPTION_MAX_LENGTH: 1000,
  MAX_ESCALATION_LEVEL: 5,
  MAX_SUBTASK_DEPTH: 10
} as const;

type DUE_TIME_INTERVAL_UNIT = 'SECOND' | 'MINUTE' | 'HOUR' | 'DAY' | 'WEEK' | 'MONTH' | 'YEAR';

// Time interval constants for due time queries - CONFIGURABLE
export const DUE_TIME_INTERVAL_VALUE: number = parseInt(process.env.DUE_TIME_INTERVAL_VALUE || '30');
export const DUE_TIME_INTERVAL_UNIT: DUE_TIME_INTERVAL_UNIT = (process.env.DUE_TIME_INTERVAL_UNIT as DUE_TIME_INTERVAL_UNIT) || 'MINUTE';

// Scheduler-specific configuration
export const SCHEDULER_CONFIG = {
  // How often the scheduler runs (in cron format)
  CRON_SCHEDULE: process.env.SCHEDULER_CRON || '*/2 * * * *', // Default: every 2 minutes
  
  // Time window for fetching due tasks
  DUE_TASKS_WINDOW_VALUE: parseInt(process.env.DUE_TASKS_WINDOW_VALUE || '30'),
  DUE_TASKS_WINDOW_UNIT: (process.env.DUE_TASKS_WINDOW_UNIT as DUE_TIME_INTERVAL_UNIT) || 'MINUTE',
  
  // Buffer time (how early to start looking for tasks)
  DUE_TASKS_BUFFER_VALUE: parseInt(process.env.DUE_TASKS_BUFFER_VALUE || '1'),
  DUE_TASKS_BUFFER_UNIT: (process.env.DUE_TASKS_BUFFER_UNIT as DUE_TIME_INTERVAL_UNIT) || 'MINUTE',
  
  // Maximum delay before scheduling a task (in milliseconds)
  MAX_SCHEDULING_DELAY_MS: parseInt(process.env.MAX_SCHEDULING_DELAY_MS || '1800000') // Default: 30 minutes
} as const;

// Task events for logging and notifications
export const TASK_EVENTS = {
  CREATED: 'task_created',
  UPDATED: 'task_updated',
  DELETED: 'task_deleted',
  ASSIGNED: 'task_assigned',
  UNASSIGNED: 'task_unassigned',
  STATUS_CHANGED: 'task_status_changed',
  PRIORITY_CHANGED: 'task_priority_changed',
  DUE_DATE_CHANGED: 'task_due_date_changed',
  DUE_TIME_CHANGED: 'task_due_time_changed',
  START_DATE_CHANGED: 'task_start_date_changed',
  START_TIME_CHANGED: 'task_start_time_changed',
  RECURRENCE_MODIFIED: 'task_recurrence_modified',
  STARTED: 'task_started',
  COMPLETED: 'task_completed',
  REOPENED: 'task_reopened',
  OVERDUE: 'task_overdue',
  SUBTASK_ADDED: 'subtask_added',
  SUBTASK_REMOVED: 'subtask_removed',
  ESCALATED: 'task_escalated',
  DEPENDENCY_UPDATED: 'task_dependency_updated',
  COPIED: 'task_copied',
  MOVED: 'task_moved'
} as const;

// SQL queries for common operations
export const SQL_QUERIES = {
  GET_TASKS_WITH_DETAILS: `
    SELECT 
      t.*,
      ts.StatusName,
      tp.PriorityName,
      pt.Title as ParentTaskTitle
    FROM Tasks t
    LEFT JOIN TaskStatus ts ON t.StatusId = ts.Id
    LEFT JOIN TaskPriority tp ON t.PriorityId = tp.Id
    LEFT JOIN Tasks pt ON t.ParentTaskId = pt.Id
    WHERE t.IsDeleted = FALSE
  `,
  
  GET_TASK_ASSIGNEES: `
    SELECT 
      ta.*,
      a.Name as AssigneeName,
      a.Email as AssigneeEmail,
      gm.GroupName
    FROM TaskAssignees ta
    LEFT JOIN Assignees a ON ta.AssigneeId = a.Id
    LEFT JOIN GroupMaster gm ON ta.GroupId = gm.GroupId
    WHERE ta.TaskId = ?
  `,
  
  GET_OVERDUE_TASKS: `
    SELECT * FROM Tasks 
    WHERE IsDeleted = FALSE 
    AND StatusId != ? 
    AND CONCAT(DueDate, ' ', DueTime) <= UTC_TIMESTAMP()
  `,
  
  GET_ESCALATION_CANDIDATES: `
    SELECT t.*, 
           DATEDIFF(CURDATE(), t.DueDate) as DaysOverdue,
           TIMESTAMPDIFF(HOUR, t.UpdatedAt, NOW()) as HoursSinceUpdate
    FROM Tasks t
    WHERE t.IsDeleted = FALSE 
    AND t.IsEscalated = FALSE
    AND (
      (t.DueDate < CURDATE()) OR
      (TIMESTAMPDIFF(HOUR, t.UpdatedAt, NOW()) > 24)
    )
  `
} as const;

// Error messages
export const ERROR_MESSAGES = {
  TASK_NOT_FOUND: 'Task not found',
  TITLE_REQUIRED: 'Task title is required',
  INVALID_PARENT_TASK: 'Invalid parent task',
  CIRCULAR_DEPENDENCY: 'Circular dependency detected',
  INVALID_ASSIGNEE: 'Invalid assignee',
  INVALID_STATUS: 'Invalid status',
  INVALID_PRIORITY: 'Invalid priority',
  INVALID_TASK_TYPE: 'Invalid task type',
  DUE_DATE_PAST: 'Due date cannot be in the past',
  SUBTASK_DUE_DATE_INVALID: 'Subtask due date cannot exceed parent task due date',
  MAX_ESCALATION_REACHED: 'Maximum escalation level reached',
  PARENT_INCOMPLETE_SUBTASKS: 'Cannot complete parent task with incomplete subtasks',
  INVALID_RECURRENCE: 'Invalid recurrence pattern',
  PERMISSION_DENIED: 'Permission denied'
} as const;
