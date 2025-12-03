import prisma from '../../lib/connection';
import axios from 'axios';
import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { TaskActionEvent } from './action.events';

export async function createApiDefinition(data: any) {
  const apiDefinition = await prisma.apidefinitions.create({
    data: {
      Name: data.name,
      Description: data.description,
      Endpoint: data.endpoint,
      HttpMethod: data.httpMethod,
      Headers: data.headers ? JSON.parse(JSON.stringify(data.headers)) : undefined,
      Body: data.body ? JSON.parse(JSON.stringify(data.body)) : undefined,
      IsActive: data.isActive ?? true,
    },
  });
  return Number(apiDefinition.Id);
}

export async function updateApiDefinition(id: number, data: any) {
  const updateData: any = {};
  if (data.name !== undefined) updateData.Name = data.name;
  if (data.description !== undefined) updateData.Description = data.description;
  if (data.endpoint !== undefined) updateData.Endpoint = data.endpoint;
  if (data.httpMethod !== undefined) updateData.HttpMethod = data.httpMethod;
  if (data.headers !== undefined) updateData.Headers = JSON.parse(JSON.stringify(data.headers));
  if (data.body !== undefined) updateData.Body = JSON.parse(JSON.stringify(data.body));
  if (data.isActive !== undefined) updateData.IsActive = data.isActive;
  await prisma.apidefinitions.update({ where: { Id: id }, data: updateData });
}

export async function deleteApiDefinition(id: number) {
  await prisma.apidefinitions.delete({ where: { Id: id } });
}

export async function getApiDefinitionById(id: number) {
  const apiDefinition = await prisma.apidefinitions.findUnique({ where: { Id: id } });
  if (!apiDefinition) return null;
  return {
    Id: Number(apiDefinition.Id),
    Name: apiDefinition.Name,
    Description: apiDefinition.Description || undefined,
    Endpoint: apiDefinition.Endpoint,
    HttpMethod: apiDefinition.HttpMethod,
    Headers: apiDefinition.Headers,
    Body: apiDefinition.Body,
    IsActive: apiDefinition.IsActive,
    CreatedAt: apiDefinition.CreatedAt,
    UpdatedAt: apiDefinition.UpdatedAt,
  };
}

export async function getAllApiDefinitions(page = 1, limit = 50) {
  const total = await prisma.apidefinitions.count();
  const apiDefinitions = await prisma.apidefinitions.findMany({
    skip: (page - 1) * limit,
    take: limit,
    orderBy: { CreatedAt: 'desc' }
  });
  return { apiDefinitions: apiDefinitions.map(api => ({
    Id: Number(api.Id), Name: api.Name, Description: api.Description || undefined, Endpoint: api.Endpoint, HttpMethod: api.HttpMethod, Headers: api.Headers, Body: api.Body, IsActive: api.IsActive, CreatedAt: api.CreatedAt, UpdatedAt: api.UpdatedAt
  })), total };
}

export async function createTaskApiAction(data: any) {
  const taskApiAction = await prisma.taskapiactions.create({
    data: {
      TaskId: data.taskId,
      ApiDefinitionId: data.apiDefinitionId,
      TriggerEvent: data.triggerEvent,
      IsActive: data.isActive ?? true,
    }
  });
  return Number(taskApiAction.Id);
}

export async function updateTaskApiAction(id: number, data: any) {
  const updateData: any = {};
  if (data.apiDefinitionId !== undefined) updateData.ApiDefinitionId = data.apiDefinitionId;
  if (data.triggerEvent !== undefined) updateData.TriggerEvent = data.triggerEvent;
  if (data.isActive !== undefined) updateData.IsActive = data.isActive;
  await prisma.taskapiactions.update({ where: { Id: id }, data: updateData });
}

export async function deleteTaskApiAction(id: number) {
  await prisma.taskapiactions.delete({ where: { Id: id } });
}

export async function getTaskApiActionById(id: number) {
  const action = await prisma.taskapiactions.findUnique({ where: { Id: id }, include: { apidefinitions: true } as any });
  if (!action) return null;
  return {
    Id: Number(action.Id),
    TaskId: Number(action.TaskId),
    ApiDefinitionId: Number(action.ApiDefinitionId),
    TriggerEvent: action.TriggerEvent as TaskActionEvent,
    IsActive: action.IsActive,
    CreatedAt: action.CreatedAt,
    UpdatedAt: action.UpdatedAt,
    ApiDefinition: action.apidefinitions ? (() => {
      const api: any = action.apidefinitions as any;
      return {
        Id: Number(api.Id),
        Name: api.Name,
        Description: api.Description || undefined,
        Endpoint: api.Endpoint,
        HttpMethod: api.HttpMethod,
        Headers: api.Headers,
        Body: api.Body,
        IsActive: api.IsActive,
        CreatedAt: api.CreatedAt,
        UpdatedAt: api.UpdatedAt
      };
    })() : undefined
  };
}

