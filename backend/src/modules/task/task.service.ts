import pool from "../../lib/connection";
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
import { RowDataPacket, ResultSetHeader } from 'mysql2';

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

  return {
    isValid: errors.length === 0,
    errors
  };
}

async function checkTaskExists(taskId: number): Promise<boolean> {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT COUNT(*) as count FROM Tasks WHERE Id = ? AND IsDeleted = FALSE',
    [taskId]
  );
  return rows[0].count > 0;
}

async function checkStatusExists(statusId: number): Promise<boolean> {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT COUNT(*) as count FROM TaskStatus WHERE Id = ?',
    [statusId]
  );
  return rows[0].count > 0;
}

async function checkPriorityExists(priorityId: number): Promise<boolean> {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT COUNT(*) as count FROM TaskPriority WHERE Id = ?',
    [priorityId]
  );
  return rows[0].count > 0;
}

async function checkCircularDependency(taskId: number, parentTaskId: number): Promise<boolean> {
  const [rows] = await pool.query<RowDataPacket[]>(
    'WITH RECURSIVE TaskHierarchy AS (SELECT Id, ParentTaskId FROM Tasks WHERE Id = ? UNION ALL SELECT t.Id, t.ParentTaskId FROM Tasks t INNER JOIN TaskHierarchy th ON t.ParentTaskId = th.Id) SELECT COUNT(*) as count FROM TaskHierarchy WHERE Id = ?',
    [parentTaskId, taskId]
  );
  return rows[0].count > 0;
}

// ============================================================================
// CORE TASK OPERATIONS
// ============================================================================

export async function getTasks(page: number = 1, limit: number = 50): Promise<{ tasks: TaskResponse[], total: number }> {
  const query = `${SQL_QUERIES.GET_TASKS_WITH_DETAILS} ORDER BY t.CreatedAt DESC LIMIT ? OFFSET ?`;
  const params: any[] = [limit, (page - 1) * limit];

  // Get total count
  const countQuery = `SELECT COUNT(*) as total FROM Tasks t WHERE t.IsDeleted = FALSE`;
  const [countResult] = await pool.query<RowDataPacket[]>(countQuery);
  const total = countResult[0].total;
  
  const [rows] = await pool.query<RowDataPacket[]>(query, params);

  // Enhance tasks with assignees and subtasks
  const tasks = await Promise.all(rows.map(async (task) => {
    const enhancedTask = await enhanceTaskWithDetails(task as any);
    return enhancedTask;
  }));

  return { tasks, total };
}

