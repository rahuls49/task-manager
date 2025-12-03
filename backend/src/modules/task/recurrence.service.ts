import prisma from "../../lib/connection";
// import { RowDataPacket, ResultSetHeader } from 'mysql2';
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
  let dailyRuleId: number | null = null;
  let weeklyRuleId: number | null = null;
  let monthlyRuleId: number | null = null;

  // Create specific rule based on type
  switch (recurrenceData.recurrenceType) {
    case 'DAILY':
      if (!recurrenceData.dailyRule) {
        throw new Error('Daily rule configuration is required for DAILY recurrence');
      }
      dailyRuleId = await createDailyRule(recurrenceData.dailyRule);
      break;

    case 'WEEKLY':
      if (!recurrenceData.weeklyRule) {
        throw new Error('Weekly rule configuration is required for WEEKLY recurrence');
      }
      weeklyRuleId = await createWeeklyRule(recurrenceData.weeklyRule);
      break;

    case 'MONTHLY':
      if (!recurrenceData.monthlyRule) {
        throw new Error('Monthly rule configuration is required for MONTHLY recurrence');
      }
      monthlyRuleId = await createMonthlyRule(recurrenceData.monthlyRule);
      break;
  }

  // Create main recurrence rule
  const recurrenceRule = await prisma.recurrencerules.create({
    data: {
      RecurrenceType: recurrenceData.recurrenceType as any,
      EndDate: recurrenceData.endDate ? new Date(recurrenceData.endDate) : null,
      DailyRuleId: dailyRuleId,
      WeeklyRuleId: weeklyRuleId,
      MonthlyRuleId: monthlyRuleId
    }
  });

  return Number(recurrenceRule.Id);
}

async function createDailyRule(dailyRule: NonNullable<CreateRecurrenceDto['dailyRule']>): Promise<number> {
  const rule = await prisma.repeat_dailyrules.create({
    data: {
      RecurEveryXDays: dailyRule.recurEveryXDays,
      IntraDayFrequencyType: dailyRule.intraDayFrequencyType as any,
      IntraDayInterval: dailyRule.intraDayInterval
    }
  });
  return Number(rule.Id);
}

async function createWeeklyRule(weeklyRule: NonNullable<CreateRecurrenceDto['weeklyRule']>): Promise<number> {
  const rule = await prisma.repeat_weeklyrules.create({
    data: {
      RecurEveryNWeeks: weeklyRule.recurEveryNWeeks,
      OnSunday: weeklyRule.daysOfWeek.sunday || false,
      OnMonday: weeklyRule.daysOfWeek.monday || false,
      OnTuesday: weeklyRule.daysOfWeek.tuesday || false,
      OnWednesday: weeklyRule.daysOfWeek.wednesday || false,
      OnThursday: weeklyRule.daysOfWeek.thursday || false,
      OnFriday: weeklyRule.daysOfWeek.friday || false,
      OnSaturday: weeklyRule.daysOfWeek.saturday || false
    }
  });
  return Number(rule.Id);
}

async function createMonthlyRule(monthlyRule: NonNullable<CreateRecurrenceDto['monthlyRule']>): Promise<number> {
  // Create base monthly rule
  const rule = await prisma.repeat_monthlyrules.create({
    data: {
      RuleType: monthlyRule.ruleType as any
    }
  });
  const monthlyRuleId = Number(rule.Id);

  // Add months (default to all months if none specified)
  const months = monthlyRule.months && monthlyRule.months.length > 0
    ? monthlyRule.months
    : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

  for (const month of months) {
    await prisma.repeat_monthlyrule_months.create({
      data: {
        MonthlyRuleId: monthlyRuleId,
        MonthNumber: month
      }
    });
  }

  // Add specific day numbers or ordinals based on rule type
  if (monthlyRule.ruleType === 'BY_DAY_OF_MONTH' && monthlyRule.dayNumbers) {
    for (const dayNumber of monthlyRule.dayNumbers) {
      await prisma.repeat_monthlyrule_days.create({
        data: {
          MonthlyRuleId: monthlyRuleId,
          DayNumber: dayNumber
        }
      });
    }
  } else if (monthlyRule.ruleType === 'BY_ORDINAL_DAY_OF_WEEK' && monthlyRule.ordinals) {
    for (const ordinal of monthlyRule.ordinals) {
      await prisma.repeat_monthlyrule_ordinals.create({
        data: {
          MonthlyRuleId: monthlyRuleId,
          Ordinal: ordinal.ordinal as any,
          DayOfWeek: ordinal.dayOfWeek as any
        }
      });
    }
  }

  return monthlyRuleId;
}

