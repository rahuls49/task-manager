import prisma from "../../lib/connection";
import { getStatusesForTaskType } from "./task-type.service";
import {
  EDITABLE_TASK_FIELDS,
  TASK_STATUS,
  TASK_PRIORITY,
  SQL_QUERIES,
  ERROR_MESSAGES,
  TASK_EVENTS,
  VALIDATION_RULES
} from "./task.constants";
import {
  CSVRow,
  CreateTaskDto,
  UpdateTaskDto,
  TaskFilters,
  TaskResponse,
  TaskValidationResult,
  ValidationError,
  AssignTaskDto,
  TaskEventData,
  TaskStats
} from "./task.types";
// import { RowDataPacket, ResultSetHeader } from 'mysql2';
import * as recurrenceService from "./recurrence.service";
import { recurringTaskScheduler } from "@task-manager/rescheduler-lib";
import { istToUtc, utcToIstDate, utcToIstTime } from '../../utils/timezone';

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

export async function validateTaskData(data: CreateTaskDto | UpdateTaskDto): Promise<TaskValidationResult> {
  const errors: ValidationError[] = [];

  // Title validation
  if ('title' in data && data.title !== undefined) {
    if (!data.title || data.title.trim().length < VALIDATION_RULES.TITLE_MIN_LENGTH) {
      errors.push({
        field: 'title',
        message: ERROR_MESSAGES.TITLE_REQUIRED,
        code: 'TITLE_REQUIRED'
      });
    }
    if (data.title && data.title.length > VALIDATION_RULES.TITLE_MAX_LENGTH) {
      errors.push({
        field: 'title',
        message: `Title cannot exceed ${VALIDATION_RULES.TITLE_MAX_LENGTH} characters`,
        code: 'TITLE_TOO_LONG'
      });
    }
  }

  // Task type validation (required for creation)
  if ('taskTypeId' in data && data.taskTypeId !== undefined) {
    if (data.taskTypeId === null || data.taskTypeId === undefined) {
      errors.push({
        field: 'taskTypeId',
        message: 'Task type is required',
        code: 'TASK_TYPE_REQUIRED'
      });
    } else {
      const taskTypeExists = await checkTaskTypeExists(data.taskTypeId);
      if (!taskTypeExists) {
        errors.push({
          field: 'taskTypeId',
          message: ERROR_MESSAGES.INVALID_TASK_TYPE,
          code: 'INVALID_TASK_TYPE'
        });
      }
    }
  }

  // Due date validation
  if (data.dueDate) {
    const dueDate = new Date(data.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (dueDate < today) {
      errors.push({
        field: 'dueDate',
        message: ERROR_MESSAGES.DUE_DATE_PAST,
        code: 'DUE_DATE_PAST'
      });
    }
  }

  // Parent task validation
  if ('parentTaskId' in data && data.parentTaskId) {
    const parentExists = await checkTaskExists(data.parentTaskId);
    if (!parentExists) {
      errors.push({
        field: 'parentTaskId',
        message: ERROR_MESSAGES.INVALID_PARENT_TASK,
        code: 'INVALID_PARENT_TASK'
      });
    }
  }

  // Status validation
  if (data.statusId) {
    const statusExists = await checkStatusExists(data.statusId);
    if (!statusExists) {
      errors.push({
        field: 'statusId',
        message: ERROR_MESSAGES.INVALID_STATUS,
        code: 'INVALID_STATUS'
      });
    }
  }

  // Priority validation
  if (data.priorityId) {
    const priorityExists = await checkPriorityExists(data.priorityId);
    if (!priorityExists) {
      errors.push({
        field: 'priorityId',
        message: ERROR_MESSAGES.INVALID_PRIORITY,
        code: 'INVALID_PRIORITY'
      });
    }
  }

  // Recurrence validation
  if (data.recurrence) {
    const recurrenceValidation = recurrenceService.validateRecurrenceData(data.recurrence);
    if (!recurrenceValidation.isValid) {
      recurrenceValidation.errors.forEach(error => {
        errors.push({
          field: 'recurrence',
          message: error,
          code: 'INVALID_RECURRENCE'
        });
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

async function checkTaskExists(taskId: number): Promise<boolean> {
  const count = await prisma.task.count({
    where: {
      Id: taskId,
      IsDeleted: false
    }
  });
  return count > 0;
}

async function checkStatusExists(statusId: number): Promise<boolean> {
  const count = await prisma.taskStatus.count({
    where: { Id: statusId }
  });
  return count > 0;
}

async function checkPriorityExists(priorityId: number): Promise<boolean> {
  const count = await prisma.taskPriority.count({
    where: { Id: priorityId }
  });
  return count > 0;
}

async function checkTaskTypeExists(taskTypeId: number): Promise<boolean> {
  const count = await prisma.taskType.count({
    where: { Id: taskTypeId }
  });
  return count > 0;
}

async function checkCircularDependency(taskId: number, parentTaskId: number): Promise<boolean> {
  // Use raw SQL for recursive query since Prisma doesn't support CTEs easily
  const result = await prisma.$queryRaw<{ count: number }[]>`
    WITH RECURSIVE TaskHierarchy AS (
      SELECT Id, ParentTaskId FROM Tasks WHERE Id = ${parentTaskId}
      UNION ALL
      SELECT t.Id, t.ParentTaskId FROM Tasks t 
      INNER JOIN TaskHierarchy th ON t.ParentTaskId = th.Id
    ) 
    SELECT COUNT(*) as count FROM TaskHierarchy WHERE Id = ${taskId}
  `;
  return result[0].count > 0;
}

// ============================================================================
// CORE TASK OPERATIONS
// ============================================================================

export async function getTasks(userId: number, page: number = 1, limit: number = 50, filters?: Partial<TaskFilters>): Promise<{ tasks: TaskResponse[], total: number }> {
  const where: any = {
    IsDeleted: false,
    OR: [
      {
        TaskAssignees: {
          some: {
            AssigneeId: userId
          }
        }
      },
      {
        CreatedBy: userId
      }
    ]
  };

  // Apply filters
  if (filters?.status && filters.status.length > 0) {
    where.StatusId = { in: filters.status };
  }

  if (filters?.priority && filters.priority.length > 0) {
    where.PriorityId = { in: filters.priority };
  }

  if (filters?.assigneeId) {
    where.TaskAssignees = {
      some: { AssigneeId: filters.assigneeId }
    };
  }

  if (filters?.groupId) {
    where.TaskAssignees = {
      some: { GroupId: filters.groupId }
    };
  }

  if (filters?.completed !== undefined) {
    if (filters.completed) {
      where.StatusId = TASK_STATUS.COMPLETED;
    } else {
      where.StatusId = { not: TASK_STATUS.COMPLETED };
    }
  }

  if (filters?.parentTaskId !== undefined) {
    if (filters.parentTaskId === null) {
      where.ParentTaskId = null;
    } else {
      where.ParentTaskId = filters.parentTaskId;
    }
  }

  if (filters?.isSubTask !== undefined) {
    if (filters.isSubTask) {
      where.ParentTaskId = { not: null };
    } else {
      where.ParentTaskId = null;
    }
  }

  const total = await prisma.task.count({ where });

  const tasks = await prisma.task.findMany({
    where,
    include: {
      Status: true,
      Priority: true,
      ParentTask: {
        select: { Title: true }
      }
    },
    orderBy: { CreatedAt: 'desc' },
    skip: (page - 1) * limit,
    take: limit
  });

  // Enhance tasks with assignees and subtasks
  const enhancedTasks = await Promise.all(tasks.map(async (task) => {
    const enhancedTask = await enhanceTaskWithDetails(task);
    return enhancedTask;
  }));

  return { tasks: enhancedTasks, total };
}

export async function getTasksWithFilters(filters: TaskFilters, page: number = 1, limit: number = 50): Promise<{ tasks: TaskResponse[], total: number }> {
  const where: any = { IsDeleted: false };
  const conditions: any[] = [];

  // Apply filters
  if (filters.status && filters.status.length > 0) {
    where.StatusId = { in: filters.status };
  }

  if (filters.priority && filters.priority.length > 0) {
    where.PriorityId = { in: filters.priority };
  }

  if (filters.assigneeId) {
    where.TaskAssignees = {
      some: { AssigneeId: filters.assigneeId }
    };
  }

  if (filters.groupId) {
    where.TaskAssignees = {
      some: { GroupId: filters.groupId }
    };
  }

  if (filters.overdue) {
    // This is complex, might need raw SQL
    // For now, skip this filter
  }

  if (filters.completed !== undefined) {
    if (filters.completed) {
      where.StatusId = TASK_STATUS.COMPLETED;
    } else {
      where.StatusId = { not: TASK_STATUS.COMPLETED };
    }
  }

  if (filters.parentTaskId !== undefined) {
    if (filters.parentTaskId === null) {
      where.ParentTaskId = null;
    } else {
      where.ParentTaskId = filters.parentTaskId;
    }
  }

  if (filters.isSubTask !== undefined) {
    if (filters.isSubTask) {
      where.ParentTaskId = { not: null };
    } else {
      where.ParentTaskId = null;
    }
  }

  const total = await prisma.task.count({ where });

  const tasks = await prisma.task.findMany({
    where,
    include: {
      Status: true,
      Priority: true,
      ParentTask: {
        select: { Title: true }
      }
    },
    orderBy: { CreatedAt: 'desc' },
    skip: (page - 1) * limit,
    take: limit
  });

  // Enhance tasks with assignees and subtasks
  const enhancedTasks = await Promise.all(tasks.map(async (task) => {
    const enhancedTask = await enhanceTaskWithDetails(task);
    return enhancedTask;
  }));

  return { tasks: enhancedTasks, total };
}

export async function getTaskById(taskId: number): Promise<TaskResponse | null> {
  const task = await prisma.task.findFirst({
    where: {
      Id: taskId,
      IsDeleted: false
    },
    include: {
      Status: true,
      Priority: true,
      ParentTask: {
        select: { Title: true }
      }
    }
  });

  if (!task) {
    return null;
  }

  return await enhanceTaskWithDetails(task);
} async function enhanceTaskWithDetails(task: any): Promise<TaskResponse> {
  // Get assignees
  const taskAssignees = await prisma.taskAssignee.findMany({
    where: { TaskId: task.Id },
    include: {
      Assignee: true,
      Group: true
    }
  });

  const assignees = taskAssignees.filter(ta => ta.AssigneeId).map(ta => ({
    Id: Number(ta.Assignee!.Id),
    Name: ta.Assignee!.Name,
    Email: ta.Assignee!.Email
  }));

  const groups = taskAssignees.filter(ta => ta.GroupId).map(ta => ({
    GroupId: Number(ta.Group!.GroupId),
    GroupName: ta.Group!.GroupName
  }));

  // Get subtasks
  const subtasksData = await prisma.task.findMany({
    where: {
      ParentTaskId: task.Id,
      IsDeleted: false
    },
    include: {
      Status: true,
      Priority: true,
      ParentTask: {
        select: { Title: true }
      }
    }
  });

  const subtasks = await Promise.all(subtasksData.map(async (subtask) => {
    return await enhanceTaskWithDetails(subtask);
  }));

  // Get recurrence details if task is recurring
  let recurrence = undefined;

  if (task.IsRecurring && task.RecurrenceId) {
    try {
      // Get new recurrence structure
      recurrence = await recurrenceService.getRecurrenceById(task.RecurrenceId);
    } catch (error) {
      console.error('Error fetching recurrence details:', error);
    }
  }

  return {
    Id: Number(task.Id),
    ParentTaskId: task.ParentTaskId ? Number(task.ParentTaskId) : undefined,
    Title: task.Title,
    Description: task.Description,
    DueDate: task.DueDate,
    DueTime: task.DueTime ? utcToIstTime(task.DueTime) : undefined,
    IsRecurring: Boolean(task.IsRecurring),
    RecurrenceId: task.RecurrenceId ? Number(task.RecurrenceId) : undefined,
    StatusId: task.StatusId ? Number(task.StatusId) : undefined,
    PriorityId: task.PriorityId ? Number(task.PriorityId) : undefined,
    TaskTypeId: task.TaskTypeId ? Number(task.TaskTypeId) : undefined,
    StartDate: task.StartDate,
    StartTime: task.StartTime ? utcToIstTime(task.StartTime) : undefined,
    IsEscalated: Boolean(task.IsEscalated),
    EscalationLevel: Number(task.EscalationLevel),
    EscalatedAt: task.EscalatedAt,
    EscalatedBy: task.EscalatedBy ? Number(task.EscalatedBy) : undefined,
    IsDeleted: Boolean(task.IsDeleted),
    DeletedAt: task.DeletedAt,
    CreatedAt: task.CreatedAt,
    UpdatedAt: task.UpdatedAt,
    assignees,
    groups,
    subtasks,
    status: task.Status ? { Id: Number(task.Status.Id), StatusName: task.Status.StatusName } : { Id: 1, StatusName: 'To Do' },
    priority: task.Priority ? { Id: Number(task.Priority.Id), PriorityName: task.Priority.PriorityName } : undefined,
    recurrence: recurrence || undefined
  };
}

export async function getTaskStatusHistory(taskId: number): Promise<any[]> {
  const history = await prisma.taskStatusHistory.findMany({
    where: {
      TaskId: taskId
    },
    include: {
      OldStatus: true,
      NewStatus: true,
      ChangedByUser: {
        select: {
          Id: true,
          Name: true,
          Email: true
        }
      }
    },
    orderBy: {
      ChangedAt: 'desc'
    }
  });

  return history.map(h => ({
    Id: Number(h.Id),
    TaskId: Number(h.TaskId),
    OldStatusId: h.OldStatusId ? Number(h.OldStatusId) : null,
    NewStatusId: Number(h.NewStatusId),
    OldStatusName: h.OldStatus?.StatusName || null,
    NewStatusName: h.NewStatus?.StatusName,
    Remark: h.Remark,
    ChangedBy: h.ChangedBy ? Number(h.ChangedBy) : null,
    ChangedByUser: h.ChangedByUser ? {
      Id: Number(h.ChangedByUser.Id),
      Name: h.ChangedByUser.Name,
      Email: h.ChangedByUser.Email
    } : null,
    ChangedAt: h.ChangedAt
  }));
}

export async function createTask(data: CreateTaskDto, userId?: number | null): Promise<number> {
  // Validate input data
  const validation = await validateTaskData(data);
  if (!validation.isValid) {
    throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
  }

  // Set default start date/time if not provided
  // Temporarily commented out
  // if (!data.startDate || !data.startTime) {
  //   const now = new Date();
  //   data.startDate = now.toISOString().split('T')[0];
  //   data.startTime = now.toISOString().split('T')[1].split('.')[0];
  //   console.log(`🔍 Default start date/time set to: "${data.startDate} ${data.startTime}"`);
  // }

  // Convert due date to proper format
  if (data.dueDate) {
    // For DATE column, ensure it's in YYYY-MM-DD format
    if (data.dueDate.includes('T')) {
      // If it's a full datetime, extract just the date part
      data.dueDate = data.dueDate.split('T')[0];
    }
    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data.dueDate)) {
      throw new Error(`Invalid due date format: ${data.dueDate}. Expected YYYY-MM-DD`);
    }
  }

  // Convert due time to proper format
  if (data.dueTime) {
    // For TIME column, ensure it's in HH:MM:SS format
    if (data.dueTime.split(':').length === 2) {
      data.dueTime = `${data.dueTime}:00`;
    }
    // Validate time format
    if (!/^\d{2}:\d{2}:\d{2}$/.test(data.dueTime)) {
      throw new Error(`Invalid due time format: ${data.dueTime}. Expected HH:MM:SS`);
    }
  }

  // Convert start date to proper format
  if (data.startDate) {
    // For DATE column, ensure it's in YYYY-MM-DD format
    if (data.startDate.includes('T')) {
      // If it's a full datetime, extract just the date part
      data.startDate = data.startDate.split('T')[0];
    }
    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data.startDate)) {
      throw new Error(`Invalid start date format: ${data.startDate}. Expected YYYY-MM-DD`);
    }
  }

  // Convert start time to proper format
  if (data.startTime) {
    // For TIME column, ensure it's in HH:MM:SS format
    if (data.startTime.split(':').length === 2) {
      data.startTime = `${data.startTime}:00`;
    }
    // Validate time format
    if (!/^\d{2}:\d{2}:\d{2}$/.test(data.startTime)) {
      throw new Error(`Invalid start time format: ${data.startTime}. Expected HH:MM:SS`);
    }
  }  // Check for circular dependency if parent task is specified
  if (data.parentTaskId) {
    const parentTask = await getTaskById(data.parentTaskId);
    if (!parentTask) {
      throw new Error(ERROR_MESSAGES.INVALID_PARENT_TASK);
    }

    // Validate subtask due date doesn't exceed parent due date
    if (data.dueDate && parentTask.DueDate) {
      const subtaskDue = new Date(data.dueDate);
      const parentDue = new Date(parentTask.DueDate);
      if (subtaskDue > parentDue) {
        throw new Error(ERROR_MESSAGES.SUBTASK_DUE_DATE_INVALID);
      }
    }
  }

  let recurrenceId: number | undefined;

  // Create recurrence rule if specified
  if (data.recurrence) {
    recurrenceId = await recurrenceService.createRecurrenceRule(data.recurrence);
    data.isRecurring = true;
    data.recurrenceId = recurrenceId;
  }

  // Set default status based on task type if not provided
  if (data.taskTypeId && !data.statusId) {
    const taskTypeStatuses = await prisma.taskTypeStatus.findMany({
      where: { TaskTypeId: data.taskTypeId },
      orderBy: { OrderIndex: 'asc' },
      include: { Status: true }
    });

    if (taskTypeStatuses.length > 0) {
      // For sequential types, start with the first status (lowest OrderIndex)
      // For random types, also start with the first status for consistency
      data.statusId = Number(taskTypeStatuses[0].Status.Id);
    }
  }

  // Create task
  const taskData: any = {
    Title: data.title,
    Description: data.description,
    IsRecurring: data.isRecurring || false,
    RecurrenceId: data.recurrenceId,
    TaskTypeId: data.taskTypeId || null,
    StatusId: data.statusId,
    PriorityId: data.priorityId,
    ParentTaskId: data.parentTaskId,
  };

  if (userId !== undefined) {
    taskData.CreatedBy = userId;
  }

  // Only add date/time fields if they have values
  if (data.dueDate !== undefined && data.dueDate !== null) {
    taskData.DueDate = new Date(data.dueDate); // Convert to Date object for @db.Date
  }
  if (data.dueTime !== undefined && data.dueTime !== null) {
    // Convert IST time to UTC for storage
    taskData.DueTime = istToUtc(data.dueDate || new Date().toISOString().split('T')[0], data.dueTime);
  }
  if (data.startDate !== undefined && data.startDate !== null) {
    taskData.StartDate = new Date(data.startDate); // Convert to Date object for @db.Date
  }
  if (data.startTime !== undefined && data.startTime !== null) {
    // Convert IST time to UTC for storage
    taskData.StartTime = istToUtc(data.startDate || new Date().toISOString().split('T')[0], data.startTime);
  }

  console.log('🔍 Task data to create:', taskData);

  const task = await prisma.task.create({
    data: taskData
  });

  const taskId = Number(task.Id);

  // Assign task to users/groups if specified
  if (data.assigneeIds || data.groupIds) {
    await assignTaskToUsers(taskId, {
      assigneeIds: data.assigneeIds,
      groupIds: data.groupIds
    });
  }

  // Log task creation event
  await logTaskEvent({
    taskId,
    event: TASK_EVENTS.CREATED,
    userId: userId === null ? undefined : userId,
    timestamp: new Date(),
    metadata: { taskData: data }
  });

  // Schedule recurring task if applicable
  if (data.isRecurring && recurrenceId) {
    const createdTask = await getTaskById(taskId);
    if (createdTask) {
      await recurringTaskScheduler.scheduleTask(createdTask as any);
    }
  }

  return taskId;
}

export async function updateTask(taskId: number, data: UpdateTaskDto, userId?: number): Promise<void> {
  // Get current task data for comparison
  const currentTask = await getTaskById(taskId);
  if (!currentTask) {
    throw new Error(ERROR_MESSAGES.TASK_NOT_FOUND);
  }

  // Validate input data
  const validation = await validateTaskData(data);
  if (!validation.isValid) {
    throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
  }

  // Convert due date to proper format
  if (data.dueDate) {
    // For DATE column, ensure it's in YYYY-MM-DD format
    if (data.dueDate.includes('T')) {
      // If it's a full datetime, extract just the date part
      data.dueDate = data.dueDate.split('T')[0];
    }
    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data.dueDate)) {
      throw new Error(`Invalid due date format: ${data.dueDate}. Expected YYYY-MM-DD`);
    }
  }

  // Convert due time to proper format
  if (data.dueTime) {
    // For TIME column, ensure it's in HH:MM:SS format
    if (data.dueTime.split(':').length === 2) {
      data.dueTime = `${data.dueTime}:00`;
    }
    // Validate time format
    if (!/^\d{2}:\d{2}:\d{2}$/.test(data.dueTime)) {
      throw new Error(`Invalid due time format: ${data.dueTime}. Expected HH:MM:SS`);
    }
  }

  // Convert start date to proper format
  if (data.startDate) {
    // For DATE column, ensure it's in YYYY-MM-DD format
    if (data.startDate.includes('T')) {
      // If it's a full datetime, extract just the date part
      data.startDate = data.startDate.split('T')[0];
    }
    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data.startDate)) {
      throw new Error(`Invalid start date format: ${data.startDate}. Expected YYYY-MM-DD`);
    }
  }

  // Convert start time to proper format
  if (data.startTime) {
    // For TIME column, ensure it's in HH:MM:SS format
    if (data.startTime.split(':').length === 2) {
      data.startTime = `${data.startTime}:00`;
    }
    // Validate time format
    if (!/^\d{2}:\d{2}:\d{2}$/.test(data.startTime)) {
      throw new Error(`Invalid start time format: ${data.startTime}. Expected HH:MM:SS`);
    }
  }

  // Validate status transitions
  if (data.statusId && data.statusId !== currentTask.StatusId) {
    await validateStatusTransition(taskId, currentTask.StatusId!, data.statusId);
  }

  let recurrenceChanged = false;

  // Handle recurrence updates
  if (data.recurrence) {
    if (currentTask.RecurrenceId) {
      // Update existing recurrence
      await recurrenceService.updateRecurrenceRule(currentTask.RecurrenceId, data.recurrence);
      recurrenceChanged = true;
    } else {
      // Create new recurrence
      const recurrenceId = await recurrenceService.createRecurrenceRule(data.recurrence);
      data.isRecurring = true;
      data.recurrenceId = recurrenceId;
      recurrenceChanged = true;
    }
  } else if (data.isRecurring === false && currentTask.RecurrenceId) {
    // Remove recurrence
    await recurrenceService.deleteRecurrenceRule(currentTask.RecurrenceId);
    data.recurrenceId = undefined;
    recurrenceChanged = true;
  }

  // Update task using Prisma
  const updateData: any = {};

  if (data.title !== undefined) updateData.Title = data.title;
  if (data.description !== undefined) updateData.Description = data.description;
  // Convert dates to Date objects for Prisma
  if (data.dueDate !== undefined) {
    updateData.DueDate = data.dueDate ? new Date(data.dueDate) : null;
  }
  if (data.dueTime !== undefined) {
    if (data.dueTime) {
      // Convert IST time to UTC for storage
      updateData.DueTime = istToUtc(data.dueDate || currentTask.DueDate || new Date().toISOString().split('T')[0], data.dueTime);
    } else {
      updateData.DueTime = null;
    }
  }
  if (data.startDate !== undefined) {
    updateData.StartDate = data.startDate ? new Date(data.startDate) : null;
  }
  if (data.startTime !== undefined) {
    if (data.startTime) {
      // Convert IST time to UTC for storage
      updateData.StartTime = istToUtc(data.startDate || currentTask.StartDate || new Date().toISOString().split('T')[0], data.startTime);
    } else {
      updateData.StartTime = null;
    }
  }
  // Update status if provided
  if (data.statusId !== undefined) {
    updateData.StatusId = data.statusId;
  }
  updateData.UpdatedAt = new Date();
  // console.log('🔍 updateData to apply:', updateData); // debug logging removed

  await prisma.task.update({
    where: { Id: taskId },
    data: updateData
  });

  // Save status change history if status was changed
  if (data.statusId !== undefined && data.statusId !== currentTask.StatusId) {
    await prisma.taskStatusHistory.create({
      data: {
        TaskId: taskId,
        OldStatusId: currentTask.StatusId || null,
        NewStatusId: data.statusId,
        Remark: data.statusRemark || null,
        ChangedBy: userId || null
      }
    });
  }

  // Log specific change events
  await logTaskUpdateEvents(currentTask, data, userId);

  // Reschedule recurring task if recurrence was changed
  if (recurrenceChanged && (data.isRecurring || currentTask.IsRecurring)) {
    if (data.isRecurring) {
      await recurringTaskScheduler.rescheduleTask(taskId);
    } else {
      recurringTaskScheduler.cancelTask(taskId);
    }
  }
}

