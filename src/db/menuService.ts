// ===== שירות תפריט יומי — SPEC סעיפים 6.2, 6.3, 6.4 =====
// מגשר בין מנוע ההמלצות (לוגיקה טהורה) לבין Dexie (אחסון).
// אינו משכפל לוגיקת מנוע — עוטף אותה ומוסיף קריאה/כתיבה ל-DB בלבד.

import type {
  FoodStats,
  MealLog,
  MealSlot,
  Menu,
  MenuSlot,
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
import { DAY_SLOTS, SLOT_LABELS } from '../utils/menuDisplay';
import { timeToMinutes } from '../utils/date';

/** מפתח הסלוט של הממתק היומי ביומן */
export const SWEET_KEY: MealSlot = 'ממתק';
/** שעת ברירת מחדל לממתק אם לא נקבעה */
export const DEFAULT_SWEET_TIME = '16:30';

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
  // שומרים על הסלוטים המותאמים ועל שעת הממתק שהמשתמשת קבעה — ה"ערבוב"
  // מגריל מחדש רק את ההצעות הקבועות, לא מוחק ארוחות שהיא הוסיפה בעצמה.
  const customs = existing ? existing.slots.filter((s) => s.custom) : [];
  const menu: Menu = existing
    ? {
        ...shuffled,
        id: existing.id,
        isWinner: existing.isWinner,
        sweetTime: existing.sweetTime,
        slots: [...shuffled.slots, ...customs],
      }
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

// ===== יומן אכילה יומי דינמי (SPEC 6.2/6.3/6.4 — מיזוג תפריט+רישום) =====
// שכבת תצוגה/עריכה מעל ה-Menu: מציגה את הארוחות הקבועות + הממתק + סלוטים
// מותאמים שהמשתמשת מוסיפה, מאפשרת הוספה/הורדת מאכלים, עדכון שעה פר-יום,
// ורישום "נאכל" עם דירוגים. שומרת על מבנה ה-Menu שהמנוע מייצר (5 משבצות +
// sweetFoodId) כדי לא לשבור את מנוע ההמלצות.

/** סלוט מנורמל לתצוגת היומן (ארוחה קבועה / ממתק / מותאמת) */
export interface DiarySlot {
  /** מפתח יציב: שם המשבצת הקבועה, 'ממתק', או מזהה סלוט מותאם */
  key: string;
  /** משבצת בסיס — לאייקון ולסינון מאכלים מתאימים */
  slot: MealSlot;
  /** תווית תצוגה */
  label: string;
  foodIds: string[];
  plannedTime: string;
  /** סלוט שהמשתמשת הוסיפה ידנית */
  custom: boolean;
  /** משבצת הממתק היומי */
  isSweet: boolean;
}

/**
 * בונה את רשימת סלוטי היומן לתצוגה: הארוחות הקבועות (לפי DAY_SLOTS),
 * הממתק היומי, והסלוטים המותאמים — ממוינים כרונולוגית לפי שעה (ריקים בסוף).
 */
export function getDiarySlots(menu: Menu, profile: Profile): DiarySlot[] {
  const byFixed = new Map<MealSlot, MenuSlot>();
  const customs: MenuSlot[] = [];
  for (const s of menu.slots) {
    if (s.custom) customs.push(s);
    else byFixed.set(s.slot, s);
  }

  const fixed: DiarySlot[] = DAY_SLOTS.map((slot) => {
    const ms = byFixed.get(slot);
    return {
      key: slot,
      slot,
      label: SLOT_LABELS[slot],
      foodIds: ms?.foodIds ?? [],
      plannedTime: ms?.plannedTime || profile.mealTimes[slot] || '',
      custom: false,
      isSweet: false,
    };
  });

  const sweet: DiarySlot = {
    key: SWEET_KEY,
    slot: 'ממתק',
    label: SLOT_LABELS['ממתק'],
    foodIds: menu.sweetFoodId ? [menu.sweetFoodId] : [],
    plannedTime:
      menu.sweetTime || profile.mealTimes['ממתק'] || DEFAULT_SWEET_TIME,
    custom: false,
    isSweet: true,
  };

  const customSlots: DiarySlot[] = customs.map((s) => ({
    key: s.id!,
    slot: s.slot,
    label: s.label || SLOT_LABELS[s.slot],
    foodIds: s.foodIds,
    plannedTime: s.plannedTime,
    custom: true,
    isSweet: false,
  }));

  return [...fixed, sweet, ...customSlots].sort((a, b) => {
    const ta = timeToMinutes(a.plannedTime);
    const tb = timeToMinutes(b.plannedTime);
    if (ta == null && tb == null) return 0;
    if (ta == null) return 1;
    if (tb == null) return -1;
    return ta - tb;
  });
}

/** מוצא סלוט בודד לתצוגה לפי מפתח (או undefined) */
export function getDiarySlot(
  menu: Menu,
  profile: Profile,
  key: string,
): DiarySlot | undefined {
  return getDiarySlots(menu, profile).find((s) => s.key === key);
}

/** טוען את המנו ומחיל מוטציה, שומר ומחזיר את המעודכן (או undefined) */
async function mutateMenu(
  menuId: string,
  fn: (menu: Menu) => Menu,
): Promise<Menu | undefined> {
  const menu = await db.menus.get(menuId);
  if (!menu) return undefined;
  const updated = fn(menu);
  await db.menus.put(updated);
  return updated;
}

/**
 * מעדכן סלוט קבוע או מותאם ב-menu.slots. אם סלוט קבוע חסר (תפריט ישן) —
 * יוצר אותו. אינו מטפל בממתק (שנשמר ב-sweetFoodId).
 */
function updateSlotList(
  menu: Menu,
  key: string,
  patch: (slot: MenuSlot | undefined) => Partial<MenuSlot>,
): MenuSlot[] {
  const isCustom = menu.slots.some((s) => s.custom && s.id === key);
  const idx = menu.slots.findIndex((s) =>
    isCustom ? s.id === key : !s.custom && s.slot === key,
  );
  if (idx >= 0) {
    const cur = menu.slots[idx];
    const slots = [...menu.slots];
    slots[idx] = { ...cur, ...patch(cur) };
    return slots;
  }
  // סלוט קבוע חסר — יוצרים אותו (מפתח קבוע = שם משבצת)
  const created: MenuSlot = {
    slot: key as MealSlot,
    foodIds: [],
    plannedTime: '',
    ...patch(undefined),
  };
  return [...menu.slots, created];
}

/** מוסיף מאכל לסלוט (הממתק = פריט יחיד ולכן מוחלף) */
export async function addFoodToSlot(
  menuId: string,
  key: string,
  foodId: string,
): Promise<Menu | undefined> {
  if (key === SWEET_KEY) {
    return mutateMenu(menuId, (menu) => ({ ...menu, sweetFoodId: foodId }));
  }
  return mutateMenu(menuId, (menu) => ({
    ...menu,
    slots: updateSlotList(menu, key, (slot) => ({
      foodIds: [...new Set([...(slot?.foodIds ?? []), foodId])],
    })),
  }));
}

/** מסיר מאכל מסלוט */
export async function removeFoodFromSlot(
  menuId: string,
  key: string,
  foodId: string,
): Promise<Menu | undefined> {
  if (key === SWEET_KEY) {
    return mutateMenu(menuId, (menu) => ({
      ...menu,
      sweetFoodId: menu.sweetFoodId === foodId ? undefined : menu.sweetFoodId,
    }));
  }
  return mutateMenu(menuId, (menu) => ({
    ...menu,
    slots: updateSlotList(menu, key, (slot) => ({
      foodIds: (slot?.foodIds ?? []).filter((id) => id !== foodId),
    })),
  }));
}

/** מעדכן את השעה של סלוט ליום הנוכחי (override פר-יום מעל ברירת המחדל) */
export async function setSlotTime(
  menuId: string,
  key: string,
  time: string,
): Promise<Menu | undefined> {
  if (key === SWEET_KEY) {
    return mutateMenu(menuId, (menu) => ({ ...menu, sweetTime: time }));
  }
  return mutateMenu(menuId, (menu) => ({
    ...menu,
    slots: updateSlotList(menu, key, () => ({ plannedTime: time })),
  }));
}

/** קלט להוספת סלוט מותאם */
export interface AddCustomSlotInput {
  label: string;
  plannedTime: string;
  /** משבצת בסיס לסינון מאכלים (ברירת מחדל: 'עשר' — חטיף כללי) */
  baseSlot?: MealSlot;
}

/**
 * מוסיף סלוט מותאם ("ארוחה נוספת") ליומן ומחזיר את מזהה הסלוט החדש,
 * או undefined אם התפריט לא נמצא.
 */
export async function addCustomSlot(
  menuId: string,
  input: AddCustomSlotInput,
): Promise<string | undefined> {
  const menu = await db.menus.get(menuId);
  if (!menu) return undefined;
  const id = newId();
  const slot: MenuSlot = {
    slot: input.baseSlot ?? 'עשר',
    foodIds: [],
    plannedTime: input.plannedTime,
    id,
    label: input.label.trim() || 'ארוחה נוספת',
    custom: true,
  };
  await db.menus.put({ ...menu, slots: [...menu.slots, slot] });
  return id;
}

/** מסיר סלוט מותאם וגם את רישום ה"נאכל" שלו (אם קיים) */
export async function removeCustomSlot(
  menuId: string,
  slotId: string,
): Promise<void> {
  const menu = await db.menus.get(menuId);
  if (!menu) return;
  await db.menus.put({
    ...menu,
    slots: menu.slots.filter((s) => !(s.custom && s.id === slotId)),
  });
  await deleteSlotLog(menu.profileId, menu.date, slotId);
}

/** קלט לרישום/עדכון "נאכל" של סלוט */
export interface LogSlotInput {
  slotKey: string;
  slot: MealSlot;
  slotLabel?: string;
  foodIds: string[];
  plannedTime: string;
  tasteRating?: TasteRating;
  satietyRating?: SatietyRating;
  mood?: string;
}

/** מחזיר את רישום ה"נאכל" של סלוט מסוים ביום, או undefined */
export async function getSlotLog(
  profileId: string,
  date: string,
  slotKey: string,
): Promise<MealLog | undefined> {
  const logs = await db.mealLogs
    .where('[profileId+date]')
    .equals([profileId, date])
    .toArray();
  return logs.find((l) => (l.slotId ?? l.slot) === slotKey);
}

/**
 * רושם (או מעדכן) שהסלוט נאכל, עם המאכלים והדירוגים הנוכחיים. upsert לפי
 * מפתח הסלוט — רישום קודם לאותו סלוט ביום מוחלף. מעדכן foodStats.
 */
export async function logSlotMeal(
  profileId: string,
  date: string,
  input: LogSlotInput,
): Promise<MealLog> {
  const existing = await db.mealLogs
    .where('[profileId+date]')
    .equals([profileId, date])
    .toArray();
  const stale = existing.filter((l) => (l.slotId ?? l.slot) === input.slotKey);
  if (stale.length) await db.mealLogs.bulkDelete(stale.map((l) => l.id));

  const [hh, mm] = input.plannedTime.split(':').map(Number);
  const eatenAt = new Date(date + 'T00:00:00');
  eatenAt.setHours(hh || 0, mm || 0, 0, 0);

  const log: MealLog = {
    id: newId(),
    profileId,
    date,
    slot: input.slot,
    slotId: input.slotKey,
    slotLabel: input.slotLabel,
    foodIds: input.foodIds,
    eatenAt: eatenAt.getTime(),
    tasteRating: input.tasteRating,
    satietyRating: input.satietyRating,
    mood: input.mood,
    wasFromPlan: true,
  };
  await db.mealLogs.add(log);
  await recalcAndSaveFoodStats(profileId);
  return log;
}

/** מבטל את סימון ה"נאכל" של סלוט (מוחק את הרישום) ומעדכן foodStats */
export async function deleteSlotLog(
  profileId: string,
  date: string,
  slotKey: string,
): Promise<void> {
  const logs = await db.mealLogs
    .where('[profileId+date]')
    .equals([profileId, date])
    .toArray();
  const stale = logs.filter((l) => (l.slotId ?? l.slot) === slotKey);
  if (stale.length) {
    await db.mealLogs.bulkDelete(stale.map((l) => l.id));
    await recalcAndSaveFoodStats(profileId);
  }
}
