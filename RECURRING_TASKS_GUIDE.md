# Recurring Task System - Complete Guide

## Overview

The Task Manager now supports comprehensive recurring tasks with three recurrence patterns:
1. **Daily** - Every N days or intra-day (minutes/hours)
2. **Weekly** - Specific days of the week
3. **Monthly** - By day of month or ordinal days

## Database Schema

The system uses a normalized schema with separate tables for each recurrence type:

```
RecurrenceRules (main table)
├── Repeat_DailyRules
├── Repeat_WeeklyRules
└── Repeat_MonthlyRules
    ├── Repeat_MonthlyRule_Months
    ├── Repeat_MonthlyRule_Days
    └── Repeat_MonthlyRule_Ordinals
```

## API Reference

### Create Recurring Task

**Endpoint**: `POST /api/tasks`

#### Example 1: Daily Task (Every 2 Days)

```json
{
  "title": "Daily Backup",
  "description": "Run system backup",
  "startDate": "2025-01-01",
  "startTime": "02:00:00",
  "dueDate": "2025-01-01",
  "dueTime": "03:00:00",
  "priorityId": 3,
  "statusId": 1,
  "isRecurring": true,
  "recurrence": {
    "recurrenceType": "DAILY",
    "dailyRule": {
      "recurEveryXDays": 2
    },
    "endDate": "2025-12-31"
  },
  "assigneeIds": [1, 2],
  "groupIds": [5]
}
```

#### Example 2: Intra-Day Task (Every 30 Minutes)

```json
{
  "title": "Monitor Server Status",
  "description": "Check if all servers are running",
  "startDate": "2025-01-01",
  "startTime": "00:00:00",
  "dueDate": "2025-01-01",
  "dueTime": "00:05:00",
  "isRecurring": true,
  "recurrence": {
    "recurrenceType": "DAILY",
    "dailyRule": {
      "recurEveryXDays": 1,
      "intraDayFrequencyType": "MINUTES",
      "intraDayInterval": 30
    }
  }
}
```

#### Example 3: Intra-Day Task (Every 4 Hours)