async function validateStatusTransition(taskId: number, currentStatusId: number, newStatusId: number): Promise<void> {
  // Get task type information
  const task = await prisma.task.findUnique({
    where: { Id: taskId, IsDeleted: false },
    select: { TaskTypeId: true }
  });

  if (!task) {
    throw new Error(ERROR_MESSAGES.TASK_NOT_FOUND);
  }

  const taskTypeId = task.TaskTypeId;

  // If task has a type, validate that the new status is associated with this task type
  if (taskTypeId) {
    const statusAssociationCount = await prisma.taskTypeStatus.count({
      where: {
        TaskTypeId: taskTypeId,
        StatusId: newStatusId
      }
    });

    if (statusAssociationCount === 0) {
      // Get task type name for error message
      const taskType = await prisma.taskType.findUnique({
        where: { Id: taskTypeId },
        select: { TypeName: true }
      });
      const typeName = taskType?.TypeName || 'Unknown';

      throw new Error(`Status ${newStatusId} is not allowed for task type "${typeName}". Only statuses associated with this task type can be used.`);
    }

    // Also validate against transition rules if they exist
    const transitionCount = await prisma.statusTransitionRule.count({
      where: {
        TaskTypeId: taskTypeId,
        FromStatusId: currentStatusId,
        ToStatusId: newStatusId
      }
    });

    // If there are transition rules defined, enforce them
    const totalTransitions = await prisma.statusTransitionRule.count({
      where: { TaskTypeId: taskTypeId }
    });

    if (totalTransitions > 0 && transitionCount === 0) {
      // Get task type name for error message
      const taskType = await prisma.taskType.findUnique({
        where: { Id: taskTypeId },
        select: { TypeName: true }
      });
      const typeName = taskType?.TypeName || 'Unknown';

      throw new Error(`Status transition from ${currentStatusId} to ${newStatusId} is not allowed for task type "${typeName}"`);
    }
  }

  // Cannot mark parent task as completed if subtasks are incomplete
  if (newStatusId === TASK_STATUS.COMPLETED) {
    const incompleteSubtasks = await prisma.task.count({
      where: {
        ParentTaskId: taskId,
        StatusId: { not: TASK_STATUS.COMPLETED },
        IsDeleted: false
      }
    });

    if (incompleteSubtasks > 0) {
      throw new Error(ERROR_MESSAGES.PARENT_INCOMPLETE_SUBTASKS);
    }
  }
} async function logTaskUpdateEvents(currentTask: any, updates: UpdateTaskDto, userId?: number): Promise<void> {
  const events: TaskEventData[] = [];

  // Status change
  if (updates.statusId && updates.statusId !== currentTask.StatusId) {
    events.push({
      taskId: currentTask.Id,
      event: TASK_EVENTS.STATUS_CHANGED,
      oldValue: currentTask.StatusId,
      newValue: updates.statusId,
      userId,
      timestamp: new Date()
    });

    // Special status events
    if (updates.statusId === TASK_STATUS.IN_PROGRESS) {
      events.push({
        taskId: currentTask.Id,
        event: TASK_EVENTS.STARTED,
        userId,
        timestamp: new Date()
      });
    } else if (updates.statusId === TASK_STATUS.COMPLETED) {
      events.push({
        taskId: currentTask.Id,
        event: TASK_EVENTS.COMPLETED,
        userId,
        timestamp: new Date()
      });
    } else if (currentTask.StatusId === TASK_STATUS.COMPLETED && updates.statusId !== TASK_STATUS.COMPLETED) {
      events.push({
        taskId: currentTask.Id,
        event: TASK_EVENTS.REOPENED,
        userId,
        timestamp: new Date()
      });
    }
  }

  // Priority change
  if (updates.priorityId && updates.priorityId !== currentTask.PriorityId) {
    events.push({
      taskId: currentTask.Id,
      event: TASK_EVENTS.PRIORITY_CHANGED,
      oldValue: currentTask.PriorityId,
      newValue: updates.priorityId,
      userId,
      timestamp: new Date()
    });
  }

  // Due date change
  if (updates.dueDate && updates.dueDate !== currentTask.DueDate) {
    events.push({
      taskId: currentTask.Id,
      event: TASK_EVENTS.DUE_DATE_CHANGED,
      oldValue: currentTask.DueDate,
      newValue: updates.dueDate,
      userId,
      timestamp: new Date()
    });
  }

  // Due time change
  if (updates.dueTime && updates.dueTime !== currentTask.DueTime) {
    events.push({
      taskId: currentTask.Id,
      event: TASK_EVENTS.DUE_TIME_CHANGED,
      oldValue: currentTask.DueTime,
      newValue: updates.dueTime,
      userId,
      timestamp: new Date()
    });
  }

  // Start date change
  if (updates.startDate && updates.startDate !== currentTask.StartDate) {
    events.push({
      taskId: currentTask.Id,
      event: TASK_EVENTS.START_DATE_CHANGED,
      oldValue: currentTask.StartDate,
      newValue: updates.startDate,
      userId,
      timestamp: new Date()
    });
  }

  // Start time change
  if (updates.startTime && updates.startTime !== currentTask.StartTime) {
    events.push({
      taskId: currentTask.Id,
      event: TASK_EVENTS.START_TIME_CHANGED,
      oldValue: currentTask.StartTime,
      newValue: updates.startTime,
      userId,
      timestamp: new Date()
    });
  }
}

