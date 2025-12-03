import * as actionService from './action.service';
import { TaskActionEvent } from './action.events';
import { Request, Response, NextFunction } from 'express';

function serializeBigInt(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'bigint') return Number(obj);
  if (obj instanceof Date) return obj.toISOString();
  if (Array.isArray(obj)) return obj.map(serializeBigInt);
  if (typeof obj === 'object') {
    const result: any = {};
    for (const key in obj) result[key] = serializeBigInt(obj[key]);
    return result;
  }
  return obj;
}

export async function createApiDefinition(req: Request, res: Response, next: NextFunction) {
  try {
    const data = req.body;
    if (!data.name || !data.endpoint || !data.httpMethod) {
      return res.status(400).json({ success: false, message: 'Name, endpoint, and httpMethod are required' });
    }
    const id = await actionService.createApiDefinition(data);
    const apiDefinition = await actionService.getApiDefinitionById(id);
    return res.status(201).json({ success: true, message: 'API definition created successfully', data: serializeBigInt(apiDefinition) });
  } catch (error) {
    next(error);
  }
}

export async function updateApiDefinition(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id);
    const data = req.body;
    const existing = await actionService.getApiDefinitionById(id);
    if (!existing) return res.status(404).json({ success: false, message: 'API definition not found' });
    await actionService.updateApiDefinition(id, data);
    const updated = await actionService.getApiDefinitionById(id);
    return res.json({ success: true, message: 'API definition updated successfully', data: serializeBigInt(updated) });
  } catch (error) { next(error); }
}

export async function deleteApiDefinition(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id);
    const existing = await actionService.getApiDefinitionById(id);
    if (!existing) return res.status(404).json({ success: false, message: 'API definition not found' });
    await actionService.deleteApiDefinition(id);
    return res.json({ success: true, message: 'API definition deleted successfully' });
  } catch (error) { next(error); }
}

export async function getApiDefinitionById(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id);
    const apiDefinition = await actionService.getApiDefinitionById(id);
    if (!apiDefinition) return res.status(404).json({ success: false, message: 'API definition not found' });
    return res.json({ success: true, message: 'API definition fetched successfully', data: serializeBigInt(apiDefinition) });
  } catch (error) { next(error); }
}

export async function getAllApiDefinitions(req: Request, res: Response, next: NextFunction) {
  try {
    const page = parseInt(req.query.page as any) || 1;
    const limit = parseInt(req.query.limit as any) || 50;
    const result = await actionService.getAllApiDefinitions(page, limit);
    return res.json({ success: true, message: 'API definitions fetched successfully', data: serializeBigInt(result.apiDefinitions), pagination: { page, limit, total: result.total, totalPages: Math.ceil(result.total / limit) } });
  } catch (error) { next(error); }
}

export async function createTaskApiAction(req: Request, res: Response, next: NextFunction) {
  try {
    const data = req.body;
    if (!data.taskId || !data.apiDefinitionId || !data.triggerEvent) return res.status(400).json({ success: false, message: 'taskId, apiDefinitionId, and triggerEvent are required' });
    const id = await actionService.createTaskApiAction(data);
    const taskApiAction = await actionService.getTaskApiActionById(id);
    return res.status(201).json({ success: true, message: 'Task API action created successfully', data: serializeBigInt(taskApiAction) });
  } catch (error) { next(error); }
}

export async function updateTaskApiAction(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id);
    const data = req.body;
    const existing = await actionService.getTaskApiActionById(id);
    if (!existing) return res.status(404).json({ success: false, message: 'Task API action not found' });
    await actionService.updateTaskApiAction(id, data);
    const updated = await actionService.getTaskApiActionById(id);
    return res.json({ success: true, message: 'Task API action updated successfully', data: serializeBigInt(updated) });
  } catch (error) { next(error); }
}

export async function deleteTaskApiAction(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id);
    const existing = await actionService.getTaskApiActionById(id);
    if (!existing) return res.status(404).json({ success: false, message: 'Task API action not found' });
    await actionService.deleteTaskApiAction(id);
    return res.json({ success: true, message: 'Task API action deleted successfully' });
  } catch (error) { next(error); }
}

export async function getTaskApiActions(req: Request, res: Response, next: NextFunction) {
  try {
    const taskId = parseInt(req.params.taskId);
    const actions = await actionService.getTaskApiActions(taskId);
    return res.json({ success: true, message: 'Task API actions fetched successfully', data: serializeBigInt(actions) });
  } catch (error) { next(error); }
}

