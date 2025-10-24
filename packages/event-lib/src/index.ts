import axios, { AxiosResponse } from 'axios';

interface EventConfig {
  endpoint: string;
  'api-key': string;
  'http-method': string;
  parameters: Record<string, any>;
}

export default async function eventHandler(params: any, fileName: string) {
  const create_task_event: EventConfig[] = require(`../json/${fileName}.json`);
  
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
      const config = {
        method: event['http-method'],
        url: event.endpoint,
        headers: {
          'api-key': event['api-key']
        },
        data: { ...event.parameters, ...params },
        timeout: 10000 // 10 second timeout
      };
      
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