export async function deleteTask(taskId: number, userId?: number): Promise<boolean> {
  const task = await getTaskById(taskId);
  if (!task) {
    return false;
  }

  // Soft delete - update IsDeleted flag
  const result = await prisma.task.updateMany({
    where: { Id: taskId },
    data: {
      IsDeleted: true,
      DeletedAt: new Date()
    }
  });

  if (result.count > 0) {
    // Log deletion event
    await logTaskEvent({
      taskId,
      event: TASK_EVENTS.DELETED,
      userId,
      timestamp: new Date()
    });

    return true;
  }

  return false;
}

// ============================================================================
// TASK ASSIGNMENT OPERATIONS
// ============================================================================

export async function assignTask(taskId: number, assignData: AssignTaskDto, userId?: number): Promise<void> {
  const task = await getTaskById(taskId);
  if (!task) {
    throw new Error(ERROR_MESSAGES.TASK_NOT_FOUND);
  }

  await assignTaskToUsers(taskId, assignData);

  // Log assignment event
  await logTaskEvent({
    taskId,
    event: TASK_EVENTS.ASSIGNED,
    userId,
    timestamp: new Date(),
    metadata: { assigneeIds: assignData.assigneeIds, groupIds: assignData.groupIds }
  });
}

async function assignTaskToUsers(taskId: number, assignData: AssignTaskDto): Promise<void> {
  // Remove existing assignments
  await prisma.taskAssignee.deleteMany({
    where: { TaskId: taskId }
  });

  // Add new user assignments
  if (assignData.assigneeIds && assignData.assigneeIds.length > 0) {
    for (const assigneeId of assignData.assigneeIds) {
      await prisma.taskAssignee.create({
        data: {
          TaskId: taskId,
          AssigneeId: assigneeId
        }
      });
    }
  }

  // Add new group assignments
  if (assignData.groupIds && assignData.groupIds.length > 0) {
    for (const groupId of assignData.groupIds) {
      await prisma.taskAssignee.create({
        data: {
          TaskId: taskId,
          GroupId: groupId
        }
      });
    }
  }
}

