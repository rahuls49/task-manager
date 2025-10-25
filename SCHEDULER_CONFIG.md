# Task Scheduler Configuration Guide

## Overview

The task scheduling system now supports fully configurable timing for when tasks are fetched and scheduled. You can set it to look ahead 30 minutes, 1 hour, or any custom duration.

## Configuration Options

### 1. Environment Variables

#### Backend Configuration (`backend/.env`)
```env
# How far in advance to look for overdue tasks (getOverdueTasks endpoint)
DUE_TIME_INTERVAL_VALUE=30
DUE_TIME_INTERVAL_UNIT=MINUTE

# Scheduler-specific configuration  
DUE_TASKS_WINDOW_VALUE=30
DUE_TASKS_WINDOW_UNIT=MINUTE
DUE_TASKS_BUFFER_VALUE=1
DUE_TASKS_BUFFER_UNIT=MINUTE
```

#### Scheduler Configuration (`packages/scheduler/.env`)
```env
# Cron schedule for how often to check for due tasks
SCHEDULER_CRON=*/2 * * * *

# Maximum delay before scheduling a task (in milliseconds)
MAX_SCHEDULING_DELAY_MS=1800000  # 30 minutes
```

### 2. Supported Time Units
- `SECOND`
- `MINUTE` 
- `HOUR`
- `DAY`
- `WEEK`
- `MONTH`
- `YEAR`

## Quick Configuration Examples

### 30 Minutes Ahead
```bash
node config-scheduler.js set 30 MINUTE
```

### 1 Hour Ahead
```bash
node config-scheduler.js set 1 HOUR
```

### 2 Hours with Custom Cron
```bash
node config-scheduler.js set 2 HOUR "*/5 * * * *"
```

## API Endpoints

### Get Current Configuration
```http
GET /system/scheduler/config
```

Response:
```json
{
  "success": true,
  "message": "Scheduler configuration fetched successfully",
  "data": {
    "dueTimeInterval": {
      "value": 30,
      "unit": "MINUTE"
    },
    "schedulerConfig": {
      "CRON_SCHEDULE": "*/2 * * * *",
      "DUE_TASKS_WINDOW_VALUE": 30,
      "DUE_TASKS_WINDOW_UNIT": "MINUTE",
      "MAX_SCHEDULING_DELAY_MS": 1800000
    }
  }
}
```

### Update Configuration
```http
PUT /system/scheduler/config
Content-Type: application/json

{
  "dueTimeIntervalValue": 60,
  "dueTimeIntervalUnit": "MINUTE",
  "dueTasksWindowValue": 60,
  "dueTasksWindowUnit": "MINUTE",
  "maxSchedulingDelayMs": 3600000
}
```

## How It Works

### 1. `getOverdueTasks()` Endpoint
- **Purpose**: Returns tasks that are overdue OR due within the configured time window
- **Configuration**: `DUE_TIME_INTERVAL_VALUE` and `DUE_TIME_INTERVAL_UNIT`
- **SQL Query**: 
  ```sql
  SELECT * FROM Tasks 
  WHERE IsDeleted = FALSE 
  AND StatusId != ? 
  AND CONCAT(DueDate, ' ', DueTime) <= DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? MINUTE)
  ```

### 2. `getDueTasks()` Endpoint  
- **Purpose**: Returns tasks due within a specific time window (used by scheduler)
- **Configuration**: `DUE_TASKS_WINDOW_VALUE` and `DUE_TASKS_WINDOW_UNIT`
- **Buffer**: `DUE_TASKS_BUFFER_VALUE` (how early to start looking)

### 3. Scheduler Service
- **Frequency**: Controlled by `SCHEDULER_CRON` 
- **Max Delay**: `MAX_SCHEDULING_DELAY_MS` (won't schedule tasks further out than this)

## Usage Scenarios

### Scenario 1: Real-time Notifications (2-5 minutes)
```bash
node config-scheduler.js set 2 MINUTE "*/1 * * * *"
```
- Tasks fetched 2 minutes in advance
- Scheduler runs every minute
- Good for: Immediate notifications, real-time alerts

### Scenario 2: Standard Business (30 minutes) 
```bash
node config-scheduler.js set 30 MINUTE
```
- Tasks fetched 30 minutes in advance  
- Scheduler runs every 2 minutes (default)
- Good for: Regular task management, email notifications

### Scenario 3: Planning Ahead (2-4 hours)
```bash
node config-scheduler.js set 2 HOUR "*/10 * * * *"
```
- Tasks fetched 2 hours in advance
- Scheduler runs every 10 minutes
- Good for: Daily planning, batch processing

### Scenario 4: Long-term Planning (1 day)
```bash
node config-scheduler.js set 1 DAY "0 */6 * * *"
```
- Tasks fetched 1 day in advance
- Scheduler runs every 6 hours
- Good for: Weekly reports, project deadlines

## Testing Configuration

### 1. Check Current Settings
```bash
node config-scheduler.js show
```

### 2. Test API Endpoints
```bash
# Get due tasks with current config
curl http://localhost:5000/system/tasks/due

# Get overdue tasks with current config  
curl http://localhost:5000/system/tasks/overdue

# Check configuration via API
curl http://localhost:5000/system/scheduler/config
```

### 3. Monitor Logs
- Backend logs: Check for "getDueTasks" and "getOverdueTasks" messages
- Scheduler logs: Look for scheduling decisions and timing info
- Worker logs: Verify tasks are processed at correct times

## Best Practices

1. **Match Scheduler Frequency to Use Case**
   - Frequent notifications: 1-2 minute intervals
   - Standard tasks: 2-5 minute intervals  
   - Background processing: 10+ minute intervals

2. **Set Appropriate Look-ahead Time**
   - Too short: May miss tasks due to processing delays
   - Too long: Tasks scheduled too early, potential resource waste

3. **Consider System Load**
   - More frequent checks = higher database load
   - Longer intervals = potential delays in task execution

4. **Test Before Production**
   - Always test configuration changes in development
   - Monitor logs to ensure expected behavior
   - Restart services after configuration changes

## Troubleshooting

### Tasks Sent Too Early
- Reduce `DUE_TASKS_WINDOW_VALUE`
- Increase scheduler frequency (`SCHEDULER_CRON`)

### Tasks Sent Too Late  
- Increase `DUE_TASKS_WINDOW_VALUE`
- Reduce scheduler frequency
- Check system performance and delays

### Configuration Not Applied
- Restart backend and scheduler services
- Verify environment variable syntax
- Check file permissions on .env files