// ============================================================================
// RECURRENCE RETRIEVAL FUNCTIONS
// ============================================================================

export async function getRecurrenceById(recurrenceId: number): Promise<RecurrenceResponse | null> {
  // Get main recurrence rule
  const recurrence = await prisma.recurrencerules.findUnique({
    where: { Id: recurrenceId },
    include: {
      repeat_dailyrules: true,
      repeat_weeklyrules: true,
      repeat_monthlyrules: {
        include: {
          repeat_monthlyrule_months: true,
          repeat_monthlyrule_days: true,
          repeat_monthlyrule_ordinals: true
        }
      }
    }
  });

  if (!recurrence) {
    return null;
  }

  const response: RecurrenceResponse = {
    Id: Number(recurrence.Id),
    RecurrenceType: recurrence.RecurrenceType,
    EndDate: recurrence.EndDate?.toISOString().split('T')[0]
  };

  // Get specific rule details based on type
  switch (recurrence.RecurrenceType) {
    case 'DAILY':
      if (recurrence.repeat_dailyrules) {
        response.dailyRule = {
          Id: Number(recurrence.repeat_dailyrules.Id),
          RecurEveryXDays: recurrence.repeat_dailyrules.RecurEveryXDays,
          IntraDayFrequencyType: recurrence.repeat_dailyrules.IntraDayFrequencyType || undefined,
          IntraDayInterval: recurrence.repeat_dailyrules.IntraDayInterval || undefined
        };
      }
      break;

    case 'WEEKLY':
      if (recurrence.repeat_weeklyrules) {
        response.weeklyRule = {
          Id: Number(recurrence.repeat_weeklyrules.Id),
          RecurEveryNWeeks: recurrence.repeat_weeklyrules.RecurEveryNWeeks,
          OnSunday: recurrence.repeat_weeklyrules.OnSunday,
          OnMonday: recurrence.repeat_weeklyrules.OnMonday,
          OnTuesday: recurrence.repeat_weeklyrules.OnTuesday,
          OnWednesday: recurrence.repeat_weeklyrules.OnWednesday,
          OnThursday: recurrence.repeat_weeklyrules.OnThursday,
          OnFriday: recurrence.repeat_weeklyrules.OnFriday,
          OnSaturday: recurrence.repeat_weeklyrules.OnSaturday
        };
      }
      break;

    case 'MONTHLY':
      if (recurrence.repeat_monthlyrules) {
        response.monthlyRule = {
          Id: Number(recurrence.repeat_monthlyrules.Id),
          RuleType: recurrence.repeat_monthlyrules.RuleType,
          months: recurrence.repeat_monthlyrules.repeat_monthlyrule_months.map(m => ({
            MonthlyRuleId: Number(m.MonthlyRuleId),
            MonthNumber: m.MonthNumber
          })),
          dayNumbers: recurrence.repeat_monthlyrules.repeat_monthlyrule_days.map(d => ({
            MonthlyRuleId: Number(d.MonthlyRuleId),
            DayNumber: d.DayNumber
          })),
          ordinals: recurrence.repeat_monthlyrules.repeat_monthlyrule_ordinals.map(o => ({
            MonthlyRuleId: Number(o.MonthlyRuleId),
            Ordinal: o.Ordinal,
            DayOfWeek: o.DayOfWeek
          }))
        };
      }
      break;
  }

  return response;
}

async function getDailyRule(dailyRuleId: number): Promise<DailyRule> {
  const rule = await prisma.repeat_dailyrules.findUnique({
    where: { Id: dailyRuleId }
  });
  if (!rule) throw new Error('Daily rule not found');
  return {
    Id: Number(rule.Id),
    RecurEveryXDays: rule.RecurEveryXDays,
    IntraDayFrequencyType: rule.IntraDayFrequencyType || undefined,
    IntraDayInterval: rule.IntraDayInterval || undefined
  };
}

