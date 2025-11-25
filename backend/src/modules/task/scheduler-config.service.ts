import prisma from "../../lib/connection";

const DEFAULT_SETTINGS = {
  DUE_TIME_INTERVAL_VALUE: parseInt(process.env.DUE_TIME_INTERVAL_VALUE || "30", 10),
  DUE_TIME_INTERVAL_UNIT: (process.env.DUE_TIME_INTERVAL_UNIT as SchedulerTimeUnit) || "MINUTE",
  DUE_TASKS_WINDOW_VALUE: parseInt(process.env.DUE_TASKS_WINDOW_VALUE || "30", 10),
  DUE_TASKS_WINDOW_UNIT: (process.env.DUE_TASKS_WINDOW_UNIT as SchedulerTimeUnit) || "MINUTE",
  DUE_TASKS_BUFFER_VALUE: parseInt(process.env.DUE_TASKS_BUFFER_VALUE || "1", 10),
  DUE_TASKS_BUFFER_UNIT: (process.env.DUE_TASKS_BUFFER_UNIT as SchedulerTimeUnit) || "MINUTE",
  MAX_SCHEDULING_DELAY_MS: parseInt(process.env.MAX_SCHEDULING_DELAY_MS || "1800000", 10),
  SCHEDULER_CRON: process.env.SCHEDULER_CRON || "*/2 * * * *",
  ESCALATION_CRON: process.env.ESCALATION_CRON || "*/10 * * * *"
};

export type SchedulerTimeUnit = "SECOND" | "MINUTE" | "HOUR" | "DAY" | "WEEK" | "MONTH" | "YEAR";

export type SchedulerConfigKey = keyof typeof DEFAULT_SETTINGS;

const CONFIG_DESCRIPTIONS: Record<SchedulerConfigKey, string> = {
  DUE_TIME_INTERVAL_VALUE: "Minutes/hours ahead for overdue polling window",
  DUE_TIME_INTERVAL_UNIT: "Unit for overdue polling window",
  DUE_TASKS_WINDOW_VALUE: "How far ahead to fetch due tasks",
  DUE_TASKS_WINDOW_UNIT: "Unit for due task window",
  DUE_TASKS_BUFFER_VALUE: "Buffer before now for due task query",
  DUE_TASKS_BUFFER_UNIT: "Unit for due task buffer",
  MAX_SCHEDULING_DELAY_MS: "Maximum delay allowed before queueing",
  SCHEDULER_CRON: "Cron used by scheduler service",
  ESCALATION_CRON: "Cron used for escalation sweep"
};

export const SCHEDULER_CONFIG_DESCRIPTIONS = { ...CONFIG_DESCRIPTIONS };

export interface SchedulerSettings {
  dueTimeInterval: { value: number; unit: SchedulerTimeUnit };
  dueTasksWindow: { value: number; unit: SchedulerTimeUnit };
  dueTasksBuffer: { value: number; unit: SchedulerTimeUnit };
  maxSchedulingDelayMs: number;
  cronSchedule: string;
  escalationCron: string;
}

export interface SchedulerConfigUpdate {
  dueTimeIntervalValue?: number;
  dueTimeIntervalUnit?: SchedulerTimeUnit;
  dueTasksWindowValue?: number;
  dueTasksWindowUnit?: SchedulerTimeUnit;
  dueTasksBufferValue?: number;
  dueTasksBufferUnit?: SchedulerTimeUnit;
  maxSchedulingDelayMs?: number;
  cronSchedule?: string;
  escalationCron?: string;
}

export async function getSchedulerSettings(): Promise<SchedulerSettings> {
  const configMap = await getConfigMap();

  return {
    dueTimeInterval: {
      value: parseNumber(configMap.DUE_TIME_INTERVAL_VALUE, DEFAULT_SETTINGS.DUE_TIME_INTERVAL_VALUE),
      unit: parseUnit(configMap.DUE_TIME_INTERVAL_UNIT, DEFAULT_SETTINGS.DUE_TIME_INTERVAL_UNIT)
    },
    dueTasksWindow: {
      value: parseNumber(configMap.DUE_TASKS_WINDOW_VALUE, DEFAULT_SETTINGS.DUE_TASKS_WINDOW_VALUE),
      unit: parseUnit(configMap.DUE_TASKS_WINDOW_UNIT, DEFAULT_SETTINGS.DUE_TASKS_WINDOW_UNIT)
    },
    dueTasksBuffer: {
      value: parseNumber(configMap.DUE_TASKS_BUFFER_VALUE, DEFAULT_SETTINGS.DUE_TASKS_BUFFER_VALUE),
      unit: parseUnit(configMap.DUE_TASKS_BUFFER_UNIT, DEFAULT_SETTINGS.DUE_TASKS_BUFFER_UNIT)
    },
    maxSchedulingDelayMs: parseNumber(configMap.MAX_SCHEDULING_DELAY_MS, DEFAULT_SETTINGS.MAX_SCHEDULING_DELAY_MS),
    cronSchedule: configMap.SCHEDULER_CRON || DEFAULT_SETTINGS.SCHEDULER_CRON,
    escalationCron: configMap.ESCALATION_CRON || DEFAULT_SETTINGS.ESCALATION_CRON
  };
}

