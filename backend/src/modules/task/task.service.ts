import prisma from "../../lib/connection";
import { rbacClient } from "../../lib/rbac-client";
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
import { publishTaskEvent } from "./task.event-publisher";
import { getSchedulerSettings } from "./scheduler-config.service";
import * as actionService from "../action/action.service";
import { TaskActionEvent, HttpMethod } from "../action/action.events";

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
  const count = await prisma.tasks.count({
    where: {
      Id: taskId,
      IsDeleted: false
    }
  });
  return count > 0;
}

async function checkStatusExists(statusId: number): Promise<boolean> {
  const count = await prisma.taskstatus.count({
    where: { Id: statusId }
  });
  return count > 0;
}

async function checkPriorityExists(priorityId: number): Promise<boolean> {
  const count = await prisma.taskpriority.count({
    where: { Id: priorityId }
  });
  return count > 0;
}

async function checkTaskTypeExists(taskTypeId: number): Promise<boolean> {
  const count = await prisma.tasktype.count({
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
        taskassignees: {
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
    where.taskassignees = {
      some: { AssigneeId: filters.assigneeId }
    };
  }

  if (filters?.groupId) {
    where.taskassignees = {
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

  if (filters?.escalated !== undefined) {
    where.IsEscalated = filters.escalated;
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

  // Search by title or description (case-insensitive)
  if (filters?.search && filters.search.trim()) {
    const searchTerm = filters.search.trim();
    where.OR = [
      { Title: { contains: searchTerm } },
      { Description: { contains: searchTerm } }
    ];
  }

  const total = await prisma.tasks.count({ where });

  const tasks = await prisma.tasks.findMany({
    where,
    include: {
      taskstatus: true,
      taskpriority: true,
      tasks: { select: { Title: true } }
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
    where.taskassignees = {
      some: { AssigneeId: filters.assigneeId }
    };
  }

  if (filters.groupId) {
    where.taskassignees = {
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

  const total = await prisma.tasks.count({ where });

  const tasks = await prisma.tasks.findMany({
    where,
    include: {
      taskstatus: true,
      taskpriority: true,
      tasks: {
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
  const task = await prisma.tasks.findFirst({
    where: {
      Id: taskId,
      IsDeleted: false
    },
    include: {
      taskstatus: true,
      taskpriority: true,
      tasks: {
        select: { Title: true }
      }
    }
  });

  if (!task) {
    return null;
  }

  return await enhanceTaskWithDetails(task);
}

// Cache for user IDs from RBAC service to reduce API calls
let rbacUsersCache: Map<number, { id: number; name: string; email: string }> | null = null;
let rbacUsersCacheTime: number = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache

async function getRbacUserById(userId: number): Promise<{ Id: number; Name: string; Email: string } | null> {
  // Check if cache is still valid
  if (rbacUsersCache && Date.now() - rbacUsersCacheTime < CACHE_TTL) {
    const cached = rbacUsersCache.get(userId);
    if (cached) {
      return { Id: cached.id, Name: cached.name, Email: cached.email };
    }
  }

  // Try to fetch from RBAC API
  if (rbacClient.isReady()) {
    try {
      // Refresh the entire user cache
      const response = await rbacClient.getAllUsers();
      if (response.success && response.data) {
        rbacUsersCache = new Map();
        rbacUsersCacheTime = Date.now();

        for (const user of response.data) {
          rbacUsersCache.set(user.id, {
            id: user.id,
            name: user.name || user.username || user.email,
            email: user.email
          });
        }

        const cached = rbacUsersCache.get(userId);
        if (cached) {
          return { Id: cached.id, Name: cached.name, Email: cached.email };
        }
      }
    } catch (error) {
      console.warn('[Task Service] Failed to fetch user from RBAC:', error);
    }
  }

  return null;
}

async function enhanceTaskWithDetails(task: any): Promise<TaskResponse> {
  // Get task assignee links (just IDs, not user details)
  const taskAssignees = await prisma.taskassignees.findMany({
    where: { TaskId: task.Id },
    include: {
      assignees: true, // Still include as fallback
      groupmaster: true
    }
  });

  // Fetch assignee details from RBAC API where possible
  const assignees: { Id: number; Name: string; Email: string }[] = [];

  for (const ta of taskAssignees) {
    if (ta.AssigneeId) {
      // Try to get from RBAC first
      const rbacUser = await getRbacUserById(Number(ta.AssigneeId));
      if (rbacUser) {
        assignees.push(rbacUser);
      } else if (ta.assignees) {
        // Fallback to Prisma data
        assignees.push({
          Id: Number(ta.assignees.Id),
          Name: ta.assignees.Name,
          Email: ta.assignees.Email
        });
      }
    }
  }

  const groups = taskAssignees.filter(ta => ta.GroupId).map(ta => ({
    GroupId: Number(ta.groupmaster!.GroupId),
    GroupName: ta.groupmaster!.GroupName
  }));

  // Get subtasks
  const subtasksData = await prisma.tasks.findMany({
    where: {
      ParentTaskId: task.Id,
      IsDeleted: false
    },
    include: {
      taskstatus: true,
      taskpriority: true,
      tasks: { select: { Title: true } }
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

  // Get API actions for this task
  const apiActions = await actionService.getTaskApiActions(Number(task.Id));

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
    Points: task.Points ? Number(task.Points) : 0,
    assignees,
    groups,
    subtasks,
    status: task.taskstatus ? { Id: Number(task.taskstatus.Id), StatusName: task.taskstatus.StatusName } : { Id: 1, StatusName: 'To Do' },
    priority: task.taskpriority ? { Id: Number(task.taskpriority.Id), PriorityName: task.taskpriority.PriorityName } : undefined,
    recurrence: recurrence || undefined,
    apiActions: apiActions.length > 0 ? apiActions : undefined
  };
}

export async function getTaskStatusHistory(taskId: number): Promise<any[]> {
  const history = await prisma.taskstatushistory.findMany({
    where: {
      TaskId: taskId
    },
    include: {
      taskstatus_taskstatushistory_OldStatusIdTotaskstatus: true,
      taskstatus_taskstatushistory_NewStatusIdTotaskstatus: true,
      assignees: {
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
    OldStatusName: h.taskstatus_taskstatushistory_OldStatusIdTotaskstatus?.StatusName || null,
    NewStatusName: h.taskstatus_taskstatushistory_NewStatusIdTotaskstatus?.StatusName,
    Remark: h.Remark,
    ChangedBy: h.ChangedBy ? Number(h.ChangedBy) : null,
    ChangedByUser: h.assignees ? {
      Id: Number(h.assignees.Id),
      Name: h.assignees.Name,
      Email: h.assignees.Email
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
    const taskTypeStatuses = await prisma.tasktypestatuses.findMany({
      where: { TaskTypeId: data.taskTypeId },
      orderBy: { OrderIndex: 'asc' },
      include: { taskstatus: true }
    });

    if (taskTypeStatuses.length > 0) {
      // For sequential types, start with the first status (lowest OrderIndex)
      // For random types, also start with the first status for consistency
      data.statusId = Number(taskTypeStatuses[0].taskstatus.Id);
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
    Points: data.points || 0,
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

  const task = await prisma.tasks.create({
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

  // Create API actions if specified
  console.log('🔔 Checking for API actions:', { hasApiActions: !!data.apiActions, count: data.apiActions?.length || 0, apiActions: data.apiActions });
  if (data.apiActions && data.apiActions.length > 0) {
    console.log('✅ Creating API actions for task:', taskId, data.apiActions);
    await actionService.createTaskApiActionsFromInline(taskId, data.apiActions);
    console.log('✅ API actions created successfully');
  }

  const createdTask = await getTaskById(taskId);

  // Log task creation event
  await logTaskEvent({
    taskId,
    event: TASK_EVENTS.CREATED,
    userId: userId === null ? undefined : userId,
    timestamp: new Date(),
    metadata: { taskData: data }
  }, createdTask || undefined);

  // Trigger task-specific API actions for task_created event
  await actionService.triggerApiActionsForEvent(taskId, TaskActionEvent.TASK_CREATED, createdTask);

  // Trigger task-specific API actions based on initial task state
  if (data.assigneeIds && data.assigneeIds.length > 0 || data.groupIds && data.groupIds.length > 0) {
    await actionService.triggerApiActionsForEvent(taskId, TaskActionEvent.TASK_ASSIGNED, {
      ...createdTask,
      addedAssigneeIds: data.assigneeIds || [],
      addedGroupIds: data.groupIds || []
    });
  }

  if (createdTask && createdTask.StatusId === TASK_STATUS.IN_PROGRESS) {
    await actionService.triggerApiActionsForEvent(taskId, TaskActionEvent.TASK_STARTED, createdTask);
  } else if (createdTask && createdTask.StatusId === TASK_STATUS.COMPLETED) {
    await actionService.triggerApiActionsForEvent(taskId, TaskActionEvent.TASK_COMPLETED, createdTask);
  }

  if (data.priorityId) {
    await actionService.triggerApiActionsForEvent(taskId, TaskActionEvent.TASK_PRIORITY_CHANGED, createdTask);
  }

  if (data.dueDate) {
    await actionService.triggerApiActionsForEvent(taskId, TaskActionEvent.TASK_DUE_DATE_CHANGED, createdTask);
  }

  if (data.dueTime) {
    await actionService.triggerApiActionsForEvent(taskId, TaskActionEvent.TASK_DUE_TIME_CHANGED, createdTask);
  }

  if (data.startDate) {
    await actionService.triggerApiActionsForEvent(taskId, TaskActionEvent.TASK_START_DATE_CHANGED, createdTask);
  }

  if (data.startTime) {
    await actionService.triggerApiActionsForEvent(taskId, TaskActionEvent.TASK_START_TIME_CHANGED, createdTask);
  }

  if (data.recurrence) {
    await actionService.triggerApiActionsForEvent(taskId, TaskActionEvent.TASK_RECURRENCE_MODIFIED, createdTask);
  }

  // Trigger API actions for subtask_added event on parent task
  if (data.parentTaskId) {
    await actionService.triggerApiActionsForEvent(data.parentTaskId, TaskActionEvent.SUBTASK_ADDED, createdTask);
  }

  // Set default EndDate for intra-day recurrence if not set
  if (data.isRecurring && recurrenceId && data.recurrence?.recurrenceType === 'DAILY' && data.recurrence.dailyRule?.intraDayFrequencyType) {
    const existingRecurrence = await prisma.recurrencerules.findUnique({
      where: { Id: recurrenceId },
      include: { repeat_dailyrules: true }
    });
    if (existingRecurrence && !existingRecurrence.EndDate && existingRecurrence.repeat_dailyrules?.IntraDayFrequencyType) {
      // Set EndDate to the task's due date for intra-day recurrence
      await prisma.recurrencerules.update({
        where: { Id: recurrenceId },
        data: { EndDate: data.dueDate ? new Date(data.dueDate) : null }
      });
    }
  }

  // Schedule recurring task if applicable
  if (data.isRecurring && recurrenceId && createdTask) {
    await recurringTaskScheduler.scheduleTask(createdTask as any);
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
  // Update priority if provided
  if (data.priorityId !== undefined) {
    updateData.PriorityId = data.priorityId;
  }
  // Update points if provided
  if (data.points !== undefined) {
    updateData.Points = data.points;
  }
  updateData.UpdatedAt = new Date();
  // console.log('🔍 updateData to apply:', updateData); // debug logging removed

  await prisma.tasks.update({
    where: { Id: taskId },
    data: updateData
  });

  // Save status change history if status was changed
  // Save status change history if status was changed
  if (data.statusId !== undefined && data.statusId !== currentTask.StatusId) {
    await prisma.taskstatushistory.create({
      data: {
        TaskId: taskId,
        OldStatusId: currentTask.StatusId || null,
        NewStatusId: data.statusId,
        Remark: data.statusRemark,
        ChangedBy: userId,
        ChangedAt: new Date()
      }
    });
  }

  // Update assignees if provided
  let assignmentChanges: { added: { assigneeIds: number[], groupIds: number[] }, removed: { assigneeIds: number[], groupIds: number[] } } | null = null;
  if (data.assigneeIds || data.groupIds) {
    assignmentChanges = await assignTaskToUsers(taskId, {
      assigneeIds: data.assigneeIds,
      groupIds: data.groupIds
    });
  }

  // Update API actions if provided
  if (data.apiActions !== undefined) {
    // Delete existing API actions and create new ones
    await actionService.deleteAllTaskApiActions(taskId);
    if (data.apiActions.length > 0) {
      await actionService.createTaskApiActionsFromInline(taskId, data.apiActions);
    }
  }

  // Log update event
  await logTaskUpdateEvents(currentTask, data, userId, { recurrenceChanged });

  // Get updated task for triggering API actions
  const updatedTask = await getTaskById(taskId);

  // Trigger task-specific API actions for specific events
  if (data.priorityId !== undefined && data.priorityId !== currentTask.PriorityId) {
    await actionService.triggerApiActionsForEvent(taskId, TaskActionEvent.TASK_PRIORITY_CHANGED, updatedTask);
  }

  // Trigger task-specific API actions for due date change
  if (data.dueDate !== undefined && data.dueDate !== currentTask.DueDate) {
    await actionService.triggerApiActionsForEvent(taskId, TaskActionEvent.TASK_DUE_DATE_CHANGED, updatedTask);
  }

  // Trigger task-specific API actions for due time change
  if (data.dueTime !== undefined && data.dueTime !== currentTask.DueTime) {
    await actionService.triggerApiActionsForEvent(taskId, TaskActionEvent.TASK_DUE_TIME_CHANGED, updatedTask);
  }

  // Trigger task-specific API actions for start date change
  if (data.startDate !== undefined && data.startDate !== currentTask.StartDate) {
    await actionService.triggerApiActionsForEvent(taskId, TaskActionEvent.TASK_START_DATE_CHANGED, updatedTask);
  }

  // Trigger task-specific API actions for start time change
  if (data.startTime !== undefined && data.startTime !== currentTask.StartTime) {
    await actionService.triggerApiActionsForEvent(taskId, TaskActionEvent.TASK_START_TIME_CHANGED, updatedTask);
  }

  // Trigger task-specific API actions for assignee changes
  if (assignmentChanges) {
    // Trigger TASK_UNASSIGNED if any were removed
    if (assignmentChanges.removed.assigneeIds.length > 0 || assignmentChanges.removed.groupIds.length > 0) {
      await actionService.triggerApiActionsForEvent(taskId, TaskActionEvent.TASK_UNASSIGNED, {
        ...updatedTask,
        removedAssigneeIds: assignmentChanges.removed.assigneeIds,
        removedGroupIds: assignmentChanges.removed.groupIds
      });
    }


    // Trigger TASK_ASSIGNED if any were added
    if (assignmentChanges.added.assigneeIds.length > 0 || assignmentChanges.added.groupIds.length > 0) {
      await actionService.triggerApiActionsForEvent(taskId, TaskActionEvent.TASK_ASSIGNED, {
        ...updatedTask,
        addedAssigneeIds: assignmentChanges.added.assigneeIds,
        addedGroupIds: assignmentChanges.added.groupIds
      });
    }
  }

  // Trigger task-specific API actions for task_updated event
  await actionService.triggerApiActionsForEvent(taskId, TaskActionEvent.TASK_UPDATED, updatedTask);

  // Trigger specific event for status change
  if (data.statusId !== undefined && data.statusId !== currentTask.StatusId) {
    await actionService.triggerApiActionsForEvent(taskId, TaskActionEvent.TASK_STATUS_CHANGED, updatedTask);

    // Trigger task-specific API actions for status events
    if (data.statusId === TASK_STATUS.IN_PROGRESS) {
      await actionService.triggerApiActionsForEvent(taskId, TaskActionEvent.TASK_STARTED, updatedTask);
    } else if (data.statusId === TASK_STATUS.COMPLETED) {
      await actionService.triggerApiActionsForEvent(taskId, TaskActionEvent.TASK_COMPLETED, updatedTask);
    } else if (currentTask.StatusId === TASK_STATUS.COMPLETED) {
      await actionService.triggerApiActionsForEvent(taskId, TaskActionEvent.TASK_REOPENED, updatedTask);
    }
  }

  // Handle recurrence rescheduling if needed
  if (recurrenceChanged || data.dueDate || data.dueTime) {
    if (currentTask.RecurrenceId || data.recurrence) {
      await recurringTaskScheduler.rescheduleTask(taskId);
    } else {
      recurringTaskScheduler.cancelTask(taskId);
    }

    // Trigger specific event for rescheduling
    await actionService.triggerApiActionsForEvent(taskId, TaskActionEvent.TASK_RESCHEDULED, updatedTask);
  }

  // Trigger specific event for recurrence modification
  if (recurrenceChanged) {
    await actionService.triggerApiActionsForEvent(taskId, TaskActionEvent.TASK_RECURRENCE_MODIFIED, updatedTask);
  }
}

async function validateStatusTransition(taskId: number, currentStatusId: number, newStatusId: number): Promise<void> {
  // Get task type information
  const task = await prisma.tasks.findUnique({
    where: { Id: taskId, IsDeleted: false },
    select: { TaskTypeId: true }
  });

  if (!task) {
    throw new Error(ERROR_MESSAGES.TASK_NOT_FOUND);
  }

  const taskTypeId = task.TaskTypeId;

  // If task has a type, validate that the new status is associated with this task type
  if (taskTypeId) {
    const statusAssociationCount = await prisma.tasktypestatuses.count({
      where: {
        TaskTypeId: taskTypeId,
        StatusId: newStatusId
      }
    });

    if (statusAssociationCount === 0) {
      // Get task type name for error message
      const taskType = await prisma.tasktype.findUnique({
        where: { Id: taskTypeId },
        select: { TypeName: true }
      });
      const typeName = taskType?.TypeName || 'Unknown';

      throw new Error(`Status ${newStatusId} is not allowed for task type "${typeName}". Only statuses associated with this task type can be used.`);
    }

    // Also validate against transition rules if they exist
    const transitionCount = await prisma.statustransitionrules.count({
      where: {
        TaskTypeId: taskTypeId,
        FromStatusId: currentStatusId,
        ToStatusId: newStatusId
      }
    });

    // If there are transition rules defined, enforce them
    const totalTransitions = await prisma.statustransitionrules.count({
      where: { TaskTypeId: taskTypeId }
    });

    if (totalTransitions > 0 && transitionCount === 0) {
      // Get task type name for error message
      const taskType = await prisma.tasktype.findUnique({
        where: { Id: taskTypeId },
        select: { TypeName: true }
      });
      const typeName = taskType?.TypeName || 'Unknown';

      throw new Error(`Status transition from ${currentStatusId} to ${newStatusId} is not allowed for task type "${typeName}"`);
    }
  }

  // Cannot mark parent task as completed if subtasks are incomplete
  if (newStatusId === TASK_STATUS.COMPLETED) {
    const incompleteSubtasks = await prisma.tasks.count({
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
}

async function logTaskUpdateEvents(
  currentTask: TaskResponse,
  updates: UpdateTaskDto,
  userId?: number,
  options?: { recurrenceChanged?: boolean; updatedTask?: TaskResponse | null }
): Promise<void> {
  const events: TaskEventData[] = [];
  let rescheduleTriggered = false;

  const statusChanged = updates.statusId !== undefined && updates.statusId !== currentTask.StatusId;
  const priorityChanged = updates.priorityId !== undefined && updates.priorityId !== currentTask.PriorityId;
  const dueDateChanged = updates.dueDate !== undefined && updates.dueDate !== currentTask.DueDate;
  const dueTimeChanged = updates.dueTime !== undefined && updates.dueTime !== currentTask.DueTime;
  const startDateChanged = updates.startDate !== undefined && updates.startDate !== currentTask.StartDate;
  const startTimeChanged = updates.startTime !== undefined && updates.startTime !== currentTask.StartTime;

  if (statusChanged && updates.statusId !== undefined) {
    events.push({
      taskId: currentTask.Id,
      event: TASK_EVENTS.STATUS_CHANGED,
      oldValue: currentTask.StatusId,
      newValue: updates.statusId,
      userId,
      timestamp: new Date()
    });

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
    } else if (currentTask.StatusId === TASK_STATUS.COMPLETED) {
      events.push({
        taskId: currentTask.Id,
        event: TASK_EVENTS.REOPENED,
        userId,
        timestamp: new Date()
      });
    }
  }

  if (priorityChanged && updates.priorityId !== undefined) {
    events.push({
      taskId: currentTask.Id,
      event: TASK_EVENTS.PRIORITY_CHANGED,
      oldValue: currentTask.PriorityId,
      newValue: updates.priorityId,
      userId,
      timestamp: new Date()
    });
  }

  if (dueDateChanged) {
    rescheduleTriggered = true;
    events.push({
      taskId: currentTask.Id,
      event: TASK_EVENTS.DUE_DATE_CHANGED,
      oldValue: currentTask.DueDate,
      newValue: updates.dueDate,
      userId,
      timestamp: new Date()
    });
  }

  if (dueTimeChanged) {
    rescheduleTriggered = true;
    events.push({
      taskId: currentTask.Id,
      event: TASK_EVENTS.DUE_TIME_CHANGED,
      oldValue: currentTask.DueTime,
      newValue: updates.dueTime,
      userId,
      timestamp: new Date()
    });
  }

  if (startDateChanged) {
    events.push({
      taskId: currentTask.Id,
      event: TASK_EVENTS.START_DATE_CHANGED,
      oldValue: currentTask.StartDate,
      newValue: updates.startDate,
      userId,
      timestamp: new Date()
    });
  }

  if (startTimeChanged) {
    events.push({
      taskId: currentTask.Id,
      event: TASK_EVENTS.START_TIME_CHANGED,
      oldValue: currentTask.StartTime,
      newValue: updates.startTime,
      userId,
      timestamp: new Date()
    });
  }

  if (options?.recurrenceChanged) {
    rescheduleTriggered = true;
    events.push({
      taskId: currentTask.Id,
      event: TASK_EVENTS.RECURRENCE_MODIFIED,
      userId,
      timestamp: new Date()
    });
  }

  if (rescheduleTriggered) {
    const newDueDateValue = updates.dueDate !== undefined
      ? updates.dueDate
      : options?.updatedTask?.DueDate ?? currentTask.DueDate ?? null;
    const newDueTimeValue = updates.dueTime !== undefined
      ? updates.dueTime
      : options?.updatedTask?.DueTime ?? currentTask.DueTime ?? null;

    events.push({
      taskId: currentTask.Id,
      event: TASK_EVENTS.RESCHEDULED,
      userId,
      timestamp: new Date(),
      metadata: {
        recurrenceChanged: !!options?.recurrenceChanged,
        dueDate: {
          old: currentTask.DueDate ?? null,
          new: newDueDateValue
        },
        dueTime: {
          old: currentTask.DueTime ?? null,
          new: newDueTimeValue
        }
      }
    });
  }

  if (!events.length) {
    return;
  }

  const snapshot = options?.updatedTask ?? (await getTaskById(currentTask.Id));

  for (const event of events) {
    await logTaskEvent(event, snapshot || currentTask);
  }
}

export async function deleteTask(taskId: number, userId?: number): Promise<boolean> {
  const task = await getTaskById(taskId);
  if (!task) {
    return false;
  }

  // Trigger API actions for task_deleted event before deletion
  await actionService.triggerApiActionsForEvent(taskId, TaskActionEvent.TASK_DELETED, task);

  // Trigger API actions for subtask_removed event on parent task
  if (task.ParentTaskId) {
    await actionService.triggerApiActionsForEvent(Number(task.ParentTaskId), TaskActionEvent.SUBTASK_REMOVED, task);
  }

  // Soft delete - update IsDeleted flag
  const result = await prisma.tasks.updateMany({
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
    }, task);

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

  const changes = await assignTaskToUsers(taskId, assignData);

  const updatedTask = await getTaskById(taskId);

  // Log assignment event
  await logTaskEvent({
    taskId,
    event: TASK_EVENTS.ASSIGNED,
    userId,
    timestamp: new Date(),
    metadata: {
      assigneeIds: assignData.assigneeIds,
      groupIds: assignData.groupIds,
      added: changes.added,
      removed: changes.removed
    }
  }, updatedTask || task);

  // Trigger task-specific API actions for task_unassigned event (if any were removed)
  if (changes.removed.assigneeIds.length > 0 || changes.removed.groupIds.length > 0) {
    await actionService.triggerApiActionsForEvent(taskId, TaskActionEvent.TASK_UNASSIGNED, {
      ...updatedTask,
      removedAssigneeIds: changes.removed.assigneeIds,
      removedGroupIds: changes.removed.groupIds
    });
  }

  // Trigger task-specific API actions for task_assigned event (if any were added)
  if (changes.added.assigneeIds.length > 0 || changes.added.groupIds.length > 0) {
    await actionService.triggerApiActionsForEvent(taskId, TaskActionEvent.TASK_ASSIGNED, {
      ...updatedTask,
      addedAssigneeIds: changes.added.assigneeIds,
      addedGroupIds: changes.added.groupIds
    });
  }
}

async function assignTaskToUsers(taskId: number, assignData: AssignTaskDto): Promise<{ added: { assigneeIds: number[], groupIds: number[] }, removed: { assigneeIds: number[], groupIds: number[] } }> {
  // Get existing assignments first
  const existingAssignments = await prisma.taskassignees.findMany({
    where: { TaskId: taskId }
  });

  const existingAssigneeIds = existingAssignments
    .filter(a => a.AssigneeId)
    .map(a => Number(a.AssigneeId));
  const existingGroupIds = existingAssignments
    .filter(a => a.GroupId)
    .map(a => Number(a.GroupId));

  const newAssigneeIds = assignData.assigneeIds || [];
  const newGroupIds = assignData.groupIds || [];

  // Calculate what's being added and removed
  const addedAssigneeIds = newAssigneeIds.filter(id => !existingAssigneeIds.includes(id));
  const removedAssigneeIds = existingAssigneeIds.filter(id => !newAssigneeIds.includes(id));
  const addedGroupIds = newGroupIds.filter(id => !existingGroupIds.includes(id));
  const removedGroupIds = existingGroupIds.filter(id => !newGroupIds.includes(id));

  // Remove existing assignments
  await prisma.taskassignees.deleteMany({
    where: { TaskId: taskId }
  });

  // Add new user assignments
  if (newAssigneeIds.length > 0) {
    for (const assigneeId of newAssigneeIds) {
      await prisma.taskassignees.create({
        data: {
          TaskId: taskId,
          AssigneeId: assigneeId
        }
      });
    }
  }

  // Add new group assignments
  if (newGroupIds.length > 0) {
    for (const groupId of newGroupIds) {
      await prisma.taskassignees.create({
        data: {
          TaskId: taskId,
          GroupId: groupId
        }
      });
    }
  }

  return {
    added: { assigneeIds: addedAssigneeIds, groupIds: addedGroupIds },
    removed: { assigneeIds: removedAssigneeIds, groupIds: removedGroupIds }
  };
}

export async function unassignTask(taskId: number, assigneeId?: number, groupId?: number, userId?: number): Promise<void> {
  const where: any = { TaskId: taskId };

  if (assigneeId) {
    where.AssigneeId = assigneeId;
  }

  if (groupId) {
    where.GroupId = groupId;
  }

  const result = await prisma.taskassignees.deleteMany({
    where
  });

  if (result.count > 0) {
    const updatedTask = await getTaskById(taskId);
    await logTaskEvent({
      taskId,
      event: TASK_EVENTS.UNASSIGNED,
      userId,
      timestamp: new Date(),
      metadata: { assigneeId, groupId }
    }, updatedTask || undefined);

    // Trigger API actions for task_unassigned event
    await actionService.triggerApiActionsForEvent(taskId, TaskActionEvent.TASK_UNASSIGNED, updatedTask);
  }
}

// ============================================================================
// TASK ESCALATION OPERATIONS
// ============================================================================

export async function escalateTask(taskId: number, userId?: number, notes?: string, assignData?: { assigneeIds?: number[], groupIds?: number[] }): Promise<void> {
  const task = await getTaskById(taskId);
  if (!task) {
    throw new Error(ERROR_MESSAGES.TASK_NOT_FOUND);
  }

  if (task.EscalationLevel >= VALIDATION_RULES.MAX_ESCALATION_LEVEL) {
    throw new Error(ERROR_MESSAGES.MAX_ESCALATION_REACHED);
  }

  const newLevel = task.EscalationLevel + 1;

  // Update task escalation
  await prisma.tasks.update({
    where: { Id: taskId },
    data: {
      IsEscalated: true,
      EscalationLevel: newLevel,
      EscalatedAt: new Date(),
      EscalatedBy: userId
    }
  });

  // Assign to new assignees if provided
  if (assignData && (assignData.assigneeIds?.length || assignData.groupIds?.length)) {
    await assignTaskToUsers(taskId, assignData);
  }

  // Log escalation history
  await prisma.escalationhistory.create({
    data: {
      TaskId: taskId,
      PreviousLevel: task.EscalationLevel,
      NewLevel: newLevel,
      TriggeredBy: userId,
      ActionTaken: 'Manual escalation',
      Notes: notes
    }
  });

  const escalatedTask = await getTaskById(taskId);

  // Log escalation event
  await logTaskEvent({
    taskId,
    event: TASK_EVENTS.ESCALATED,
    userId,
    timestamp: new Date(),
    metadata: { previousLevel: task.EscalationLevel, newLevel, notes, assignedTo: assignData }
  }, escalatedTask || undefined);

  // Trigger API actions for task_escalated event
  await actionService.triggerApiActionsForEvent(taskId, TaskActionEvent.TASK_ESCALATED, escalatedTask);
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

  const rules = await prisma.escalationrules.findMany({
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
  await prisma.tasks.update({
    where: { Id: taskId },
    data: {
      IsEscalated: true,
      EscalationLevel: { increment: 1 },
      EscalatedAt: new Date()
    }
  });

  // Log escalation
  await prisma.escalationhistory.create({
    data: {
      TaskId: taskId,
      NewLevel: rule.MaxEscalationLevel,
      ActionTaken: rule.ActionType,
      ActionTarget: rule.ActionValue
    }
  });

  const escalatedTask = await getTaskById(taskId);

  // Log event
  await logTaskEvent({
    taskId,
    event: TASK_EVENTS.ESCALATED,
    timestamp: new Date(),
    metadata: { ruleId: rule.Id, automatic: true }
  }, escalatedTask || undefined);
}

// ============================================================================
// TASK TYPE STATUS OPERATIONS
// ============================================================================

export async function getOverdueTasks(): Promise<TaskResponse[]> {
  const settings = await getSchedulerSettings();
  const DUE_TIME_INTERVAL_VALUE = settings.dueTimeInterval.value;
  const DUE_TIME_INTERVAL_UNIT = settings.dueTimeInterval.unit;

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
    // Check if overdue action already triggered
    const alreadyTriggered = await actionService.hasEventBeenTriggered(task.Id, TaskActionEvent.TASK_OVERDUE);

    if (!alreadyTriggered) {
      await logTaskEvent({
        taskId: task.Id,
        event: TASK_EVENTS.OVERDUE,
        timestamp: new Date()
      }, task);

      // Trigger task-specific API actions for task_overdue event
      await actionService.triggerApiActionsForEvent(task.Id, TaskActionEvent.TASK_OVERDUE, task);
    }
  }

  console.log(`📋 getOverdueTasks: Found ${tasks.length} task(s) overdue or due within ${DUE_TIME_INTERVAL_VALUE} ${DUE_TIME_INTERVAL_UNIT}(s)`);

  return tasks;
}

export async function getDueTasks(): Promise<TaskResponse[]> {
  const settings = await getSchedulerSettings();
  const windowValue = settings.dueTasksWindow.value;
  const windowUnit = settings.dueTasksWindow.unit;
  const bufferValue = settings.dueTasksBuffer.value;
  const bufferUnit = settings.dueTasksBuffer.unit;

  const query = `
    SELECT * FROM Tasks 
    WHERE IsDeleted = FALSE 
    AND StatusId != ? 
    AND TIMESTAMP(DueDate, DueTime) BETWEEN 
        DATE_SUB(UTC_TIMESTAMP(), INTERVAL ? ${bufferUnit}) 
        AND DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? ${windowUnit})
  `;

  const rows = await prisma.$queryRawUnsafe(query, TASK_STATUS.COMPLETED, bufferValue, windowValue) as any[];

  const tasks = await Promise.all(rows.map(async (task: any) => {
    return await enhanceTaskWithDetails(task);
  }));

  console.log(`📋 getDueTasks: Found ${tasks.length} task(s) due within ${windowValue} ${windowUnit}(s) (with ${bufferValue} ${bufferUnit} buffer)`);

  return tasks;
}

/**
 * Get tasks that are about to start (based on StartDate/StartTime)
 * Used to trigger task_started API actions
 */
export async function getStartingTasks(): Promise<TaskResponse[]> {
  const settings = await getSchedulerSettings();
  const windowValue = settings.dueTasksWindow.value;
  const windowUnit = settings.dueTasksWindow.unit;
  const bufferValue = settings.dueTasksBuffer.value;
  const bufferUnit = settings.dueTasksBuffer.unit;

  const query = `
    SELECT * FROM Tasks 
    WHERE IsDeleted = FALSE 
    AND StatusId NOT IN (?, ?) 
    AND StartDate IS NOT NULL 
    AND StartTime IS NOT NULL
    AND TIMESTAMP(StartDate, StartTime) BETWEEN 
        DATE_SUB(UTC_TIMESTAMP(), INTERVAL ? ${bufferUnit}) 
        AND DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? ${windowUnit})
  `;

  const rows = await prisma.$queryRawUnsafe(query, TASK_STATUS.COMPLETED, TASK_STATUS.CANCELLED, bufferValue, windowValue) as any[];

  const tasks = await Promise.all(rows.map(async (task: any) => {
    return await enhanceTaskWithDetails(task);
  }));

  // Trigger API actions for task_started event
  for (const task of tasks) {
    // Check if started action already triggered
    // Note: We use TASK_STARTED here which usually implies status change to In Progress,
    // but in this context it means "Scheduled Start Time Reached".
    const alreadyTriggered = await actionService.hasEventBeenTriggered(task.Id, TaskActionEvent.TASK_STARTED);

    if (!alreadyTriggered) {
      // We log a custom event or reuse STARTED
      await logTaskEvent({
        taskId: task.Id,
        event: TASK_EVENTS.STARTED,
        timestamp: new Date(),
        metadata: { reason: 'scheduled_start_time_reached' }
      }, task);

      // Trigger API actions for task_started event
      // await actionService.triggerApiActionsForEvent(task.Id, TaskActionEvent.TASK_STARTED, task);
    }
  }

  console.log(`📋 getStartingTasks: Found ${tasks.length} task(s) starting within ${windowValue} ${windowUnit}(s) (with ${bufferValue} ${bufferUnit} buffer)`);

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

async function logTaskEvent(eventData: TaskEventData, taskSnapshot?: TaskResponse | null): Promise<void> {
  console.log('Task Event:', eventData);

  try {
    const snapshot = taskSnapshot ?? (await getTaskById(eventData.taskId));
    await publishTaskEvent(eventData, eventData.event);
  } catch (error) {
    console.error('Failed to dispatch task event:', error);
  }
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


