import { Router } from "express";
import multer from 'multer';
import verifyAuthToken from "../../middlewares/auth-middleware";
import { 
  createTask, 
  getTasks, 
  getTaskById, 
  getTaskStatusHistory,
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
  duplicateTask,
  listTasks,
  createRecurrence,
  getRecurrence,
  updateRecurrence,
  deleteRecurrence,
  getAvailableStatusesForTaskType
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
taskRouter.get('/', verifyAuthToken, getTasks);

// Get tasks with filters from request body
taskRouter.post('/list', listTasks);

// Get single task by ID
taskRouter.get('/:id', getTaskById);

// Get task status history
taskRouter.get('/:id/status-history', getTaskStatusHistory);

// Create new task
taskRouter.post('/', verifyAuthToken, createTask);

// Update task
taskRouter.put('/:id', updateTask);

// Delete task (soft delete)
taskRouter.delete('/:id', deleteTask);

// Get available statuses for a task
taskRouter.get('/:id/available-statuses', getAvailableStatusesForTaskType);

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


// Duplicate task
taskRouter.post('/:id/duplicate', duplicateTask);

// ============================================================================
// DATA OPERATIONS
// ============================================================================

// Import tasks from CSV
taskRouter.post('/import/csv', upload.single('file'), importFromCsv);

// ============================================================================
// RECURRENCE MANAGEMENT OPERATIONS  
// ============================================================================

// Create recurrence rule
taskRouter.post('/recurrence', createRecurrence);

// Get recurrence rule by ID
taskRouter.get('/recurrence/:id', getRecurrence);

// Update recurrence rule
taskRouter.put('/recurrence/:id', updateRecurrence);

// Delete recurrence rule
taskRouter.delete('/recurrence/:id', deleteRecurrence);

export default taskRouter;