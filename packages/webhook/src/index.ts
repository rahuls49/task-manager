import axios, { AxiosResponse } from 'axios';

interface WebhookConfig {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH';
  headers?: Record<string, string>;
  timeout?: number;
}

interface WebhookEvent {
  event: string;
  data: any;
  timestamp?: string;
  source?: string;
}

class WebhookService {
  private config: WebhookConfig;

  constructor(config: WebhookConfig) {
    this.config = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000,
      ...config
    };
  }

  async sendEvent(event: WebhookEvent): Promise<AxiosResponse> {
    const payload = {
      ...event,
      timestamp: event.timestamp || new Date().toISOString(),
      source: event.source || 'task-manager'
    };

    try {
      const response = await axios({
        method: this.config.method,
        url: this.config.url,
        headers: this.config.headers,
        data: payload,
        timeout: this.config.timeout
      });

      console.log(`Webhook sent successfully to ${this.config.url} for event: ${event.event}`);
      return response;
    } catch (error) {
      console.error(`Failed to send webhook to ${this.config.url}:`, error);
      throw error;
    }
  }

  async sendTaskCreatedEvent(taskData: any): Promise<AxiosResponse> {
    const event: WebhookEvent = {
      event: 'task.created',
      data: taskData
    };

    return this.sendEvent(event);
  }

  async sendTaskUpdatedEvent(taskData: any, changes?: any): Promise<AxiosResponse> {
    const event: WebhookEvent = {
      event: 'task.updated',
      data: {
        task: taskData,
        changes
      }
    };

    return this.sendEvent(event);
  }

  async sendTaskDeletedEvent(taskId: number): Promise<AxiosResponse> {
    const event: WebhookEvent = {
      event: 'task.deleted',
      data: { taskId }
    };

    return this.sendEvent(event);
  }
}

// Factory function to create webhook service for n8n
export function createN8nWebhook(url: string, apiKey?: string): WebhookService {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };

  if (apiKey) {
    headers['X-API-Key'] = apiKey;
  }

  return new WebhookService({
    url,
    method: 'POST',
    headers
  });
}

// Generic webhook service creator
export function createWebhookService(config: WebhookConfig): WebhookService {
  return new WebhookService(config);
}

// Default export for convenience
export default WebhookService;