export async function getTaskApiActions(taskId: number) {
  const actions = await prisma.taskapiactions.findMany({ where: { TaskId: taskId }, include: { apidefinitions: true } as any, orderBy: { CreatedAt: 'desc' } });
  return actions.map(action => ({
    Id: Number(action.Id),
    TaskId: Number(action.TaskId),
    ApiDefinitionId: Number(action.ApiDefinitionId),
    TriggerEvent: action.TriggerEvent as TaskActionEvent,
    IsActive: action.IsActive,
    CreatedAt: action.CreatedAt,
    UpdatedAt: action.UpdatedAt,
    ApiDefinition: action.apidefinitions ? (() => {
      const api: any = action.apidefinitions as any;
      return { Id: Number(api.Id), Name: api.Name, Description: api.Description || undefined, Endpoint: api.Endpoint, HttpMethod: api.HttpMethod, Headers: api.Headers, Body: api.Body, IsActive: api.IsActive, CreatedAt: api.CreatedAt, UpdatedAt: api.UpdatedAt };
    })() : undefined
  }));
}

export async function createTaskApiActionsFromInline(taskId: number, actions: any[]) {
  for (const action of actions) {
    let apiDefinitionId: number;
    if (action.apiDefinitionId) {
      apiDefinitionId = action.apiDefinitionId;
    } else if (action.apiDefinition) {
      apiDefinitionId = await createApiDefinition(action.apiDefinition);
    } else {
      throw new Error('Either apiDefinitionId or apiDefinition must be provided');
    }
    await createTaskApiAction({ taskId, apiDefinitionId, triggerEvent: action.triggerEvent, isActive: action.isActive });
  }
}

export async function deleteAllTaskApiActions(taskId: number) {
  await prisma.taskapiactions.deleteMany({ where: { TaskId: taskId } });
}

export async function executeApiAction(apiDefinition: any, taskId: number, triggerEvent: string, taskData: any) {
  const startTime = Date.now();
  let responseStatus: any;
  let responseBody: any;
  let errorMessage: string | undefined;
  let isSuccess = false;
  let requestBody: any = apiDefinition.Body;
  if (requestBody && taskData) {
    requestBody = replaceTemplateVariables(requestBody, taskData);
  }
  try {
    const methodUpper = (apiDefinition.HttpMethod || 'GET').toUpperCase();
    const config: any = { method: methodUpper, url: apiDefinition.Endpoint, headers: apiDefinition.Headers || {}, timeout: 30000 };
    if (['POST', 'PUT', 'PATCH'].includes(methodUpper) && requestBody) config.data = requestBody;
    else if (['GET', 'DELETE', 'HEAD'].includes(methodUpper) && requestBody) config.params = requestBody;
    const response = await axios(config);
    responseStatus = response.status; responseBody = response.data; isSuccess = response.status >= 200 && response.status < 300;
  } catch (err: any) {
    if (axios.isAxiosError(err)) { responseStatus = err.response?.status; responseBody = err.response?.data; errorMessage = err.message; } else { errorMessage = err.message || 'Unknown error'; }
    isSuccess = false;
  }
  const durationMs = Date.now() - startTime;
  const apiCall = await prisma.apicalls.create({ data: {
    ApiDefinitionId: apiDefinition.Id, TaskId: taskId, TriggerEvent: triggerEvent, RequestUrl: apiDefinition.Endpoint,
    RequestMethod: apiDefinition.HttpMethod, RequestHeaders: apiDefinition.Headers ? JSON.parse(JSON.stringify(apiDefinition.Headers)) : undefined,
    RequestBody: requestBody ? JSON.parse(JSON.stringify(requestBody)) : undefined, ResponseStatus: responseStatus,
    ResponseBody: responseBody ? JSON.parse(JSON.stringify(responseBody)) : undefined, ErrorMessage: errorMessage, DurationMs: durationMs, IsSuccess: isSuccess
  } });
  return { Id: Number(apiCall.Id), ApiDefinitionId: Number(apiCall.ApiDefinitionId), TaskId: apiCall.TaskId ? Number(apiCall.TaskId) : undefined, TriggerEvent: apiCall.TriggerEvent, RequestUrl: apiCall.RequestUrl, RequestMethod: apiCall.RequestMethod, RequestHeaders: apiCall.RequestHeaders, RequestBody: apiCall.RequestBody, ResponseStatus: apiCall.ResponseStatus || undefined, ResponseBody: apiCall.ResponseBody, ErrorMessage: apiCall.ErrorMessage || undefined, ExecutedAt: apiCall.ExecutedAt, DurationMs: apiCall.DurationMs || undefined, IsSuccess: apiCall.IsSuccess };
}

const redis = new Redis({
  port: parseInt(process.env.REDIS_PORT as string || '6379'),
  host: process.env.REDIS_HOST as string || '127.0.0.1',
  username: process.env.REDIS_USERNAME as string || 'default',
  password: process.env.REDIS_PASSWORD as string || undefined,
  maxRetriesPerRequest: null
});
const specificHooksQueue = new Queue('specific-hooks', { connection: redis });

