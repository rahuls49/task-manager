# Installation Instructions for Recurring Task System

## 1. Install Dependencies

```bash
# Install rescheduler-lib dependencies
cd packages/rescheduler-lib
pnpm install

# Install backend dependencies (updated to include rescheduler-lib)
cd ../../backend
pnpm install

# Return to root
cd ..
```

## 2. Database Setup

Run the SQL commands you provided to create the database schema. The schema includes:

- `RecurrenceRules` table
- `Repeat_DailyRules` table
- `Repeat_WeeklyRules` table
- `Repeat_MonthlyRules` table with junction tables
- Updated `Tasks` table with `StartDate` and `StartTime` columns

```bash
mysql -u root -p task_manager < init-data.sql
```

## 3. Environment Configuration

### Backend (.env)
Make sure your backend `.env` includes database credentials:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=task_manager
```

### Rescheduler Library
Create `.env` in `packages/rescheduler-lib`:

```bash
cd packages/rescheduler-lib
cp .env.example .env
```

Edit the `.env` file with your database credentials.

## 4. Build the Rescheduler Library

```bash
cd packages/rescheduler-lib
pnpm run build
```

## 5. Start the Services

### Option 1: Start Backend with Integrated Scheduler

The scheduler will automatically initialize when the backend starts:

```bash
cd backend
pnpm run dev
```

### Option 2: Run Scheduler as Standalone Service

```bash
# Terminal 1 - Backend
cd backend
pnpm run dev

# Terminal 2 - Scheduler
cd packages/rescheduler-lib
pnpm run dev
```

## 6. Verify Installation

Check the console output. You should see:

```
🚀 Initializing Recurring Task Scheduler...
📋 Found X recurring task(s) to schedule
✅ Scheduler initialized successfully
```

## 7. Test the System

### Create a Test Recurring Task

```bash
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Every 5 Minutes",
    "description": "This is a test recurring task",
    "startDate": "2025-10-29",
    "startTime": "10:00:00",
    "dueDate": "2025-10-29",
    "dueTime": "10:05:00",
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

Watch the scheduler logs. Within 5 minutes, you should see:

```
⏰ Executing recurring task: X - Test Every 5 Minutes
✅ Created new task instance: Y for recurring task X
```

## 8. Verify in Database

```sql
-- Check recurring tasks
SELECT * FROM Tasks WHERE IsRecurring = TRUE;

-- Check recurrence rules
SELECT * FROM RecurrenceRules;

-- Check daily rules
SELECT * FROM Repeat_DailyRules;

-- Check if new instances are created
SELECT * FROM Tasks WHERE Title = 'Test Every 5 Minutes' ORDER BY CreatedAt DESC;
```

## Troubleshooting

### Issue: Module not found '@task-manager/rescheduler-lib'

**Solution**: Build the rescheduler-lib first:
```bash
cd packages/rescheduler-lib
pnpm run build
```

### Issue: Database connection errors

**Solution**: 
1. Verify MySQL is running
2. Check credentials in `.env` files
3. Ensure database exists: `CREATE DATABASE task_manager;`

### Issue: Tasks not executing

**Solution**:
1. Check scheduler logs for errors
2. Verify task has `IsRecurring = TRUE` and `RecurrenceId` is not NULL
3. Ensure times are correct (system uses UTC internally)

### Issue: TypeScript errors

**Solution**:
```bash
# Clean and rebuild
cd packages/rescheduler-lib
rm -rf dist node_modules
pnpm install
pnpm run build

cd ../../backend
rm -rf node_modules
pnpm install
```

## Next Steps

1. Read `RECURRING_TASKS_GUIDE.md` for detailed API examples
2. Read `packages/rescheduler-lib/README.md` for library documentation
3. Test different recurrence patterns
4. Integrate with your frontend

## Production Deployment

For production:

1. **Use PM2 or similar process manager**:
```bash
pm2 start packages/rescheduler-lib/dist/index.js --name "task-scheduler"
pm2 start backend/dist/index.js --name "backend"
```

2. **Enable logging**:
Configure proper logging to file or logging service

3. **Monitor scheduler**:
Set up monitoring to ensure scheduler is running

4. **Database backups**:
Recurring tasks create many records - ensure proper backup strategy

5. **Time zones**:
System uses UTC internally - ensure proper conversion for user display