export async function unassignTask(taskId: number, assigneeId?: number, groupId?: number, userId?: number): Promise<void> {
  const where: any = { TaskId: taskId };

  if (assigneeId) {
    where.AssigneeId = assigneeId;
  }

  if (groupId) {
    where.GroupId = groupId;
  }

  const result = await prisma.taskAssignee.deleteMany({
    where
  });

  if (result.count > 0) {
    await logTaskEvent({
      taskId,
      event: TASK_EVENTS.UNASSIGNED,
      userId,
      timestamp: new Date(),
      metadata: { assigneeId, groupId }
    });
  }
}

// ============================================================================
// TASK ESCALATION OPERATIONS
// ============================================================================

export async function escalateTask(taskId: number, userId?: number, notes?: string): Promise<void> {
  const task = await getTaskById(taskId);
  if (!task) {
    throw new Error(ERROR_MESSAGES.TASK_NOT_FOUND);
  }

  if (task.EscalationLevel >= VALIDATION_RULES.MAX_ESCALATION_LEVEL) {
    throw new Error(ERROR_MESSAGES.MAX_ESCALATION_REACHED);
  }

  const newLevel = task.EscalationLevel + 1;

  // Update task escalation
  await prisma.task.update({
    where: { Id: taskId },
    data: {
      IsEscalated: true,
      EscalationLevel: newLevel,
      EscalatedAt: new Date(),
      EscalatedBy: userId
    }
  });

  // Log escalation history
  await prisma.escalationHistory.create({
    data: {
      TaskId: taskId,
      PreviousLevel: task.EscalationLevel,
      NewLevel: newLevel,
      TriggeredBy: userId,
      ActionTaken: 'Manual escalation',
      Notes: notes
    }
  });

  // Log escalation event
  await logTaskEvent({
    taskId,
    event: TASK_EVENTS.ESCALATED,
    userId,
    timestamp: new Date(),
    metadata: { previousLevel: task.EscalationLevel, newLevel, notes }
  });
}

