# Database Setup Guide

## Quick Setup

To set up the database with the new recurrence system:

### 1. Create the Database Schema

Execute your provided SQL schema to create all tables:

```sql
-- Your complete schema from the userRequest
-- This will create all the new recurrence tables
```

### 2. Initialize Default Data

Run the initialization script to populate default data:

```bash
mysql -u your_username -p task_manager < init-data.sql
```

Or execute the SQL directly:

```sql
-- Run the contents of init-data.sql
```

### 3. Verify Setup

Check that all tables were created correctly:

```sql
USE task_manager;

SHOW TABLES;

-- Should show:
-- Assignees
-- EscalationHistory  
-- EscalationRules
-- GroupMaster
-- RecurrenceRules
-- Repeat_DailyRules
-- Repeat_MonthlyRule_Days
-- Repeat_MonthlyRule_Months
-- Repeat_MonthlyRule_Ordinals
-- Repeat_MonthlyRules
-- Repeat_WeeklyRules
-- TaskAssignees
-- TaskPriority
-- TaskStatus
-- Tasks
-- UserGroupMembers
```

### 4. Test the API

Start your backend server and run the diagnostic test:

```bash
# In the task-manager directory
node test-diagnostics.js
```

## Migration Notes

⚠️ **Important**: This is a breaking change. The old `TaskRecurrence` table no longer exists.

### If you have existing data:

1. **Export existing task data** before applying the new schema
2. **Apply the new schema** (this will drop the entire database)
3. **Manually recreate tasks** with new recurrence patterns using the API

### Example Migration Process:

```sql
-- 1. Backup existing tasks (before schema change)
SELECT * FROM Tasks WHERE IsRecurring = TRUE;

-- 2. Note down recurrence patterns from old TaskRecurrence table
SELECT * FROM TaskRecurrence;

-- 3. Apply new schema (your provided SQL)

-- 4. Use the new API to recreate tasks with equivalent recurrence patterns
```

## Environment Variables

Make sure your `.env` file has the correct database connection:

```env
DB_HOST=localhost
DB_USER=your_username
DB_PASSWORD=your_password
DB_NAME=task_manager
```

## Troubleshooting

### Common Issues:

1. **"Table 'taskrecurrence' doesn't exist"**
   - This error means you're using the new code with an old database
   - Solution: Apply the new schema

2. **"Connection refused"**
   - Check if MySQL is running
   - Verify connection credentials

3. **"Database doesn't exist"**
   - Run: `CREATE DATABASE task_manager;`
   - Then apply the schema

### Verify Connection:

```javascript
// Test database connection
const mysql = require('mysql2/promise');

async function testConnection() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'your_username',
      password: 'your_password',
      database: 'task_manager'
    });
    
    const [rows] = await connection.execute('SELECT COUNT(*) as count FROM Tasks');
    console.log('✅ Database connected, tasks table exists');
    console.log('Tasks count:', rows[0].count);
    
    await connection.end();
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
  }
}

testConnection();
```