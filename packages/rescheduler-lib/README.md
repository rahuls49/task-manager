# Rescheduler Library

A powerful recurring task scheduler for the Task Manager application using `node-schedule`.

## Features

### 1. Daily Recurrence
- **Every N Days**: Run tasks every 1, 2, 3... days
- **Intra-day Repetition**:
  - Every N minutes (e.g., every 30 minutes)
  - Every N hours (e.g., every 4 hours)

**Example**: Create a task that runs every 2 days at 9:00 AM
```json
{
  "recurrenceType": "DAILY",
  "dailyRule": {
    "recurEveryXDays": 2
  },
  "startTime": "09:00:00"
}
```

**Example**: Create a task that runs every 30 minutes
```json
{
  "recurrenceType": "DAILY",
  "dailyRule": {
    "recurEveryXDays": 1,
    "intraDayFrequencyType": "MINUTES",
    "intraDayInterval": 30
  }
}
```

### 2. Weekly Recurrence
- Run on specific days of the week (any combination)
- Every N weeks (e.g., every 2 weeks)

**Example**: Run every Monday and Wednesday
```json
{
  "recurrenceType": "WEEKLY",
  "weeklyRule": {
    "recurEveryNWeeks": 1,
    "daysOfWeek": {
      "monday": true,
      "wednesday": true
    }
  },
  "startTime": "10:00:00"
}
```

**Example**: Run every 2 weeks on Sunday and Tuesday
```json
{
  "recurrenceType": "WEEKLY",
  "weeklyRule": {
    "recurEveryNWeeks": 2,
    "daysOfWeek": {
      "sunday": true,
      "tuesday": true
    }
  }
}
```

### 3. Monthly Recurrence

#### By Day of Month
Run on specific dates (1-31) or last day of month

**Example**: Run on the 1st, 15th, and last day of specific months
```json
{
  "recurrenceType": "MONTHLY",
  "monthlyRule": {
    "ruleType": "BY_DAY_OF_MONTH",
    "months": [1, 5, 9],  // January, May, September
    "dayNumbers": ["1", "15", "L"]  // 1st, 15th, and Last day
  },
  "startTime": "08:00:00"
}
```

#### By Ordinal Day of Week
Run on ordinal occurrences (First, Second, Third, Fourth, Last) of specific weekdays

**Example**: Run on First Monday and Last Friday of every month
```json
{
  "recurrenceType": "MONTHLY",
  "monthlyRule": {
    "ruleType": "BY_ORDINAL_DAY_OF_WEEK",
    "months": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],  // All months
    "ordinals": [
      {
        "ordinal": "FIRST",
        "dayOfWeek": "MONDAY"
      },
      {
        "ordinal": "LAST",
        "dayOfWeek": "FRIDAY"
      }
    ]
  }
}
```

## How It Works

### Task Creation with Recurrence
When a recurring task is created:
1. The recurrence rule is stored in the database
2. The scheduler automatically picks it up and schedules it using `node-schedule`
3. The task is executed at the specified intervals

### Automatic Task Recreation
When a recurring task is executed:
1. A new task instance is created with updated dates
2. All subtasks are copied to the new instance
3. All task assignments (users and groups) are preserved
4. The new task starts in "To Do" status

### Date/Time Calculation
The scheduler automatically calculates:
- **Start Date**: Based on recurrence rules
- **Start Time**: Preserved from original task
- **Due Date**: Calculated based on original task duration
- **Due Time**: Preserved from original task

## Installation

```bash
cd packages/rescheduler-lib
pnpm install
```

## Configuration

Create a `.env` file:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=task_manager
```

## Usage

### As a Standalone Service

```bash
pnpm run dev
```

### As a Library

```typescript
import { recurringTaskScheduler } from '@task-manager/rescheduler-lib';

// Initialize the scheduler
await recurringTaskScheduler.initialize();

// Schedule a specific task
await recurringTaskScheduler.scheduleTask(task);

// Reschedule a task (after update)
await recurringTaskScheduler.rescheduleTask(taskId);

// Cancel a task schedule
recurringTaskScheduler.cancelTask(taskId);

// Get all scheduled jobs
const jobs = recurringTaskScheduler.getScheduledJobs();

// Shutdown gracefully
await recurringTaskScheduler.shutdown();
```

## API Examples

### Create Daily Recurring Task (Every 4 Hours)

```bash
POST /api/tasks
{
  "title": "System Health Check",
  "description": "Check system health and send report",
  "startDate": "2025-01-01",
  "startTime": "00:00:00",
  "dueDate": "2025-01-01",
  "dueTime": "00:15:00",
  "isRecurring": true,
  "recurrence": {
    "recurrenceType": "DAILY",
    "dailyRule": {
      "recurEveryXDays": 1,
      "intraDayFrequencyType": "HOURS",
      "intraDayInterval": 4
    }
  }
}
```

### Create Weekly Recurring Task

```bash
POST /api/tasks
{
  "title": "Weekly Team Meeting",
  "description": "Discuss progress and blockers",
  "startDate": "2025-01-06",
  "startTime": "10:00:00",
  "dueDate": "2025-01-06",
  "dueTime": "11:00:00",
  "isRecurring": true,
  "recurrence": {
    "recurrenceType": "WEEKLY",
    "weeklyRule": {
      "recurEveryNWeeks": 1,
      "daysOfWeek": {
        "monday": true,
        "friday": true
      }
    },
    "endDate": "2025-12-31"
  }
}
```

### Create Monthly Recurring Task (First and Last Monday)

```bash
POST /api/tasks
{
  "title": "Monthly Report Generation",
  "description": "Generate and send monthly reports",
  "startDate": "2025-01-06",
  "startTime": "09:00:00",
  "dueDate": "2025-01-06",
  "dueTime": "17:00:00",
  "isRecurring": true,
  "recurrence": {
    "recurrenceType": "MONTHLY",
    "monthlyRule": {
      "ruleType": "BY_ORDINAL_DAY_OF_WEEK",
      "months": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
      "ordinals": [
        {
          "ordinal": "FIRST",
          "dayOfWeek": "MONDAY"
        },
        {
          "ordinal": "LAST",
          "dayOfWeek": "MONDAY"
        }
      ]
    }
  }
}
```

## Technical Details

### Database Schema
The scheduler uses the following tables:
- `RecurrenceRules`: Main recurrence configuration
- `Repeat_DailyRules`: Daily recurrence settings
- `Repeat_WeeklyRules`: Weekly recurrence settings
- `Repeat_MonthlyRules`: Monthly recurrence base
- `Repeat_MonthlyRule_Months`: Which months to run
- `Repeat_MonthlyRule_Days`: Specific day numbers
- `Repeat_MonthlyRule_Ordinals`: Ordinal day specifications

### node-schedule Integration
The library uses `node-schedule` for precise scheduling:
- Cron expressions for intra-day tasks
- RecurrenceRule objects for complex patterns
- Custom date functions for advanced scheduling

## Monitoring

The scheduler logs all operations:
- ✅ Successful scheduling
- ⏰ Task executions
- 🛑 Cancellations
- ❌ Errors

Check console output or integrate with your logging system.

## Support

For issues or questions, please refer to the main Task Manager documentation.
