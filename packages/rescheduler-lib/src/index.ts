import * as schedule from 'node-schedule';
import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';

dotenv.config();

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface RecurrenceRule {
  Id: number;
  RecurrenceType: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  EndDate?: string;
  DailyRuleId?: number;
  WeeklyRuleId?: number;
  MonthlyRuleId?: number;
}

interface DailyRule {
  Id: number;
  RecurEveryXDays: number;
  IntraDayFrequencyType?: 'MINUTES' | 'HOURS';
  IntraDayInterval?: number;
}

interface WeeklyRule {
  Id: number;
  RecurEveryNWeeks: number;
  OnSunday: boolean;
  OnMonday: boolean;
  OnTuesday: boolean;
  OnWednesday: boolean;
  OnThursday: boolean;
  OnFriday: boolean;
  OnSaturday: boolean;
}

interface MonthlyRule {
  Id: number;
  RuleType: 'BY_DAY_OF_MONTH' | 'BY_ORDINAL_DAY_OF_WEEK';
  months: number[];
  dayNumbers?: string[];
  ordinals?: Array<{
    Ordinal: 'FIRST' | 'SECOND' | 'THIRD' | 'FOURTH' | 'LAST';
    DayOfWeek: 'SUNDAY' | 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY';
  }>;
}

interface Task {
  Id: number;
  ParentTaskId?: number;
  Title: string;
  Description?: string;
  DueDate?: string | Date;
  DueTime?: string;
  StartDate?: string | Date;
  StartTime?: string;
  IsRecurring: boolean;
  RecurrenceId?: number;
  StatusId?: number;
  PriorityId?: number;
}

interface ScheduledJob {
  taskId: number;
  job: schedule.Job;
  recurrenceType: string;
}

// ============================================================================
// DATABASE CONNECTION
// ============================================================================

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'task_manager',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// ============================================================================
// SCHEDULER MANAGER
// ============================================================================

class RecurringTaskScheduler {
  private scheduledJobs: Map<number, ScheduledJob> = new Map();

  /**
   * Initialize scheduler - load all recurring tasks and schedule them
   */
  async initialize() {
    console.log('🚀 Initializing Recurring Task Scheduler...');
    
    try {
      const connection = await pool.getConnection();
      
      // Get all recurring tasks
      const [tasks] = await connection.query<any[]>(
        `SELECT * FROM Tasks WHERE IsRecurring = TRUE AND IsDeleted = FALSE AND RecurrenceId IS NOT NULL`
      );
      
      connection.release();

      console.log(`📋 Found ${tasks.length} recurring task(s) to schedule`);

      for (const task of tasks) {
        await this.scheduleTask(task);
      }

      console.log('✅ Scheduler initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing scheduler:', error);
      throw error;
    }
  }

  /**
   * Schedule a recurring task
   */
  async scheduleTask(task: Task) {
    try {
      if (!task.RecurrenceId) {
        console.log(`⚠️  Task ${task.Id} has no recurrence rule`);
        return;
      }

      // Get recurrence rule
      const recurrence = await this.getRecurrenceRule(task.RecurrenceId);
      if (!recurrence) {
        console.log(`⚠️  Recurrence rule ${task.RecurrenceId} not found`);
        return;
      }

      // Cancel existing job if any
      this.cancelTask(task.Id);

      // Check if task should start in the future
      const startDateTime = this.getTaskStartDateTime(task);
      if (startDateTime) {
        const now = new Date();
        
        if (startDateTime > now) {
          // Task starts in the future - schedule it to start then
          console.log(`⏳ Task ${task.Id} scheduled to start at ${startDateTime.toISOString()}`);
          
          // Schedule a one-time job to activate the recurring schedule at start time
          schedule.scheduleJob(startDateTime, async () => {
            console.log(`🚀 Activating recurring schedule for task ${task.Id}`);
            await this.activateRecurringSchedule(task, recurrence);
          });
          
          return;
        }
      }

      // Start time is in the past or not set - activate immediately
      await this.activateRecurringSchedule(task, recurrence);

    } catch (error) {
      console.error(`❌ Error scheduling task ${task.Id}:`, error);
    }
  }

