import { Router } from "express";
import multer from 'multer';
import { 
  createTask, 
  getTasks, 
  getTaskById, 
  updateTask, 
  deleteTask, 
  importFromCsv,
  assignTask,
  unassignTask,
  markTaskAsCompleted,
  reopenTask,
  escalateTask,
  processEscalations,
  getSubtasks,
  createSubtask,
  getOverdueTasks,
  getTaskStats,
  duplicateTask
} from "./task.controller";

const taskRouter = Router();

// Configure multer for memory storage (no disk storage)
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed!'));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// ============================================================================
// CORE TASK OPERATIONS
// ============================================================================

// Get all tasks with filtering and pagination
taskRouter.get('/', getTasks);

// Get single task by ID
taskRouter.get('/:id', getTaskById);

// Create new task
taskRouter.post('/', createTask);

// Update task
taskRouter.put('/:id', updateTask);

// Delete task (soft delete)
taskRouter.delete('/:id', deleteTask);

// ============================================================================
// TASK ASSIGNMENT OPERATIONS
// ============================================================================

// Assign task to users/groups
taskRouter.post('/:id/assign', assignTask);

// Unassign task from users/groups
taskRouter.post('/:id/unassign', unassignTask);

// ============================================================================
// TASK STATUS OPERATIONS
// ============================================================================

// Mark task as completed
taskRouter.patch('/:id/complete', markTaskAsCompleted);

// Reopen completed task
taskRouter.patch('/:id/reopen', reopenTask);

// ============================================================================
// TASK ESCALATION OPERATIONS
// ============================================================================

// Manually escalate task
taskRouter.post('/:id/escalate', escalateTask);

// Process automatic escalations (system endpoint)
taskRouter.post('/system/process-escalations', processEscalations);

// ============================================================================
// SUBTASK OPERATIONS
// ============================================================================

// Get all subtasks of a parent task
taskRouter.get('/:id/subtasks', getSubtasks);

// Create subtask under a parent task
taskRouter.post('/:id/subtasks', createSubtask);

// ============================================================================
// UTILITY OPERATIONS
// ============================================================================

// Get overdue tasks
taskRouter.get('/system/overdue', getOverdueTasks);

// Get task statistics
taskRouter.get('/system/stats', getTaskStats);

// Duplicate task
taskRouter.post('/:id/duplicate', duplicateTask);

// ============================================================================
// DATA OPERATIONS
// ============================================================================

// Import tasks from CSV
taskRouter.post('/import/csv', upload.single('file'), importFromCsv);

export default taskRouter;