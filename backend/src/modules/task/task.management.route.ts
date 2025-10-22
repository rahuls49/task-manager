import { Router } from "express";
import {
  initializeSystem,
  getTaskStatuses,
  getTaskPriorities,
  getAssignees,
  createAssignee,
  getGroups,
  createGroup,
  getGroupMembers,
  addUserToGroup,
  removeUserFromGroup,
  createTaskRecurrence
} from "./task.management.controller";

const managementRouter = Router();

// ============================================================================
// SYSTEM MANAGEMENT
// ============================================================================

// Initialize task management system
managementRouter.post('/initialize', initializeSystem);

// ============================================================================
// REFERENCE DATA MANAGEMENT
// ============================================================================

// Task statuses
managementRouter.get('/statuses', getTaskStatuses);

// Task priorities
managementRouter.get('/priorities', getTaskPriorities);

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

// ============================================================================
// RECURRENCE MANAGEMENT
// ============================================================================

// Create task recurrence pattern
managementRouter.post('/recurrence', createTaskRecurrence);

export default managementRouter;