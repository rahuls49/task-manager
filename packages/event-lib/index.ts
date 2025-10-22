import axios, { AxiosResponse } from 'axios';

interface EventConfig {
  endpoint: string;
  'api-key': string;
  'http-method': string;
  parameters: Record<string, any>;
}

export default async function eventHandler(params: any, fileName: string) {
  const create_task_event: EventConfig[] = require(`../json/${fileName}.json`);
  const promises = create_task_event.map((event: EventConfig) => {
    const config = {
      method: event['http-method'],
      url: event.endpoint,
      headers: {
        'api-key': event['api-key']
      },
      data: { ...event.parameters, ...params }
    };
    return axios(config);
  });

  try {
    const responses = await Promise.all(promises);
    return responses.map((res: AxiosResponse) => res.data);
  } catch (error) {
    console.error('Error sending create task event:', error);
    throw error;
  }
}