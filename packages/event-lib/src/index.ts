import axios, { AxiosResponse } from 'axios';
import * as fs from 'fs';
import * as path from 'path';

interface EventConfig {
  endpoint: string;
  'api-key': string;
  'http-method': string;
  parameters: Record<string, any>;
}

export default async function eventHandler(params: any, fileName: string) {
  let create_task_event: EventConfig[] = [];
  try {
    const jsonPath = path.join(__dirname, '..', 'json', `${fileName}.json`);
    const jsonContent = fs.readFileSync(jsonPath, 'utf-8');
    create_task_event = JSON.parse(jsonContent);
  } catch (err) {
    console.error(`Event-lib: event file not found for ${fileName}.json`, err);
    return;
  }

  // Process events without blocking
  create_task_event.forEach(async (event: EventConfig) => {
    try {
      await sendEventWithRetry(event, params);
    } catch (error) {
      console.error(`Failed to send event to ${event.endpoint} after retries:`, error);
    }
  });
}

async function sendEventWithRetry(event: EventConfig, params: any, maxRetries: number = 3) {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const methodUpper = (event['http-method'] || 'GET').toUpperCase();
      const apiKey = (event as any)['api-key'] || (event as any)['x-api-key'] || (event as any)['X-API-Key'];
      const headers: Record<string, any> = {};
      if (apiKey) {
        headers['x-api-key'] = apiKey;
      }

      const config: any = {
        method: methodUpper,
        url: event.endpoint,
        headers,
        timeout: 10000 // 10 second timeout
      };

      // For GET/DELETE/HEAD, axios uses `params` for query params
      if (['GET', 'DELETE', 'HEAD'].includes(methodUpper)) {
        config.params = { ...event.parameters, ...params };
      } else {
        config.data = { ...event.parameters, ...params };
      }
      
      const response = await axios(config);
      console.log(`Event sent successfully to ${event.endpoint} on attempt ${attempt}`);
      return response.data;
    } catch (error) {
      lastError = error;
      console.warn(`Attempt ${attempt} failed for ${event.endpoint}:`, error);
      
      if (attempt < maxRetries) {
        // Exponential backoff: wait 1s, 2s, 4s...
        const delay = Math.pow(2, attempt - 1) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}