async function getWeeklyRule(weeklyRuleId: number): Promise<WeeklyRule> {
  const rule = await prisma.repeat_weeklyrules.findUnique({
    where: { Id: weeklyRuleId }
  });
  if (!rule) throw new Error('Weekly rule not found');
  return {
    Id: Number(rule.Id),
    RecurEveryNWeeks: rule.RecurEveryNWeeks,
    OnSunday: rule.OnSunday,
    OnMonday: rule.OnMonday,
    OnTuesday: rule.OnTuesday,
    OnWednesday: rule.OnWednesday,
    OnThursday: rule.OnThursday,
    OnFriday: rule.OnFriday,
    OnSaturday: rule.OnSaturday
  };
}

async function getMonthlyRule(monthlyRuleId: number): Promise<MonthlyRule & {
  months?: MonthlyRuleMonth[];
  dayNumbers?: MonthlyRuleDay[];
  ordinals?: MonthlyRuleOrdinal[];
}> {
  const rule = await prisma.repeat_monthlyrules.findUnique({
    where: { Id: monthlyRuleId },
    include: {
      repeat_monthlyrule_months: true,
      repeat_monthlyrule_days: true,
      repeat_monthlyrule_ordinals: true
    }
  });
  if (!rule) throw new Error('Monthly rule not found');

    return {
    Id: Number(rule.Id),
    RuleType: rule.RuleType,
    months: rule.repeat_monthlyrule_months.map(m => ({
      MonthlyRuleId: Number(m.MonthlyRuleId),
      MonthNumber: m.MonthNumber
    })),
    dayNumbers: rule.repeat_monthlyrule_days.map(d => ({
      MonthlyRuleId: Number(d.MonthlyRuleId),
      DayNumber: d.DayNumber
    })),
    ordinals: rule.repeat_monthlyrule_ordinals.map(o => ({
      MonthlyRuleId: Number(o.MonthlyRuleId),
      Ordinal: o.Ordinal,
      DayOfWeek: o.DayOfWeek
    }))
  };
}

// ============================================================================
// RECURRENCE UPDATE FUNCTIONS
// ============================================================================

export async function updateRecurrenceRule(recurrenceId: number, recurrenceData: CreateRecurrenceDto): Promise<void> {
  // Get current recurrence rule
  const currentRule = await prisma.recurrencerules.findUnique({
    where: { Id: recurrenceId },
    include: {
      repeat_dailyrules: true,
      repeat_weeklyrules: true,
      repeat_monthlyrules: true
    }
  });

  if (!currentRule) {
    throw new Error('Recurrence rule not found');
  }

  // Delete old specific rules
  if (currentRule.repeat_dailyrules) {
    await prisma.repeat_dailyrules.delete({
      where: { Id: currentRule.repeat_dailyrules.Id }
    });
  }
  if (currentRule.repeat_weeklyrules) {
    await deleteWeeklyRulePrisma(currentRule.repeat_weeklyrules.Id);
  }
  if (currentRule.repeat_monthlyrules) {
    await deleteMonthlyRulePrisma(currentRule.repeat_monthlyrules.Id);
  }

  // Create new specific rules
  let dailyRuleId: bigint | null = null;
  let weeklyRuleId: bigint | null = null;
  let monthlyRuleId: bigint | null = null;

  switch (recurrenceData.recurrenceType) {
    case 'DAILY':
      if (!recurrenceData.dailyRule) {
        throw new Error('Daily rule configuration is required for DAILY recurrence');
      }
      const dailyRule = await prisma.repeat_dailyrules.create({
        data: {
          RecurEveryXDays: recurrenceData.dailyRule.recurEveryXDays,
          IntraDayFrequencyType: recurrenceData.dailyRule.intraDayFrequencyType,
          IntraDayInterval: recurrenceData.dailyRule.intraDayInterval
        }
      });
      dailyRuleId = dailyRule.Id;
      break;

    case 'WEEKLY':
      if (!recurrenceData.weeklyRule) {
        throw new Error('Weekly rule configuration is required for WEEKLY recurrence');
      }
      const weeklyRule = await prisma.repeat_weeklyrules.create({
        data: {
          RecurEveryNWeeks: recurrenceData.weeklyRule.recurEveryNWeeks,
          OnSunday: recurrenceData.weeklyRule.daysOfWeek.sunday,
          OnMonday: recurrenceData.weeklyRule.daysOfWeek.monday,
          OnTuesday: recurrenceData.weeklyRule.daysOfWeek.tuesday,
          OnWednesday: recurrenceData.weeklyRule.daysOfWeek.wednesday,
          OnThursday: recurrenceData.weeklyRule.daysOfWeek.thursday,
          OnFriday: recurrenceData.weeklyRule.daysOfWeek.friday,
          OnSaturday: recurrenceData.weeklyRule.daysOfWeek.saturday
        }
      });
      weeklyRuleId = weeklyRule.Id;
      break;

    case 'MONTHLY':
      if (!recurrenceData.monthlyRule) {
        throw new Error('Monthly rule configuration is required for MONTHLY recurrence');
      }
      const monthlyRule = await createMonthlyRulePrisma(recurrenceData.monthlyRule);
      monthlyRuleId = monthlyRule.Id;
      break;
  }

  // Update main recurrence rule
  await prisma.recurrencerules.update({
    where: { Id: recurrenceId },
    data: {
      RecurrenceType: recurrenceData.recurrenceType,
      EndDate: recurrenceData.endDate ? new Date(recurrenceData.endDate) : null,
      DailyRuleId: dailyRuleId,
      WeeklyRuleId: weeklyRuleId,
      MonthlyRuleId: monthlyRuleId
    }
  });
}

