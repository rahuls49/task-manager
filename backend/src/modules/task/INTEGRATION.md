# Task Management System Integration Guide

## Quick Start

### 1. Import and Setup Routes

```typescript
import { taskRouter, managementRouter } from './modules/task';

// In your main app.ts or server setup
app.use('/api/tasks', taskRouter);
app.use('/api/management', managementRouter);
```

### 2. Initialize the System

```bash
# Initialize the system with default statuses, priorities, and escalation rules
curl -X POST http://localhost:3000/api/management/initialize
```

### 3. Create Basic Data

```bash
# Create assignees
curl -X POST http://localhost:3000/api/management/assignees \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Smith", 
    "email": "john.smith@company.com"
  }'

# Create groups
curl -X POST http://localhost:3000/api/management/groups \
  -H "Content-Type: application/json" \
  -d '{
    "groupName": "Development Team"
  }'

# Add user to group
curl -X POST http://localhost:3000/api/management/groups/1/members \
  -H "Content-Type: application/json" \
  -d '{"userId": 1}'
```

### 4. Create Your First Task

```bash
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Implement user authentication",
    "description": "Add JWT-based authentication to the application",
    "dueDate": "2024-12-31",
    "dueTime": "17:00:00",
    "statusId": 1,
    "priorityId": 3,
    "assigneeIds": [1],
    "groupIds": [1]
  }'
```

## Common Usage Patterns

### 1. Task Lifecycle Management

```typescript
// Create task
const taskData = {
  title: "New Feature Implementation",
  description: "Implement the new dashboard feature",
  dueDate: "2024-12-31",
  statusId: 1, // To Do
  priorityId: 3, // High
  assigneeIds: [1, 2]
};

// Start work on task
await updateTask(taskId, { statusId: 2 }); // In Progress

// Complete task
await updateTask(taskId, { statusId: 3 }); // Completed

// Reopen if needed
await reopenTask(taskId);
```

### 2. Subtask Management

```typescript
// Create parent task
const parentTask = await createTask({
  title: "Website Redesign Project",
  description: "Complete website redesign",
  dueDate: "2024-12-31"
});

// Create subtasks
const subtask1 = await createSubtask(parentTask.id, {
  title: "Design wireframes",
  dueDate: "2024-11-15"  // Before parent due date
});

const subtask2 = await createSubtask(parentTask.id, {
  title: "Implement frontend",
  dueDate: "2024-12-15"
});
```

### 3. Assignment Management

```typescript
// Assign to individual users
await assignTask(taskId, {
  assigneeIds: [1, 2, 3]
});

// Assign to groups (all group members get the task)
await assignTask(taskId, {
  groupIds: [1, 2]
});

// Mixed assignment
await assignTask(taskId, {
  assigneeIds: [1],
  groupIds: [2]
});

// Unassign specific user
await unassignTask(taskId, 1);
```

### 4. Escalation Handling

```typescript
// Manual escalation
await escalateTask(taskId, userId, "Task is blocking critical path");

// Set up automatic escalation processing (run periodically)
setInterval(async () => {
  await processEscalations();
}, 60 * 60 * 1000); // Every hour
```

### 5. Filtering and Searching

```typescript
// Get overdue tasks
const overdueTasks = await getTasks({ overdue: true });

// Get tasks by status
const inProgressTasks = await getTasks({ 
  status: [2] // In Progress
});

// Get tasks assigned to specific user
const userTasks = await getTasks({ 
  assigneeId: 1 
});

// Get subtasks of a parent
const subtasks = await getTasks({ 
  parentTaskId: parentTaskId 
});

// Complex filtering
const complexFilter = await getTasks({
  status: [1, 2], // To Do or In Progress
  priority: [3, 4, 5], // High, Critical, Urgent
  assigneeId: 1,
  overdue: false
});
```

## Advanced Features

### 1. Recurring Tasks

```typescript
// Create recurrence pattern
const recurrenceId = await createTaskRecurrence({
  frequency: "weekly",
  interval: 1,
  daysOfWeek: '["monday", "wednesday", "friday"]',
  endDate: "2024-12-31"
});

// Create recurring task
const recurringTask = await createTask({
  title: "Weekly Status Report",
  isRecurring: true,
  recurrenceId: recurrenceId
});
```

### 2. Task Statistics Dashboard

