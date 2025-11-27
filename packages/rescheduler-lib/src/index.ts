import * as schedule from 'node-schedule';
import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
// Use runtime require to avoid TypeScript pulling external package source under this package's rootDir
// @ts-ignore: intentionally require external package at runtime to avoid rootDir inclusion error
// eslint-disable-next-line @typescript-eslint/no-var-requires
const eventHandler: any = require('@task-manager/event-lib').default || require('@task-manager/event-lib');

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
  private executingTasks: Set<number> = new Set();

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

  private buildOccurrenceContext(task: any) {
    const templateAnchorStart = this.combineDateAndTime(task.StartDate, task.StartTime) ||
      this.combineDateAndTime(task.DueDate, task.DueTime) ||
      new Date();

    const templateDue = this.combineDateAndTime(task.DueDate, task.DueTime) || templateAnchorStart;
    const durationMs = Math.max(templateDue.getTime() - templateAnchorStart.getTime(), 0);
    const occurrenceStart = new Date();

    const startDateLabel = this.formatDateValue(occurrenceStart) || this.formatDateValue(new Date());
    const startTimeLabel = this.formatTimeValue(occurrenceStart) || '00:00:00';

    return {
      templateAnchorStart,
      occurrenceStart,
      durationMs,
      startLabel: `${startDateLabel} ${startTimeLabel}`.trim()
    };
  }

  private async cloneTaskRecursive(
    connection: mysql.PoolConnection,
    templateTask: any,
    context: {
      templateAnchorStart: Date;
      newAnchorStart: Date;
      parentId: number | null;
      defaultDurationMs: number;
    }
  ): Promise<number> {
    const templateStart = this.combineDateAndTime(templateTask.StartDate, templateTask.StartTime) || context.templateAnchorStart;
    const templateDue = this.combineDateAndTime(templateTask.DueDate, templateTask.DueTime) ||
      new Date(templateStart.getTime() + context.defaultDurationMs);
    const durationMs = Math.max(templateDue.getTime() - templateStart.getTime(), context.defaultDurationMs);
    const startOffset = templateStart.getTime() - context.templateAnchorStart.getTime();

    const newStart = new Date(context.newAnchorStart.getTime() + startOffset);
    const newDue = new Date(newStart.getTime() + durationMs);

    const { date: startDateValue, time: startTimeValue } = this.splitDateTime(newStart);
    const { date: dueDateValue, time: dueTimeValue } = this.splitDateTime(newDue);

    const [result] = await connection.query<any>(
      `INSERT INTO Tasks 
         (ParentTaskId, Title, Description, StartDate, StartTime, DueDate, DueTime, 
          TaskTypeId, StatusId, PriorityId, IsRecurring, RecurrenceId, CreatedBy, IsEscalated, EscalationLevel, CreatedAt, UpdatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, FALSE, NULL, ?, FALSE, 0, UTC_TIMESTAMP(), UTC_TIMESTAMP())`,
      [
        context.parentId,
        templateTask.Title,
        templateTask.Description,
        startDateValue,
        startTimeValue,
        dueDateValue,
        dueTimeValue,
        this.toNullableNumber(templateTask.TaskTypeId),
        1, // Reset status to TODO for new instances
        this.toNullableNumber(templateTask.PriorityId),
        this.toNullableNumber(templateTask.CreatedBy)
      ]
    );

    const newTaskId = Number(result.insertId);

    await this.copyTaskAssignments(connection, Number(templateTask.Id), newTaskId);

    const subtasks = await this.getSubtasks(connection, Number(templateTask.Id));
    for (const subtask of subtasks) {
      await this.cloneTaskRecursive(connection, subtask, {
        templateAnchorStart: templateStart,
        newAnchorStart: newStart,
        parentId: newTaskId,
        defaultDurationMs: durationMs || context.defaultDurationMs
      });
    }

    return newTaskId;
  }

  private async getTaskRecord(connection: mysql.PoolConnection, taskId: number) {
    const [rows] = await connection.query<any[]>(
      `SELECT * FROM Tasks WHERE Id = ? AND IsDeleted = FALSE`,
      [taskId]
    );
    return rows.length ? rows[0] : null;
  }

  private async getSubtasks(connection: mysql.PoolConnection, taskId: number) {
    const [rows] = await connection.query<any[]>(
      `SELECT * FROM Tasks WHERE ParentTaskId = ? AND IsDeleted = FALSE`,
      [taskId]
    );
    return rows;
  }

  private async copyTaskAssignments(connection: mysql.PoolConnection, sourceTaskId: number, targetTaskId: number) {
    const [assignments] = await connection.query<any[]>(
      `SELECT AssigneeId, GroupId FROM TaskAssignees WHERE TaskId = ?`,
      [sourceTaskId]
    );

    if (!assignments || assignments.length === 0) {
      return;
    }

    for (const assignment of assignments) {
      await connection.query(
        `INSERT INTO TaskAssignees (TaskId, AssigneeId, GroupId, AssignedAt) VALUES (?, ?, ?, UTC_TIMESTAMP())`,
        [
          targetTaskId,
          this.toNullableNumber(assignment.AssigneeId),
          this.toNullableNumber(assignment.GroupId)
        ]
      );
    }
  }

  private splitDateTime(date: Date | null): { date: string | null; time: string | null } {
    if (!date || Number.isNaN(date.getTime())) {
      return { date: null, time: null };
    }

    const iso = date.toISOString();
    const [datePart, timePart] = iso.split('T');
    return { date: datePart, time: timePart.split('.')[0] };
  }

  private combineDateAndTime(dateValue?: Date | string | null, timeValue?: Date | string | null): Date | null {
    if (!dateValue && !timeValue) {
      return null;
    }

    const base = dateValue ? new Date(dateValue) : new Date();
    if (Number.isNaN(base.getTime())) {
      return null;
    }

    if (timeValue) {
      const timeParts = this.extractTimeParts(timeValue);
      base.setUTCHours(timeParts.hours, timeParts.minutes, timeParts.seconds, 0);
    } else {
      base.setUTCHours(0, 0, 0, 0);
    }

    return base;
  }

  private extractTimeParts(value: Date | string | null) {
    if (value instanceof Date) {
      return {
        hours: value.getUTCHours(),
        minutes: value.getUTCMinutes(),
        seconds: value.getUTCSeconds()
      };
    }

    if (typeof value === 'string') {
      const [h = '0', m = '0', s = '0'] = value.split(':');
      return {
        hours: parseInt(h, 10) || 0,
        minutes: parseInt(m, 10) || 0,
        seconds: parseInt(s, 10) || 0
      };
    }

    return { hours: 0, minutes: 0, seconds: 0 };
  }

  private formatDateValue(value: Date | string | null): string | null {
    if (!value) {
      return null;
    }

    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
      return null;
    }
    return date.toISOString().split('T')[0];
  }

  private formatTimeValue(value: Date | string | null): string | null {
    if (!value) {
      return null;
    }

    if (typeof value === 'string') {
      return value.length === 5 ? `${value}:00` : value;
    }

    const iso = value.toISOString().split('T')[1];
    return iso.split('.')[0];
  }

  private toNullableNumber(value: any): number | null {
    if (value === null || value === undefined) {
      return null;
    }
    const num = Number(value);
    return Number.isNaN(num) ? null : num;
  }

  private async emitTaskCreatedEvent(taskId: number) {
    try {
      const snapshot = await this.fetchTaskSnapshot(taskId);
      if (!snapshot) {
        return;
      }

      const payload = {
        event: 'task_created',
        timestamp: new Date().toISOString(),
        triggeredBy: null,
        data: {
          task: snapshot,
          change: {
            oldValue: null,
            newValue: null,
            metadata: null
          }
        }
      };

      await eventHandler(payload, 'create-task-event');
    } catch (error) {
      console.error(`⚠️  Failed to emit task_created event for task ${taskId}:`, error);
    }
  }

  private async fetchTaskSnapshot(taskId: number) {
    const connection = await pool.getConnection();

    try {
      const [taskRows] = await connection.query<any[]>(
        `SELECT * FROM Tasks WHERE Id = ?`,
        [taskId]
      );

      if (!taskRows.length) {
        return null;
      }

      const task = taskRows[0];

      const [assignmentRows] = await connection.query<any[]>(
        `SELECT 
           ta.AssigneeId, 
           ta.GroupId, 
           a.Name as AssigneeName, 
           a.Email as AssigneeEmail,
           gm.GroupName
         FROM TaskAssignees ta
         LEFT JOIN Assignees a ON ta.AssigneeId = a.Id
         LEFT JOIN GroupMaster gm ON ta.GroupId = gm.GroupId
         WHERE ta.TaskId = ?`,
        [taskId]
      );

      const assignees = assignmentRows
        .filter(row => row.AssigneeId)
        .map(row => ({
          Id: Number(row.AssigneeId),
          Name: row.AssigneeName,
          Email: row.AssigneeEmail
        }));

      const groups = assignmentRows
        .filter(row => row.GroupId)
        .map(row => ({
          GroupId: Number(row.GroupId),
          GroupName: row.GroupName
        }));

      return {
        taskId: Number(task.Id),
        title: task.Title,
        statusId: this.toNullableNumber(task.StatusId),
        priorityId: this.toNullableNumber(task.PriorityId),
        dueDate: this.formatDateValue(task.DueDate),
        dueTime: this.formatTimeValue(task.DueTime),
        startDate: this.formatDateValue(task.StartDate),
        startTime: this.formatTimeValue(task.StartTime),
        recurrenceId: this.toNullableNumber(task.RecurrenceId),
        parentTaskId: this.toNullableNumber(task.ParentTaskId),
        escalationLevel: this.toNullableNumber(task.EscalationLevel) || 0,
        assignees,
        groups
      };
    } finally {
      connection.release();
    }
  }

  /**
   * Execute recurring task - create new instance
   */
  async executeRecurringTask(task: Task, recurrence: RecurrenceRule & { rule: any }) {
    if (this.executingTasks.has(task.Id)) {
      console.log(`⚠️  Recurring task ${task.Id} is already being processed. Skipping duplicate execution.`);
      return;
    }

    this.executingTasks.add(task.Id);
    console.log(`⏰ Executing recurring task: ${task.Id} - ${task.Title}`);

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const templateTask = await this.getTaskRecord(connection, task.Id);
      if (!templateTask) {
        console.warn(`⚠️  Template task ${task.Id} no longer exists. Skipping.`);
        await connection.rollback();
        return;
      }

      const occurrence = this.buildOccurrenceContext(templateTask);

      if (this.hasRecurrenceWindowExpired(templateTask, recurrence, occurrence.occurrenceStart, occurrence.durationMs)) {
        console.log(`⛔ Recurrence window elapsed for task ${task.Id}. No further instances will be created.`);
        await connection.rollback();
        return;
      }

      const parentId = this.toNullableNumber(templateTask.ParentTaskId);

      const newTaskId = await this.cloneTaskRecursive(connection, templateTask, {
        templateAnchorStart: occurrence.templateAnchorStart,
        newAnchorStart: occurrence.occurrenceStart,
        parentId,
        defaultDurationMs: occurrence.durationMs
      });

      await connection.commit();

      console.log(`✅ Created new task instance: ${newTaskId} for recurring task ${task.Id}`);
      console.log(
        `   Start: ${occurrence.startLabel} | Duration: ${Math.round(occurrence.durationMs / (1000 * 60))} minutes`
      );

      await this.emitTaskCreatedEvent(newTaskId);
    } catch (error) {
      await connection.rollback();
      console.error(`❌ Error executing recurring task ${task.Id}:`, error);
    } finally {
      connection.release();
      this.executingTasks.delete(task.Id);
    }
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

  private hasRecurrenceWindowExpired(
    templateTask: Task,
    recurrence: RecurrenceRule & { rule: any },
    occurrenceStart: Date,
    occurrenceDurationMs: number
  ): boolean {
    const boundary = this.getRecurrenceEndBoundary(templateTask, recurrence);
    if (!boundary) {
      return false;
    }

    if (occurrenceStart > boundary) {
      this.cancelTask(templateTask.Id);
      return true;
    }

    const occurrenceEnd = new Date(occurrenceStart.getTime() + occurrenceDurationMs);
    if (occurrenceEnd > boundary) {
      this.cancelTask(templateTask.Id);
      return true;
    }

    return false;
  }

  private getRecurrenceEndBoundary(templateTask: Task, recurrence: RecurrenceRule & { rule: any }): Date | null {
    if (recurrence.EndDate) {
      const endDate = new Date(recurrence.EndDate);
      if (Number.isNaN(endDate.getTime())) {
        return null;
      }

      const timeSource = templateTask.DueTime || templateTask.StartTime || null;
      if (timeSource) {
        const parts = this.extractTimeParts(timeSource);
        endDate.setUTCHours(parts.hours, parts.minutes, parts.seconds, 999);
      } else {
        endDate.setUTCHours(23, 59, 59, 999);
      }

      return endDate;
    }

    // For intra-day recurrence without EndDate, default to the template task's due date/time
    if (recurrence.RecurrenceType === 'DAILY' && recurrence.rule?.IntraDayFrequencyType) {
      return this.combineDateAndTime(templateTask.DueDate, templateTask.DueTime) || 
             this.combineDateAndTime(templateTask.StartDate, templateTask.StartTime);
    }

    return null;
  }

  private calculateNextOccurrence(lastStart: Date, recurrence: RecurrenceRule & { rule: any }): Date {
    const next = new Date(lastStart);

    switch (recurrence.RecurrenceType) {
      case 'DAILY':
        const dailyRule = recurrence.rule as DailyRule;
        if (dailyRule.IntraDayFrequencyType === 'MINUTES') {
          next.setMinutes(next.getMinutes() + dailyRule.IntraDayInterval);
        } else if (dailyRule.IntraDayFrequencyType === 'HOURS') {
          next.setHours(next.getHours() + dailyRule.IntraDayInterval);
        } else {
          next.setDate(next.getDate() + dailyRule.RecurEveryXDays);
        }
        break;
      case 'WEEKLY':
        const weeklyRule = recurrence.rule as WeeklyRule;
        next.setDate(next.getDate() + (weeklyRule.RecurEveryNWeeks * 7));
        break;
      case 'MONTHLY':
        const monthlyRule = recurrence.rule as MonthlyRule;
        next.setMonth(next.getMonth() + 1);
        break;
    }

    return next;
  }

  private calculateDuration(task: any): number {
    const start = this.combineDateAndTime(task.StartDate, task.StartTime);
    const due = this.combineDateAndTime(task.DueDate, task.DueTime);
    if (start && due) {
      return Math.max(due.getTime() - start.getTime(), 0);
    }
    return 0;
  }

  private formatDateTime(date: Date): string {
    const dateStr = this.formatDateValue(date) || '';
    const timeStr = this.formatTimeValue(date) || '';
    return `${dateStr} ${timeStr}`.trim();
  }

  /**
   * Create the next instance of a recurring task when a task instance is completed
   */
  async createNextRecurringInstance(completedTaskId: number) {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // Get the completed task
      const completedTask = await this.getTaskRecord(connection, completedTaskId);
      if (!completedTask) {
        console.warn(`Completed task ${completedTaskId} no longer exists. Skipping.`);
        await connection.rollback();
        return;
      }

      let templateTask: any;
      let parentId: number | null = null;

      // Determine the template task
      if (completedTask.ParentTaskId) {
        // This is an instance, get the parent as template
        const parentTask = await this.getTaskRecord(connection, Number(completedTask.ParentTaskId));
        if (!parentTask || !parentTask.IsRecurring || !parentTask.RecurrenceId) {
          console.log(`Parent task ${completedTask.ParentTaskId} is not recurring or has no recurrence rule.`);
          await connection.rollback();
          return;
        }
        templateTask = parentTask;
        parentId = Number(completedTask.ParentTaskId);
      } else if (completedTask.IsRecurring && completedTask.RecurrenceId) {
        // This is the base recurring task, use it as template
        templateTask = completedTask;
        parentId = null;
      } else {
        console.log(`Task ${completedTaskId} is not part of a recurring series.`);
        await connection.rollback();
        return;
      }

      // Get recurrence rule
      const recurrence = await this.getRecurrenceRule(templateTask.RecurrenceId);
      if (!recurrence) {
        console.log(`Recurrence rule ${templateTask.RecurrenceId} not found.`);
        await connection.rollback();
        return;
      }

      // Calculate next occurrence start time based on the completed task's start time
      let nextOccurrenceStart: Date;
      if (recurrence.RecurrenceType === 'DAILY' && (recurrence.rule as DailyRule)?.IntraDayFrequencyType) {
        // For intra-day completion-based, start from current time + interval
        const dailyRule = recurrence.rule as DailyRule;
        const intervalMs = dailyRule.IntraDayFrequencyType === 'MINUTES' 
          ? dailyRule.IntraDayInterval * 60 * 1000 
          : dailyRule.IntraDayInterval * 60 * 60 * 1000;
        nextOccurrenceStart = new Date(Date.now() + intervalMs);
      } else {
        const completedTaskStart = this.combineDateAndTime(completedTask.StartDate, completedTask.StartTime);
        if (!completedTaskStart) {
          console.warn(`Completed task ${completedTaskId} has no valid start time. Skipping.`);
          await connection.rollback();
          return;
        }
        nextOccurrenceStart = this.calculateNextOccurrence(completedTaskStart, recurrence);
      }

      const occurrence = {
        templateAnchorStart: this.combineDateAndTime(templateTask.StartDate, templateTask.StartTime) || nextOccurrenceStart,
        occurrenceStart: nextOccurrenceStart,
        durationMs: this.calculateDuration(templateTask),
        startLabel: this.formatDateTime(nextOccurrenceStart)
      };

      if (this.hasRecurrenceWindowExpired(templateTask, recurrence, occurrence.occurrenceStart, occurrence.durationMs)) {
        console.log(`Recurrence window elapsed for task ${templateTask.Id}. No further instances will be created.`);
        await connection.rollback();
        return;
      }

      const newTaskId = await this.cloneTaskRecursive(connection, templateTask, {
        templateAnchorStart: occurrence.templateAnchorStart,
        newAnchorStart: occurrence.occurrenceStart,
        parentId: parentId,
        defaultDurationMs: occurrence.durationMs
      });

      await connection.commit();

      console.log(`✅ Created next recurring instance: ${newTaskId} for completed task ${completedTaskId}`);
      console.log(
        `   Start: ${occurrence.startLabel} | Duration: ${Math.round(occurrence.durationMs / (1000 * 60))} minutes`
      );

      await this.emitTaskCreatedEvent(newTaskId);
    } catch (error) {
      await connection.rollback();
      console.error(`❌ Error creating next recurring instance for task ${completedTaskId}:`, error);
    } finally {
      connection.release();
    }
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
