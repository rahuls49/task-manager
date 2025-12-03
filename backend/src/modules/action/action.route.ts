import { Router } from 'express';
import verifyAuthToken from '../../middlewares/auth-middleware';
import {
  createApiDefinition,
  updateApiDefinition,
  deleteApiDefinition,
  getApiDefinitionById,
  getAllApiDefinitions,
  createTaskApiAction,
  updateTaskApiAction,
  deleteTaskApiAction,
  getTaskApiActions,
  getApiCalls,
  getActionEvents,
  getHttpMethods,
  testApiDefinition,
} from './action.controller';

const actionRouter = Router();

// ============================================================================
// METADATA ROUTES
// ============================================================================

// Get all available action events
actionRouter.get('/events', getActionEvents);

// Get all available HTTP methods
actionRouter.get('/http-methods', getHttpMethods);

// ============================================================================
// API DEFINITION ROUTES
// ============================================================================

// Get all API definitions
actionRouter.get('/api-definitions', getAllApiDefinitions);

// Get API definition by ID
actionRouter.get('/api-definitions/:id', getApiDefinitionById);

// Create new API definition
actionRouter.post('/api-definitions', verifyAuthToken, createApiDefinition);

// Update API definition
actionRouter.put('/api-definitions/:id', verifyAuthToken, updateApiDefinition);

// Delete API definition
actionRouter.delete('/api-definitions/:id', verifyAuthToken, deleteApiDefinition);

// Test API definition
actionRouter.post('/api-definitions/:id/test', verifyAuthToken, testApiDefinition);

// ============================================================================
// TASK API ACTION ROUTES
// ============================================================================

// Get all API actions for a task
actionRouter.get('/tasks/:taskId/api-actions', getTaskApiActions);

// Create new task API action
actionRouter.post('/task-api-actions', verifyAuthToken, createTaskApiAction);

// Update task API action
actionRouter.put('/task-api-actions/:id', verifyAuthToken, updateTaskApiAction);

// Delete task API action
actionRouter.delete('/task-api-actions/:id', verifyAuthToken, deleteTaskApiAction);

// ============================================================================
// API CALL HISTORY ROUTES
// ============================================================================

// Get API call history
actionRouter.get('/api-calls', getApiCalls);

export default actionRouter;
