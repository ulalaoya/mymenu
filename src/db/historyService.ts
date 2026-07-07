// ===== שירות היסטוריה והתקדמות — SPEC סעיף 6.5 =====
// עוטף את Dexie ומחשב נתוני לוח שנה, פירוט יום, רצף ימים, מאכלים חדשים,
// תפריטים מנצחים וגיוון קבוצות מזון שבועי. חוויה חיובית בלבד — אין קלוריות,
// אין משקל, אין דיאטה. הלוגיקה הטהורה מופרדת מקריאות ה-DB לצורך בדיקות.

import type {
  FoodGroup,
  FoodItem,
  MealLog,
  Menu,
  SatietyRating,
  TasteRating,
} from '../types';
import { db } from './database';
import { getProfileFoods } from './foodRepo';
import { markWinnerMenus } from '../engine';
import { DAY_SLOTS } from '../utils/menuDisplay';
import { WATER_GOAL_CUPS } from './menuService';

/** מספר המשבצות (ארוחות) ביום — לחישוב שלמות רישום (ללא הממתק) */
export const MEALS_PER_DAY = DAY_SLOTS.length; // 5

// ===== לוח שנה חודשי =====

/** מצב יום בודד בלוח השנה */
export interface DayCell {
  /** תאריך "YYYY-MM-DD" */
  date: string;
  /** מספר היום בחודש (1..31) */
  day: number;
  /** כמה ארוחות שונות נרשמו (0..MEALS_PER_DAY) */
  mealsLogged: number;
  /** כמה כוסות מים נשתו */
  waterCups: number;
  /**
   * רמת שלמות 0..4 לצביעה:
   * 0=ריק, 1=מעט, 2=חלקי, 3=כמעט מלא, 4=יום מלא (כל הארוחות + מספיק מים).
   */
  completeness: 0 | 1 | 2 | 3 | 4;
}

/** לוח שנה חודשי מלא */
export interface MonthCalendar {
  year: number;
  /** חודש 1..12 */
  month: number;
  /** באיזה יום בשבוע מתחיל החודש (0=ראשון..6=שבת) — למיקום ברשת */
  startWeekday: number;
  days: DayCell[];
}

/** מחשב רמת שלמות 0..4 מתוך ארוחות שנרשמו וכוסות מים */
export function computeCompleteness(
  mealsLogged: number,
  waterCups: number,
): 0 | 1 | 2 | 3 | 4 {
  if (mealsLogged === 0 && waterCups === 0) return 0;
  // בונוס מים: חצי היעד ומעלה נחשב "מים טובים"
  const goodWater = waterCups >= Math.ceil(WATER_GOAL_CUPS / 2);
  if (mealsLogged >= MEALS_PER_DAY && goodWater) return 4;
  if (mealsLogged >= MEALS_PER_DAY) return 3;
  if (mealsLogged >= 3) return 3;
  if (mealsLogged >= 2) return 2;
  return 1;
}

/** בונה מחרוזת תאריך YYYY-MM-DD מרכיבים */
function dateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * לוח שנה חודשי: לכל יום כמה ארוחות נרשמו, כמה מים, ורמת שלמות לצביעה.
 * @param profileId פרופיל
 * @param year שנה מלאה (למשל 2026)
 * @param month חודש 1..12
 */
