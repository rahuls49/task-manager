# ✅ Recurring Tasks - Quick Start

## You're Ready to Go!

The recurring task system has been successfully implemented and built. Here's how to start using it:

## 🚀 Quick Start (3 Steps)

### 1. Run the Database Schema

```bash
mysql -u root -p task_manager < init-data.sql
```

This creates all the necessary tables including:
- `RecurrenceRules`
- `Repeat_DailyRules`
- `Repeat_WeeklyRules`
- `Repeat_MonthlyRules` + junction tables
- Updated `Tasks` table with `StartDate` and `StartTime`

### 2. Start the Backend

```bash
cd backend
pnpm run dev
```

The scheduler will automatically initialize and start scheduling any existing recurring tasks.

### 3. Create Your First Recurring Task

```bash
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Recurring Task - Every 5 Minutes",
    "description": "This will create a new task every 5 minutes",
    "startDate": "2025-10-29",
    "startTime": "00:00:00",
    "dueDate": "2025-10-29",
    "dueTime": "00:05:00",
    "isRecurring": true,
    "recurrence": {
      "recurrenceType": "DAILY",
      "dailyRule": {
        "recurEveryXDays": 1,
        "intraDayFrequencyType": "MINUTES",
        "intraDayInterval": 5
      }
    }
  }'
```

Watch your console - within 5 minutes you'll see:
```
⏰ Executing recurring task: X - Test Recurring Task - Every 5 Minutes
✅ Created new task instance: Y for recurring task X
```

## 📚 Full Documentation

- **RECURRING_TASKS_GUIDE.md** - Complete guide with 9+ examples
- **API_QUICK_REFERENCE.md** - Quick copy-paste API examples
- **INSTALLATION.md** - Detailed installation and troubleshooting
- **IMPLEMENTATION_SUMMARY.md** - What was implemented

## 💡 Common Patterns

### Daily Backup (Every Night at 2 AM)
```json
{
  "title": "Database Backup",
  "startDate": "2025-10-30",
  "startTime": "02:00:00",
  "isRecurring": true,
  "recurrence": {
    "recurrenceType": "DAILY",
    "dailyRule": { "recurEveryXDays": 1 }
  }
}
```

### Weekly Team Meeting (Every Monday at 9 AM)
```json
{
  "title": "Weekly Sync",
  "startDate": "2025-11-04",
  "startTime": "09:00:00",
  "dueDate": "2025-11-04",
  "dueTime": "10:00:00",
  "isRecurring": true,
  "recurrence": {
    "recurrenceType": "WEEKLY",
    "weeklyRule": {
      "recurEveryNWeeks": 1,
      "daysOfWeek": { "monday": true }
    }
  }
}
```

### Monthly Payroll (1st and 15th)
```json
{
  "title": "Process Payroll",
  "isRecurring": true,
  "recurrence": {
    "recurrenceType": "MONTHLY",
    "monthlyRule": {
      "ruleType": "BY_DAY_OF_MONTH",
      "months": [1,2,3,4,5,6,7,8,9,10,11,12],
      "dayNumbers": ["1", "15"]
    }
  }
}
```

## 🔍 Verify It's Working

### Check Scheduled Tasks
```sql
SELECT Id, Title, IsRecurring, RecurrenceId, StartDate, StartTime 
FROM Tasks 
WHERE IsRecurring = TRUE;
```

### Check Recurrence Rules
```sql
SELECT * FROM RecurrenceRules;
SELECT * FROM Repeat_DailyRules;
SELECT * FROM Repeat_WeeklyRules;
```

### Watch the Logs
Look for these messages in your backend console:
```
🚀 Initializing Recurring Task Scheduler...
📋 Found X recurring task(s) to schedule
✅ Scheduled task Y (Task Title) - Type: DAILY
   Next execution: 2025-10-29T...
✅ Scheduler initialized successfully
```

## 🎯 What You Can Do Now

✅ Create tasks that run every N minutes/hours  
✅ Create tasks that run every N days  
✅ Create tasks on specific weekdays  
✅ Create tasks on specific dates of the month  
✅ Create tasks on ordinal days (First Monday, Last Friday, etc.)  
✅ All subtasks are automatically copied  
✅ All assignments are preserved  
✅ Dates/times are automatically recalculated  

## ⚙️ Configuration

All configuration is optional. The system uses sensible defaults.

### Backend `.env`
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=task_manager
```

## 🆘 Troubleshooting

### "Cannot find module '@task-manager/rescheduler-lib'"
```bash
cd packages/rescheduler-lib
pnpm run build
```

### Tasks Not Executing
1. Check backend console for scheduler initialization messages
2. Verify task has `IsRecurring = TRUE` and `RecurrenceId` is not NULL
3. Check system time (scheduler uses UTC internally)

### Database Connection Errors
1. Verify MySQL is running
2. Check credentials in `.env`
3. Ensure database exists

## 🎉 You're All Set!

Your recurring task system is production-ready. Start creating tasks and watch them automatically recreate themselves!

For more examples and advanced patterns, check out:
- **API_QUICK_REFERENCE.md** for copy-paste examples
- **RECURRING_TASKS_GUIDE.md** for detailed documentation

Happy scheduling! 🚀