export async function checkAndProcessEscalations(): Promise<void> {
  const candidates = await prisma.$queryRaw`
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
  ` as any[];

  const rules = await prisma.escalationRule.findMany({
    where: { IsActive: true }
  });

  for (const task of candidates) {
    for (const rule of rules) {
      let shouldEscalate = false;

      switch (rule.ConditionType) {
        case 'overdue':
          shouldEscalate = task.DaysOverdue >= parseInt(rule.ConditionValue);
          break;
        case 'inactive':
          shouldEscalate = task.HoursSinceUpdate >= parseInt(rule.ConditionValue);
          break;
      }

      if (shouldEscalate && task.EscalationLevel < rule.MaxEscalationLevel) {
        await escalateTaskByRule(task.Id, rule);
      }
    }
  }
}

async function escalateTaskByRule(taskId: number, rule: any): Promise<void> {
  // Update task
  await prisma.task.update({
    where: { Id: taskId },
    data: {
      IsEscalated: true,
      EscalationLevel: { increment: 1 },
      EscalatedAt: new Date()
    }
  });

  // Log escalation
  await prisma.escalationHistory.create({
    data: {
      TaskId: taskId,
      NewLevel: rule.MaxEscalationLevel,
      ActionTaken: rule.ActionType,
      ActionTarget: rule.ActionValue
    }
  });

  // Log event
  await logTaskEvent({
    taskId,
    event: TASK_EVENTS.ESCALATED,
    timestamp: new Date(),
    metadata: { ruleId: rule.Id, automatic: true }
  });
}

