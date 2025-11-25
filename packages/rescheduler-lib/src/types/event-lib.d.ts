declare module '@task-manager/event-lib' {
  export interface EventPayload {
    [key: string]: any;
  }

  export default function eventHandler(params: EventPayload, fileName: string): Promise<void>;
}
