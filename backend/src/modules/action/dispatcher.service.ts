import { Queue } from 'bullmq';
import Redis from 'ioredis';
import prisma from '../../lib/connection';
import { TriggerEvent, Task } from '@task-manager/prisma-client';

const redis = new Redis({
  port: parseInt(process.env.REDIS_PORT || '6379'),
  host: process.env.REDIS_HOST || '127.0.0.1',
  username: process.env.REDIS_USERNAME || 'default',
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
});

const apiExecutionQueue = new Queue('api-execution', { connection: redis });

export async function dispatchTaskEvent(eventType: TriggerEvent, taskData: Task): Promise<void> {
  // Query ApiActionDefinition records matching the triggerEvent and taskId conditions
  const definitions = await prisma.apiActionDefinition.findMany({
    where: {
      triggerEvent: eventType,
      OR: [
        { taskId: null },
        { taskId: taskData.Id },
      ],
    },
  });

  // Fan-out to queue: add a job for each definition
  const jobs = definitions.map((definition) => ({
    name: 'execute-api-action',
    data: {
      actionDefinitionId: definition.id,
      contextData: taskData,
    },
    opts: {
      jobId: `${taskData.Id}-${eventType}-${definition.id}-${Date.now()}`, // Unique jobId to prevent de-duplication
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
    },
  }));

  if (jobs.length > 0) {
    await apiExecutionQueue.addBulk(jobs);
  }
}