async function deleteMonthlyRulePrisma(monthlyRuleId: bigint): Promise<void> {
  // Delete related records first due to foreign key constraints
  await prisma.repeat_monthlyrule_months.deleteMany({
    where: { MonthlyRuleId: monthlyRuleId }
  });
  await prisma.repeat_monthlyrule_days.deleteMany({
    where: { MonthlyRuleId: monthlyRuleId }
  });
  await prisma.repeat_monthlyrule_ordinals.deleteMany({
    where: { MonthlyRuleId: monthlyRuleId }
  });
  await prisma.repeat_monthlyrules.delete({
    where: { Id: monthlyRuleId }
  });
}

async function createMonthlyRulePrisma(monthlyRuleData: any): Promise<any> {
  const monthlyRule = await prisma.repeat_monthlyrules.create({
    data: {
      RuleType: monthlyRuleData.ruleType
    }
  });

  // Create months if provided
  if (monthlyRuleData.months) {
    await prisma.repeat_monthlyrule_months.createMany({
      data: monthlyRuleData.months.map((month: number) => ({
        MonthlyRuleId: monthlyRule.Id,
        MonthNumber: month
      }))
    });
  }

  // Create days or ordinals based on rule type
  if (monthlyRuleData.ruleType === 'BY_DAY_OF_MONTH' && monthlyRuleData.dayNumbers) {
    await prisma.repeat_monthlyrule_days.createMany({
      data: monthlyRuleData.dayNumbers.map((day: number) => ({
        MonthlyRuleId: monthlyRule.Id,
        DayNumber: day
      }))
    });
  } else if (monthlyRuleData.ruleType === 'BY_ORDINAL_DAY_OF_WEEK' && monthlyRuleData.ordinals) {
    await prisma.repeat_monthlyrule_ordinals.createMany({
      data: monthlyRuleData.ordinals.map((ordinal: any) => ({
        MonthlyRuleId: monthlyRule.Id,
        Ordinal: ordinal.ordinal,
        DayOfWeek: ordinal.dayOfWeek
      }))
    });
  }

  return monthlyRule;
}

// ============================================================================
// RECURRENCE DELETION FUNCTIONS
// ============================================================================

export async function deleteRecurrenceRule(recurrenceId: number): Promise<void> {
  // Get current recurrence rule
  const currentRule = await prisma.recurrencerules.findUnique({
    where: { Id: recurrenceId },
    include: {
      repeat_dailyrules: true,
      repeat_weeklyrules: true,
      repeat_monthlyrules: true
    }
  });

  if (!currentRule) {
    return; // Already deleted or doesn't exist
  }

  // Delete specific rules
  if (currentRule.repeat_dailyrules) {
    await prisma.repeat_dailyrules.delete({
      where: { Id: currentRule.repeat_dailyrules.Id }
    });
  }
  if (currentRule.repeat_weeklyrules) {
    await prisma.repeat_weeklyrules.delete({
      where: { Id: currentRule.repeat_weeklyrules.Id }
    });
  }
  if (currentRule.repeat_monthlyrules) {
    await deleteMonthlyRulePrisma(currentRule.repeat_monthlyrules.Id);
  }

  // Delete main recurrence rule
  await prisma.recurrencerules.delete({
    where: { Id: recurrenceId }
  });
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

async function deleteWeeklyRulePrisma(weeklyRuleId: bigint): Promise<void> {
  await prisma.repeat_weeklyrules.delete({
    where: { Id: weeklyRuleId }
  });
}