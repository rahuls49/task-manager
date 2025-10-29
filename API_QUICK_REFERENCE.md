# Recurring Tasks - Quick API Reference

## Create Recurring Task

**POST** `/api/tasks`

### Daily Patterns

```json
// Every N days
{
  "recurrence": {
    "recurrenceType": "DAILY",
    "dailyRule": { "recurEveryXDays": 2 }
  }
}

// Every N minutes
{
  "recurrence": {
    "recurrenceType": "DAILY",
    "dailyRule": {
      "recurEveryXDays": 1,
      "intraDayFrequencyType": "MINUTES",
      "intraDayInterval": 30
    }
  }
}

// Every N hours
{
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

### Weekly Patterns

```json
// Every Monday and Friday
{
  "recurrence": {
    "recurrenceType": "WEEKLY",
    "weeklyRule": {
      "recurEveryNWeeks": 1,
      "daysOfWeek": {
        "monday": true,
        "friday": true
      }
    }
  }
}

// Every 2 weeks on Sunday
{
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

### Monthly Patterns - By Day

```json
// 1st, 15th, and last day of every month
{
  "recurrence": {
    "recurrenceType": "MONTHLY",
    "monthlyRule": {
      "ruleType": "BY_DAY_OF_MONTH",
      "months": [1,2,3,4,5,6,7,8,9,10,11,12],
      "dayNumbers": ["1", "15", "L"]
    }
  }
}

// 1st and 15th of Jan, May, Sep
{
  "recurrence": {
    "recurrenceType": "MONTHLY",
    "monthlyRule": {
      "ruleType": "BY_DAY_OF_MONTH",
      "months": [1, 5, 9],
      "dayNumbers": ["1", "15"]
    }
  }
}
```

### Monthly Patterns - Ordinal

```json
// First Monday every month
{
  "recurrence": {
    "recurrenceType": "MONTHLY",
    "monthlyRule": {
      "ruleType": "BY_ORDINAL_DAY_OF_WEEK",
      "months": [1,2,3,4,5,6,7,8,9,10,11,12],
      "ordinals": [{
        "ordinal": "FIRST",
        "dayOfWeek": "MONDAY"
      }]
    }
  }
}

// Last Friday every month
{
  "recurrence": {
    "recurrenceType": "MONTHLY",
    "monthlyRule": {
      "ruleType": "BY_ORDINAL_DAY_OF_WEEK",
      "months": [1,2,3,4,5,6,7,8,9,10,11,12],
      "ordinals": [{
        "ordinal": "LAST",
        "dayOfWeek": "FRIDAY"
      }]
    }
  }
}

// Second Tuesday and Fourth Thursday quarterly
{
  "recurrence": {
    "recurrenceType": "MONTHLY",
    "monthlyRule": {
      "ruleType": "BY_ORDINAL_DAY_OF_WEEK",
      "months": [1, 4, 7, 10],
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
    }
  }
}
```

## Complete Task Example

```json
{
  "title": "Weekly Team Meeting",
  "description": "Discuss progress and blockers",
  "startDate": "2025-01-06",
  "startTime": "10:00:00",
  "dueDate": "2025-01-06",
  "dueTime": "11:00:00",
  "priorityId": 3,
  "statusId": 1,
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
  },
  "assigneeIds": [1, 2],
  "groupIds": [5]
}
```

## Update Recurrence

**PUT** `/api/tasks/:id`

```json
{
  "recurrence": {
    "recurrenceType": "DAILY",
    "dailyRule": { "recurEveryXDays": 3 }
  }
}
```

## Disable Recurrence

**PUT** `/api/tasks/:id`

```json
{
  "isRecurring": false
}
```

## Field Reference

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | Yes | Task title |
| `startDate` | string | No | Start date (YYYY-MM-DD) |
| `startTime` | string | No | Start time (HH:MM:SS) |
| `dueDate` | string | No | Due date (YYYY-MM-DD) |
| `dueTime` | string | No | Due time (HH:MM:SS) |
| `isRecurring` | boolean | No | Enable recurrence |
| `recurrence` | object | Conditional | Required if isRecurring=true |

### Recurrence Object

| Field | Type | Values |
|-------|------|--------|
| `recurrenceType` | string | DAILY, WEEKLY, MONTHLY |
| `endDate` | string | Optional end date (YYYY-MM-DD) |
| `dailyRule` | object | For DAILY type |
| `weeklyRule` | object | For WEEKLY type |
| `monthlyRule` | object | For MONTHLY type |

### Daily Rule

| Field | Type | Description |
|-------|------|-------------|
| `recurEveryXDays` | number | Every N days (1-365) |
| `intraDayFrequencyType` | string | MINUTES or HOURS |
| `intraDayInterval` | number | Interval value |

### Weekly Rule

| Field | Type | Description |
|-------|------|-------------|
| `recurEveryNWeeks` | number | Every N weeks |
| `daysOfWeek` | object | Boolean flags for each day |

### Monthly Rule

| Field | Type | Description |
|-------|------|-------------|
| `ruleType` | string | BY_DAY_OF_MONTH or BY_ORDINAL_DAY_OF_WEEK |
| `months` | number[] | 1-12 (empty = all months) |
| `dayNumbers` | string[] | "1"-"31" or "L" |
| `ordinals` | array | Ordinal specifications |

### Ordinal Object

| Field | Type | Values |
|-------|------|--------|
| `ordinal` | string | FIRST, SECOND, THIRD, FOURTH, LAST |
| `dayOfWeek` | string | SUNDAY-SATURDAY |

## Common Use Cases

### System Tasks
```json
// Backup every day at 2 AM
{ "recurrenceType": "DAILY", "dailyRule": { "recurEveryXDays": 1 }, "startTime": "02:00:00" }

// Monitor every 15 minutes
{ "recurrenceType": "DAILY", "dailyRule": { "recurEveryXDays": 1, "intraDayFrequencyType": "MINUTES", "intraDayInterval": 15 } }
```

### Business Tasks
```json
// Payroll on 1st and 15th
{ "recurrenceType": "MONTHLY", "monthlyRule": { "ruleType": "BY_DAY_OF_MONTH", "months": [1,2,3,4,5,6,7,8,9,10,11,12], "dayNumbers": ["1", "15"] } }

// Board meeting last Friday quarterly
{ "recurrenceType": "MONTHLY", "monthlyRule": { "ruleType": "BY_ORDINAL_DAY_OF_WEEK", "months": [3, 6, 9, 12], "ordinals": [{ "ordinal": "LAST", "dayOfWeek": "FRIDAY" }] } }
```

### Team Tasks
```json
// Daily standup Mon-Fri
{ "recurrenceType": "WEEKLY", "weeklyRule": { "recurEveryNWeeks": 1, "daysOfWeek": { "monday": true, "tuesday": true, "wednesday": true, "thursday": true, "friday": true } } }

// Sprint planning every 2 weeks
{ "recurrenceType": "WEEKLY", "weeklyRule": { "recurEveryNWeeks": 2, "daysOfWeek": { "monday": true } } }
```

## Response Format

```json
{
  "success": true,
  "message": "Task created successfully",
  "data": {
    "Id": 123,
    "Title": "Weekly Team Meeting",
    "IsRecurring": true,
    "RecurrenceId": 45,
    "recurrence": {
      "Id": 45,
      "RecurrenceType": "WEEKLY",
      "EndDate": "2025-12-31",
      "weeklyRule": {
        "Id": 12,
        "RecurEveryNWeeks": 1,
        "OnMonday": true,
        "OnFriday": true,
        ...
      }
    },
    ...
  }
}
```

## Testing Examples

```bash
# Create daily task
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"Test","isRecurring":true,"recurrence":{"recurrenceType":"DAILY","dailyRule":{"recurEveryXDays":1}}}'

# Create weekly task
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"Test","isRecurring":true,"recurrence":{"recurrenceType":"WEEKLY","weeklyRule":{"recurEveryNWeeks":1,"daysOfWeek":{"monday":true}}}}'

# Create monthly task
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"Test","isRecurring":true,"recurrence":{"recurrenceType":"MONTHLY","monthlyRule":{"ruleType":"BY_DAY_OF_MONTH","months":[1,2,3,4,5,6,7,8,9,10,11,12],"dayNumbers":["1"]}}}'
```
