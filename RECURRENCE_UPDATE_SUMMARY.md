# Task Manager - Updated Recurrence System

## Overview

This update implements a new flexible recurrence system for the Task Manager application that supports complex recurrence patterns as requested.

## What's New

### ✅ Flexible Recurrence Patterns

The new system supports:

1. **Daily Recurrence**
   - Every X days (e.g., every 2 days)
   - Intra-day intervals (e.g., every 4 hours)

2. **Weekly Recurrence** 
   - Specific days of the week
   - Every N weeks (e.g., bi-weekly)
   - Example: Every Monday and Friday, or every 2 weeks on Tuesday

3. **Monthly Recurrence**
   - **By Day of Month**: Specific dates (e.g., 2nd, 5th, 10th, 28th of each month)
   - **By Ordinal Day**: First/Second/Third/Fourth/Last occurrence of a weekday
   - Example: First and third Monday of every month
   - Example: Last Friday of March, June, September, December

### ✅ Database Schema Updates

New tables have been implemented according to your provided schema:

- `RecurrenceRules` - Main recurrence configuration table
- `Repeat_DailyRules` - Daily recurrence settings
- `Repeat_WeeklyRules` - Weekly recurrence settings  
- `Repeat_MonthlyRules` - Monthly recurrence base table
- `Repeat_MonthlyRule_Months` - Which months to apply the rule
- `Repeat_MonthlyRule_Days` - Specific days for BY_DAY_OF_MONTH
- `Repeat_MonthlyRule_Ordinals` - Ordinal days for BY_ORDINAL_DAY_OF_WEEK

### ✅ API Endpoints

#### Updated Endpoints:
- `POST /api/tasks` - Create task with new recurrence structure
- `PUT /api/tasks/:id` - Update task with new recurrence structure

#### New Endpoints:
- `POST /api/tasks/recurrence` - Create standalone recurrence rule
- `GET /api/tasks/recurrence/:id` - Get recurrence rule details
- `PUT /api/tasks/recurrence/:id` - Update recurrence rule
- `DELETE /api/tasks/recurrence/:id` - Delete recurrence rule

## File Changes

### New Files:
- `backend/src/modules/task/recurrence.service.ts` - Recurrence management logic
- `RECURRENCE_API.md` - Complete API documentation with examples
- `test-recurrence-api.js` - Frontend test examples
- `test-new-recurrence.js` - Backend API test script

### Modified Files:
- `backend/src/modules/task/task.types.ts` - Added new recurrence type definitions
- `backend/src/modules/task/task.service.ts` - Updated to use new recurrence system
- `backend/src/modules/task/task.controller.ts` - Added recurrence endpoints
- `backend/src/modules/task/task.route.ts` - Added recurrence routes

## Usage Examples

### 1. Task that runs every Sunday weekly:
```json
{
  "recurrenceType": "WEEKLY",
  "weeklyRule": {
    "recurEveryNWeeks": 1,
    "daysOfWeek": { "sunday": true }
  }
}
```

### 2. Task that runs first and third Monday of every month:
```json
{
  "recurrenceType": "MONTHLY", 
  "monthlyRule": {
    "ruleType": "BY_ORDINAL_DAY_OF_WEEK",
    "ordinals": [
      { "ordinal": "FIRST", "dayOfWeek": "MONDAY" },
      { "ordinal": "THIRD", "dayOfWeek": "MONDAY" }
    ]
  }
}
```

### 3. Task that runs on 2nd, 5th, 10th, 28th of every month:
```json
{
  "recurrenceType": "MONTHLY",
  "monthlyRule": {
    "ruleType": "BY_DAY_OF_MONTH", 
    "dayNumbers": ["2", "5", "10", "28"]
  }
}
```

### 4. Quarterly task (last Friday of specific months):
```json
{
  "recurrenceType": "MONTHLY",
  "monthlyRule": {
    "ruleType": "BY_ORDINAL_DAY_OF_WEEK",
    "months": [3, 6, 9, 12],
    "ordinals": [
      { "ordinal": "LAST", "dayOfWeek": "FRIDAY" }
    ]
  }
}
```

## Backward Compatibility

⚠️ **Breaking Change**: The system completely replaces the old TaskRecurrence table with the new RecurrenceRules system. The old table no longer exists in the database schema.

- Old recurrence data is no longer accessible
- Existing tasks with recurrence need manual migration
- This is a complete replacement, not an additive change

## Database Setup

To set up the new database:

1. Run the provided SQL schema to create all tables
2. Run `init-data.sql` to populate default statuses, priorities, and sample data
3. Existing tasks will lose their recurrence patterns and need to be reconfigured

## Testing

Run the diagnostic script to verify functionality:
```bash
# Test basic functionality and new recurrence system
node test-diagnostics.js
```

## Validation

The system includes comprehensive validation:
- Recurrence type validation
- Required field validation for each recurrence type
- Date range validation
- Day/month number validation

## Next Steps

1. ✅ Database schema implemented
2. ✅ Backend API updated
3. ✅ Validation system in place
4. ✅ Documentation created
5. 🔄 **Ready for frontend integration**
6. 🔄 **Ready for testing with your data**

The task creation and update endpoints now fully support your requested flexible recurrence patterns!