// ============================================================================
// TASK TYPE STATUS OPERATIONS
// ============================================================================

export async function getOverdueTasks(): Promise<TaskResponse[]> {
  const { DUE_TIME_INTERVAL_VALUE, DUE_TIME_INTERVAL_UNIT } = await import('./task.constants');

  // Get tasks that are overdue or due within the configured interval
  const rows = await prisma.$queryRaw`
    SELECT * FROM Tasks 
    WHERE IsDeleted = FALSE 
    AND StatusId != ${TASK_STATUS.COMPLETED} 
    AND CONCAT(DueDate, ' ', DueTime) <= DATE_ADD(UTC_TIMESTAMP(), INTERVAL ${DUE_TIME_INTERVAL_VALUE} ${DUE_TIME_INTERVAL_UNIT})
  ` as any[];

  const tasks = await Promise.all(rows.map(async (task: any) => {
    return await enhanceTaskWithDetails(task);
  }));

  // Mark tasks as overdue if not already processed
  for (const task of tasks) {
    await logTaskEvent({
      taskId: task.Id,
      event: TASK_EVENTS.OVERDUE,
      timestamp: new Date()
    });
  }

  console.log(`📋 getOverdueTasks: Found ${tasks.length} task(s) overdue or due within ${DUE_TIME_INTERVAL_VALUE} ${DUE_TIME_INTERVAL_UNIT}(s)`);

  return tasks;
}