export async function getTasksWithFilters(filters: TaskFilters, page: number = 1, limit: number = 50): Promise<{ tasks: TaskResponse[], total: number }> {
  let query = SQL_QUERIES.GET_TASKS_WITH_DETAILS;
  const params: any[] = [];
  const conditions: string[] = [];

  // Apply filters
  if (filters.status && filters.status.length > 0) {
    conditions.push(`t.StatusId IN (${filters.status.map(() => '?').join(', ')})`);
    params.push(...filters.status);
  }

  if (filters.priority && filters.priority.length > 0) {
    conditions.push(`t.PriorityId IN (${filters.priority.map(() => '?').join(', ')})`);
    params.push(...filters.priority);
  }

  if (filters.assigneeId) {
    conditions.push(`EXISTS (SELECT 1 FROM TaskAssignees ta WHERE ta.TaskId = t.Id AND ta.AssigneeId = ?)`);
    params.push(filters.assigneeId);
  }

  if (filters.groupId) {
    conditions.push(`EXISTS (SELECT 1 FROM TaskAssignees ta WHERE ta.TaskId = t.Id AND ta.GroupId = ?)`);
    params.push(filters.groupId);
  }

  if (filters.overdue) {
    conditions.push(`((t.DueDate < CURDATE()) OR (t.DueDate = CURDATE() AND t.DueTime < CURTIME()))`);
  }

  if (filters.completed !== undefined) {
    if (filters.completed) {
      conditions.push(`t.StatusId = ?`);
      params.push(TASK_STATUS.COMPLETED);
    } else {
      conditions.push(`t.StatusId != ?`);
      params.push(TASK_STATUS.COMPLETED);
    }
  }

  if (filters.parentTaskId !== undefined) {
    if (filters.parentTaskId === null) {
      conditions.push(`t.ParentTaskId IS NULL`);
    } else {
      conditions.push(`t.ParentTaskId = ?`);
      params.push(filters.parentTaskId);
    }
  }

  if (filters.isSubTask !== undefined) {
    if (filters.isSubTask) {
      conditions.push(`t.ParentTaskId IS NOT NULL`);
    } else {
      conditions.push(`t.ParentTaskId IS NULL`);
    }
  }

  if (conditions.length > 0) {
    query += ` AND ${conditions.join(' AND ')}`;
  }

  // Get total count
  const countQuery = `SELECT COUNT(*) as total FROM Tasks t WHERE t.IsDeleted = FALSE ${conditions.length > 0 ? ' AND ' + conditions.join(' AND ') : ''}`;
  const [countResult] = await pool.query<RowDataPacket[]>(countQuery, params);
  const total = countResult[0].total;
  
  // Add pagination
  query += ` ORDER BY t.CreatedAt DESC LIMIT ? OFFSET ?`;
  params.push(limit, (page - 1) * limit);

  const [rows] = await pool.query<RowDataPacket[]>(query, params);

  // Enhance tasks with assignees and subtasks
  const tasks = await Promise.all(rows.map(async (task) => {
    const enhancedTask = await enhanceTaskWithDetails(task as any);
    return enhancedTask;
  }));

  return { tasks, total };
}

export async function getTaskById(taskId: number): Promise<TaskResponse | null> {
  const query = `${SQL_QUERIES.GET_TASKS_WITH_DETAILS} AND t.Id = ?`;
  const [rows] = await pool.query<RowDataPacket[]>(query, [taskId]);
  
  if (rows.length === 0) {
    return null;
  }

  return await enhanceTaskWithDetails(rows[0] as any);
}

async function enhanceTaskWithDetails(task: any): Promise<TaskResponse> {
  // Get assignees
  const [assigneeRows] = await pool.query<RowDataPacket[]>(SQL_QUERIES.GET_TASK_ASSIGNEES, [task.Id]);
  
  const assignees = assigneeRows.filter(row => row.AssigneeId).map(row => ({
    Id: row.AssigneeId,
    Name: row.AssigneeName,
    Email: row.AssigneeEmail
  }));

  const groups = assigneeRows.filter(row => row.GroupId).map(row => ({
    GroupId: row.GroupId,
    GroupName: row.GroupName
  }));

  // Get subtasks
  const [subtaskRows] = await pool.query<RowDataPacket[]>(
    `${SQL_QUERIES.GET_TASKS_WITH_DETAILS} AND t.ParentTaskId = ?`,
    [task.Id]
  );

  const subtasks = await Promise.all(subtaskRows.map(async (subtask) => {
    return await enhanceTaskWithDetails(subtask as any);
  }));

  return {
    ...task,
    assignees,
    groups,
    subtasks,
    status: task.StatusName ? { Id: task.StatusId, StatusName: task.StatusName } : undefined,
    priority: task.PriorityName ? { Id: task.PriorityId, PriorityName: task.PriorityName } : undefined,
    recurrence: task.RecurrenceFrequency ? {
      Id: task.RecurrenceId,
      Frequency: task.RecurrenceFrequency,
      RecurrenceInterval: task.RecurrenceInterval,
      EndDate: task.RecurrenceEndDate
    } : undefined
  };
}