export async function getApiCalls(req: Request, res: Response, next: NextFunction) {
  try {
    const page = parseInt(req.query.page as any) || 1;
    const limit = parseInt(req.query.limit as any) || 50;
    const filters: any = {};
    if (req.query.apiDefinitionId) filters.apiDefinitionId = parseInt(req.query.apiDefinitionId as any);
    if (req.query.taskId) filters.taskId = parseInt(req.query.taskId as any);
    if (req.query.triggerEvent) filters.triggerEvent = req.query.triggerEvent as any;
    if (req.query.isSuccess !== undefined) filters.isSuccess = req.query.isSuccess === 'true';
    if (req.query.startDate) filters.startDate = new Date(req.query.startDate as any);
    if (req.query.endDate) filters.endDate = new Date(req.query.endDate as any);
    const result = await actionService.getApiCalls(filters, page, limit);
    return res.json({ success: true, message: 'API calls fetched successfully', data: serializeBigInt(result.calls), pagination: { page, limit, total: result.total, totalPages: Math.ceil(result.total / limit) } });
  } catch (error) { next(error); }
}

export async function getActionEvents(req: Request, res: Response, next: NextFunction) { try { const events = (require('./action.events') as any).getAllActionEvents(); return res.json({ success: true, message: 'Action events fetched successfully', data: events }); } catch (error) { next(error); } }

export async function getHttpMethods(req: Request, res: Response, next: NextFunction) { try { const methods = (require('./action.events') as any).getAllHttpMethods(); return res.json({ success: true, message: 'HTTP methods fetched successfully', data: methods }); } catch (error) { next(error); } }

export async function testApiDefinition(req: Request, res: Response, next: NextFunction) { try { const id = parseInt(req.params.id); const apiDefinition = await actionService.getApiDefinitionById(id); if (!apiDefinition) return res.status(404).json({ success: false, message: 'API definition not found' }); const testTaskData = { Id: 0, Title: 'Test Task', Description: 'Test task for API testing', ...req.body.testData }; const result = await actionService.executeApiAction(apiDefinition, 0, TaskActionEvent.TASK_CREATED, testTaskData); return res.json({ success: true, message: result.IsSuccess ? 'API call successful' : 'API call failed', data: serializeBigInt(result) }); } catch (error) { next(error); } }

export async function triggerTaskActions(req: Request, res: Response, next: NextFunction) {
  try {
    console.log('🔔 triggerTaskActions called. Body:', JSON.stringify(req.body, null, 2));
    let taskId: any;
    let event: any;
    let taskData: any;
    if (req.body.data && req.body.data.task) {
      taskId = req.body.data.task.taskId; event = req.body.event; taskData = req.body.data.task; console.log('📦 Detected event-lib payload structure');
    } else {
      taskId = req.body.taskId; event = req.body.event; taskData = req.body.taskData; console.log('📦 Detected direct payload structure');
    }
    if (!taskId || !event) { console.error('❌ Missing taskId or event in payload'); console.error('Payload received:', req.body); return res.status(400).json({ success: false, message: 'taskId and event are required' }); }
    if (!taskData) {
      try {
        const record = await (require('../../lib/connection').default).tasks.findUnique({ where: { Id: parseInt(String(taskId)) } });
        if (record) taskData = { ...record };
      } catch {}
    }
    if (!Object.values(TaskActionEvent).includes(event)) { return res.status(400).json({ success: false, message: `Invalid event: ${event}. Valid events are: ${Object.values(TaskActionEvent).join(', ')}` }); }
    const isRecent = await actionService.hasEventTriggeredRecently(parseInt(String(taskId)), event as string, 10);
    if (isRecent) {
      console.log(`⏱️ Skipping duplicate trigger for task ${taskId}, event ${event} within recent window`);
      return res.json({ success: true, message: `Skipped duplicate trigger for task ${taskId}, event: ${event}` });
    }
    console.log(`🔔 Enqueuing API actions for task ${taskId}, event: ${event}`);
    await actionService.triggerApiActionsForEvent(parseInt(String(taskId)), event as string, taskData);
    return res.json({ success: true, message: `API actions enqueued for task ${taskId}, event: ${event}` });
  } catch (error) { console.error('Failed to trigger task actions:', error); next(error); }
}

export async function executeApiActionEndpoint(req: Request, res: Response, next: NextFunction) {
  try {
    const { apiDefinitionId, taskId, event, taskData } = req.body || {};
    if (!apiDefinitionId || !event) {
      return res.status(400).json({ success: false, message: 'apiDefinitionId and event are required' });
    }
    const apiDefinition = await actionService.getApiDefinitionById(parseInt(String(apiDefinitionId)));
    if (!apiDefinition) {
      return res.status(404).json({ success: false, message: 'API definition not found' });
    }
    const result = await actionService.executeApiAction(apiDefinition, taskId ? parseInt(String(taskId)) : 0, event as string, taskData);
    return res.json({ success: true, message: result.IsSuccess ? 'API call successful' : 'API call failed', data: serializeBigInt(result) });
  } catch (error) { next(error); }
}