export async function triggerApiActionsForEvent(taskId: number, triggerEvent: TaskActionEvent | string, taskData: any) {
  const eventStr = String(triggerEvent);
  if (isIdempotentEvent(eventStr)) {
    const alreadyTriggered = await hasEventBeenTriggered(taskId, eventStr);
    if (alreadyTriggered) {
      return;
    }
  }
  const actions = await prisma.taskapiactions.findMany({ where: { TaskId: taskId, TriggerEvent: triggerEvent, IsActive: true }, include: { apidefinitions: true } as any });
  const jobs = actions
    .filter(a => (a.apidefinitions as any)?.IsActive)
    .map(a => {
      const def: any = a.apidefinitions as any;
      return {
        name: 'execute-api',
        data: {
          apiDefinitionId: Number(def.Id),
          taskId: Number(taskId),
          event: String(triggerEvent),
          taskData
        },
        opts: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 1000 }
        }
      };
    });
  if (jobs.length > 0) {
    await specificHooksQueue.addBulk(jobs as any);
  }
}

function replaceTemplateVariables(template: any, data: any): any {
  if (typeof template === 'string') {
    return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, path) => {
      const value = getNestedValue(data, path);
      return value !== undefined ? String(value) : match;
    });
  }
  if (Array.isArray(template)) return template.map(item => replaceTemplateVariables(item, data));
  if (typeof template === 'object' && template !== null) {
    const result: any = {};
    for (const key in template) result[key] = replaceTemplateVariables(template[key], data);
    return result;
  }
  return template;
}

function getNestedValue(obj: any, path: string) {
  return path.split('.').reduce((current: any, key: string) => current && current[key] !== undefined ? current[key] : undefined, obj);
}

function isIdempotentEvent(event: string): boolean {
  return [
    TaskActionEvent.TASK_CREATED,
    TaskActionEvent.TASK_STARTED,
    TaskActionEvent.TASK_COMPLETED,
    TaskActionEvent.TASK_OVERDUE,
    TaskActionEvent.TASK_ESCALATED,
    TaskActionEvent.TASK_REOPENED,
  ].includes(event as TaskActionEvent);
}

export async function getApiCalls(filters: any, page = 1, limit = 50) {
  const where: any = {};
  if (filters.apiDefinitionId) where.ApiDefinitionId = filters.apiDefinitionId;
  if (filters.taskId) where.TaskId = filters.taskId;
  if (filters.triggerEvent) where.TriggerEvent = filters.triggerEvent;
  if (filters.isSuccess !== undefined) where.IsSuccess = filters.isSuccess;
  if (filters.startDate || filters.endDate) { where.ExecutedAt = {}; if (filters.startDate) where.ExecutedAt.gte = filters.startDate; if (filters.endDate) where.ExecutedAt.lte = filters.endDate; }
  const total = await prisma.apicalls.count({ where });
  const calls = await prisma.apicalls.findMany({ where, include: { apidefinitions: true } as any, skip: (page - 1) * limit, take: limit, orderBy: { ExecutedAt: 'desc' } });
  return { calls: calls.map(call => ({ Id: Number(call.Id), ApiDefinitionId: Number(call.ApiDefinitionId), TaskId: call.TaskId ? Number(call.TaskId) : undefined, TriggerEvent: call.TriggerEvent, RequestUrl: call.RequestUrl, RequestMethod: call.RequestMethod, RequestHeaders: call.RequestHeaders, RequestBody: call.RequestBody, ResponseStatus: call.ResponseStatus || undefined, ResponseBody: call.ResponseBody, ErrorMessage: call.ErrorMessage || undefined, ExecutedAt: call.ExecutedAt, DurationMs: call.DurationMs || undefined, IsSuccess: call.IsSuccess, ApiDefinition: call.apidefinitions ? (() => { const api: any = call.apidefinitions as any; return { Id: Number(api.Id), Name: api.Name, Description: api.Description || undefined, Endpoint: api.Endpoint, HttpMethod: api.HttpMethod, Headers: api.Headers, Body: api.Body, IsActive: api.IsActive, CreatedAt: api.CreatedAt, UpdatedAt: api.UpdatedAt }; })() : undefined })), total };
}

export async function hasEventBeenTriggered(taskId: number, event: string) {
  const count = await prisma.apicalls.count({ where: { TaskId: taskId, TriggerEvent: event } });
  return count > 0;
}

export async function hasEventTriggeredRecently(taskId: number, event: string, windowSeconds: number = 10) {
  const since = new Date(Date.now() - windowSeconds * 1000);
  const recent = await prisma.apicalls.findFirst({ where: { TaskId: taskId, TriggerEvent: event, ExecutedAt: { gte: since } } });
  return !!recent;
}
