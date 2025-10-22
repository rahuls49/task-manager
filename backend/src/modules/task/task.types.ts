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
  IsRecurring: boolean;
  RecurrenceId?: number;
  StatusId?: number;
  PriorityId?: number;
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

// DTOs for API requests
export interface CreateTaskDto {
  parentTaskId?: number;
  title: string;
  description?: string;
  dueDate?: string;
  dueTime?: string;
  isRecurring?: boolean;
  recurrenceId?: number;
  statusId?: number;
  priorityId?: number;
  assigneeIds?: number[];
  groupIds?: number[];
}

export interface UpdateTaskDto {
  title?: string;
  description?: string;
  dueDate?: string;
  dueTime?: string;
  statusId?: number;
  priorityId?: number;
  isRecurring?: boolean;
  recurrenceId?: number;
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

// Response Types
export interface TaskResponse extends Task {
  status?: TaskStatus;
  priority?: TaskPriority;
  assignees?: Assignee[];
  groups?: GroupMaster[];
  subtasks?: TaskResponse[];
  parentTask?: TaskResponse;
  recurrence?: TaskRecurrence;
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