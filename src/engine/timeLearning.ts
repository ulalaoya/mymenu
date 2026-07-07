// ===== למידת שעות ארוחה — SPEC סעיף 5.1 =====
// ממוצע נע של 14 יום אחרונים: לכל משבצת מחשבים את שעת האכילה הממוצעת
// מתוך eatenAt של הרישומים, ומעדכנים את mealTimes. אם אין מספיק דגימות —
// נשארים בברירת המחדל הקיימת. לוגיקה טהורה.

import type { MealLog, MealSlot } from '../types';

/** חלון הלמידה בימים (SPEC 5.1: ממוצע נע של 14 יום) */
export const LEARNING_WINDOW_DAYS = 14;
/** מינימום דגימות למשבצת כדי לעדכן את השעה (הימנעות מרעש) */
export const MIN_SAMPLES = 3;

/** ממיר timestamp לדקות מתחילת היום המקומי */
function minutesOfDay(ts: number): number {
  const d = new Date(ts);
  return d.getHours() * 60 + d.getMinutes();
}

/** ממיר דקות מתחילת היום למחרוזת "HH:MM" */
export function minutesToTime(minutes: number): string {
  const m = Math.round(minutes);
  const hh = Math.floor(m / 60) % 24;
  const mm = m % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

/**
 * מעדכן את שעות הארוחה לפי ממוצע נע של 14 הימים האחרונים.
 * @param mealLogs כל רישומי הארוחות של הפרופיל
 * @param currentTimes השעות הנוכחיות (ברירת מחדל אם אין מספיק דגימות)
 * @param now חותם זמן ייחוס (ברירת מחדל: עכשיו) — לצורך בדיקות דטרמיניסטיות
 */
export function learnMealTimes(
  mealLogs: MealLog[],
  currentTimes: Partial<Record<MealSlot, string>>,
  now: number = Date.now(),
): Partial<Record<MealSlot, string>> {
  const windowMs = LEARNING_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const cutoff = now - windowMs;

  // אוסף דקות-אכילה לכל משבצת בתוך החלון
  const samples = new Map<MealSlot, number[]>();
  for (const log of mealLogs) {
    if (log.eatenAt < cutoff || log.eatenAt > now) continue;
    const arr = samples.get(log.slot) ?? [];
    arr.push(minutesOfDay(log.eatenAt));
    samples.set(log.slot, arr);
  }

  const updated: Partial<Record<MealSlot, string>> = { ...currentTimes };
  for (const [slot, mins] of samples) {
    if (mins.length < MIN_SAMPLES) continue;
    const avg = mins.reduce((s, v) => s + v, 0) / mins.length;
    updated[slot] = minutesToTime(avg);
  }
  return updated;
}
