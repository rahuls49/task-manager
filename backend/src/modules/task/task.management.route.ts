import { Router } from "express";
import verifyAuthToken from "../../middlewares/auth-middleware";
import {
  initializeSystem,
  getTaskStatuses,
  createTaskStatus,
  getTaskPriorities,
  createTaskPriority,
  getAssignees,
  createAssignee,
  getGroups,
  createGroup,
  getGroupMembers,
  addUserToGroup,
  removeUserFromGroup
} from "./task.management.controller";

const managementRouter = Router();

// ============================================================================
// SYSTEM MANAGEMENT
// ============================================================================

// Initialize task management system (allow authenticated users during initial setup)
managementRouter.post('/initialize', verifyAuthToken, initializeSystem);

// ============================================================================
// REFERENCE DATA MANAGEMENT
// ============================================================================

// Task statuses
managementRouter.get('/statuses', getTaskStatuses);

// Create new status
managementRouter.post('/statuses', createTaskStatus);

// Task priorities
managementRouter.get('/priorities', getTaskPriorities);

// Create new priority
managementRouter.post('/priorities', createTaskPriority);

// ============================================================================
// ASSIGNEE MANAGEMENT
// ============================================================================

// Get all assignees
managementRouter.get('/assignees', getAssignees);

// Create new assignee
managementRouter.post('/assignees', createAssignee);

// ============================================================================
// GROUP MANAGEMENT
// ============================================================================

// Get all groups
managementRouter.get('/groups', getGroups);

// Create new group
managementRouter.post('/groups', createGroup);

// Get group members
managementRouter.get('/groups/:groupId/members', getGroupMembers);

// Add user to group
managementRouter.post('/groups/:groupId/members', addUserToGroup);

// Remove user from group
managementRouter.delete('/groups/:groupId/members/:userId', removeUserFromGroup);

export default managementRouter;