export async function getDueTasks(): Promise<TaskResponse[]> {
  // Get tasks that are due within the configured time window
  // Since times are stored in UTC, we need to compare with UTC time
  const { SCHEDULER_CONFIG } = await import('./task.constants');

  const windowValue = SCHEDULER_CONFIG.DUE_TASKS_WINDOW_VALUE;
  const windowUnit = SCHEDULER_CONFIG.DUE_TASKS_WINDOW_UNIT;
  const bufferValue = SCHEDULER_CONFIG.DUE_TASKS_BUFFER_VALUE;
  const bufferUnit = SCHEDULER_CONFIG.DUE_TASKS_BUFFER_UNIT;

  const rows = await prisma.$queryRaw`
    SELECT * FROM Tasks 
    WHERE IsDeleted = FALSE 
    AND StatusId != ${TASK_STATUS.COMPLETED} 
    AND CONCAT(DueDate, ' ', DueTime) BETWEEN 
        DATE_SUB(UTC_TIMESTAMP(), INTERVAL ${bufferValue} ${bufferUnit}) 
        AND DATE_ADD(UTC_TIMESTAMP(), INTERVAL ${windowValue} ${windowUnit})
  ` as any[];

  const tasks = await Promise.all(rows.map(async (task: any) => {
    return await enhanceTaskWithDetails(task);
  }));

  console.log(`📋 getDueTasks: Found ${tasks.length} task(s) due within ${windowValue} ${windowUnit}(s) (with ${bufferValue} ${bufferUnit} buffer)`);

  return tasks;
}

