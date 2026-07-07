// ===== חישוב סטטיסטיקות מזון — SPEC סעיף 5.2 =====
// לוגיקה טהורה: מחשבת FoodStats מתוך יומני הארוחות (mealLogs), אמין יותר
// מ-increment כי הוא מחושב מחדש מהמקור בכל פעם. wrappers ל-Dexie בהמשך הקובץ.

import type { FoodItem, FoodStats, MealLog } from '../types';
import { db } from '../db/database';

/** מזהה יציב ל-foodStats לפי פרופיל+מאכל */
export function foodStatsId(profileId: string, foodId: string): string {
  return `${profileId}::${foodId}`;
}

/** סטטיסטיקה מורחבת עם שדה עזר actuallyAteRate המחושב */
export interface FoodStatsComputed extends FoodStats {
  /** timesEaten / timesOffered (0 אם לא הוצע מעולם) */
  actuallyAteRate: number;
}

/** צובר פנימי בזמן החישוב */
interface Accum {
  tasteSum: number;
  tasteCount: number;
  satietySum: number;
  satietyCount: number;
  timesOffered: number;
  timesEaten: number;
  lastEatenDate?: string;
  lastOfferedDate?: string;
}

function emptyAccum(): Accum {
  return {
    tasteSum: 0,
    tasteCount: 0,
    satietySum: 0,
    satietyCount: 0,
    timesOffered: 0,
    timesEaten: 0,
  };
}

function maxDate(a: string | undefined, b: string): string {
  if (!a) return b;
  return b > a ? b : a;
}

/**
 * מחשב מפה foodId → FoodStatsComputed מתוך יומני הארוחות של פרופיל.
 *
 * הגדרות:
 * - "הוצע" (timesOffered): כל רישום ארוחה שבו המאכל הופיע (בין אם נאכל בפועל
 *   ובין אם לא — הרישום עצמו מעיד שהמאכל הועמד לבחירה). כאן: כל foodId
 *   שמופיע ב-mealLog נחשב גם כהוצע וגם כנאכל, שכן mealLog מתעד אכילה בפועל.
 * - "נאכל" (timesEaten): כל mealLog שבו המאכל מופיע.
 * - tasteAvg/satietyAvg: ממוצע הדירוגים (1–5) על פני הרישומים שבהם ניתן דירוג.
 *   רישום ללא דירוג לא משתתף בממוצע.
 *
 * הערה: מכיוון שרישום ארוחה = אכילה בפועל, actuallyAteRate מבוסס על היחס
 * בין רישומים שנאכלו לבין הפעמים שהמאכל הוצע דרך menus (מועבר אופציונלית).
 * ללא נתוני הצעה חיצוניים, timesOffered=timesEaten ולכן actuallyAteRate=1.
 */
export function computeFoodStats(
  profileId: string,
  mealLogs: MealLog[],
  _foods?: FoodItem[],
  offeredCounts?: Map<string, { count: number; lastDate?: string }>,
): Map<string, FoodStatsComputed> {
  const acc = new Map<string, Accum>();

  const ensure = (foodId: string): Accum => {
    let a = acc.get(foodId);
    if (!a) {
      a = emptyAccum();
      acc.set(foodId, a);
    }
    return a;
  };

  for (const log of mealLogs) {
    if (log.profileId !== profileId) continue;
    for (const foodId of log.foodIds) {
      const a = ensure(foodId);
      a.timesEaten += 1;
      a.lastEatenDate = maxDate(a.lastEatenDate, log.date);
      if (typeof log.tasteRating === 'number') {
        a.tasteSum += log.tasteRating;
        a.tasteCount += 1;
      }
      if (typeof log.satietyRating === 'number') {
        a.satietySum += log.satietyRating;
        a.satietyCount += 1;
      }
    }
  }

  // שילוב נתוני הצעה (מ-menus) אם סופקו — אחרת ההצעה = האכילה.
  if (offeredCounts) {
    for (const [foodId, info] of offeredCounts) {
      const a = ensure(foodId);
      a.timesOffered = info.count;
      a.lastOfferedDate = maxDate(a.lastOfferedDate, info.lastDate ?? '');
    }
  }

  const result = new Map<string, FoodStatsComputed>();
  for (const [foodId, a] of acc) {
    const timesOffered =
      a.timesOffered > 0 ? a.timesOffered : a.timesEaten;
    const tasteAvg = a.tasteCount > 0 ? a.tasteSum / a.tasteCount : 0;
    const satietyAvg = a.satietyCount > 0 ? a.satietySum / a.satietyCount : 0;
    const actuallyAteRate =
      timesOffered > 0 ? a.timesEaten / timesOffered : 0;
    result.set(foodId, {
      id: foodStatsId(profileId, foodId),
      profileId,
      foodId,
      tasteAvg,
      satietyAvg,
      timesOffered,
      timesEaten: a.timesEaten,
      lastEatenDate: a.lastEatenDate,
      lastOfferedDate: a.lastOfferedDate || undefined,
      actuallyAteRate,
    });
  }
  return result;
}

