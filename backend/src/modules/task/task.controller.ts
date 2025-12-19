import { Request, Response, NextFunction } from "express";
import * as taskService from "./task.service";
import * as recurrenceService from "./recurrence.service";
import { CSVRow, CreateTaskDto, UpdateTaskDto, TaskFilters, AssignTaskDto, CreateRecurrenceDto } from "./task.types";
import { Readable } from "stream";
import csv from 'csv-parser';
import * as taskTypeService from "./task-type.service";
import * as taskInit from "./task.init";
import { getSchedulerSettings, updateSchedulerSettings, SCHEDULER_CONFIG_DESCRIPTIONS } from "./scheduler-config.service";

// Helper function to convert BigInt to number and Date objects to strings in response data
function serializeBigInt(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'bigint') return Number(obj);
  if (obj instanceof Date) {
    // For Date objects, check if valid
    if (isNaN(obj.getTime())) {
      return null; // Invalid date
    }
    // Format based on field name context - this is a heuristic
    // For DATE fields (year-based), return YYYY-MM-DD
    // For TIME fields (time-based), return HH:MM:SS
    // For other dates, return ISO string
    const iso = obj.toISOString();
    if (obj.getFullYear() > 1970 && obj.getFullYear() < 3000) {
      // Likely a DATE field
      return iso.split('T')[0];
    } else if (obj.getFullYear() === 1970) {
      // Likely a TIME field (Prisma returns 1970-01-01 for TIME columns)
      return iso.split('T')[1].split('.')[0];
    } else {
      // Other dates
      return iso;
    }
  }
  if (Array.isArray(obj)) return obj.map(serializeBigInt);
  if (typeof obj === 'object') {
    const result: any = {};
    for (const key in obj) {
      result[key] = serializeBigInt(obj[key]);
    }
    return result;
  }
  return obj;
}

// ============================================================================
// CORE TASK OPERATIONS
// ============================================================================

