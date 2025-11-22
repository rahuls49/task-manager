const { recurringTaskScheduler } = require('./packages/rescheduler-lib/dist/index.js');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function runTest() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'task_manager',
    waitForConnections: true,
  });

  const connection = await pool.getConnection();

  try {
    await connection.query('START TRANSACTION');

    // Create a simple daily rule
    const [dailyResult] = await connection.query(
      `INSERT INTO Repeat_DailyRules (RecurEveryXDays) VALUES (?)`,
      [1]
    );

    const dailyRuleId = dailyResult.insertId;

    // Create RecurrenceRules row
    const [recurrenceResult] = await connection.query(
      `INSERT INTO RecurrenceRules (RecurrenceType, DailyRuleId) VALUES (?, ?)`,
      ['DAILY', dailyRuleId]
    );

    const recurrenceId = recurrenceResult.insertId;

    // Create a recurring parent task
    const [taskResult] = await connection.query(
      `INSERT INTO Tasks (Title, Description, IsRecurring, RecurrenceId, StartDate, StartTime, DueDate, DueTime, StatusId, PriorityId) VALUES (?, ?, TRUE, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'Test Recurrence Task',
        'Parent recurring task',
        recurrenceId,
        new Date().toISOString().split('T')[0],
        '00:00:00',
        new Date().toISOString().split('T')[0],
        '23:59:59',
        1,
        1
      ]
    );

    const parentTaskId = taskResult.insertId;

    // Retrieve full task and recurrence objects from DB
    const [tasksRows] = await connection.query(`SELECT * FROM Tasks WHERE Id = ?`, [parentTaskId]);
    const task = tasksRows[0];

    const [recurrenceRows] = await connection.query(`SELECT * FROM RecurrenceRules WHERE Id = ?`, [recurrenceId]);
    const recurrence = recurrenceRows[0];

    await connection.commit();

    // Execute one recurring tick
    await recurringTaskScheduler.executeRecurringTask(task, recurrence);

    // Check the newly created task
    const [rows] = await connection.query(`SELECT * FROM Tasks WHERE Id != ? AND Title = ? ORDER BY Id DESC LIMIT 1`, [parentTaskId, task.Title]);

    if (rows.length === 0) {
      console.error('No new task found - test failed');
      return;
    }

    const newTask = rows[0];

    console.log('New task created:', newTask);

    console.log('IsRecurring for new task:', !!newTask.IsRecurring);
    console.log('RecurrenceId for new task:', newTask.RecurrenceId);

    if (newTask.IsRecurring) {
      console.error('Test failed: New instance is recurring');
    } else if (newTask.RecurrenceId !== null) {
      console.error('Test failed: New instance carries recurrenceId');
    } else {
      console.log('Test passed: New instance is not recurring and has no RecurrenceId');
    }
  } catch (err) {
    console.error('Error during test:', err);
    await connection.rollback();
  } finally {
    connection.release();
    await pool.end();
  }
}

runTest().catch(err => {
  console.error('Test runner failed:', err);
});
