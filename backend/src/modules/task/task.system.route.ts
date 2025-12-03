import { Router } from "express";
import {
    getOverdueTasks,
    getDueTasks,
    getStartingTasks,
    getTaskStats,
    getSchedulerConfig,
    updateSchedulerConfig,
    getTaskTypes,
    createTaskType,
    getTaskTypeById,
    getAvailableStatusesForTaskType,
    processEscalations
} from "./task.controller";
import { triggerTaskActions, executeApiActionEndpoint } from "../action/action.controller";

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

// Get tasks that are about to start (based on StartDate/StartTime)
taskSystemRouter.get('/tasks/starting', getStartingTasks);

// Get task statistics
taskSystemRouter.get('/tasks/stats', getTaskStats);

// Get scheduler configuration
taskSystemRouter.get('/scheduler/config', getSchedulerConfig);

// Update scheduler configuration
taskSystemRouter.put('/scheduler/config', updateSchedulerConfig);

// Trigger escalation sweep
taskSystemRouter.post('/tasks/escalations/process', processEscalations);

// Trigger API actions for a task event (used by scheduler/queue worker)
taskSystemRouter.post('/tasks/trigger-actions', triggerTaskActions);

// Execute a single API action by definition ID
taskSystemRouter.post('/actions/execute', executeApiActionEndpoint);


export default taskSystemRouter;