export async function updateSchedulerSettings(payload: SchedulerConfigUpdate): Promise<SchedulerSettings> {
  const operations: Array<Promise<any>> = [];

  if (payload.dueTimeIntervalValue !== undefined) {
    operations.push(upsertConfig("DUE_TIME_INTERVAL_VALUE", payload.dueTimeIntervalValue.toString()));
  }
  if (payload.dueTimeIntervalUnit) {
    operations.push(upsertConfig("DUE_TIME_INTERVAL_UNIT", payload.dueTimeIntervalUnit));
  }
  if (payload.dueTasksWindowValue !== undefined) {
    operations.push(upsertConfig("DUE_TASKS_WINDOW_VALUE", payload.dueTasksWindowValue.toString()));
  }
  if (payload.dueTasksWindowUnit) {
    operations.push(upsertConfig("DUE_TASKS_WINDOW_UNIT", payload.dueTasksWindowUnit));
  }
  if (payload.dueTasksBufferValue !== undefined) {
    operations.push(upsertConfig("DUE_TASKS_BUFFER_VALUE", payload.dueTasksBufferValue.toString()));
  }
  if (payload.dueTasksBufferUnit) {
    operations.push(upsertConfig("DUE_TASKS_BUFFER_UNIT", payload.dueTasksBufferUnit));
  }
  if (payload.maxSchedulingDelayMs !== undefined) {
    operations.push(upsertConfig("MAX_SCHEDULING_DELAY_MS", payload.maxSchedulingDelayMs.toString()));
  }
  if (payload.cronSchedule) {
    operations.push(upsertConfig("SCHEDULER_CRON", payload.cronSchedule));
  }
  if (payload.escalationCron) {
    operations.push(upsertConfig("ESCALATION_CRON", payload.escalationCron));
  }

  if (operations.length) {
    await Promise.all(operations);
  }

  return getSchedulerSettings();
}

export async function getSchedulerSettingValue(key: SchedulerConfigKey): Promise<string | null> {
  const record = await schedulerConfigRepo().findUnique({
    where: { ConfigKey: key }
  });
  return record?.ConfigValue ?? null;
}

async function getConfigMap(): Promise<Record<SchedulerConfigKey, string>> {
  const rows = await schedulerConfigRepo().findMany();
  const map = rows.reduce((acc: Record<string, string>, row: any) => {
    acc[row.ConfigKey] = row.ConfigValue;
    return acc;
  }, {} as Record<string, string>);

  return map as Record<SchedulerConfigKey, string>;
}

async function upsertConfig(key: SchedulerConfigKey, value: string): Promise<void> {
  await schedulerConfigRepo().upsert({
    where: { ConfigKey: key },
    update: {
      ConfigValue: value,
      Description: CONFIG_DESCRIPTIONS[key]
    },
    create: {
      ConfigKey: key,
      ConfigValue: value,
      Description: CONFIG_DESCRIPTIONS[key]
    }
  });
}

function parseNumber(raw: string | undefined, fallback: number): number {
  if (raw === undefined || raw === null) {
    return fallback;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseUnit(raw: string | undefined, fallback: SchedulerTimeUnit): SchedulerTimeUnit {
  const upper = (raw || "").toUpperCase();
  const validUnits: SchedulerTimeUnit[] = ["SECOND", "MINUTE", "HOUR", "DAY", "WEEK", "MONTH", "YEAR"];
  return validUnits.includes(upper as SchedulerTimeUnit) ? (upper as SchedulerTimeUnit) : fallback;
}

export function toSeconds(value: number, unit: SchedulerTimeUnit): number {
  const multipliers: Record<SchedulerTimeUnit, number> = {
    SECOND: 1,
    MINUTE: 60,
    HOUR: 60 * 60,
    DAY: 60 * 60 * 24,
    WEEK: 60 * 60 * 24 * 7,
    MONTH: 60 * 60 * 24 * 30,
    YEAR: 60 * 60 * 24 * 365
  };

  return value * multipliers[unit];
}

function schedulerConfigRepo() {
  return prisma.schedulerConfig;
}