/**
 * בונה מפת ספירות "הוצע" מתוך תפריטים (menus) — כל foodId שהופיע במשבצת
 * או כ-sweetFoodId נספר, יחד עם התאריך האחרון שבו הופיע.
 */
export function buildOfferedCounts(
  menus: { date: string; slots: { foodIds: string[] }[]; sweetFoodId?: string }[],
): Map<string, { count: number; lastDate?: string }> {
  const map = new Map<string, { count: number; lastDate?: string }>();
  const bump = (foodId: string, date: string) => {
    const cur = map.get(foodId) ?? { count: 0, lastDate: undefined };
    cur.count += 1;
    cur.lastDate = maxDate(cur.lastDate, date);
    map.set(foodId, cur);
  };
  for (const m of menus) {
    for (const slot of m.slots) {
      for (const foodId of slot.foodIds) bump(foodId, m.date);
    }
    if (m.sweetFoodId) bump(m.sweetFoodId, m.date);
  }
  return map;
}

/**
 * Wrapper ל-Dexie: מחשב מחדש את כל ה-foodStats של פרופיל מתוך היומנים
 * והתפריטים ושומר ב-DB (recalculate מלא — אמין יותר מ-increment).
 * נקרא אחרי כל רישום ארוחה.
 */
export async function recalcAndSaveFoodStats(
  profileId: string,
): Promise<Map<string, FoodStatsComputed>> {
  const [mealLogs, menus] = await Promise.all([
    db.mealLogs.where('profileId').equals(profileId).toArray(),
    db.menus.where('profileId').equals(profileId).toArray(),
  ]);
  const offered = buildOfferedCounts(menus);
  const stats = computeFoodStats(profileId, mealLogs, undefined, offered);

  // כתיבה: מוחקים את הישן של הפרופיל וכותבים מחדש (מקור אמת יחיד).
  const existing = await db.foodStats
    .where('profileId')
    .equals(profileId)
    .toArray();
  await db.foodStats.bulkDelete(existing.map((s) => s.id));

  const rows: FoodStats[] = [...stats.values()].map((s) => ({
    id: s.id,
    profileId: s.profileId,
    foodId: s.foodId,
    tasteAvg: s.tasteAvg,
    satietyAvg: s.satietyAvg,
    timesOffered: s.timesOffered,
    timesEaten: s.timesEaten,
    lastEatenDate: s.lastEatenDate,
    lastOfferedDate: s.lastOfferedDate,
  }));
  if (rows.length > 0) await db.foodStats.bulkPut(rows);
  return stats;
}

/** טוען את כל ה-foodStats של פרופיל כמפה foodId → FoodStats */
export async function loadFoodStats(
  profileId: string,
): Promise<Map<string, FoodStats>> {
  const rows = await db.foodStats
    .where('profileId')
    .equals(profileId)
    .toArray();
  return new Map(rows.map((r) => [r.foodId, r]));
}
