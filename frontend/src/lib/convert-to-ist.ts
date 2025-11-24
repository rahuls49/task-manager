import { formatInTimeZone } from 'date-fns-tz';

/**
 * Helper to construct the ISO string with IST offset
 */
function getISTDate(dateStr: string, timeStr: string | null) {
    const datePart = dateStr.split('T')[0];
    // Ensure we have seconds: `HH:mm` -> `HH:mm:00`, `HH:mm:ss` unchanged.
    const rawTime = timeStr || "00:00:00";
    const timePart = rawTime.split(':').length === 2 ? `${rawTime}:00` : rawTime;
    return `${datePart}T${timePart}+05:30`;
}

/**
 * Format a date/time pair for display in IST (Full Date + Time)
 */
export function formatDateTime(dateStr: string | null, timeStr: string | null) {
    if (!dateStr) return "Not set";
    const date = getISTDate(dateStr, timeStr);
    return formatInTimeZone(date, 'Asia/Kolkata', 'PPpp');
}

/**
 * Format just the Date part in IST
 */
export function formatDate(dateStr: string | null) {
    if (!dateStr) return "Not set";
    // Time doesn't matter for just the date part, but we need a valid ISO string
    const date = getISTDate(dateStr, "00:00:00");
    return formatInTimeZone(date, 'Asia/Kolkata', 'PPP');
}

/**
 * Format just the Time part in IST
 */
export function formatTime(dateStr: string | null, timeStr: string | null) {
    if (!dateStr || !timeStr) return "Not set";
    const date = getISTDate(dateStr, timeStr);
    return formatInTimeZone(date, 'Asia/Kolkata', 'p');
}