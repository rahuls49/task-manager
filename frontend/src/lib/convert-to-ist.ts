import { formatInTimeZone } from 'date-fns-tz';

export function formatDateTime(DueDate: string | null, DueTime: string | null) {
    if (!DueDate || !DueTime) return "Not set";
    const date = `${DueDate.split('T')[0]}T${DueTime}Z`
    return formatInTimeZone(date, 'Asia/Kolkata', 'PPpp')
}