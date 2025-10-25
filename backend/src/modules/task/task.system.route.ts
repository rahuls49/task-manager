import { Router } from "express";
import {
    getOverdueTasks,
    getDueTasks,
    getTaskStats,
    getSchedulerConfig,
    updateSchedulerConfig
} from "./task.controller";

const taskSystemRouter = Router();

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