export async function createTask(data: CreateTaskDto, userId?: number): Promise<number> {
  // Validate input data
  const validation = await validateTaskData(data);
  if (!validation.isValid) {
    throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
  }

  // Convert due date to UTC
  if (data.dueDate) {
    const time = data.dueTime || '00:00';
    const dateTimeStr = `${data.dueDate}T${time}:00+05:30`;
    const dateObj = new Date(dateTimeStr);
    
    // Store date and time components separately in UTC
    const utcISOString = dateObj.toISOString();
    data.dueDate = utcISOString.split('T')[0]; // YYYY-MM-DD in UTC
    data.dueTime = utcISOString.split('T')[1].split('.')[0]; // HH:MM:SS in UTC
    
    console.log(`📅 Task creation: Input ${data.dueDate}T${time} IST -> Stored as ${data.dueDate} ${data.dueTime} UTC`);
  }

  // Check for circular dependency if parent task is specified
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

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Insert task
    const taskFields = [];
    const taskValues = [];
    const taskPlaceholders = [];

    for (const [key, value] of Object.entries(data)) {
      if (EDITABLE_TASK_FIELDS.includes(key) && value !== undefined) {
        taskFields.push(key);
        taskValues.push(value);
        taskPlaceholders.push('?');
      }
    }

    const taskSql = `INSERT INTO Tasks (${taskFields.join(', ')}) VALUES (${taskPlaceholders.join(', ')})`;
    const [taskResult] = await connection.execute<ResultSetHeader>(taskSql, taskValues);
    const taskId = taskResult.insertId;

    // Assign task to users/groups if specified
    if (data.assigneeIds || data.groupIds) {
      await assignTaskToUsers(connection, taskId, {
        assigneeIds: data.assigneeIds,
        groupIds: data.groupIds
      });
    }

    await connection.commit();

    // Log task creation event
    await logTaskEvent({
      taskId,
      event: TASK_EVENTS.CREATED,
      userId,
      timestamp: new Date(),
      metadata: { taskData: data }
    });

    return taskId;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
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

  // Validate status transitions
  if (data.statusId && data.statusId !== currentTask.StatusId) {
    await validateStatusTransition(taskId, currentTask.StatusId!, data.statusId);
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const updateFields = [];
    const updateValues = [];

    for (const [key, value] of Object.entries(data)) {
      if (EDITABLE_TASK_FIELDS.includes(key) && value !== undefined) {
        updateFields.push(`${key} = ?`);
        updateValues.push(value);
      }
    }

    if (updateFields.length > 0) {
      updateFields.push('UpdatedAt = NOW()');
      const updateSql = `UPDATE Tasks SET ${updateFields.join(', ')} WHERE Id = ? AND IsDeleted = FALSE`;
      updateValues.push(taskId);

      await connection.execute(updateSql, updateValues);

      // Log specific change events
      await logTaskUpdateEvents(currentTask, data, userId);
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function validateStatusTransition(taskId: number, currentStatusId: number, newStatusId: number): Promise<void> {
  // Cannot mark parent task as completed if subtasks are incomplete
  if (newStatusId === TASK_STATUS.COMPLETED) {
    const [subtasks] = await pool.query<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM Tasks WHERE ParentTaskId = ? AND StatusId != ? AND IsDeleted = FALSE',
      [taskId, TASK_STATUS.COMPLETED]
    );
    
    if (subtasks[0].count > 0) {
      throw new Error(ERROR_MESSAGES.PARENT_INCOMPLETE_SUBTASKS);
    }
  }
}

async function logTaskUpdateEvents(currentTask: any, updates: UpdateTaskDto, userId?: number): Promise<void> {
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

  // Log all events
  for (const event of events) {
    await logTaskEvent(event);
  }
}

export async function deleteTask(taskId: number, userId?: number): Promise<boolean> {
  const task = await getTaskById(taskId);
  if (!task) {
    return false;
  }

  // Soft delete - update IsDeleted flag
  const [result] = await pool.query<ResultSetHeader>(
    'UPDATE Tasks SET IsDeleted = TRUE, DeletedAt = NOW() WHERE Id = ?',
    [taskId]
  );

  if (result.affectedRows > 0) {
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

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    await assignTaskToUsers(connection, taskId, assignData);
    
    await connection.commit();

    // Log assignment event
    await logTaskEvent({
      taskId,
      event: TASK_EVENTS.ASSIGNED,
      userId,
      timestamp: new Date(),
      metadata: { assigneeIds: assignData.assigneeIds, groupIds: assignData.groupIds }
    });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function assignTaskToUsers(connection: any, taskId: number, assignData: AssignTaskDto): Promise<void> {
  // Remove existing assignments
  await connection.execute('DELETE FROM TaskAssignees WHERE TaskId = ?', [taskId]);

  // Add new user assignments
  if (assignData.assigneeIds && assignData.assigneeIds.length > 0) {
    for (const assigneeId of assignData.assigneeIds) {
      await connection.execute(
        'INSERT INTO TaskAssignees (TaskId, AssigneeId, GroupId) VALUES (?, ?, NULL)',
        [taskId, assigneeId]
      );
    }
  }

  // Add new group assignments
  if (assignData.groupIds && assignData.groupIds.length > 0) {
    for (const groupId of assignData.groupIds) {
      await connection.execute(
        'INSERT INTO TaskAssignees (TaskId, AssigneeId, GroupId) VALUES (?, NULL, ?)',
        [taskId, groupId]
      );
    }
  }
}

export async function unassignTask(taskId: number, assigneeId?: number, groupId?: number, userId?: number): Promise<void> {
  const conditions = ['TaskId = ?'];
  const params = [taskId];

  if (assigneeId) {
    conditions.push('AssigneeId = ?');
    params.push(assigneeId);
  }

  if (groupId) {
    conditions.push('GroupId = ?');
    params.push(groupId);
  }

  const [result] = await pool.query<ResultSetHeader>(
    `DELETE FROM TaskAssignees WHERE ${conditions.join(' AND ')}`,
    params
  );

  if (result.affectedRows > 0) {
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

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Update task escalation
    await connection.execute(
      'UPDATE Tasks SET IsEscalated = TRUE, EscalationLevel = ?, EscalatedAt = NOW(), EscalatedBy = ? WHERE Id = ?',
      [newLevel, userId, taskId]
    );

    // Log escalation history
    await connection.execute(
      'INSERT INTO EscalationHistory (TaskId, PreviousLevel, NewLevel, TriggeredBy, ActionTaken, Notes) VALUES (?, ?, ?, ?, ?, ?)',
      [taskId, task.EscalationLevel, newLevel, userId, 'Manual escalation', notes]
    );

    await connection.commit();

    // Log escalation event
    await logTaskEvent({
      taskId,
      event: TASK_EVENTS.ESCALATED,
      userId,
      timestamp: new Date(),
      metadata: { previousLevel: task.EscalationLevel, newLevel, notes }
    });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function checkAndProcessEscalations(): Promise<void> {
  const [candidates] = await pool.query<RowDataPacket[]>(SQL_QUERIES.GET_ESCALATION_CANDIDATES);

  for (const task of candidates) {
    // Check escalation rules
    const [rules] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM EscalationRules WHERE IsActive = TRUE'
    );

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
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Update task
    await connection.execute(
      'UPDATE Tasks SET IsEscalated = TRUE, EscalationLevel = EscalationLevel + 1, EscalatedAt = NOW() WHERE Id = ?',
      [taskId]
    );

    // Log escalation
    await connection.execute(
      'INSERT INTO EscalationHistory (TaskId, NewLevel, ActionTaken, ActionTarget) VALUES (?, ?, ?, ?)',
      [taskId, rule.MaxEscalationLevel, rule.ActionType, rule.ActionValue]
    );

    await connection.commit();

    // Log event
    await logTaskEvent({
      taskId,
      event: TASK_EVENTS.ESCALATED,
      timestamp: new Date(),
      metadata: { ruleId: rule.Id, automatic: true }
    });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export async function getOverdueTasks(): Promise<TaskResponse[]> {
  const { DUE_TIME_INTERVAL_VALUE, DUE_TIME_INTERVAL_UNIT } = await import('./task.constants');
  
  // Get tasks that are overdue or due within the configured interval
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT * FROM Tasks 
     WHERE IsDeleted = FALSE 
     AND StatusId != ? 
     AND CONCAT(DueDate, ' ', DueTime) <= DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? ${DUE_TIME_INTERVAL_UNIT})`,
    [TASK_STATUS.COMPLETED, DUE_TIME_INTERVAL_VALUE]
  );
  
  const tasks = await Promise.all(rows.map(async (task) => {
    return await enhanceTaskWithDetails(task as any);
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
  
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT * FROM Tasks 
     WHERE IsDeleted = FALSE 
     AND StatusId != ? 
     AND CONCAT(DueDate, ' ', DueTime) BETWEEN 
         DATE_SUB(UTC_TIMESTAMP(), INTERVAL ? ${bufferUnit}) 
         AND DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? ${windowUnit})`,
    [TASK_STATUS.COMPLETED, bufferValue, windowValue]
  );
  
  const tasks = await Promise.all(rows.map(async (task) => {
    return await enhanceTaskWithDetails(task as any);
  }));

  console.log(`📋 getDueTasks: Found ${tasks.length} task(s) due within ${windowValue} ${windowUnit}(s) (with ${bufferValue} ${bufferUnit} buffer)`);

  return tasks;
}

export async function getTaskStats(): Promise<TaskStats> {
  const [totalRows] = await pool.query<RowDataPacket[]>(
    'SELECT COUNT(*) as total FROM Tasks WHERE IsDeleted = FALSE'
  );

  const [statusRows] = await pool.query<RowDataPacket[]>(
    'SELECT ts.StatusName, COUNT(*) as count FROM Tasks t JOIN TaskStatus ts ON t.StatusId = ts.Id WHERE t.IsDeleted = FALSE GROUP BY t.StatusId, ts.StatusName'
  );

  const [priorityRows] = await pool.query<RowDataPacket[]>(
    'SELECT tp.PriorityName, COUNT(*) as count FROM Tasks t JOIN TaskPriority tp ON t.PriorityId = tp.Id WHERE t.IsDeleted = FALSE GROUP BY t.PriorityId, tp.PriorityName'
  );

  const [overdueRows] = await pool.query<RowDataPacket[]>(SQL_QUERIES.GET_OVERDUE_TASKS, [TASK_STATUS.COMPLETED]);

  const [escalatedRows] = await pool.query<RowDataPacket[]>(
    'SELECT COUNT(*) as count FROM Tasks WHERE IsDeleted = FALSE AND IsEscalated = TRUE'
  );

  const byStatus: { [key: string]: number } = {};
  statusRows.forEach(row => {
    byStatus[row.StatusName] = row.count;
  });

  const byPriority: { [key: string]: number } = {};
  priorityRows.forEach(row => {
    byPriority[row.PriorityName] = row.count;
  });

  return {
    total: totalRows[0].total,
    completed: byStatus['Completed'] || 0,
    inProgress: byStatus['In Progress'] || 0,
    overdue: overdueRows.length,
    escalated: escalatedRows[0].count,
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

// CSV Import (legacy support)
export async function saveCSVData(csvData: CSVRow[]): Promise<void> {
  for (const row of csvData) {
    const taskData: CreateTaskDto = {
      title: row.title || row.name || 'Untitled Task',
      description: row.description,
      dueDate: row.dueDate || row.due_date,
      dueTime: row.dueTime || row.due_time,
      statusId: parseInt(row.statusId || row.status_id) || TASK_STATUS.TODO,
      priorityId: parseInt(row.priorityId || row.priority_id) || TASK_PRIORITY.MEDIUM
    };

    if (taskData.title) {
      await createTask(taskData);
    }
  }
}