export async function getMonthCalendar(
  profileId: string,
  year: number,
  month: number,
): Promise<MonthCalendar> {
  const from = dateStr(year, month, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const to = dateStr(year, month, daysInMonth);
  const startWeekday = new Date(year, month - 1, 1).getDay();

  const [logs, waters] = await Promise.all([
    db.mealLogs
      .where('[profileId+date]')
      .between([profileId, from], [profileId, to], true, true)
      .toArray(),
    db.waterLogs
      .where('[profileId+date]')
      .between([profileId, from], [profileId, to], true, true)
      .toArray(),
  ]);

  // כמה משבצות שונות נרשמו לכל יום (ארוחה שנרשמה פעמיים נספרת פעם אחת)
  const slotsByDate = new Map<string, Set<string>>();
  for (const log of logs) {
    const set = slotsByDate.get(log.date) ?? new Set<string>();
    set.add(log.slot);
    slotsByDate.set(log.date, set);
  }
  const waterByDate = new Map<string, number>();
  for (const w of waters) waterByDate.set(w.date, w.cups);

  const days: DayCell[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const date = dateStr(year, month, d);
    const mealsLogged = slotsByDate.get(date)?.size ?? 0;
    const waterCups = waterByDate.get(date) ?? 0;
    days.push({
      date,
      day: d,
      mealsLogged,
      waterCups,
      completeness: computeCompleteness(mealsLogged, waterCups),
    });
  }

  return { year, month, startWeekday, days };
}

// ===== פירוט יום בודד =====

/** שורת ארוחה בפירוט היום */
export interface DayMealEntry {
  slot: MealLog['slot'];
  /** שמות המאכלים שנאכלו */
  foodNames: string[];
  /** אימוג'ים תואמים */
  foodEmojis: string[];
  eatenAt: number;
  tasteRating?: TasteRating;
  satietyRating?: SatietyRating;
  mood?: string;
}

/** פירוט יום שלם: מה נאכל, דירוגים, מים */
export interface DayDetails {
  date: string;
  meals: DayMealEntry[];
  waterCups: number;
}

/**
 * פירוט יום: כל הארוחות שנרשמו עם שמות המאכלים והדירוגים + כוסות מים.
 * הארוחות מסודרות לפי סדר היום ולפי שעת האכילה.
 */
export async function getDayDetails(
  profileId: string,
  date: string,
): Promise<DayDetails> {
  const [logs, water, foods] = await Promise.all([
    db.mealLogs.where('[profileId+date]').equals([profileId, date]).toArray(),
    db.waterLogs.where('[profileId+date]').equals([profileId, date]).first(),
    getProfileFoods(profileId),
  ]);

  const foodsById = new Map<string, FoodItem>();
  foods.forEach((f) => foodsById.set(f.id, f));

  const slotOrder = (slot: MealLog['slot']): number => {
    const i = DAY_SLOTS.indexOf(slot);
    return i === -1 ? DAY_SLOTS.length : i;
  };

  const meals: DayMealEntry[] = logs
    .map((log) => {
      const items = log.foodIds
        .map((id) => foodsById.get(id))
        .filter((f): f is FoodItem => Boolean(f));
      return {
        slot: log.slot,
        foodNames: items.map((f) => f.name),
        foodEmojis: items.map((f) => f.emoji),
        eatenAt: log.eatenAt,
        tasteRating: log.tasteRating,
        satietyRating: log.satietyRating,
        mood: log.mood,
      };
    })
    .sort((a, b) => {
      const s = slotOrder(a.slot) - slotOrder(b.slot);
      return s !== 0 ? s : a.eatenAt - b.eatenAt;
    });

  return { date, meals, waterCups: water?.cups ?? 0 };
}

// ===== רצף ימים (streak) =====

/** מחסיר יום ממחרוזת YYYY-MM-DD */
function prevDate(date: string): string {
  const d = new Date(date + 'T00:00:00');
  d.setDate(d.getDate() - 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * מחשב רצף ימים רצופים (עד today ועד בכלל) שבהם נרשמה לפחות ארוחה אחת.
 * לוגיקה טהורה. אם today עצמו ריק, מתחילים לספור מאתמול (כדי לא "לשבור"
 * רצף רק בגלל שהיום עוד לא נרשם דבר).
 */
export function computeStreakFromDates(
  loggedDates: Set<string>,
  today: string,
): number {
  let streak = 0;
  let cursor = today;
  // אם היום עדיין ריק — לא שוברים; מתחילים מאתמול
  if (!loggedDates.has(cursor)) {
    cursor = prevDate(cursor);
  }
  while (loggedDates.has(cursor)) {
    streak++;
    cursor = prevDate(cursor);
  }
  return streak;
}

/** רצף ימים רצופים עם רישום ארוחה, עד היום (wrapper ל-DB) */
export async function computeStreak(
  profileId: string,
  today: string,
): Promise<number> {
  const logs = await db.mealLogs
    .where('profileId')
    .equals(profileId)
    .toArray();
  const dates = new Set(logs.map((l) => l.date));
  return computeStreakFromDates(dates, today);
}

// ===== מאכלים חדשים שניסיתי =====

/** מאכל חדש שנוסה */
export interface TriedFood {
  id: string;
  name: string;
  emoji: string;
  /** האם מאכל אישי שנוסף על ידי המשתמשת */
  isCustom: boolean;
}

/**
 * מאכלים "חדשים": כל המאכלים האישיים (isCustom) שהמשתמשת הוסיפה, וכן
 * כל מאכל גלובלי שנרשם לפחות פעם אחת (הרחבת טעמים). ממוין: אישיים קודם.
 */
export async function getNewFoodsTried(
  profileId: string,
): Promise<TriedFood[]> {
  const [logs, foods] = await Promise.all([
    db.mealLogs.where('profileId').equals(profileId).toArray(),
    getProfileFoods(profileId),
  ]);

  const foodsById = new Map<string, FoodItem>();
  foods.forEach((f) => foodsById.set(f.id, f));

  const eatenIds = new Set<string>();
  for (const log of logs) log.foodIds.forEach((id) => eatenIds.add(id));

  const result: TriedFood[] = [];
  const seen = new Set<string>();
  for (const f of foods) {
    // כלול מאכל אם הוא אישי, או אם נאכל בפועל לפחות פעם
    if (!f.isCustom && !eatenIds.has(f.id)) continue;
    if (seen.has(f.id)) continue;
    seen.add(f.id);
    result.push({
      id: f.id,
      name: f.name,
      emoji: f.emoji,
      isCustom: f.isCustom,
    });
  }

  // אישיים קודם, ואז לפי שם
  result.sort((a, b) => {
    if (a.isCustom !== b.isCustom) return a.isCustom ? -1 : 1;
    return a.name.localeCompare(b.name, 'he');
  });
  return result;
}

// ===== תפריטים מנצחים =====

/** כרטיס תפריט מנצח לתצוגה */
export interface WinnerMenuCard {
  id: string;
  date: string;
  /** תיאור קצר של המנות העיקריות (שמות מאכלים) */
  highlights: string[];
  overallRating?: number;
}

/**
 * מחזיר את התפריטים המנצחים (isWinner) של הפרופיל, החדשים קודם, עם תקציר
 * המנות העיקריות (צהריים/ערב). משתמש ב-markWinnerMenus מהמנוע כדי לוודא
 * שהסימון עקבי עם overallRating (גם אם isWinner לא נשמר בעבר).
 */
export async function getWinnerMenus(
  profileId: string,
): Promise<WinnerMenuCard[]> {
  const [menus, foods] = await Promise.all([
    db.menus.where('profileId').equals(profileId).toArray(),
    getProfileFoods(profileId),
  ]);

  const foodsById = new Map<string, FoodItem>();
  foods.forEach((f) => foodsById.set(f.id, f));

  const marked: Menu[] = markWinnerMenus(menus);
  const winners = marked.filter((m) => m.isWinner);
  winners.sort((a, b) => b.date.localeCompare(a.date));

  return winners.map((m) => {
    const mainSlots = m.slots.filter(
      (s) => s.slot === 'צהריים' || s.slot === 'ערב',
    );
    const highlights = mainSlots
      .flatMap((s) => s.foodIds)
      .map((id) => foodsById.get(id)?.name)
      .filter((n): n is string => Boolean(n))
      .slice(0, 4);
    return {
      id: m.id,
      date: m.date,
      highlights,
      overallRating: m.overallRating,
    };
  });
}

// ===== גיוון קבוצות מזון שבועי =====

/** נקודת גיוון ליום בשבוע */
export interface DayVariety {
  /** תאריך "YYYY-MM-DD" */
  date: string;
  /** יום בשבוע 0..6 (0=ראשון) */
  weekday: number;
  /** כמה קבוצות מזון שונות כוסו באותו יום (0..8) */
  groupCount: number;
  /** רשימת הקבוצות שכוסו (לתצוגה עשירה) */
  groups: FoodGroup[];
}

/** גיוון שבועי מלא (7 ימים החל מ-weekStart) */
export interface WeeklyVariety {
  weekStart: string;
  days: DayVariety[];
  /** המקסימום התאורטי לגרף (סך קבוצות המזון) */
  maxGroups: number;
}

/** מוסיף ימים למחרוזת YYYY-MM-DD */
function addDays(date: string, days: number): string {
  const d = new Date(date + 'T00:00:00');
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** סך קבוצות המזון האפשריות (לתקרת הגרף) */
export const TOTAL_FOOD_GROUPS = 8;

/**
 * גיוון קבוצות מזון לאורך 7 ימים מ-weekStart: לכל יום כמה קבוצות מזון שונות
 * כוסו בפועל (מתוך רישומי הארוחות). ספירת קבוצות — לא קלוריות (SPEC 6.5).
 */
export async function getWeeklyGroupVariety(
  profileId: string,
  weekStart: string,
): Promise<WeeklyVariety> {
  const weekEnd = addDays(weekStart, 6);
  const [logs, foods] = await Promise.all([
    db.mealLogs
      .where('[profileId+date]')
      .between([profileId, weekStart], [profileId, weekEnd], true, true)
      .toArray(),
    getProfileFoods(profileId),
  ]);

  const foodsById = new Map<string, FoodItem>();
  foods.forEach((f) => foodsById.set(f.id, f));

  const groupsByDate = new Map<string, Set<FoodGroup>>();
  for (const log of logs) {
    const set = groupsByDate.get(log.date) ?? new Set<FoodGroup>();
    for (const id of log.foodIds) {
      foodsById.get(id)?.foodGroups.forEach((g) => set.add(g));
    }
    groupsByDate.set(log.date, set);
  }

  const days: DayVariety[] = [];
  for (let i = 0; i < 7; i++) {
    const date = addDays(weekStart, i);
    const set = groupsByDate.get(date) ?? new Set<FoodGroup>();
    days.push({
      date,
      weekday: new Date(date + 'T00:00:00').getDay(),
      groupCount: set.size,
      groups: [...set],
    });
  }

  return { weekStart, days, maxGroups: TOTAL_FOOD_GROUPS };
}

// ===== עזרי תאריך לתצוגה =====

/** מחזיר את תחילת השבוע (יום ראשון) עבור תאריך נתון, כמחרוזת YYYY-MM-DD */
export function startOfWeek(date: string): string {
  const d = new Date(date + 'T00:00:00');
  const weekday = d.getDay(); // 0=ראשון
  d.setDate(d.getDate() - weekday);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
