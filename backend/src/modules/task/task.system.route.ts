import { Router } from "express";
import {
    getOverdueTasks,
    getDueTasks,
    getTaskStats,
    getSchedulerConfig,
    updateSchedulerConfig,
    getTaskTypes,
    createTaskType,
    getTaskTypeById,
    getAvailableStatusesForTaskType
} from "./task.controller";

const taskSystemRouter = Router();

// ============================================================================
// TASK TYPE OPERATIONS
// ============================================================================

// Get all task types
taskSystemRouter.get('/task-types', getTaskTypes);

// Create new task type
taskSystemRouter.post('/task-types', createTaskType);

// Get task type by ID
taskSystemRouter.get('/task-types/:id', getTaskTypeById);

// Get available statuses for a task type
taskSystemRouter.get('/task-types/:taskTypeId/statuses', getAvailableStatusesForTaskType);

// ============================================================================
// SYSTEM TASK OPERATIONS
// ============================================================================

// Get overdue tasks
taskSystemRouter.get('/tasks/overdue', getOverdueTasks);

// Get due tasks (within next few minutes)
taskSystemRouter.get('/tasks/due', getDueTasks);

// Get task statistics
taskSystemRouter.get('/tasks/stats', getTaskStats);

// Get scheduler configuration
taskSystemRouter.get('/scheduler/config', getSchedulerConfig);

// Update scheduler configuration
taskSystemRouter.put('/scheduler/config', updateSchedulerConfig);


export default taskSystemRouter;