export async function getTaskStats(): Promise<TaskStats> {
  const totalRows = await prisma.$queryRaw<{ total: number }[]>`SELECT COUNT(*) as total FROM Tasks WHERE IsDeleted = FALSE`;

  const statusRows = await prisma.$queryRaw<{ StatusName: string; count: number }[]>`
    SELECT ts.StatusName, COUNT(*) as count FROM Tasks t JOIN TaskStatus ts ON t.StatusId = ts.Id WHERE t.IsDeleted = FALSE GROUP BY t.StatusId, ts.StatusName
  `;

  const priorityRows = await prisma.$queryRaw<{ PriorityName: string; count: number }[]>`
    SELECT tp.PriorityName, COUNT(*) as count FROM Tasks t JOIN TaskPriority tp ON t.PriorityId = tp.Id WHERE t.IsDeleted = FALSE GROUP BY t.PriorityId, tp.PriorityName
  `;

  const overdueRows = await prisma.$queryRaw`SELECT * FROM Tasks WHERE IsDeleted = FALSE AND StatusId != ${TASK_STATUS.COMPLETED} AND DueDate < CURDATE()` as any[];

  const escalatedRows = await prisma.$queryRaw<{ count: number }[]>`SELECT COUNT(*) as count FROM Tasks WHERE IsDeleted = FALSE AND IsEscalated = TRUE`;

  const byStatus: { [key: string]: number } = {};
  statusRows.forEach((row: any) => {
    byStatus[row.StatusName] = row.count;
  });

  const byPriority: { [key: string]: number } = {};
  priorityRows.forEach((row: any) => {
    byPriority[row.PriorityName] = row.count;
  });

  return {
    total: totalRows[0]?.total || 0,
    completed: byStatus['Completed'] || 0,
    inProgress: byStatus['In Progress'] || 0,
    overdue: overdueRows.length,
    escalated: escalatedRows[0]?.count || 0,
    byPriority,
    byStatus
  };
}

async function logTaskEvent(eventData: TaskEventData): Promise<void> {
  // This would typically log to an events table or external system
  console.log('Task Event:', eventData);
  // You could implement actual logging here:
  // await pool.query('INSERT INTO TaskEvents (TaskId, Event, OldValue, NewValue, UserId, Timestamp, Metadata) VALUES (?, ?, ?, ?, ?, ?, ?)', 
  //   [eventData.taskId, eventData.event, eventData.oldValue, eventData.newValue, eventData.userId, eventData.timestamp, JSON.stringify(eventData.metadata)]);
}

// ============================================================================
// TASK TYPE STATUS OPERATIONS
// ============================================================================

// CSV Import (legacy support)
export async function saveCSVData(csvData: CSVRow[]): Promise<void> {
  for (const row of csvData) {
    const taskData: CreateTaskDto = {
      title: row.title || row.name || 'Untitled Task',
      description: row.description,
      dueDate: row.duedate || row.dueDate || row.due_date,
      dueTime: row.duetime || row.dueTime || row.due_time,
      taskTypeId: parseInt(row.tasktypeid || row.taskTypeId || row.task_type_id) || 1, // Default to first task type
      statusId: parseInt(row.statusid || row.statusId || row.status_id) || TASK_STATUS.TODO,
      priorityId: parseInt(row.priorityid || row.priorityId || row.priority_id) || TASK_PRIORITY.MEDIUM
    };

    // Handle assigneeIds from CSV
    const assigneeIdsStr = row.assigneeids || row.assigneeIds || row.assignee_ids || row.assigneeId || row.assignee_id;
    if (assigneeIdsStr) {
      // Handle comma-separated values or single value
      const assigneeIds = assigneeIdsStr.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
      if (assigneeIds.length > 0) {
        taskData.assigneeIds = assigneeIds;
      }
    }

    // Handle groupIds from CSV
    const groupIdsStr = row.groupids || row.groupIds || row.group_ids || row.groupId || row.group_id;
    if (groupIdsStr) {
      // Handle comma-separated values or single value
      const groupIds = groupIdsStr.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
      if (groupIds.length > 0) {
        taskData.groupIds = groupIds;
      }
    }

    if (taskData.title) {
      await createTask(taskData);
    }
  }
}