```typescript
// Get comprehensive task statistics
const stats = await getTaskStats();

// Example response:
{
  total: 150,
  completed: 45,
  inProgress: 30,
  overdue: 15,
  escalated: 5,
  byPriority: {
    "Low": 20,
    "Medium": 80,
    "High": 35,
    "Critical": 15
  },
  byStatus: {
    "To Do": 60,
    "In Progress": 30,
    "Completed": 45,
    "Blocked": 10
  }
}
```

### 3. Bulk Operations

```typescript
// Import from CSV
const formData = new FormData();
formData.append('file', csvFile);

await fetch('/api/tasks/import/csv', {
  method: 'POST',
  body: formData
});

// Bulk status update (implement custom endpoint)
const taskIds = [1, 2, 3, 4, 5];
for (const taskId of taskIds) {
  await updateTask(taskId, { statusId: 3 });
}
```

## Integration with Frontend

### React Example

```jsx
import React, { useState, useEffect } from 'react';

const TaskManager = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      const response = await fetch('/api/tasks');
      const result = await response.json();
      
      if (result.success) {
        setTasks(result.data);
      }
    } catch (error) {
      console.error('Failed to load tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const createTask = async (taskData) => {
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData)
      });
      
      const result = await response.json();
      
      if (result.success) {
        await loadTasks(); // Reload tasks
      }
    } catch (error) {
      console.error('Failed to create task:', error);
    }
  };

  const completeTask = async (taskId) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/complete`, {
        method: 'PATCH'
      });
      
      const result = await response.json();
      
      if (result.success) {
        await loadTasks(); // Reload tasks
      }
    } catch (error) {
      console.error('Failed to complete task:', error);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h1>Task Manager</h1>
      <div className="tasks">
        {tasks.map(task => (
          <div key={task.Id} className="task-item">
            <h3>{task.Title}</h3>
            <p>{task.Description}</p>
            <p>Status: {task.status?.StatusName}</p>
            <p>Priority: {task.priority?.PriorityName}</p>
            <p>Due: {task.DueDate} {task.DueTime}</p>
            
            {task.assignees?.length > 0 && (
              <div>
                <strong>Assignees:</strong>
                {task.assignees.map(assignee => (
                  <span key={assignee.Id}>{assignee.Name} </span>
                ))}
              </div>
            )}
            
            {task.StatusId !== 3 && (
              <button onClick={() => completeTask(task.Id)}>
                Complete
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TaskManager;
```

## Error Handling

```typescript
// Comprehensive error handling
const handleTaskOperation = async (operation: () => Promise<any>) => {
  try {
    const result = await operation();
    
    if (!result.success) {
      throw new Error(result.message);
    }
    
    return result.data;
  } catch (error) {
    if (error instanceof Error) {
      // Handle validation errors
      if (error.message.includes('Validation failed')) {
        showValidationError(error.message);
      }
      // Handle not found errors
      else if (error.message.includes('not found')) {
        showNotFoundError(error.message);
      }
      // Handle other errors
      else {
        showGenericError('An unexpected error occurred');
      }
    }
    
    throw error;
  }
};

// Usage
try {
  await handleTaskOperation(async () => {
    return await createTask(taskData);
  });
} catch (error) {
  console.error('Task operation failed:', error);
}
```

## Performance Optimization

### 1. Pagination

```typescript
// Implement pagination for large datasets
const loadTasksWithPagination = async (page = 1, limit = 20) => {
  const response = await fetch(`/api/tasks?page=${page}&limit=${limit}`);
  const result = await response.json();
  
  return {
    tasks: result.data,
    pagination: result.pagination
  };
};
```

### 2. Caching

```typescript
// Cache frequently accessed data
const statusCache = new Map();

const getTaskStatuses = async () => {
  if (statusCache.has('statuses')) {
    return statusCache.get('statuses');
  }
  
  const response = await fetch('/api/management/statuses');
  const result = await response.json();
  
  if (result.success) {
    statusCache.set('statuses', result.data);
    return result.data;
  }
  
  return [];
};
```

## Monitoring and Logging

```typescript
// Task event monitoring
const monitorTaskEvents = () => {
  // This would typically integrate with your logging system
  console.log('Task events are automatically logged by the system');
  
  // You could implement real-time notifications here
  // e.g., WebSocket connections, push notifications, etc.
};

// Escalation monitoring
const monitorEscalations = async () => {
  const stats = await getTaskStats();
  
  if (stats.escalated > 10) {
    // Alert management about high escalation count
    sendAlert('High escalation count detected');
  }
  
  if (stats.overdue > 20) {
    // Alert about overdue tasks
    sendAlert('High overdue task count');
  }
};
```

This integration guide provides everything you need to implement the comprehensive task management system in your application.