```json
{
  "title": "Database Cleanup",
  "description": "Clean up temporary tables",
  "startDate": "2025-01-01",
  "startTime": "00:00:00",
  "dueDate": "2025-01-01",
  "dueTime": "00:30:00",
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

#### Example 4: Weekly Task (Every Monday, Wednesday, Friday)

```json
{
  "title": "Team Standup",
  "description": "Daily standup meeting",
  "startDate": "2025-01-06",
  "startTime": "09:00:00",
  "dueDate": "2025-01-06",
  "dueTime": "09:30:00",
  "isRecurring": true,
  "recurrence": {
    "recurrenceType": "WEEKLY",
    "weeklyRule": {
      "recurEveryNWeeks": 1,
      "daysOfWeek": {
        "monday": true,
        "wednesday": true,
        "friday": true
      }
    }
  }
}
```

#### Example 5: Bi-Weekly Task (Every 2 Weeks on Sunday)

```json
{
  "title": "Bi-weekly Planning",
  "description": "Sprint planning meeting",
  "startDate": "2025-01-05",
  "startTime": "14:00:00",
  "dueDate": "2025-01-05",
  "dueTime": "16:00:00",
  "isRecurring": true,
  "recurrence": {
    "recurrenceType": "WEEKLY",
    "weeklyRule": {
      "recurEveryNWeeks": 2,
      "daysOfWeek": {
        "sunday": true
      }
    }
  }
}
```

#### Example 6: Monthly Task (Specific Days)

Run on 1st, 15th, and last day of January, May, and September:

```json
{
  "title": "Quarterly Review Prep",
  "description": "Prepare quarterly review materials",
  "startDate": "2025-01-01",
  "startTime": "09:00:00",
  "dueDate": "2025-01-01",
  "dueTime": "17:00:00",
  "isRecurring": true,
  "recurrence": {
    "recurrenceType": "MONTHLY",
    "monthlyRule": {
      "ruleType": "BY_DAY_OF_MONTH",
      "months": [1, 5, 9],
      "dayNumbers": ["1", "15", "L"]
    }
  }
}
```

#### Example 7: Monthly Task (Every Month on Specific Days)

Run on 1st and 15th of every month:

```json
{
  "title": "Payroll Processing",
  "description": "Process employee payroll",
  "startDate": "2025-01-01",
  "startTime": "08:00:00",
  "dueDate": "2025-01-01",
  "dueTime": "12:00:00",
  "isRecurring": true,
  "recurrence": {
    "recurrenceType": "MONTHLY",
    "monthlyRule": {
      "ruleType": "BY_DAY_OF_MONTH",
      "months": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
      "dayNumbers": ["1", "15"]
    }
  }
}
```

#### Example 8: Monthly Task (Ordinal Days)

Run on First Monday and Last Friday of every month:

```json
{
  "title": "Monthly Team Meeting",
  "description": "All-hands team meeting",
  "startDate": "2025-01-06",
  "startTime": "10:00:00",
  "dueDate": "2025-01-06",
  "dueTime": "11:30:00",
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
          "dayOfWeek": "FRIDAY"
        }
      ]
    }
  }
}
```

#### Example 9: Complex Monthly Task

Run on Second Tuesday and Fourth Thursday of February, May, August, November:

```json
{
  "title": "Quarterly Board Meeting",
  "description": "Board of directors meeting",
  "startDate": "2025-02-11",
  "startTime": "14:00:00",
  "dueDate": "2025-02-11",
  "dueTime": "17:00:00",
  "isRecurring": true,
  "recurrence": {
    "recurrenceType": "MONTHLY",
    "monthlyRule": {
      "ruleType": "BY_ORDINAL_DAY_OF_WEEK",
      "months": [2, 5, 8, 11],
      "ordinals": [
        {
          "ordinal": "SECOND",
          "dayOfWeek": "TUESDAY"
        },
        {
          "ordinal": "FOURTH",
          "dayOfWeek": "THURSDAY"
        }
      ]
    },
    "endDate": "2026-12-31"
  }
}
```

### Update Recurring Task

**Endpoint**: `PUT /api/tasks/:id`

You can update the recurrence pattern of an existing task:

```json
{
  "recurrence": {
    "recurrenceType": "WEEKLY",
    "weeklyRule": {
      "recurEveryNWeeks": 1,
      "daysOfWeek": {
        "tuesday": true,
        "thursday": true
      }
    }
  }
}
```

### Disable Recurrence

```json
{
  "isRecurring": false
}
```

## Field Descriptions

### Task Fields

- **startDate** (optional): When the task should start (YYYY-MM-DD)
  - Default: Current date if not provided
- **startTime** (optional): Time when task should start (HH:MM:SS)
  - Default: "00:00:00" if not provided
- **dueDate** (optional): When the task is due (YYYY-MM-DD)
- **dueTime** (optional): Time when task is due (HH:MM:SS)
- **isRecurring** (boolean): Whether task recurs
- **recurrence** (object): Recurrence configuration

### Recurrence Fields

#### Daily Rule
- **recurEveryXDays** (number): Repeat every N days (1-365)
- **intraDayFrequencyType** (string): "MINUTES" or "HOURS"
- **intraDayInterval** (number): Interval value

#### Weekly Rule
- **recurEveryNWeeks** (number): Repeat every N weeks (1+)
- **daysOfWeek** (object): Boolean flags for each day
  - sunday, monday, tuesday, wednesday, thursday, friday, saturday

#### Monthly Rule
- **ruleType** (string): "BY_DAY_OF_MONTH" or "BY_ORDINAL_DAY_OF_WEEK"
- **months** (array): Month numbers 1-12 (empty = all months)
- **dayNumbers** (array): Day numbers "1"-"31" or "L" for last day
- **ordinals** (array): Ordinal day specifications
  - **ordinal**: "FIRST", "SECOND", "THIRD", "FOURTH", "LAST"
  - **dayOfWeek**: "SUNDAY" through "SATURDAY"

### End Date
- **endDate** (optional): When recurrence should stop (YYYY-MM-DD)

## How Recurring Tasks Work

### 1. Task Creation
When you create a recurring task:
1. The task is saved with start/due dates and times
2. The recurrence rule is created in the database
3. The scheduler automatically picks it up and schedules it

### 2. Task Execution
When the scheduled time arrives:
1. A new task instance is created
2. Start and due dates are recalculated based on recurrence
3. All subtasks are copied to the new instance
4. All assignments (users/groups) are preserved
5. Status is reset to "To Do"

### 3. Date/Time Recalculation
The system preserves the duration between start and due dates:
- Original: Start 2025-01-01 09:00, Due 2025-01-01 17:00 (8 hours)
- Next occurrence: Start 2025-01-02 09:00, Due 2025-01-02 17:00 (8 hours)

## Running the Scheduler

### As a Standalone Service

```bash
cd packages/rescheduler-lib
pnpm install
cp .env.example .env
# Edit .env with your database credentials
pnpm run dev
```

### Integrated with Backend

The scheduler is automatically initialized when the backend starts. It will:
1. Load all recurring tasks from the database
2. Schedule them using node-schedule
3. Execute them at the appropriate times

## Monitoring Scheduled Jobs

You can check which tasks are scheduled:

```typescript
import { recurringTaskScheduler } from '@task-manager/rescheduler-lib';

