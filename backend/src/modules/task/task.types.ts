// Interface for CSV data
export interface CSVRow {
  [key: string]: string;
}

// Core Task Types
export interface TaskStatus {
  Id: number;
  StatusName: string;
}

export interface TaskPriority {
  Id: number;
  PriorityName: string;
}

export interface Assignee {
  Id: number;
  Name: string;
  Email: string;
}

export interface GroupMaster {
  GroupId: number;
  GroupName: string;
  ParentId?: number;
}

export interface UserGroupMember {
  GroupId: number;
  UserId: number;
}

// ============================================================================
// NEW RECURRENCE TYPES
// ============================================================================

export interface RecurrenceRule {
  Id: number;
  RecurrenceType: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  EndDate?: string;
  DailyRuleId?: number;
  WeeklyRuleId?: number;
  MonthlyRuleId?: number;
}

export interface DailyRule {
  Id: number;
  RecurEveryXDays: number; // e.g., 1 = every day, 3 = every 3 days
  IntraDayFrequencyType?: 'MINUTES' | 'HOURS';
  IntraDayInterval?: number; // e.g., 30 (minutes), 4 (hours)
}

export interface WeeklyRule {
  Id: number;
  RecurEveryNWeeks: number; // e.g., 1 = every week, 2 = every 2 weeks
  OnSunday: boolean;
  OnMonday: boolean;
  OnTuesday: boolean;
  OnWednesday: boolean;
  OnThursday: boolean;
  OnFriday: boolean;
  OnSaturday: boolean;
}

export interface MonthlyRule {
  Id: number;
  RuleType: 'BY_DAY_OF_MONTH' | 'BY_ORDINAL_DAY_OF_WEEK';
}

export interface MonthlyRuleMonth {
  MonthlyRuleId: number;
  MonthNumber: number; // 1=Jan, 2=Feb, ..., 12=Dec
}

export interface MonthlyRuleDay {
  MonthlyRuleId: number;
  DayNumber: string; // e.g., '1', '15', '31', 'L' (Last)
}

export interface MonthlyRuleOrdinal {
  MonthlyRuleId: number;
  Ordinal: 'FIRST' | 'SECOND' | 'THIRD' | 'FOURTH' | 'LAST';
  DayOfWeek: 'SUNDAY' | 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY';
}

// ============================================================================
// LEGACY RECURRENCE TYPE (for backward compatibility)
// ============================================================================

export interface TaskRecurrence {
  Id: number;
  Frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  RecurrenceInterval: number;
  EndDate?: string;
  DaysOfWeek?: string; // JSON string for days
}

export interface EscalationRule {
  Id: number;
  Name: string;
  ConditionType: 'overdue' | 'inactive' | 'sla_breach' | 'priority';
  ConditionValue: string;
  MaxEscalationLevel: number;
  NotificationGroupId?: number;
  ActionType: 'notify' | 'reassign' | 'status_change';
  ActionValue?: string;
  IsActive: boolean;
  CreatedAt: Date;
  UpdatedAt: Date;
}

export interface Task {
  Id: number;
  ParentTaskId?: number;
  Title: string;
  Description?: string;
  DueDate?: string;
  DueTime?: string;
  StartDate?: string;
  StartTime?: string;
  IsRecurring: boolean;
  RecurrenceId?: number;
  StatusId?: number;
  PriorityId?: number;
  TaskTypeId?: number;
  IsEscalated: boolean;
  EscalationLevel: number;
  EscalatedAt?: Date;
  EscalatedBy?: number;
  IsDeleted: boolean;
  DeletedAt?: Date;
  CreatedAt: Date;
  UpdatedAt: Date;
}

export interface TaskAssignee {
  TaskId: number;
  AssigneeId?: number;
  GroupId?: number;
  AssignedAt: Date;
}

export interface EscalationHistory {
  Id: number;
  TaskId: number;
  PreviousLevel?: number;
  NewLevel: number;
  TriggeredBy?: number;
  ActionTaken: string;
  ActionTarget?: string;
  Notes?: string;
  TriggeredAt: Date;
}

// ============================================================================
// RECURRENCE DTOs
// ============================================================================

export interface CreateRecurrenceDto {
  recurrenceType: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  endDate?: string;

  // For DAILY recurrence
  dailyRule?: {
    recurEveryXDays: number;
    intraDayFrequencyType?: 'MINUTES' | 'HOURS';
    intraDayInterval?: number;
  };