export async function getTasks(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id ? parseInt(req.user.id as string) : undefined;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated"
      });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;

    // Parse filters from query params
    const filters: Partial<TaskFilters> = {};
    if (req.query.status) {
      const status = req.query.status as string;
      if (status === 'completed') {
        filters.completed = true;
      } else if (status === 'incompleted') {
        filters.completed = false;
      } else if (status === 'escalated') {
        filters.escalated = true;
      } else if (!isNaN(parseInt(status))) {
        filters.status = [parseInt(status)];
      }
    }

    // Parse isSubTask filter to exclude subtasks from main listing
    if (req.query.isSubTask !== undefined) {
      filters.isSubTask = req.query.isSubTask === 'true';
    }

    // Parse priority filter
    if (req.query.priority) {
      const priority = req.query.priority as string;
      if (!isNaN(parseInt(priority))) {
        filters.priority = [parseInt(priority)];
      } else if (priority.includes(',')) {
        // Support multiple priorities: ?priority=1,2,3
        filters.priority = priority.split(',').map(p => parseInt(p)).filter(p => !isNaN(p));
      }
    }

    // Parse search query
    if (req.query.search) {
      filters.search = req.query.search as string;
    }

    const result = await taskService.getTasks(userId, page, limit, filters);

    return res.json({
      success: true,
      message: "Tasks fetched successfully",
      data: serializeBigInt(result.tasks),
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function listTasks(req: Request, res: Response, next: NextFunction) {
  try {
    const page = parseInt(req.body.page as string) || 1;
    const limit = parseInt(req.body.limit as string) || 50;

    // Build filters from request body
    const allowedFilters = ['status', 'priority', 'assigneeId', 'groupId', 'overdue', 'completed', 'escalated', 'parentTaskId', 'isSubTask'];
    const filters: TaskFilters = {};
    for (const key of allowedFilters) {
      if (req.body.hasOwnProperty(key)) {
        (filters as any)[key] = req.body[key];
      }
    }
    console.log({ filters })
    const result = await taskService.getTasksWithFilters(filters, page, limit);

    return res.json({
      success: true,
      message: "Tasks fetched successfully",
      data: serializeBigInt(result.tasks),
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function getTaskById(req: Request, res: Response, next: NextFunction) {
  try {
    const taskId = parseInt(req.params.id);
    const task = await taskService.getTaskById(taskId);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found"
      });
    }

    return res.json({
      success: true,
      message: "Task fetched successfully",
      data: serializeBigInt(task)
    });
  } catch (error) {
    next(error);
  }
}

export async function getTaskStatusHistory(req: Request, res: Response, next: NextFunction) {
  try {
    const taskId = parseInt(req.params.id);
    const history = await taskService.getTaskStatusHistory(taskId);

    return res.json({
      success: true,
      message: "Task status history fetched successfully",
      data: serializeBigInt(history)
    });
  } catch (error) {
    next(error);
  }
}

export async function createTask(req: Request, res: Response, next: NextFunction) {
  try {
    const taskData: CreateTaskDto = req.body;
    const userId = req.user?.id ? parseInt(req.user.id as string) : null;

    // Normalize assigneeIds and groupIds to arrays
    if (taskData.assigneeIds !== undefined && !Array.isArray(taskData.assigneeIds)) {
      taskData.assigneeIds = [taskData.assigneeIds];
    }
    if (taskData.groupIds !== undefined && !Array.isArray(taskData.groupIds)) {
      taskData.groupIds = [taskData.groupIds];
    }

    const taskId = await taskService.createTask(taskData, userId);
    const createdTask = await taskService.getTaskById(taskId);
    return res.status(201).json({
      success: true,
      message: "Task created successfully",
      data: serializeBigInt(createdTask)
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Validation failed')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    next(error);
  }
}

export async function updateTask(req: Request, res: Response, next: NextFunction) {
  try {
    const taskId = parseInt(req.params.id);
    const updateData: UpdateTaskDto = req.body;
    const userId = req.user?.id ? parseInt(req.user.id as string) : undefined;

    console.log('[updateTask] Request:', { taskId, updateData, userId });

    await taskService.updateTask(taskId, updateData, userId);
    const updatedTask = await taskService.getTaskById(taskId);

    return res.json({
      success: true,
      message: "Task updated successfully",
      data: serializeBigInt(updatedTask)
    });
  } catch (error) {
    console.error('[updateTask] Error:', error);
    if (error instanceof Error) {
      if (error.message.includes('Validation failed') ||
        error.message.includes('not found') ||
        error.message.includes('Cannot complete parent task')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }
      // Return 500 with actual error message for debugging
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
    next(error);
  }
}

export async function deleteTask(req: Request, res: Response, next: NextFunction) {
  try {
    const taskId = parseInt(req.params.id);
    const userId = req.user?.id ? parseInt(req.user.id as string) : undefined;

    const deleted = await taskService.deleteTask(taskId, userId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Task not found"
      });
    }

    return res.json({
      success: true,
      message: "Task deleted successfully"
    });
  } catch (error) {
    next(error);
  }
}

// ============================================================================
// TASK ASSIGNMENT OPERATIONS
// ============================================================================

export async function assignTask(req: Request, res: Response, next: NextFunction) {
  try {
    const taskId = parseInt(req.params.id);
    const assignData: AssignTaskDto = req.body;
    const userId = req.user?.id ? parseInt(req.user.id as string) : undefined;

    await taskService.assignTask(taskId, assignData, userId);
    const task = await taskService.getTaskById(taskId);

    return res.json({
      success: true,
      message: "Task assigned successfully",
      data: serializeBigInt(task)
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    next(error);
  }
}

export async function unassignTask(req: Request, res: Response, next: NextFunction) {
  try {
    const taskId = parseInt(req.params.id);
    const { assigneeId, groupId } = req.body;
    const userId = req.user?.id ? parseInt(req.user.id as string) : undefined;

    await taskService.unassignTask(taskId, assigneeId, groupId, userId);
    const task = await taskService.getTaskById(taskId);

    return res.json({
      success: true,
      message: "Task unassigned successfully",
      data: serializeBigInt(task)
    });
  } catch (error) {
    next(error);
  }
}

// ============================================================================
// TASK STATUS OPERATIONS
// ============================================================================

export async function markTaskAsCompleted(req: Request, res: Response, next: NextFunction) {
  try {
    const taskId = parseInt(req.params.id);
    const userId = req.user?.id ? parseInt(req.user.id as string) : undefined;

    await taskService.updateTask(taskId, { statusId: 3 }, userId); // Assuming 3 is COMPLETED
    const task = await taskService.getTaskById(taskId);

    return res.json({
      success: true,
      message: "Task marked as completed",
      data: serializeBigInt(task)
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Cannot complete parent task')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    next(error);
  }
}

export async function reopenTask(req: Request, res: Response, next: NextFunction) {
  try {
    const taskId = parseInt(req.params.id);
    const userId = req.user?.id ? parseInt(req.user.id as string) : undefined;

    await taskService.updateTask(taskId, { statusId: 1 }, userId); // Assuming 1 is TODO
    const task = await taskService.getTaskById(taskId);

    return res.json({
      success: true,
      message: "Task reopened successfully",
      data: serializeBigInt(task)
    });
  } catch (error) {
    next(error);
  }
}

// ============================================================================
// TASK ESCALATION OPERATIONS
// ============================================================================

export async function escalateTask(req: Request, res: Response, next: NextFunction) {
  try {
    const taskId = parseInt(req.params.id);
    const { notes, assigneeIds, groupIds } = req.body;
    const userId = req.user?.id ? parseInt(req.user.id as string) : undefined;

    await taskService.escalateTask(taskId, userId, notes, { assigneeIds, groupIds });
    const task = await taskService.getTaskById(taskId);

    return res.json({
      success: true,
      message: "Task escalated successfully",
      data: serializeBigInt(task)
    });
  } catch (error) {
    if (error instanceof Error &&
      (error.message.includes('not found') ||
        error.message.includes('Maximum escalation'))) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    next(error);
  }
}

export async function processEscalations(req: Request, res: Response, next: NextFunction) {
  try {
    await taskService.checkAndProcessEscalations();

    return res.json({
      success: true,
      message: "Escalation processing completed"
    });
  } catch (error) {
    next(error);
  }
}

// ============================================================================
// SUBTASK OPERATIONS
// ============================================================================

export async function getSubtasks(req: Request, res: Response, next: NextFunction) {
  try {
    const parentTaskId = parseInt(req.params.id);
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;

    const filters: TaskFilters = {
      parentTaskId: parentTaskId
    };

    const result = await taskService.getTasksWithFilters(filters, page, limit);

    return res.json({
      success: true,
      message: "Subtasks fetched successfully",
      data: result.tasks,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function createSubtask(req: Request, res: Response, next: NextFunction) {
  try {
    const parentTaskId = parseInt(req.params.id);
    const taskData: CreateTaskDto = {
      ...req.body,
      parentTaskId: parentTaskId
    };
    const userId = req.user?.id ? parseInt(req.user.id as string) : undefined;

    const taskId = await taskService.createTask(taskData, userId);
    const createdTask = await taskService.getTaskById(taskId);

    return res.status(201).json({
      success: true,
      message: "Subtask created successfully",
      data: serializeBigInt(createdTask)
    });
  } catch (error) {
    if (error instanceof Error) {
      const errorMessages = [
        'Validation failed',
        'Subtask due date',
        'not found',
        'Maximum task hierarchy',
        'Invalid parent'
      ];
      if (errorMessages.some(msg => error.message.includes(msg))) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }
    }
    next(error);
  }
}

// ============================================================================
// UTILITY OPERATIONS
// ============================================================================

export async function getOverdueTasks(req: Request, res: Response, next: NextFunction) {
  try {
    const tasks = await taskService.getOverdueTasks();

    return res.json({
      success: true,
      message: "Overdue tasks fetched successfully",
      data: tasks
    });
  } catch (error) {
    next(error);
  }
}

export async function getDueTasks(req: Request, res: Response, next: NextFunction) {
  try {
    const tasks = await taskService.getDueTasks();

    return res.json({
      success: true,
      message: "Due tasks fetched successfully",
      data: tasks
    });
  } catch (error) {
    next(error);
  }
}

export async function getStartingTasks(req: Request, res: Response, next: NextFunction) {
  try {
    const tasks = await taskService.getStartingTasks();

    return res.json({
      success: true,
      message: "Starting tasks fetched successfully",
      data: tasks
    });
  } catch (error) {
    next(error);
  }
}

export async function getTaskStats(req: Request, res: Response, next: NextFunction) {
  try {
    const stats = await taskService.getTaskStats();

    return res.json({
      success: true,
      message: "Task statistics fetched successfully",
      data: stats
    });
  } catch (error) {
    next(error);
  }
}

export async function getSchedulerConfig(req: Request, res: Response, next: NextFunction) {
  try {
    const settings = await getSchedulerSettings();
    const config = {
      dueTimeInterval: settings.dueTimeInterval,
      dueTasksWindow: settings.dueTasksWindow,
      dueTasksBuffer: settings.dueTasksBuffer,
      maxSchedulingDelayMs: settings.maxSchedulingDelayMs,
      cronSchedule: settings.cronSchedule,
      escalationCron: settings.escalationCron,
      description: SCHEDULER_CONFIG_DESCRIPTIONS
    };

    return res.json({
      success: true,
      message: "Scheduler configuration fetched successfully",
      data: config
    });
  } catch (error) {
    next(error);
  }
}

export async function updateSchedulerConfig(req: Request, res: Response, next: NextFunction) {
  try {
    const {
      dueTimeIntervalValue,
      dueTimeIntervalUnit,
      dueTasksWindowValue,
      dueTasksWindowUnit,
      dueTasksBufferValue,
      dueTasksBufferUnit,
      maxSchedulingDelayMs,
      cronSchedule,
      escalationCron
    } = req.body;

    const updated = await updateSchedulerSettings({
      dueTimeIntervalValue,
      dueTimeIntervalUnit,
      dueTasksWindowValue,
      dueTasksWindowUnit,
      dueTasksBufferValue,
      dueTasksBufferUnit,
      maxSchedulingDelayMs,
      cronSchedule,
      escalationCron
    });

    return res.json({
      success: true,
      message: "Scheduler configuration updated successfully.",
      data: updated
    });
  } catch (error) {
    next(error);
  }
}

export async function duplicateTask(req: Request, res: Response, next: NextFunction) {
  try {
    const taskId = parseInt(req.params.id);
    const userId = req.user?.id ? parseInt(req.user.id as string) : undefined;

    const originalTask = await taskService.getTaskById(taskId);
    if (!originalTask) {
      return res.status(404).json({
        success: false,
        message: "Task not found"
      });
    }

    // Create duplicate with modified title
    const duplicateData: CreateTaskDto = {
      title: `${originalTask.Title} (Copy)`,
      description: originalTask.Description,
      dueDate: (originalTask.DueDate as any).toISOString().split('T')[0],
      dueTime: originalTask.DueTime,
      taskTypeId: originalTask.TaskTypeId || 1, // Use original task type or default to 1
      statusId: 1, // Reset to TODO
      priorityId: originalTask.PriorityId,
      isRecurring: originalTask.IsRecurring,
      recurrenceId: originalTask.RecurrenceId,
      assigneeIds: originalTask.assignees?.map(a => a.Id),
      groupIds: originalTask.groups?.map(g => g.GroupId)
    };

    const newTaskId = await taskService.createTask(duplicateData, userId);
    const newTask = await taskService.getTaskById(newTaskId);

    return res.status(201).json({
      success: true,
      message: "Task duplicated successfully",
      data: serializeBigInt(newTask)
    });
  } catch (error) {
    next(error);
  }
}

// ============================================================================
// TASK TYPE OPERATIONS
// ============================================================================

export async function getTaskTypes(req: Request, res: Response, next: NextFunction) {
  try {
    const taskTypes = await taskTypeService.getAllTaskTypes();

    return res.json({
      success: true,
      message: "Task types fetched successfully",
      data: serializeBigInt(taskTypes)
    });
  } catch (error) {
    next(error);
  }
}

export async function createTaskType(req: Request, res: Response, next: NextFunction) {
  try {
    const taskTypeData = req.body;
    const taskType = await taskTypeService.createTaskType(taskTypeData);

    return res.status(201).json({
      success: true,
      message: "Task type created successfully",
      data: serializeBigInt(taskType)
    });
  } catch (error) {
    next(error);
  }
}

export async function getTaskTypeById(req: Request, res: Response, next: NextFunction) {
  try {
    const taskTypeId = parseInt(req.params.id);
    const taskType = await taskTypeService.getTaskTypeById(taskTypeId);

    if (!taskType) {
      return res.status(404).json({
        success: false,
        message: "Task type not found"
      });
    }

    return res.json({
      success: true,
      message: "Task type fetched successfully",
      data: serializeBigInt(taskType)
    });
  } catch (error) {
    next(error);
  }
}

export async function getAvailableStatusesForTaskType(req: Request, res: Response, next: NextFunction) {
  try {
    const taskTypeId = req.params.taskTypeId ? parseInt(req.params.taskTypeId) : undefined;
    const statuses = await taskInit.getAvailableStatusesForTaskType(taskTypeId);

    return res.json({
      success: true,
      message: "Available statuses fetched successfully",
      data: statuses
    });
  } catch (error) {
    next(error);
  }
}

// ============================================================================
// CSV IMPORT OPERATIONS
// ============================================================================

export async function importFromCsv(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const results: CSVRow[] = [];
    const errors: string[] = [];

    // Convert buffer to stream and parse CSV
    const stream = Readable.from(req.file.buffer);
    await new Promise((resolve, reject) => {
      stream
        .pipe(csv())
        .on('data', (data: CSVRow) => {
          try {
            const processedData = processCSVRow(data);
            results.push(processedData);
          } catch (error) {
            errors.push(`Row processing error: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        })
        .on('end', async () => {
          try {
            await taskService.saveCSVData(results);
            resolve(results);
          } catch (error) {
            reject(error);
          }
        })
        .on('error', (error: Error) => {
          reject(error);
        });
    });

    const validRecords = results.filter(r => r.title || r.name);
    const recordsWithAssignees = results.filter(r => r.assigneeids || r.assigneeIds || r.assignee_ids || r.assigneeId || r.assignee_id);
    const recordsWithGroups = results.filter(r => r.groupids || r.groupIds || r.group_ids || r.groupId || r.group_id);

    return res.json({
      success: true,
      message: 'CSV file processed and saved to database successfully',
      data: {
        totalRecords: results.length,
        processedRecords: validRecords.length,
        recordsWithAssignees: recordsWithAssignees.length,
        recordsWithGroups: recordsWithGroups.length,
        processingErrors: errors.length > 0 ? errors : undefined
      }
    });
  } catch (error) {
    next(error);
  }
}

// Process and validate CSV row
function processCSVRow(row: CSVRow): CSVRow {
  const processedRow: CSVRow = {};

  for (const [key, value] of Object.entries(row)) {
    const cleanKey = key.trim().toLowerCase().replace(/ /g, '_');
    const cleanValue = value ? value.trim() : '';
    processedRow[cleanKey] = cleanValue;
  }

  // Validate assigneeIds if present
  const assigneeIdsKey = Object.keys(processedRow).find(key =>
    ['assigneeids', 'assignee_ids', 'assigneeid', 'assignee_id'].includes(key)
  );
  if (assigneeIdsKey && processedRow[assigneeIdsKey]) {
    const assigneeIds = processedRow[assigneeIdsKey].split(',').map(id => id.trim());
    // Validate that all IDs are numeric
    const invalidIds = assigneeIds.filter(id => isNaN(parseInt(id)));
    if (invalidIds.length > 0) {
      throw new Error(`Invalid assignee IDs: ${invalidIds.join(', ')}`);
    }
  }

  // Validate groupIds if present
  const groupIdsKey = Object.keys(processedRow).find(key =>
    ['groupids', 'group_ids', 'groupid', 'group_id'].includes(key)
  );
  if (groupIdsKey && processedRow[groupIdsKey]) {
    const groupIds = processedRow[groupIdsKey].split(',').map(id => id.trim());
    // Validate that all IDs are numeric
    const invalidIds = groupIds.filter(id => isNaN(parseInt(id)));
    if (invalidIds.length > 0) {
      throw new Error(`Invalid group IDs: ${invalidIds.join(', ')}`);
    }
  }

  return processedRow;
}

// ============================================================================
// RECURRENCE MANAGEMENT OPERATIONS
// ============================================================================

export async function createRecurrence(req: Request, res: Response, next: NextFunction) {
  try {
    const recurrenceData: CreateRecurrenceDto = req.body;

    // Validate recurrence data
    const validation = recurrenceService.validateRecurrenceData(recurrenceData);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: `Recurrence validation failed: ${validation.errors.join(', ')}`,
        errors: validation.errors
      });
    }

    const recurrenceId = await recurrenceService.createRecurrenceRule(recurrenceData);
    const createdRecurrence = await recurrenceService.getRecurrenceById(recurrenceId);

    return res.status(201).json({
      success: true,
      message: "Recurrence rule created successfully",
      data: createdRecurrence
    });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    next(error);
  }
}

export async function getRecurrence(req: Request, res: Response, next: NextFunction) {
  try {
    const recurrenceId = parseInt(req.params.id);
    const recurrence = await recurrenceService.getRecurrenceById(recurrenceId);

    if (!recurrence) {
      return res.status(404).json({
        success: false,
        message: "Recurrence rule not found"
      });
    }

    return res.json({
      success: true,
      message: "Recurrence rule fetched successfully",
      data: recurrence
    });
  } catch (error) {
    next(error);
  }
}

export async function updateRecurrence(req: Request, res: Response, next: NextFunction) {
  try {
    const recurrenceId = parseInt(req.params.id);
    const recurrenceData: CreateRecurrenceDto = req.body;

    // Validate recurrence data
    const validation = recurrenceService.validateRecurrenceData(recurrenceData);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: `Recurrence validation failed: ${validation.errors.join(', ')}`,
        errors: validation.errors
      });
    }

    await recurrenceService.updateRecurrenceRule(recurrenceId, recurrenceData);
    const updatedRecurrence = await recurrenceService.getRecurrenceById(recurrenceId);

    return res.json({
      success: true,
      message: "Recurrence rule updated successfully",
      data: updatedRecurrence
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    next(error);
  }
}

export async function deleteRecurrence(req: Request, res: Response, next: NextFunction) {
  try {
    const recurrenceId = parseInt(req.params.id);

    await recurrenceService.deleteRecurrenceRule(recurrenceId);

    return res.json({
      success: true,
      message: "Recurrence rule deleted successfully"
    });
  } catch (error) {
    next(error);
  }
}