  /**
   * Activate the recurring schedule for a task
   */
  async activateRecurringSchedule(task: Task, recurrence: RecurrenceRule & { rule: any }) {
    try {
      // Create schedule rule
      const scheduleRule = await this.createScheduleRule(task, recurrence);
      
      if (!scheduleRule) {
        console.log(`⚠️  Could not create schedule rule for task ${task.Id}`);
        return;
      }

      // Schedule the job
      const job = schedule.scheduleJob(scheduleRule, async () => {
        await this.executeRecurringTask(task, recurrence);
      });

      if (job) {
        this.scheduledJobs.set(task.Id, {
          taskId: task.Id,
          job,
          recurrenceType: recurrence.RecurrenceType
        });

        console.log(`✅ Scheduled task ${task.Id} (${task.Title}) - Type: ${recurrence.RecurrenceType}`);
        console.log(`   Next execution: ${job.nextInvocation()}`);
      }
    } catch (error) {
      console.error(`❌ Error activating recurring schedule for task ${task.Id}:`, error);
    }
  }

  /**
   * Get recurrence rule with all details
   */
  async getRecurrenceRule(recurrenceId: number): Promise<RecurrenceRule & { rule: DailyRule | WeeklyRule | MonthlyRule | null } | null> {
    const connection = await pool.getConnection();
    try {
      // Get main recurrence rule
      const [recurrenceRows] = await connection.query<any[]>(
        `SELECT * FROM RecurrenceRules WHERE Id = ?`,
        [recurrenceId]
      );

      if (recurrenceRows.length === 0) {
        return null;
      }

      const recurrence = recurrenceRows[0] as RecurrenceRule;
      let rule: DailyRule | WeeklyRule | MonthlyRule | null = null;

      // Get specific rule based on type
      switch (recurrence.RecurrenceType) {
        case 'DAILY':
          if (recurrence.DailyRuleId) {
            const [dailyRows] = await connection.query<any[]>(
              `SELECT * FROM Repeat_DailyRules WHERE Id = ?`,
              [recurrence.DailyRuleId]
            );
            rule = dailyRows[0] as DailyRule;
          }
          break;

        case 'WEEKLY':
          if (recurrence.WeeklyRuleId) {
            const [weeklyRows] = await connection.query<any[]>(
              `SELECT * FROM Repeat_WeeklyRules WHERE Id = ?`,
              [recurrence.WeeklyRuleId]
            );
            rule = weeklyRows[0] as WeeklyRule;
          }
          break;

        case 'MONTHLY':
          if (recurrence.MonthlyRuleId) {
            const [monthlyRows] = await connection.query<any[]>(
              `SELECT * FROM Repeat_MonthlyRules WHERE Id = ?`,
              [recurrence.MonthlyRuleId]
            );
            const monthlyRule = monthlyRows[0];

            // Get months
            const [monthRows] = await connection.query<any[]>(
              `SELECT MonthNumber FROM Repeat_MonthlyRule_Months WHERE MonthlyRuleId = ?`,
              [recurrence.MonthlyRuleId]
            );
            monthlyRule.months = monthRows.map((row: any) => row.MonthNumber);

            // Get day numbers or ordinals
            if (monthlyRule.RuleType === 'BY_DAY_OF_MONTH') {
              const [dayRows] = await connection.query<any[]>(
                `SELECT DayNumber FROM Repeat_MonthlyRule_Days WHERE MonthlyRuleId = ?`,
                [recurrence.MonthlyRuleId]
              );
              monthlyRule.dayNumbers = dayRows.map((row: any) => row.DayNumber);
            } else {
              const [ordinalRows] = await connection.query<any[]>(
                `SELECT Ordinal, DayOfWeek FROM Repeat_MonthlyRule_Ordinals WHERE MonthlyRuleId = ?`,
                [recurrence.MonthlyRuleId]
              );
              monthlyRule.ordinals = ordinalRows;
            }

            rule = monthlyRule as MonthlyRule;
          }
          break;
      }

      return { ...recurrence, rule };
    } finally {
      connection.release();
    }
  }

  /**
   * Get task's start date and time as a Date object
   */
  getTaskStartDateTime(task: Task): Date | null {
    if (!task.StartDate) {
      return null;
    }

    let datePart: string;
    
    // Handle both Date objects and string dates from database
    if (task.StartDate instanceof Date) {
      // MySQL returns Date objects - format as YYYY-MM-DD
      datePart = task.StartDate.toISOString().split('T')[0];
    } else {
      // String format - extract date part
      datePart = task.StartDate.split('T')[0];
    }
    
    const timePart = task.StartTime || '00:00:00';
    
    // Combine date and time with 'Z' suffix to treat as UTC
    // Database stores times in UTC, so we need to parse them as UTC
    const dateTimeStr = `${datePart}T${timePart}Z`;
    const dateTime = new Date(dateTimeStr);
    
    return isNaN(dateTime.getTime()) ? null : dateTime;
  }

