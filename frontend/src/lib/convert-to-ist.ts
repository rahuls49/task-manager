import { formatInTimeZone } from 'date-fns-tz';

export function formatDateTime(DueDate: string, DueTime: string) {
    const date = `${DueDate.split('T')[0]}T${DueTime}Z`
    return formatInTimeZone(date, 'Asia/Kolkata', 'PPpp')
}