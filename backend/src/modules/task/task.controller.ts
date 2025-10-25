import { Request, Response, NextFunction } from "express";
import * as taskService from "./task.service";
import { CSVRow, CreateTaskDto, UpdateTaskDto, TaskFilters, AssignTaskDto } from "./task.types";
import { Readable } from "stream";
import csv from 'csv-parser';
import eventHandler from "@task-manager/event-lib";

// ============================================================================
// CORE TASK OPERATIONS
// ============================================================================

export async function getTasks(req: Request, res: Response, next: NextFunction) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;

    const result = await taskService.getTasks(page, limit);
    
    return res.json({
      success: true,
      message: "Tasks fetched successfully",
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

export async function listTasks(req: Request, res: Response, next: NextFunction) {
  try {
    const page = parseInt(req.body.page as string) || 1;
    const limit = parseInt(req.body.limit as string) || 50;
    
    // Build filters from request body
    const filters: TaskFilters = req.body.filters || {};

    const result = await taskService.getTasksWithFilters(filters, page, limit);
    
    return res.json({
      success: true,
      message: "Tasks fetched successfully",
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
      data: task
    });
  } catch (error) {
    next(error);
  }
}

export async function createTask(req: Request, res: Response, next: NextFunction) {
  try {
    const taskData: CreateTaskDto = req.body;
    const userId = req.user?.id ? parseInt(req.user.id as string) : undefined;

    const taskId = await taskService.createTask(taskData, userId);
    const createdTask = await taskService.getTaskById(taskId);
    eventHandler(createdTask, "create-task-event");
    return res.status(201).json({
      success: true,
      message: "Task created successfully",
      data: createdTask
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

    await taskService.updateTask(taskId, updateData, userId);
    const updatedTask = await taskService.getTaskById(taskId);

    return res.json({
      success: true,
      message: "Task updated successfully",
      data: updatedTask
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('Validation failed') || 
          error.message.includes('not found') ||
          error.message.includes('Cannot complete parent task')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }
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
      data: task
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
      data: task
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
      data: task
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
      data: task
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
    const { notes } = req.body;
    const userId = req.user?.id ? parseInt(req.user.id as string) : undefined;

    await taskService.escalateTask(taskId, userId, notes);
    const task = await taskService.getTaskById(taskId);

    return res.json({
      success: true,
      message: "Task escalated successfully",
      data: task
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
      data: createdTask
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
      dueDate: originalTask.DueDate,
      dueTime: originalTask.DueTime,
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
      data: newTask
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

    // Convert buffer to stream and parse CSV
    const stream = Readable.from(req.file.buffer);
    await new Promise((resolve, reject) => {
      stream
        .pipe(csv())
        .on('data', (data: CSVRow) => {
          const processedData = processCSVRow(data);
          results.push(processedData);
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
    
    return res.json({
      success: true,
      message: 'CSV file processed and saved to database successfully',
      data: {
        totalRecords: results.length,
        processedRecords: results.filter(r => r.title || r.name).length
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
  
  return processedRow;
}