import { TaskActionEvent, HttpMethod, ActionType } from './action.events';

// ============================================================================
// API DEFINITION TYPES
// ============================================================================

export interface ApiDefinition {
  Id: number;
  Name: string;
  Description?: string;
  Endpoint: string;
  HttpMethod: HttpMethod;
  Headers?: Record<string, string>;
  Body?: Record<string, any>;
  IsActive: boolean;
  CreatedAt: Date;
  UpdatedAt: Date;
}

export interface CreateApiDefinitionDto {
  name: string;
  description?: string;
  endpoint: string;
  httpMethod: HttpMethod;
  headers?: Record<string, string>;
  body?: Record<string, any>;
  isActive?: boolean;
}

export interface UpdateApiDefinitionDto {
  name?: string;
  description?: string;
  endpoint?: string;
  httpMethod?: HttpMethod;
  headers?: Record<string, string>;
  body?: Record<string, any>;
  isActive?: boolean;
}

// ============================================================================
// TASK API ACTION TYPES
// ============================================================================

export interface TaskApiAction {
  Id: number;
  TaskId: number;
  ApiDefinitionId: number;
  TriggerEvent: TaskActionEvent;
  IsActive: boolean;
  CreatedAt: Date;
  UpdatedAt: Date;
  ApiDefinition?: ApiDefinition;
}

export interface CreateTaskApiActionDto {
  taskId: number;
  apiDefinitionId: number;
  triggerEvent: TaskActionEvent;
  isActive?: boolean;
}

export interface UpdateTaskApiActionDto {
  apiDefinitionId?: number;
  triggerEvent?: TaskActionEvent;
  isActive?: boolean;
}

// For creating API actions inline with task creation
export interface InlineApiActionDto {
  // Either use existing API definition
  apiDefinitionId?: number;
  // Or create a new one inline
  apiDefinition?: CreateApiDefinitionDto;
  // Required: which event triggers this action
  triggerEvent: TaskActionEvent;
  isActive?: boolean;
}

// ============================================================================
// API CALL TYPES (for logging)
// ============================================================================

export interface ApiCall {
  Id: number;
  ApiDefinitionId: number;
  TaskId?: number;
  TriggerEvent: string;
  RequestUrl: string;
  RequestMethod: HttpMethod;
  RequestHeaders?: Record<string, string>;
  RequestBody?: Record<string, any>;
  ResponseStatus?: number;
  ResponseBody?: any;
  ErrorMessage?: string;
  ExecutedAt: Date;
  DurationMs?: number;
  IsSuccess: boolean;
  ApiDefinition?: ApiDefinition;
}

export interface ApiCallFilters {
  apiDefinitionId?: number;
  taskId?: number;
  triggerEvent?: string;
  isSuccess?: boolean;
  startDate?: Date;
  endDate?: Date;
}

// ============================================================================
// RESPONSE TYPES
// ============================================================================

export interface ApiDefinitionResponse extends ApiDefinition {
  taskApiActionsCount?: number;
}

export interface TaskApiActionResponse extends TaskApiAction {
  ApiDefinition?: ApiDefinition;
}

export interface ApiCallResponse extends ApiCall {
  ApiDefinition?: ApiDefinition;
}

export interface ApiCallListResponse {
  calls: ApiCallResponse[];
  total: number;
  page: number;
  limit: number;
}
