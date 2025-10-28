import pool from "../../lib/connection";
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { 
  CreateRecurrenceDto, 
  RecurrenceRule, 
  DailyRule, 
  WeeklyRule, 
  MonthlyRule,
  MonthlyRuleMonth,
  MonthlyRuleDay,
  MonthlyRuleOrdinal,
  RecurrenceResponse 
} from "./task.types";

// ============================================================================
// RECURRENCE CREATION FUNCTIONS
// ============================================================================

export async function createRecurrenceRule(recurrenceData: CreateRecurrenceDto): Promise<number> {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    let dailyRuleId: number | null = null;
    let weeklyRuleId: number | null = null;
    let monthlyRuleId: number | null = null;

    // Create specific rule based on type
    switch (recurrenceData.recurrenceType) {
      case 'DAILY':
        if (!recurrenceData.dailyRule) {
          throw new Error('Daily rule configuration is required for DAILY recurrence');
        }
        dailyRuleId = await createDailyRule(connection, recurrenceData.dailyRule);
        break;

      case 'WEEKLY':
        if (!recurrenceData.weeklyRule) {
          throw new Error('Weekly rule configuration is required for WEEKLY recurrence');
        }
        weeklyRuleId = await createWeeklyRule(connection, recurrenceData.weeklyRule);
        break;

      case 'MONTHLY':
        if (!recurrenceData.monthlyRule) {
          throw new Error('Monthly rule configuration is required for MONTHLY recurrence');
        }
        monthlyRuleId = await createMonthlyRule(connection, recurrenceData.monthlyRule);
        break;
    }

    // Create main recurrence rule
    const [result] = await connection.execute<ResultSetHeader>(
      `INSERT INTO RecurrenceRules 
       (RecurrenceType, EndDate, DailyRuleId, WeeklyRuleId, MonthlyRuleId) 
       VALUES (?, ?, ?, ?, ?)`,
      [recurrenceData.recurrenceType, recurrenceData.endDate || null, dailyRuleId, weeklyRuleId, monthlyRuleId]
    );

    const recurrenceId = result.insertId;

    await connection.commit();
    return recurrenceId;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function createDailyRule(connection: any, dailyRule: NonNullable<CreateRecurrenceDto['dailyRule']>): Promise<number> {
  const [result] = await connection.execute(
    `INSERT INTO Repeat_DailyRules 
     (RecurEveryXDays, IntraDayFrequencyType, IntraDayInterval) 
     VALUES (?, ?, ?)`,
    [
      dailyRule.recurEveryXDays,
      dailyRule.intraDayFrequencyType || null,
      dailyRule.intraDayInterval || null
    ]
  ) as [ResultSetHeader, any];
  return result.insertId;
}

async function createWeeklyRule(connection: any, weeklyRule: NonNullable<CreateRecurrenceDto['weeklyRule']>): Promise<number> {
  const [result] = await connection.execute(
    `INSERT INTO Repeat_WeeklyRules 
     (RecurEveryNWeeks, OnSunday, OnMonday, OnTuesday, OnWednesday, OnThursday, OnFriday, OnSaturday) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      weeklyRule.recurEveryNWeeks,
      weeklyRule.daysOfWeek.sunday || false,
      weeklyRule.daysOfWeek.monday || false,
      weeklyRule.daysOfWeek.tuesday || false,
      weeklyRule.daysOfWeek.wednesday || false,
      weeklyRule.daysOfWeek.thursday || false,
      weeklyRule.daysOfWeek.friday || false,
      weeklyRule.daysOfWeek.saturday || false
    ]
  ) as [ResultSetHeader, any];
  return result.insertId;
}

async function createMonthlyRule(connection: any, monthlyRule: NonNullable<CreateRecurrenceDto['monthlyRule']>): Promise<number> {
  // Create base monthly rule
  const [result] = await connection.execute(
    `INSERT INTO Repeat_MonthlyRules (RuleType) VALUES (?)`,
    [monthlyRule.ruleType]
  ) as [ResultSetHeader, any];
  const monthlyRuleId = result.insertId;

  // Add months (default to all months if none specified)
  const months = monthlyRule.months && monthlyRule.months.length > 0 
    ? monthlyRule.months 
    : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

  for (const month of months) {
    await connection.execute(
      `INSERT INTO Repeat_MonthlyRule_Months (MonthlyRuleId, MonthNumber) VALUES (?, ?)`,
      [monthlyRuleId, month]
    );
  }

  // Add specific day numbers or ordinals based on rule type
  if (monthlyRule.ruleType === 'BY_DAY_OF_MONTH' && monthlyRule.dayNumbers) {
    for (const dayNumber of monthlyRule.dayNumbers) {
      await connection.execute(
        `INSERT INTO Repeat_MonthlyRule_Days (MonthlyRuleId, DayNumber) VALUES (?, ?)`,
        [monthlyRuleId, dayNumber]
      );
    }
  } else if (monthlyRule.ruleType === 'BY_ORDINAL_DAY_OF_WEEK' && monthlyRule.ordinals) {
    for (const ordinal of monthlyRule.ordinals) {
      await connection.execute(
        `INSERT INTO Repeat_MonthlyRule_Ordinals (MonthlyRuleId, Ordinal, DayOfWeek) VALUES (?, ?, ?)`,
        [monthlyRuleId, ordinal.ordinal, ordinal.dayOfWeek]
      );
    }
  }

  return monthlyRuleId;
}

// ============================================================================
// RECURRENCE RETRIEVAL FUNCTIONS
// ============================================================================

export async function getRecurrenceById(recurrenceId: number): Promise<RecurrenceResponse | null> {
  // Get main recurrence rule
  const [recurrenceRows] = await pool.query<RowDataPacket[]>(
    `SELECT * FROM RecurrenceRules WHERE Id = ?`,
    [recurrenceId]
  );

  if (recurrenceRows.length === 0) {
    return null;
  }

  const recurrence = recurrenceRows[0] as RecurrenceRule;
  const response: RecurrenceResponse = {
    Id: recurrence.Id,
    RecurrenceType: recurrence.RecurrenceType,
    EndDate: recurrence.EndDate
  };

  // Get specific rule details based on type
  switch (recurrence.RecurrenceType) {
    case 'DAILY':
      if (recurrence.DailyRuleId) {
        response.dailyRule = await getDailyRule(recurrence.DailyRuleId);
      }
      break;

    case 'WEEKLY':
      if (recurrence.WeeklyRuleId) {
        response.weeklyRule = await getWeeklyRule(recurrence.WeeklyRuleId);
      }
      break;

    case 'MONTHLY':
      if (recurrence.MonthlyRuleId) {
        response.monthlyRule = await getMonthlyRule(recurrence.MonthlyRuleId);
      }
      break;
  }

  return response;
}

async function getDailyRule(dailyRuleId: number): Promise<DailyRule> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT * FROM Repeat_DailyRules WHERE Id = ?`,
    [dailyRuleId]
  );
  return rows[0] as DailyRule;
}

async function getWeeklyRule(weeklyRuleId: number): Promise<WeeklyRule> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT * FROM Repeat_WeeklyRules WHERE Id = ?`,
    [weeklyRuleId]
  );
  return rows[0] as WeeklyRule;
}

async function getMonthlyRule(monthlyRuleId: number): Promise<MonthlyRule & {
  months?: MonthlyRuleMonth[];
  dayNumbers?: MonthlyRuleDay[];
  ordinals?: MonthlyRuleOrdinal[];
}> {
  // Get base monthly rule
  const [ruleRows] = await pool.query<RowDataPacket[]>(
    `SELECT * FROM Repeat_MonthlyRules WHERE Id = ?`,
    [monthlyRuleId]
  );
  const monthlyRule = ruleRows[0] as MonthlyRule;

  // Get months
  const [monthRows] = await pool.query<RowDataPacket[]>(
    `SELECT * FROM Repeat_MonthlyRule_Months WHERE MonthlyRuleId = ?`,
    [monthlyRuleId]
  );

  // Get day numbers or ordinals based on rule type
  let dayNumbers: MonthlyRuleDay[] = [];
  let ordinals: MonthlyRuleOrdinal[] = [];

  if (monthlyRule.RuleType === 'BY_DAY_OF_MONTH') {
    const [dayRows] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM Repeat_MonthlyRule_Days WHERE MonthlyRuleId = ?`,
      [monthlyRuleId]
    );
    dayNumbers = dayRows as MonthlyRuleDay[];
  } else if (monthlyRule.RuleType === 'BY_ORDINAL_DAY_OF_WEEK') {
    const [ordinalRows] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM Repeat_MonthlyRule_Ordinals WHERE MonthlyRuleId = ?`,
      [monthlyRuleId]
    );
    ordinals = ordinalRows as MonthlyRuleOrdinal[];
  }

  return {
    ...monthlyRule,
    months: monthRows as MonthlyRuleMonth[],
    dayNumbers,
    ordinals
  };
}

// ============================================================================
// RECURRENCE UPDATE FUNCTIONS
// ============================================================================

export async function updateRecurrenceRule(recurrenceId: number, recurrenceData: CreateRecurrenceDto): Promise<void> {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Get current recurrence rule
    const [currentRows] = await connection.query<RowDataPacket[]>(
      `SELECT * FROM RecurrenceRules WHERE Id = ?`,
      [recurrenceId]
    );

    if (currentRows.length === 0) {
      throw new Error('Recurrence rule not found');
    }

    const currentRule = currentRows[0] as RecurrenceRule;

    // Delete old specific rules
    if (currentRule.DailyRuleId) {
      await connection.execute(`DELETE FROM Repeat_DailyRules WHERE Id = ?`, [currentRule.DailyRuleId]);
    }
    if (currentRule.WeeklyRuleId) {
      await connection.execute(`DELETE FROM Repeat_WeeklyRules WHERE Id = ?`, [currentRule.WeeklyRuleId]);
    }
    if (currentRule.MonthlyRuleId) {
      await deleteMonthlyRule(connection, currentRule.MonthlyRuleId);
    }

    // Create new specific rules
    let dailyRuleId: number | null = null;
    let weeklyRuleId: number | null = null;
    let monthlyRuleId: number | null = null;

    switch (recurrenceData.recurrenceType) {
      case 'DAILY':
        if (!recurrenceData.dailyRule) {
          throw new Error('Daily rule configuration is required for DAILY recurrence');
        }
        dailyRuleId = await createDailyRule(connection, recurrenceData.dailyRule);
        break;

      case 'WEEKLY':
        if (!recurrenceData.weeklyRule) {
          throw new Error('Weekly rule configuration is required for WEEKLY recurrence');
        }
        weeklyRuleId = await createWeeklyRule(connection, recurrenceData.weeklyRule);
        break;

      case 'MONTHLY':
        if (!recurrenceData.monthlyRule) {
          throw new Error('Monthly rule configuration is required for MONTHLY recurrence');
        }
        monthlyRuleId = await createMonthlyRule(connection, recurrenceData.monthlyRule);
        break;
    }

    // Update main recurrence rule
    await connection.execute(
      `UPDATE RecurrenceRules 
       SET RecurrenceType = ?, EndDate = ?, DailyRuleId = ?, WeeklyRuleId = ?, MonthlyRuleId = ?
       WHERE Id = ?`,
      [recurrenceData.recurrenceType, recurrenceData.endDate || null, dailyRuleId, weeklyRuleId, monthlyRuleId, recurrenceId]
    );

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function deleteMonthlyRule(connection: any, monthlyRuleId: number): Promise<void> {
  // Delete related records first due to foreign key constraints
  await connection.execute(`DELETE FROM Repeat_MonthlyRule_Months WHERE MonthlyRuleId = ?`, [monthlyRuleId]);
  await connection.execute(`DELETE FROM Repeat_MonthlyRule_Days WHERE MonthlyRuleId = ?`, [monthlyRuleId]);
  await connection.execute(`DELETE FROM Repeat_MonthlyRule_Ordinals WHERE MonthlyRuleId = ?`, [monthlyRuleId]);
  await connection.execute(`DELETE FROM Repeat_MonthlyRules WHERE Id = ?`, [monthlyRuleId]);
}

// ============================================================================
// RECURRENCE DELETION FUNCTIONS
// ============================================================================

export async function deleteRecurrenceRule(recurrenceId: number): Promise<void> {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Get current recurrence rule
    const [currentRows] = await connection.query<RowDataPacket[]>(
      `SELECT * FROM RecurrenceRules WHERE Id = ?`,
      [recurrenceId]
    );

    if (currentRows.length === 0) {
      return; // Already deleted or doesn't exist
    }

    const currentRule = currentRows[0] as RecurrenceRule;

    // Delete specific rules
    if (currentRule.DailyRuleId) {
      await connection.execute(`DELETE FROM Repeat_DailyRules WHERE Id = ?`, [currentRule.DailyRuleId]);
    }
    if (currentRule.WeeklyRuleId) {
      await connection.execute(`DELETE FROM Repeat_WeeklyRules WHERE Id = ?`, [currentRule.WeeklyRuleId]);
    }
    if (currentRule.MonthlyRuleId) {
      await deleteMonthlyRule(connection, currentRule.MonthlyRuleId);
    }

    // Delete main recurrence rule
    await connection.execute(`DELETE FROM RecurrenceRules WHERE Id = ?`, [recurrenceId]);

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

export function validateRecurrenceData(recurrenceData: CreateRecurrenceDto): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate recurrence type
  if (!['DAILY', 'WEEKLY', 'MONTHLY'].includes(recurrenceData.recurrenceType)) {
    errors.push('Invalid recurrence type. Must be DAILY, WEEKLY, or MONTHLY');
  }

  // Validate end date if provided
  if (recurrenceData.endDate) {
    const endDate = new Date(recurrenceData.endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (endDate <= today) {
      errors.push('End date must be in the future');
    }
  }

  // Validate specific rule data
  switch (recurrenceData.recurrenceType) {
    case 'DAILY':
      if (!recurrenceData.dailyRule) {
        errors.push('Daily rule configuration is required for DAILY recurrence');
      } else {
        if (recurrenceData.dailyRule.recurEveryXDays < 1) {
          errors.push('Daily recurrence interval must be at least 1 day');
        }
        if (recurrenceData.dailyRule.intraDayInterval && recurrenceData.dailyRule.intraDayInterval < 1) {
          errors.push('Intra-day interval must be at least 1');
        }
      }
      break;

    case 'WEEKLY':
      if (!recurrenceData.weeklyRule) {
        errors.push('Weekly rule configuration is required for WEEKLY recurrence');
      } else {
        if (recurrenceData.weeklyRule.recurEveryNWeeks < 1) {
          errors.push('Weekly recurrence interval must be at least 1 week');
        }
        const hasAnyDaySelected = Object.values(recurrenceData.weeklyRule.daysOfWeek).some(day => day === true);
        if (!hasAnyDaySelected) {
          errors.push('At least one day of the week must be selected for WEEKLY recurrence');
        }
      }
      break;

    case 'MONTHLY':
      if (!recurrenceData.monthlyRule) {
        errors.push('Monthly rule configuration is required for MONTHLY recurrence');
      } else {
        if (recurrenceData.monthlyRule.ruleType === 'BY_DAY_OF_MONTH') {
          if (!recurrenceData.monthlyRule.dayNumbers || recurrenceData.monthlyRule.dayNumbers.length === 0) {
            errors.push('Day numbers are required for BY_DAY_OF_MONTH monthly recurrence');
          }
        } else if (recurrenceData.monthlyRule.ruleType === 'BY_ORDINAL_DAY_OF_WEEK') {
          if (!recurrenceData.monthlyRule.ordinals || recurrenceData.monthlyRule.ordinals.length === 0) {
            errors.push('Ordinal day specifications are required for BY_ORDINAL_DAY_OF_WEEK monthly recurrence');
          }
        }
        
        // Validate months if specified
        if (recurrenceData.monthlyRule.months) {
          const invalidMonths = recurrenceData.monthlyRule.months.filter(month => month < 1 || month > 12);
          if (invalidMonths.length > 0) {
            errors.push('Invalid month numbers. Must be between 1 and 12');
          }
        }
      }
      break;
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}