# Webhook Package

This package provides webhook functionality for sending events to external services like n8n.

## Installation

```bash
pnpm add @task-manager/webhook
```

## Usage

### Basic Usage

```typescript
import { createN8nWebhook } from '@task-manager/webhook';

// Create a webhook service for n8n
const n8nWebhook = createN8nWebhook('https://your-n8n-instance.com/webhook/task-created');

// Send task created event
await n8nWebhook.sendTaskCreatedEvent({
  id: 123,
  title: 'New Task',
  description: 'Task description',
  status: 'todo',
  createdAt: new Date()
});
```

### Advanced Usage

```typescript
import { createWebhookService } from '@task-manager/webhook';

// Create a custom webhook service
const webhook = createWebhookService({
  url: 'https://api.example.com/webhook',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your-token'
  },
  timeout: 5000
});

// Send custom event
await webhook.sendEvent({
  event: 'task.created',
  data: { taskId: 123, title: 'New Task' },
  source: 'task-manager'
});
```

### Integration with Task Creation

To integrate with task creation events, you can modify the task controller:

```typescript
import { createN8nWebhook } from '@task-manager/webhook';

const n8nWebhook = createN8nWebhook(process.env.N8N_WEBHOOK_URL!);

export async function createTask(req: Request, res: Response, next: NextFunction) {
  try {
    const taskData: CreateTaskDto = req.body;
    const userId = req.user?.id ? parseInt(req.user.id as string) : undefined;

    const taskId = await taskService.createTask(taskData, userId);
    const createdTask = await taskService.getTaskById(taskId);

    // Send webhook to n8n
    try {
      await n8nWebhook.sendTaskCreatedEvent(createdTask);
    } catch (error) {
      console.error('Failed to send webhook to n8n:', error);
      // Don't fail the request if webhook fails
    }

    return res.status(201).json({
      success: true,
      message: "Task created successfully",
      data: createdTask
    });
  } catch (error) {
    next(error);
  }
}
```

## Configuration

Update the `json/n8n-webhook.json` file with your n8n webhook URL and any required API keys:

```json
[
  {
    "url": "https://your-n8n-instance.com/webhook/your-webhook-id",
    "method": "POST",
    "headers": {
      "Content-Type": "application/json",
      "X-API-Key": "your-n8n-api-key-if-needed"
    },
    "timeout": 10000
  }
]
```

## Events

The webhook service supports the following event types:

- `task.created` - Sent when a new task is created
- `task.updated` - Sent when a task is updated
- `task.deleted` - Sent when a task is deleted

Each event includes:
- `event`: The event type
- `data`: The event data
- `timestamp`: ISO timestamp of the event
- `source`: Source system (defaults to 'task-manager')