const jobs = recurringTaskScheduler.getScheduledJobs();
console.log(jobs);
// Output:
// [
//   {
//     taskId: 123,
//     recurrenceType: 'DAILY',
//     nextInvocation: 2025-01-02T09:00:00.000Z
//   }
// ]
```

## Validation Rules

The system validates:
- At least one day must be selected for weekly recurrence
- Day numbers must be selected for BY_DAY_OF_MONTH
- Ordinals must be specified for BY_ORDINAL_DAY_OF_WEEK
- End date must be in the future
- Intervals must be positive numbers

## Limitations

1. Minimum intra-day interval: 1 minute
2. Maximum daily interval: 365 days
3. Monthly recurrence limited to specified patterns
4. Tasks are recreated, not modified in place

## Troubleshooting

### Task Not Executing
1. Check if scheduler is running
2. Verify task has `IsRecurring = TRUE`
3. Check `RecurrenceId` is not NULL
4. Verify end date hasn't passed
5. Check scheduler logs for errors

### Incorrect Timing
1. Verify start time is set correctly
2. Check time zone settings (system uses UTC internally)
3. Ensure recurrence rule is correct

### Missing Subtasks
Subtasks are automatically copied when parent recurring task executes. Ensure:
1. Parent task has `IsRecurring = TRUE`
2. Subtasks exist before execution
3. Check database for new task instances

## Best Practices

1. **Set Explicit Times**: Always specify startTime and dueTime
2. **Use End Dates**: Set endDate for tasks that shouldn't run forever
3. **Test First**: Create with a short interval to verify behavior
4. **Monitor Logs**: Check scheduler output for errors
5. **Backup Data**: Recurring tasks create new records automatically

## Examples by Use Case

### System Maintenance
```json
{
  "title": "Database Backup",
  "recurrenceType": "DAILY",
  "dailyRule": { "recurEveryXDays": 1 },
  "startTime": "02:00:00"
}
```

### Monitoring
```json
{
  "title": "Health Check",
  "recurrenceType": "DAILY",
  "dailyRule": {
    "recurEveryXDays": 1,
    "intraDayFrequencyType": "MINUTES",
    "intraDayInterval": 15
  }
}
```

### Meetings
```json
{
  "title": "Weekly Sync",
  "recurrenceType": "WEEKLY",
  "weeklyRule": {
    "recurEveryNWeeks": 1,
    "daysOfWeek": { "monday": true }
  }
}
```

### Reports
```json
{
  "title": "Monthly Report",
  "recurrenceType": "MONTHLY",
  "monthlyRule": {
    "ruleType": "BY_ORDINAL_DAY_OF_WEEK",
    "ordinals": [{
      "ordinal": "LAST",
      "dayOfWeek": "FRIDAY"
    }]
  }
}
```

## Support

For issues or questions:
1. Check this documentation
2. Review scheduler logs
3. Verify database schema matches expected structure
4. Check node-schedule documentation: https://www.npmjs.com/package/node-schedule
