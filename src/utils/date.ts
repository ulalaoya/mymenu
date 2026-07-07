// ===== עזרי תאריך/שעה מקומיים =====
// כל התאריכים באפליקציה בפורמט "YYYY-MM-DD" לפי השעון המקומי.

/** מחזיר תאריך "YYYY-MM-DD" מקומי מתוך Date (ברירת מחדל: עכשיו) */
export function toDateString(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** מחזיר את תאריך היום כמחרוזת "YYYY-MM-DD" */
export function todayString(): string {
  return toDateString();
}

/** מחזיר שעה נוכחית כמחרוזת "HH:MM" מתוך Date (ברירת מחדל: עכשיו) */
export function toTimeString(d: Date = new Date()): string {
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

/** ממיר "HH:MM" לדקות מתחילת היום; מחזיר null אם לא תקין */
export function timeToMinutes(time: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!m) return null;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  if (hh > 23 || mm > 59) return null;
  return hh * 60 + mm;
}

/** דקות מתחילת היום עבור Date נתון (ברירת מחדל: עכשיו) */
export function minutesOfDay(d: Date = new Date()): number {
  return d.getHours() * 60 + d.getMinutes();
}
