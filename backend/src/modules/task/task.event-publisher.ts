import eventHandler from '@task-manager/event-lib';
import { TASK_EVENTS } from './task.constants';

const eventMap: Record<string, string> = {
  [TASK_EVENTS.CREATED]: 'create-task-event',
  [TASK_EVENTS.ASSIGNED]: 'task-assigned-event',
  [TASK_EVENTS.STARTED]: 'task-start-event',
  [TASK_EVENTS.COMPLETED]: 'task-end-event',
  [TASK_EVENTS.OVERDUE]: 'task-overdue-event',
  [TASK_EVENTS.ESCALATED]: 'task-escalation-event',
  [TASK_EVENTS.RESCHEDULED]: 'task-reschedule-event',
};

export async function publishTaskEvent(payload: any, eventName: string) {
  const fileName = eventMap[eventName];
  if (!fileName) return; // No config for this event
  try {
    await eventHandler(payload, fileName);
  } catch (err) {
    console.error('Failed to publish task event', err);
  }
}
