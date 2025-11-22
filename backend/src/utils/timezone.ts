import { formatInTimeZone, fromZonedTime, toZonedTime } from 'date-fns-tz';

/**
 * Timezone constants
 */
export const TIMEZONE = {
  IST: 'Asia/Kolkata',
  UTC: 'UTC'
} as const;

/**
 * Convert IST date and time to UTC Date object for database storage
 * @param dateStr - Date in YYYY-MM-DD format
 * @param timeStr - Time in HH:MM:SS format
 * @returns Date object in UTC
 */
export function istToUtc(dateStr: string, timeStr: string): Date {
  // Combine date and time as IST
  const istDateTimeStr = `${dateStr}T${timeStr}`;
  // Parse as IST and convert to UTC
  return fromZonedTime(istDateTimeStr, TIMEZONE.IST);
}

/**
 * Convert UTC Date object from database to IST date string
 * @param utcDate - Date object from database
 * @returns Date in YYYY-MM-DD format (IST)
 */
export function utcToIstDate(utcDate: Date): string {
  const istDate = toZonedTime(utcDate, TIMEZONE.IST);
  return istDate.toISOString().split('T')[0];
}

/**
 * Convert UTC Date object from database to IST time string
 * @param utcDate - Date object from database
 * @returns Time in HH:MM:SS format (IST)
 */
export function utcToIstTime(utcDate: Date): string {
  const istDate = toZonedTime(utcDate, TIMEZONE.IST);
  // Return the time part in IST (HH:MM:SS)
  const hours = istDate.getHours().toString().padStart(2, '0');
  const minutes = istDate.getMinutes().toString().padStart(2, '0');
  const seconds = istDate.getSeconds().toString().padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

/**
 * Format UTC date and time to IST display string
 * @param dateStr - Date in YYYY-MM-DD format (from database)
 * @param timeStr - Time in HH:MM:SS format (from database)
 * @returns Formatted IST date/time string
 */
export function formatUtcToIst(dateStr: string | null, timeStr: string | null): string {
  if (!dateStr || !timeStr) return "Not set";

  // Combine date and time as UTC (database format)
  const utcDateTimeStr = `${dateStr}T${timeStr}Z`;
  return formatInTimeZone(utcDateTimeStr, TIMEZONE.IST, 'PPpp');
}