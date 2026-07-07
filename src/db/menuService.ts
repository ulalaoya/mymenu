// ===== שירות תפריט יומי — SPEC סעיפים 6.2, 6.3, 6.4 =====
// מגשר בין מנוע ההמלצות (לוגיקה טהורה) לבין Dexie (אחסון).
// אינו משכפל לוגיקת מנוע — עוטף אותה ומוסיף קריאה/כתיבה ל-DB בלבד.

import type {
  FoodStats,
  MealLog,
  MealSlot,
  Menu,
  Profile,
  SatietyRating,
  TasteRating,
  WaterLog,
} from '../types';
import { db } from './database';
import { getProfileFoods } from './foodRepo';
import {
  buildDailyMenu,
  shuffleMenu,
  recalcAndSaveFoodStats,
  loadFoodStats,
  type FoodStatsComputed,
} from '../engine';

/** יעד כוסות המים היומי (SPEC סעיף 4: 6–8 כוסות) */
export const WATER_GOAL_CUPS = 8;

/**
 * חלון הטעינה (בימים) של תפריטים ורישומים לבניית תפריט.
 * מכסה גיוון (3 ימים) + recency (3 ימים) + מרווח ביטחון ללמידת שעות (14 יום).
 * טעינת טווח בלבד מונעת גדילה ליניארית של ה-I/O עם ההיסטוריה.
 */
const BUILD_INPUT_WINDOW_DAYS = 14;

