import { formatInTimeZone } from 'date-fns-tz';

/**
 * Format a date/time pair (as returned from the backend) for display in IST.
 *
 * Parameters are intentionally generic: `dateStr` and `timeStr`. This lets
 * callers pass either `DueDate, DueTime` or `StartDate, StartTime` without
 * needing to rely on specific parameter names.
 *
 * The application backend already stores & returns times in IST; this helper
 * only formats and displays the local IST representation and does not perform
 * any timezone conversion for persistence. Internally we build an ISO-like
 * string with the IST offset (+05:30) so `formatInTimeZone` produces the
 * correct output.
 */
export function formatDateTime(dateStr: string | null, timeStr: string | null) {
    if (!dateStr || !timeStr) return "Not set";
    // Backend provides time strings in IST already (e.g. from DB).
    // Build a timestamp with the IST offset instead of using "Z" (UTC)
    // so the Date/time functions reflect the correct instant.
    const datePart = dateStr.split('T')[0];
    // Ensure we have seconds: `HH:mm` -> `HH:mm:00`, `HH:mm:ss` unchanged.
    const timePart = timeStr.split(':').length === 2 ? `${timeStr}:00` : timeStr;
    const date = `${datePart}T${timePart}+05:30`;
    return formatInTimeZone(date, 'Asia/Kolkata', 'PPpp')
}