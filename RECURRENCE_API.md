# Task Recurrence API Documentation

This document explains how to use the updated Task API with the new flexible recurrence system.

## Overview

The new recurrence system supports:
- **Daily recurrence**: Every X days, with optional intra-day intervals
- **Weekly recurrence**: Specific days of the week, every N weeks  
- **Monthly recurrence**: Specific days of month OR ordinal days (e.g., first Monday, last Friday)

## API Endpoints

### 1. Create Task with Recurrence

**POST** `/api/tasks`

```json
{
  "title": "Weekly Team Meeting",
  "description": "Regular team sync meeting",
  "dueDate": "2024-12-02",
  "dueTime": "10:00",
  "statusId": 1,
  "priorityId": 2,
  "assigneeIds": [1, 2],
  "groupIds": [1],
  "isRecurring": true,
  "recurrence": {
    "recurrenceType": "WEEKLY",
    "endDate": "2025-12-31",
    "weeklyRule": {
      "recurEveryNWeeks": 1,
      "daysOfWeek": {
        "monday": true,
        "friday": true
      }
    }
  }
}
```

### 2. Update Task with Recurrence

**PUT** `/api/tasks/{taskId}`

```json
{
  "title": "Updated Task Title",
  "recurrence": {
    "recurrenceType": "MONTHLY",
    "monthlyRule": {
      "ruleType": "BY_ORDINAL_DAY_OF_WEEK",
      "months": [1, 3, 5, 7, 9, 11],
      "ordinals": [
        {
          "ordinal": "FIRST",
          "dayOfWeek": "MONDAY"
        },
        {
          "ordinal": "THIRD", 
          "dayOfWeek": "MONDAY"
        }
      ]
    }
  }
}
```

### 3. Create Standalone Recurrence Rule

**POST** `/api/tasks/recurrence`

```json
{
  "recurrenceType": "MONTHLY",
  "endDate": "2025-12-31",
  "monthlyRule": {
    "ruleType": "BY_DAY_OF_MONTH",
    "months": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    "dayNumbers": ["2", "5", "10", "28"]
  }
}
```

## Recurrence Examples

### Example 1: Daily Task (Every 3 Days)

```json
{
  "recurrenceType": "DAILY",
  "dailyRule": {
    "recurEveryXDays": 3
  }
}
```

### Example 2: Daily Task with Intra-day Intervals

```json
{
  "recurrenceType": "DAILY", 
  "dailyRule": {
    "recurEveryXDays": 1,
    "intraDayFrequencyType": "HOURS",
    "intraDayInterval": 4
  }
}
```

### Example 3: Weekly Task (Every Sunday)

```json
{
  "recurrenceType": "WEEKLY",
  "weeklyRule": {
    "recurEveryNWeeks": 1,
    "daysOfWeek": {
      "sunday": true
    }
  }
}
```

### Example 4: Bi-weekly Task (Monday and Friday)

```json
{
  "recurrenceType": "WEEKLY",
  "weeklyRule": {
    "recurEveryNWeeks": 2,
    "daysOfWeek": {
      "monday": true,
      "friday": true
    }
  }
}
```

### Example 5: Monthly Task (Specific Days)

```json
{
  "recurrenceType": "MONTHLY",
  "monthlyRule": {
    "ruleType": "BY_DAY_OF_MONTH",
    "dayNumbers": ["1", "15", "L"]
  }
}
```

### Example 6: Monthly Task (First and Third Monday of Every Month)

```json
{
  "recurrenceType": "MONTHLY",
  "monthlyRule": {
    "ruleType": "BY_ORDINAL_DAY_OF_WEEK",
    "ordinals": [
      {
        "ordinal": "FIRST",
        "dayOfWeek": "MONDAY"
      },
      {
        "ordinal": "THIRD",
        "dayOfWeek": "MONDAY"
      }
    ]
  }
}
```

### Example 7: Quarterly Task (Last Friday of March, June, September, December)

```json
{
  "recurrenceType": "MONTHLY",
  "monthlyRule": {
    "ruleType": "BY_ORDINAL_DAY_OF_WEEK",
    "months": [3, 6, 9, 12],
    "ordinals": [
      {
        "ordinal": "LAST",
        "dayOfWeek": "FRIDAY"
      }
    ]
  }
}
```

## Response Format

### Task Response with Recurrence

```json
{
  "success": true,
  "message": "Task created successfully",
  "data": {
    "Id": 123,
    "Title": "Weekly Team Meeting",
    "Description": "Regular team sync meeting",
    "DueDate": "2024-12-02",
    "DueTime": "10:00:00",
    "IsRecurring": true,
    "RecurrenceId": 45,
    "status": {
      "Id": 1,
      "StatusName": "To Do"
    },
    "priority": {
      "Id": 2,
      "PriorityName": "Medium"
    },
    "assignees": [
      {
        "Id": 1,
        "Name": "John Doe",
        "Email": "john@example.com"
      }
    ],
    "groups": [
      {
        "GroupId": 1,
        "GroupName": "Development Team"
      }
    ],
    "recurrence": {
      "Id": 45,
      "RecurrenceType": "WEEKLY",
      "EndDate": "2025-12-31",
      "weeklyRule": {
        "Id": 23,
        "RecurEveryNWeeks": 1,
        "OnSunday": false,
        "OnMonday": true,
        "OnTuesday": false,
        "OnWednesday": false,
        "OnThursday": false,
        "OnFriday": true,
        "OnSaturday": false
      }
    }
  }
}
```

## Validation Rules

### General Rules
- `recurrenceType` must be one of: `DAILY`, `WEEKLY`, `MONTHLY`
- `endDate` must be in the future (if provided)

### Daily Recurrence Rules
- `recurEveryXDays` must be >= 1
- `intraDayInterval` must be >= 1 (if provided)

### Weekly Recurrence Rules  
- `recurEveryNWeeks` must be >= 1
- At least one day of the week must be selected

### Monthly Recurrence Rules
- For `BY_DAY_OF_MONTH`: `dayNumbers` array is required
- For `BY_ORDINAL_DAY_OF_WEEK`: `ordinals` array is required
- `months` array values must be between 1-12 (if provided)
- Use `"L"` in `dayNumbers` to represent the last day of the month

## Error Responses

```json
{
  "success": false,
  "message": "Recurrence validation failed: At least one day of the week must be selected for WEEKLY recurrence",
  "errors": [
    "At least one day of the week must be selected for WEEKLY recurrence"
  ]
}
```

## Migration from Legacy System

The new system completely replaces the old TaskRecurrence table. The old table no longer exists in the database schema. All recurrence functionality now uses the new flexible RecurrenceRules system with dedicated tables for daily, weekly, and monthly patterns.

**Note**: This is a breaking change. Any existing tasks with old recurrence patterns need to be manually migrated to the new system.