  /**
   * Create node-schedule RecurrenceRule from database recurrence
   */
  async createScheduleRule(task: Task, recurrence: RecurrenceRule & { rule: any }): Promise<schedule.RecurrenceRule | string | null> {
    const rule = new schedule.RecurrenceRule();
    
    // Set end date if specified (using type assertion for compatibility)
    if (recurrence.EndDate) {
      (rule as any).end = new Date(recurrence.EndDate);
    }

    switch (recurrence.RecurrenceType) {
      case 'DAILY':
        return this.createDailySchedule(task, recurrence.rule as DailyRule);

      case 'WEEKLY':
        return this.createWeeklySchedule(task, recurrence.rule as WeeklyRule);

      case 'MONTHLY':
        return this.createMonthlySchedule(task, recurrence.rule as MonthlyRule);

      default:
        return null;
    }
  }

  /**
   * Create daily schedule (supports intra-day repetition)
   */
  createDailySchedule(task: Task, dailyRule: DailyRule): schedule.RecurrenceRule | string {
    // For intra-day repetition (every N minutes/hours)
    if (dailyRule.IntraDayFrequencyType && dailyRule.IntraDayInterval) {
      if (dailyRule.IntraDayFrequencyType === 'MINUTES') {
        // Run every N minutes: */N * * * *
        return `*/${dailyRule.IntraDayInterval} * * * *`;
      } else if (dailyRule.IntraDayFrequencyType === 'HOURS') {
        // Run every N hours: 0 */N * * *
        return `0 */${dailyRule.IntraDayInterval} * * *`;
      }
    }

    // For daily repetition (every N days)
    const rule = new schedule.RecurrenceRule();
    
    // Use start time if available, otherwise use current time
    const startTime = task.StartTime ? task.StartTime.split(':') : ['0', '0'];
    rule.hour = parseInt(startTime[0] || '0');
    rule.minute = parseInt(startTime[1] || '0');
    rule.second = 0;

    // Every N days - we'll use a custom date function
    if (dailyRule.RecurEveryXDays > 1) {
      const startDate = task.StartDate ? new Date(task.StartDate) : new Date();
      (rule as any).date = (date: Date) => {
        const daysDiff = Math.floor((date.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        return daysDiff % dailyRule.RecurEveryXDays === 0;
      };
    }

    return rule;
  }

  /**
   * Create weekly schedule
   */
  createWeeklySchedule(task: Task, weeklyRule: WeeklyRule): schedule.RecurrenceRule {
    const rule = new schedule.RecurrenceRule();
    
    // Set time
    const startTime = task.StartTime ? task.StartTime.split(':') : ['0', '0'];
    rule.hour = parseInt(startTime[0] || '0');
    rule.minute = parseInt(startTime[1] || '0');
    rule.second = 0;

    // Set days of week
    const daysOfWeek: number[] = [];
    if (weeklyRule.OnSunday) daysOfWeek.push(0);
    if (weeklyRule.OnMonday) daysOfWeek.push(1);
    if (weeklyRule.OnTuesday) daysOfWeek.push(2);
    if (weeklyRule.OnWednesday) daysOfWeek.push(3);
    if (weeklyRule.OnThursday) daysOfWeek.push(4);
    if (weeklyRule.OnFriday) daysOfWeek.push(5);
    if (weeklyRule.OnSaturday) daysOfWeek.push(6);

    rule.dayOfWeek = daysOfWeek;

    // For every N weeks, use custom date function
    if (weeklyRule.RecurEveryNWeeks > 1) {
      const startDate = task.StartDate ? new Date(task.StartDate) : new Date();
      const originalDayOfWeek = rule.dayOfWeek;
      
      (rule as any).dayOfWeek = (date: Date) => {
        const weeksDiff = Math.floor((date.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 7));
        const isCorrectWeek = weeksDiff % weeklyRule.RecurEveryNWeeks === 0;
        const isCorrectDay = Array.isArray(originalDayOfWeek) && originalDayOfWeek.includes(date.getDay());
        return isCorrectWeek && isCorrectDay;
      };
    }

    return rule;
  }

  /**
   * Create monthly schedule
   */
  createMonthlySchedule(task: Task, monthlyRule: MonthlyRule): schedule.RecurrenceRule {
    const rule = new schedule.RecurrenceRule();
    
    // Set time
    const startTime = task.StartTime ? task.StartTime.split(':') : ['0', '0'];
    rule.hour = parseInt(startTime[0] || '0');
    rule.minute = parseInt(startTime[1] || '0');
    rule.second = 0;

    // Set months
    rule.month = monthlyRule.months.map(m => m - 1); // node-schedule uses 0-11 for months

    if (monthlyRule.RuleType === 'BY_DAY_OF_MONTH') {
      // Set specific days of month
      const dates: number[] = [];
      
      for (const dayNum of monthlyRule.dayNumbers || []) {
        if (dayNum === 'L') {
          // Last day of month - handle with custom function
          (rule as any).date = (date: Date) => {
            const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
            return date.getDate() === lastDay;
          };
        } else {
          dates.push(parseInt(dayNum));
        }
      }

      if (dates.length > 0 && !monthlyRule.dayNumbers?.includes('L')) {
        rule.date = dates;
      }
    } else if (monthlyRule.RuleType === 'BY_ORDINAL_DAY_OF_WEEK') {
      // Handle ordinal days (e.g., FIRST MONDAY, LAST FRIDAY)
      (rule as any).date = (date: Date) => {
        return this.matchesOrdinalDay(date, monthlyRule.ordinals || []);
      };
    }

    return rule;
  }

  /**
   * Check if date matches ordinal day specification
   */
  matchesOrdinalDay(date: Date, ordinals: MonthlyRule['ordinals']): boolean {
    if (!ordinals || ordinals.length === 0) return false;

    const dayOfWeekMap: { [key: string]: number } = {
      'SUNDAY': 0, 'MONDAY': 1, 'TUESDAY': 2, 'WEDNESDAY': 3,
      'THURSDAY': 4, 'FRIDAY': 5, 'SATURDAY': 6
    };

    for (const ordinal of ordinals) {
      const targetDay = dayOfWeekMap[ordinal.DayOfWeek];
      
      if (date.getDay() !== targetDay) continue;

      const weekOfMonth = Math.floor((date.getDate() - 1) / 7) + 1;
      
      if (ordinal.Ordinal === 'LAST') {
        // Check if this is the last occurrence of this weekday in the month
        const nextWeek = new Date(date);
        nextWeek.setDate(date.getDate() + 7);
        if (nextWeek.getMonth() !== date.getMonth()) {
          return true;
        }
      } else {
        const ordinalMap: { [key: string]: number } = {
          'FIRST': 1, 'SECOND': 2, 'THIRD': 3, 'FOURTH': 4
        };
        
        if (weekOfMonth === ordinalMap[ordinal.Ordinal]) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Execute recurring task - create new instance
   */
  async executeRecurringTask(task: Task, recurrence: RecurrenceRule & { rule: any }) {
    console.log(`⏰ Executing recurring task: ${task.Id} - ${task.Title}`);
    
    try {
      const connection = await pool.getConnection();
      
      try {
        await connection.beginTransaction();

        // Calculate new start and due dates based on recurrence
        const { newStartDate, newStartTime, newDueDate, newDueTime } = this.calculateNextOccurrence(task, recurrence);

        // Create new task instance
        const [result] = await connection.query<any>(
          `INSERT INTO Tasks 
             (ParentTaskId, Title, Description, StartDate, StartTime, DueDate, DueTime, 
              IsRecurring, RecurrenceId, StatusId, PriorityId, IsDeleted)
             VALUES (?, ?, ?, ?, ?, ?, ?, FALSE, NULL, ?, ?, FALSE)`,
          [
            task.ParentTaskId,
            task.Title,
            task.Description,
            newStartDate,
            newStartTime,
            newDueDate,
            newDueTime,
              // Force new instances to not be themselves recurring or carry recurrenceId
            1, // Reset to TODO status
            task.PriorityId
          ]
        );

        const newTaskId = result.insertId;

        // Copy subtasks if parent task has any
        const [subtasks] = await connection.query<any[]>(
          `SELECT * FROM Tasks WHERE ParentTaskId = ? AND IsDeleted = FALSE`,
          [task.Id]
        );

        for (const subtask of subtasks) {
          await connection.query(
            `INSERT INTO Tasks 
             (ParentTaskId, Title, Description, StartDate, StartTime, DueDate, DueTime, 
              StatusId, PriorityId, IsDeleted)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, FALSE)`,
            [
              newTaskId,
              subtask.Title,
              subtask.Description,
              newStartDate,
              newStartTime,
              newDueDate,
              newDueTime,
              1, // Reset to TODO
              subtask.PriorityId
            ]
          );
        }

        // Copy task assignments
        const [assignments] = await connection.query<any[]>(
          `SELECT * FROM TaskAssignees WHERE TaskId = ?`,
          [task.Id]
        );

        for (const assignment of assignments) {
          await connection.query(
            `INSERT INTO TaskAssignees (TaskId, AssigneeId, GroupId) VALUES (?, ?, ?)`,
            [newTaskId, assignment.AssigneeId, assignment.GroupId]
          );
        }

        await connection.commit();

        console.log(`✅ Created new task instance: ${newTaskId} for recurring task ${task.Id}`);
        console.log(`   Start: ${newStartDate} ${newStartTime}, Due: ${newDueDate} ${newDueTime}`);
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error(`❌ Error executing recurring task ${task.Id}:`, error);
    }
  }

  /**
   * Calculate next occurrence dates
   */
  calculateNextOccurrence(task: Task, recurrence: RecurrenceRule & { rule: any }): {
    newStartDate: string;
    newStartTime: string;
    newDueDate: string;
    newDueTime: string;
  } {
    const now = new Date();
    let newStartDate: Date;
    let newDueDate: Date;

    const startDate = task.StartDate ? new Date(task.StartDate) : now;
    const dueDate = task.DueDate ? new Date(task.DueDate) : now;
    const duration = dueDate.getTime() - startDate.getTime();

    switch (recurrence.RecurrenceType) {
      case 'DAILY':
        const dailyRule = recurrence.rule as DailyRule;
        newStartDate = new Date(now);
        newStartDate.setDate(now.getDate() + dailyRule.RecurEveryXDays);
        break;

      case 'WEEKLY':
        const weeklyRule = recurrence.rule as WeeklyRule;
        newStartDate = new Date(now);
        newStartDate.setDate(now.getDate() + (7 * weeklyRule.RecurEveryNWeeks));
        break;

      case 'MONTHLY':
        newStartDate = new Date(now);
        newStartDate.setMonth(now.getMonth() + 1);
        break;

      default:
        newStartDate = new Date(now);
    }

    // Calculate due date based on duration
    newDueDate = new Date(newStartDate.getTime() + duration);

    return {
      newStartDate: newStartDate.toISOString().split('T')[0] || '',
      newStartTime: task.StartTime || '00:00:00',
      newDueDate: newDueDate.toISOString().split('T')[0] || '',
      newDueTime: task.DueTime || '23:59:59'
    };
  }

  /**
   * Cancel scheduled task
   */
  cancelTask(taskId: number) {
    const scheduled = this.scheduledJobs.get(taskId);
    if (scheduled) {
      scheduled.job.cancel();
      this.scheduledJobs.delete(taskId);
      console.log(`🛑 Cancelled schedule for task ${taskId}`);
    }
  }

  /**
   * Reschedule task (useful when task is updated)
   */
  async rescheduleTask(taskId: number) {
    const connection = await pool.getConnection();
    try {
      const [tasks] = await connection.query<any[]>(
        `SELECT * FROM Tasks WHERE Id = ? AND IsRecurring = TRUE AND IsDeleted = FALSE`,
        [taskId]
      );

      if (tasks.length > 0) {
        await this.scheduleTask(tasks[0]);
      }
    } finally {
      connection.release();
    }
  }

  /**
   * Get scheduled jobs info
   */
  getScheduledJobs(): Array<{ taskId: number; recurrenceType: string; nextInvocation: Date | null }> {
    const jobs: Array<{ taskId: number; recurrenceType: string; nextInvocation: Date | null }> = [];
    
    this.scheduledJobs.forEach((scheduled) => {
      jobs.push({
        taskId: scheduled.taskId,
        recurrenceType: scheduled.recurrenceType,
        nextInvocation: scheduled.job.nextInvocation()
      });
    });

    return jobs;
  }

  /**
   * Shutdown scheduler gracefully
   */
  async shutdown() {
    console.log('🛑 Shutting down Recurring Task Scheduler...');
    
    // Cancel all jobs
    this.scheduledJobs.forEach((scheduled) => {
      scheduled.job.cancel();
    });
    
    this.scheduledJobs.clear();
    
    // Close database pool
    await pool.end();
    
    console.log('✅ Scheduler shutdown complete');
  }
}

// ============================================================================
// EXPORT & SINGLETON
// ============================================================================

export const recurringTaskScheduler = new RecurringTaskScheduler();

// Initialize on import (for standalone service)
if (require.main === module) {
  recurringTaskScheduler.initialize().catch(console.error);

  // Graceful shutdown
  process.on('SIGINT', async () => {
    await recurringTaskScheduler.shutdown();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await recurringTaskScheduler.shutdown();
    process.exit(0);
  });
}

export default recurringTaskScheduler;
