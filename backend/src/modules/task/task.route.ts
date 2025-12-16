import { Router } from "express";
import multer from 'multer';
import verifyAuthToken from "../../middlewares/auth-middleware";
import {
  requirePermission,
  requireAnyPermission,
  loadUserPermissions
} from "../../middlewares/rbac-middleware";
import { RESOURCES, OPERATIONS } from "../../lib/rbac-constants";
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

// Apply auth middleware and load permissions for all routes
taskRouter.use(verifyAuthToken);
taskRouter.use(loadUserPermissions());

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
// Requires: Task:read permission
taskRouter.get('/',
  requirePermission(RESOURCES.TASK, OPERATIONS.READ),
  getTasks
);

// Get tasks with filters from request body
// Requires: Task:read permission
taskRouter.post('/list',
  requirePermission(RESOURCES.TASK, OPERATIONS.READ),
  listTasks
);

// Get single task by ID
// Requires: Task:read permission
taskRouter.get('/:id',
  requirePermission(RESOURCES.TASK, OPERATIONS.READ),
  getTaskById
);

// Get task status history
// Requires: Task:read permission
taskRouter.get('/:id/status-history',
  requirePermission(RESOURCES.TASK, OPERATIONS.READ),
  getTaskStatusHistory
);

// Create new task
// Requires: Task:create permission
taskRouter.post('/',
  requirePermission(RESOURCES.TASK, OPERATIONS.CREATE),
  createTask
);

// Update task
// Requires: Task:update permission
taskRouter.put('/:id',
  requirePermission(RESOURCES.TASK, OPERATIONS.UPDATE),
  updateTask
);

// Delete task (soft delete)
// Requires: Task:delete permission
taskRouter.delete('/:id',
  requirePermission(RESOURCES.TASK, OPERATIONS.DELETE),
  deleteTask
);

// Get available statuses for a task
// Requires: Task:read permission
taskRouter.get('/:id/available-statuses',
  requirePermission(RESOURCES.TASK, OPERATIONS.READ),
  getAvailableStatusesForTaskType
);

// ============================================================================
// TASK ASSIGNMENT OPERATIONS
// ============================================================================

// Assign task to users/groups
// Requires: Task:assign permission
taskRouter.post('/:id/assign',
  requirePermission(RESOURCES.TASK, OPERATIONS.ASSIGN),
  assignTask
);

// Unassign task from users/groups
// Requires: Task:assign permission
taskRouter.post('/:id/unassign',
  requirePermission(RESOURCES.TASK, OPERATIONS.ASSIGN),
  unassignTask
);

// ============================================================================
// TASK STATUS OPERATIONS
// ============================================================================

// Mark task as completed
// Requires: Task:update permission
taskRouter.patch('/:id/complete',
  requirePermission(RESOURCES.TASK, OPERATIONS.UPDATE),
  markTaskAsCompleted
);

// Reopen completed task
// Requires: Task:update permission
taskRouter.patch('/:id/reopen',
  requirePermission(RESOURCES.TASK, OPERATIONS.UPDATE),
  reopenTask
);

// ============================================================================
// TASK ESCALATION OPERATIONS
// ============================================================================

// Manually escalate task
// Requires: Task:escalate permission
taskRouter.post('/:id/escalate',
  requirePermission(RESOURCES.TASK, OPERATIONS.ESCALATE),
  escalateTask
);

// Process automatic escalations (system endpoint - requires manage permission)
taskRouter.post('/system/process-escalations',
  requirePermission(RESOURCES.TASK, OPERATIONS.MANAGE),
  processEscalations
);

// ============================================================================
// SUBTASK OPERATIONS
// ============================================================================

// Get all subtasks of a parent task
// Requires: Task:read permission
taskRouter.get('/:id/subtasks',
  requirePermission(RESOURCES.TASK, OPERATIONS.READ),
  getSubtasks
);

// Create subtask under a parent task
// Requires: Task:create permission
taskRouter.post('/:id/subtasks',
  requirePermission(RESOURCES.TASK, OPERATIONS.CREATE),
  createSubtask
);

// Duplicate task
// Requires: Task:create permission
taskRouter.post('/:id/duplicate',
  requirePermission(RESOURCES.TASK, OPERATIONS.CREATE),
  duplicateTask
);

// ============================================================================
// DATA OPERATIONS
// ============================================================================

// Import tasks from CSV
// Requires: Task:import permission
taskRouter.post('/import/csv',
  requirePermission(RESOURCES.TASK, OPERATIONS.IMPORT),
  upload.single('file'),
  importFromCsv
);

// ============================================================================
// RECURRENCE MANAGEMENT OPERATIONS  
// ============================================================================

// Create recurrence rule
// Requires: Task:create permission
taskRouter.post('/recurrence',
  requirePermission(RESOURCES.TASK, OPERATIONS.CREATE),
  createRecurrence
);

// Get recurrence rule by ID
// Requires: Task:read permission
taskRouter.get('/recurrence/:id',
  requirePermission(RESOURCES.TASK, OPERATIONS.READ),
  getRecurrence
);

// Update recurrence rule
// Requires: Task:update permission
taskRouter.put('/recurrence/:id',
  requirePermission(RESOURCES.TASK, OPERATIONS.UPDATE),
  updateRecurrence
);

// Delete recurrence rule
// Requires: Task:delete permission
taskRouter.delete('/recurrence/:id',
  requirePermission(RESOURCES.TASK, OPERATIONS.DELETE),
  deleteRecurrence
);

export default taskRouter;