  // For WEEKLY recurrence
  weeklyRule?: {
    recurEveryNWeeks: number;
    daysOfWeek: {
      sunday?: boolean;
      monday?: boolean;
      tuesday?: boolean;
      wednesday?: boolean;
      thursday?: boolean;
      friday?: boolean;
      saturday?: boolean;
    };
  };

  // For MONTHLY recurrence
  monthlyRule?: {
    ruleType: 'BY_DAY_OF_MONTH' | 'BY_ORDINAL_DAY_OF_WEEK';
    months?: number[]; // 1-12, if empty applies to all months

    // For BY_DAY_OF_MONTH
    dayNumbers?: string[]; // e.g., ['1', '15', 'L']

    // For BY_ORDINAL_DAY_OF_WEEK
    ordinals?: Array<{
      ordinal: 'FIRST' | 'SECOND' | 'THIRD' | 'FOURTH' | 'LAST';
      dayOfWeek: 'SUNDAY' | 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY';
    }>;
  };
}

// DTOs for API requests
export interface CreateTaskDto {
  parentTaskId?: number;
  title: string;
  description?: string;
  startDate?: string;
  startTime?: string;
  dueDate?: string;
  dueTime?: string;
  isRecurring?: boolean;
  recurrenceId?: number;
  recurrence?: CreateRecurrenceDto; // New recurrence structure
  taskTypeId: number; // Made required
  statusId?: number;
  priorityId?: number;
  assigneeIds?: number[];
  groupIds?: number[];
}

export interface UpdateTaskDto {
  title?: string;
  description?: string;
  startDate?: string;
  startTime?: string;
  dueDate?: string;
  dueTime?: string;
  statusId?: number;
  statusRemark?: string; // Remark for status change
  priorityId?: number;
  taskTypeId?: number;
  isRecurring?: boolean;
  recurrenceId?: number;
  recurrence?: CreateRecurrenceDto; // New recurrence structure
}

export interface AssignTaskDto {
  assigneeIds?: number[];
  groupIds?: number[];
}

export interface TaskFilters {
  status?: number[];
  priority?: number[];
  assigneeId?: number;
  groupId?: number;
  overdue?: boolean;
  completed?: boolean;
  parentTaskId?: number;
  isSubTask?: boolean;
}

// Task Events
export type TaskEvent =
  | 'task_created'
  | 'task_updated'
  | 'task_deleted'
  | 'task_assigned'
  | 'task_unassigned'
  | 'task_status_changed'
  | 'task_priority_changed'
  | 'task_due_date_changed'
  | 'task_due_time_changed'
  | 'task_start_date_changed'
  | 'task_start_time_changed'
  | 'task_recurrence_modified'
  | 'task_started'
  | 'task_completed'
  | 'task_reopened'
  | 'task_overdue'
  | 'subtask_added'
  | 'subtask_removed'
  | 'task_escalated'
  | 'task_dependency_updated'
  | 'task_copied'
  | 'task_moved';

export interface TaskEventData {
  taskId: number;
  event: TaskEvent;
  oldValue?: any;
  newValue?: any;
  userId?: number;
  timestamp: Date;
  metadata?: any;
}

// Validation Error Types
export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface TaskValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// ============================================================================
// RECURRENCE RESPONSE TYPES
// ============================================================================

export interface RecurrenceResponse {
  Id: number;
  RecurrenceType: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  EndDate?: string;

  dailyRule?: DailyRule;
  weeklyRule?: WeeklyRule;
  monthlyRule?: MonthlyRule & {
    months?: MonthlyRuleMonth[];
    dayNumbers?: MonthlyRuleDay[];
    ordinals?: MonthlyRuleOrdinal[];
  };
}

// Response Types
export interface TaskResponse extends Task {
  status?: TaskStatus;
  priority?: TaskPriority;
  assignees?: Assignee[];
  groups?: GroupMaster[];
  subtasks?: TaskResponse[];
  parentTask?: TaskResponse;
  recurrence?: RecurrenceResponse; // Updated to use new structure
}

export interface TaskListResponse {
  tasks: TaskResponse[];
  total: number;
  page: number;
  limit: number;
}

// Statistics and Dashboard Types
export interface TaskStats {
  total: number;
  completed: number;
  inProgress: number;
  overdue: number;
  escalated: number;
  byPriority: { [key: string]: number };
  byStatus: { [key: string]: number };
}