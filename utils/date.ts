import dayjs from 'dayjs';
import customParse from 'dayjs/plugin/customParseFormat';

dayjs.extend(customParse);

/** "2025-04-15" -> "mardi 15 avr. 2025" in the current app language (dayjs global locale). */
export const isoToFrDisplay = (iso: string) =>
    dayjs(iso).format('dddd D MMM YYYY');

/** accepts Date object or ISO -> ISO "YYYY-MM-DD" */
export const toISO = (d: string | Date) =>
    dayjs(d).format('YYYY-MM-DD');

/** Minutes -> compact duration: 45 -> "45 min", 60 -> "1h", 70 -> "1h10min". */
export const formatDuration = (minutes?: number | null): string => {
    const total = Math.max(0, Math.round(Number(minutes) || 0));
    if (total < 60) return `${total} min`;
    const h = Math.floor(total / 60);
    const m = total % 60;
    return m ? `${h}h${String(m).padStart(2, '0')}min` : `${h}h`;
};