/** מפחית ימים ממחרוזת תאריך YYYY-MM-DD (השוואה לקסיקוגרפית בטוחה) */
function subtractDays(date: string, days: number): string {
  const d = new Date(date + 'T00:00:00');
  d.setDate(d.getDate() - days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** מזהה ייחודי */
function newId(): string {
  return crypto.randomUUID();
}

/** ממיר מפת FoodStats (מה-DB) למפת FoodStatsComputed שהמנוע מצפה לה */
function toComputedStats(
  raw: Map<string, FoodStats>,
): Map<string, FoodStatsComputed> {
  const out = new Map<string, FoodStatsComputed>();
  for (const [foodId, s] of raw) {
    const actuallyAteRate =
      s.timesOffered > 0 ? s.timesEaten / s.timesOffered : 0;
    out.set(foodId, { ...s, actuallyAteRate });
  }
  return out;
}

/**
 * טוען את כל הקלט שהמנוע צריך כדי לבנות תפריט לתאריך נתון.
 * מחזיר מאכלים זמינים, סטטיסטיקות, תפריטים אחרונים ורישומי ארוחות.
 */
async function loadBuildInput(profile: Profile, date: string) {
  // טוענים רק את חלון הזמן הדרוש (14 יום) דרך האינדקס המורכב [profileId+date].
  // מחרוזות YYYY-MM-DD ניתנות להשוואה לקסיקוגרפית, לכן between עובד נכון.
  // כך ה-I/O קבוע ואינו גדל עם היסטוריה בת חודשים/שנים.
  const from = subtractDays(date, BUILD_INPUT_WINDOW_DAYS);
  const [foods, rawStats, recentMenus, mealLogs] = await Promise.all([
    getProfileFoods(profile.id),
    loadFoodStats(profile.id),
    db.menus
      .where('[profileId+date]')
      .between([profile.id, from], [profile.id, date], true, true)
      .toArray(),
    db.mealLogs
      .where('[profileId+date]')
      .between([profile.id, from], [profile.id, date], true, true)
      .toArray(),
  ]);
  return {
    profile,
    date,
    foods,
    stats: toComputedStats(rawStats),
    recentMenus,
    mealLogs,
  };
}

/**
 * מחזיר את תפריט היום; אם אינו קיים — בונה אחד חדש (buildDailyMenu) ושומר.
 * אידמפוטנטי: קריאות חוזרות באותו יום מחזירות את אותו תפריט (לא בונה מחדש).
 */
export async function getOrCreateTodayMenu(
  profile: Profile,
  date: string,
): Promise<Menu> {
  const existing = await db.menus
    .where('[profileId+date]')
    .equals([profile.id, date])
    .first();
  if (existing) return existing;

  const input = await loadBuildInput(profile, date);
  const menu = buildDailyMenu(input);
  await db.menus.put(menu);
  return menu;
}

/** שולף תפריט לפי מזהה */
export function getMenuById(menuId: string): Promise<Menu | undefined> {
  return db.menus.get(menuId);
}

/**
 * מחליף מאכל במשבצת מסוימת בתפריט (סיגנל העדפה — SPEC 5.3(2)).
 * מחליף את foodId הראשון במשבצת אם קיים ישן, אחרת מוסיף.
 */
export async function replaceSlotFood(
  menuId: string,
  slot: MealSlot,
  newFoodId: string,
  oldFoodId?: string,
): Promise<Menu | undefined> {
  const menu = await db.menus.get(menuId);
  if (!menu) return undefined;

  const slots = menu.slots.map((s) => {
    if (s.slot !== slot) return s;
    let foodIds: string[];
    if (oldFoodId && s.foodIds.includes(oldFoodId)) {
      foodIds = s.foodIds.map((id) => (id === oldFoodId ? newFoodId : id));
    } else if (s.foodIds.length > 0) {
      foodIds = [newFoodId, ...s.foodIds.slice(1)];
    } else {
      foodIds = [newFoodId];
    }
    // מניעת כפילות באותה משבצת
    foodIds = [...new Set(foodIds)];
    return { ...s, foodIds };
  });

  const updated: Menu = { ...menu, slots };
  await db.menus.put(updated);
  return updated;
}

/** קובע את הממתק היומי של התפריט (SPEC 6.3) */
export async function setSweet(
  menuId: string,
  foodId: string,
): Promise<Menu | undefined> {
  const menu = await db.menus.get(menuId);
  if (!menu) return undefined;
  const updated: Menu = { ...menu, sweetFoodId: foodId };
  await db.menus.put(updated);
  return updated;
}

/**
 * מגריל מחדש את תפריט היום ("ערבבי לי מחדש" — SPEC 6.3) ושומר.
 * שומר על מזהה התפריט הקיים כדי שהרפרנסים לא יישברו.
 */
export async function reshuffleTodayMenu(
  profile: Profile,
  date: string,
): Promise<Menu> {
  const existing = await db.menus
    .where('[profileId+date]')
    .equals([profile.id, date])
    .first();

  const input = await loadBuildInput(profile, date);
  const shuffled = shuffleMenu(input);
  const menu: Menu = existing
    ? { ...shuffled, id: existing.id, isWinner: existing.isWinner }
    : shuffled;
  await db.menus.put(menu);
  return menu;
}

/** קלט לרישום ארוחה */
export interface LogMealInput {
  profileId: string;
  date: string;
  slot: MealSlot;
  foodIds: string[];
  eatenAt: number;
  tasteRating?: TasteRating;
  satietyRating?: SatietyRating;
  mood?: string;
  wasFromPlan: boolean;
}

/**
 * רושם ארוחה שנאכלה (mealLog) ומעדכן את סטטיסטיקות המזון (foodStats).
 * מחזיר את רשומת ה-mealLog שנשמרה.
 */
export async function logMeal(input: LogMealInput): Promise<MealLog> {
  const log: MealLog = {
    id: newId(),
    profileId: input.profileId,
    date: input.date,
    slot: input.slot,
    foodIds: input.foodIds,
    eatenAt: input.eatenAt,
    tasteRating: input.tasteRating,
    satietyRating: input.satietyRating,
    mood: input.mood,
    wasFromPlan: input.wasFromPlan,
  };
  await db.mealLogs.add(log);
  // חישוב מחדש מלא של הסטטיסטיקות מהמקור (אמין) — משפיע על המלצות מחר.
  await recalcAndSaveFoodStats(input.profileId);
  return log;
}

/** כל רישומי הארוחות של פרופיל לתאריך נתון */
export function getMealLogsForDate(
  profileId: string,
  date: string,
): Promise<MealLog[]> {
  return db.mealLogs
    .where('[profileId+date]')
    .equals([profileId, date])
    .toArray();
}

// ===== מד מים (SPEC סעיף 4 + 6.2) =====

/** מזהה יציב לרשומת מים לפי פרופיל+תאריך */
function waterId(profileId: string, date: string): string {
  return `${profileId}::${date}`;
}

/** מחזיר את מספר כוסות המים שנשתו היום (0 אם אין רשומה) */
export async function getWaterCups(
  profileId: string,
  date: string,
): Promise<number> {
  const row = await db.waterLogs
    .where('[profileId+date]')
    .equals([profileId, date])
    .first();
  return row?.cups ?? 0;
}

/** קובע את מספר כוסות המים ליום (נצמד לטווח 0..WATER_GOAL_CUPS) */
export async function setWaterCups(
  profileId: string,
  date: string,
  cups: number,
): Promise<number> {
  const clamped = Math.max(0, Math.min(WATER_GOAL_CUPS, Math.round(cups)));
  const row: WaterLog = {
    id: waterId(profileId, date),
    profileId,
    date,
    cups: clamped,
  };
  await db.waterLogs.put(row);
  return clamped;
}
