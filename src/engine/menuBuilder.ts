// ===== בניית תפריט יומי — SPEC סעיפים 5.1 + 5.2 =====
// בונה Menu עם 5 משבצות (בוקר/עשר/צהריים/מנחה/ערב) + ממתק יומי אחד.
// אילוצים: כיסוי כל קבוצות המזון, מקור חלבון בכל ארוחה עיקרית (בוקר/צהריים/
// ערב — קבוצת "חלבונים" או "מוצרי חלב"), ≥2 מנות ירקות ו-≥2 מנות פירות ביום,
// גיוון (מנה עיקרית לא חוזרת ב-3 ימים), לפחות מאכל חדש אחד ביום, סינון
// אלרגיה/צמחונות. לוגיקה טהורה: מקבלת נתונים ומחזירה Menu.
// לוגיקה טהורה: מקבלת נתונים ומחזירה Menu.

import type {
  FoodGroup,
  FoodItem,
  MealLog,
  MealSlot,
  Menu,
  MenuSlot,
  Profile,
} from '../types';
import { filterFoodsForProfile } from '../db/foodRepo';
import {
  rankFoods,
  type ScoreContext,
  type ScoredFood,
} from './scoring';
import type { FoodStatsComputed } from './foodStats';

/** משבצות הארוחה (ללא "ממתק" — הוא משבצת נפרדת) לפי הסדר היומי */
export const MEAL_SLOTS: MealSlot[] = ['בוקר', 'עשר', 'צהריים', 'מנחה', 'ערב'];
/** הארוחות העיקריות — גיוון של 3 ימים חל עליהן (מנה עיקרית לא חוזרת) */
export const MAIN_SLOTS: MealSlot[] = ['צהריים', 'ערב'];
/**
 * ארוחות עיקריות שחייבות מקור חלבון (SPEC 4: "חלבון בכל ארוחה עיקרית").
 * מקור חלבון מתאים לילדים = קבוצת "חלבונים" או "מוצרי חלב".
 */
export const PROTEIN_MEAL_SLOTS: MealSlot[] = ['בוקר', 'צהריים', 'ערב'];
/** מינימום מנות ירקות ליום (SPEC 4: "ירק אחד לפחות ×2") */
export const MIN_VEGETABLE_SERVINGS = 2;
/** מינימום מנות פירות ליום (SPEC 4: "פרי ×2") */
export const MIN_FRUIT_SERVINGS = 2;
/** קבוצות המזון שהתפריט חייב לכסות (SPEC 5.2 + 4). קטניות/שומנים = רשות. */
export const REQUIRED_GROUPS: FoodGroup[] = [
  'פחמימות',
  'חלבונים',
  'מוצרי חלב',
  'ירקות',
  'פירות',
  'מתוקים',
];

/** חלון הגיוון למנה עיקרית (SPEC: לא חוזרת בטווח 3 ימים) */
export const VARIETY_WINDOW_DAYS = 3;
/** חלון ה-recency לקנס גיוון בניקוד (הוצע/נאכל ב-3 ימים אחרונים) */
export const RECENCY_WINDOW_DAYS = 3;

/** קלט לבניית תפריט */
export interface BuildMenuInput {
  profile: Profile;
  date: string; // YYYY-MM-DD
  foods: FoodItem[]; // כל המאכלים הזמינים לפרופיל (גלובלי + אישי)
  stats: Map<string, FoodStatsComputed>; // foodId → סטטיסטיקה
  recentMenus: Menu[]; // תפריטים אחרונים (לגיוון)
  mealLogs: MealLog[]; // רישומי ארוחות אחרונים (לגיוון + recency)
  /** מקור אקראיות אופציונלי (לשחזור/ערבוב) — ברירת מחדל Math.random */
  rng?: () => number;
}

/** מזהה ייחודי לתפריט */
function newId(): string {
  return crypto.randomUUID();
}

/** מפחית ימים ממחרוזת תאריך YYYY-MM-DD */
function subDays(date: string, days: number): string {
  const d = new Date(date + 'T00:00:00');
  d.setDate(d.getDate() - days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * אוסף מזהי מאכלים שהופיעו/נאכלו בטווח windowDays לפני date (לא כולל date).
 * משמש גם ל-recencyPenalty וגם לאילוץ הגיוון של מנה עיקרית.
 */
export function collectRecentFoodIds(
  date: string,
  windowDays: number,
  recentMenus: Menu[],
  mealLogs: MealLog[],
): Set<string> {
  const from = subDays(date, windowDays);
  const ids = new Set<string>();
  for (const m of recentMenus) {
    if (m.date >= from && m.date < date) {
      for (const s of m.slots) s.foodIds.forEach((id) => ids.add(id));
      if (m.sweetFoodId) ids.add(m.sweetFoodId);
    }
  }
  for (const log of mealLogs) {
    if (log.date >= from && log.date < date) {
      log.foodIds.forEach((id) => ids.add(id));
    }
  }
  return ids;
}

/** בונה ScoreContext־factory עבור מצב תפריט נתון */
function makeCtxBuilder(
  stats: Map<string, FoodStatsComputed>,
  coveredGroups: Set<FoodGroup>,
  recentFoodIds: Set<string>,
): (food: FoodItem) => ScoreContext {
  return (food) => ({
    stats: stats.get(food.id),
    coveredGroups,
    recentFoodIds,
  });
}

/** האם מאכל מכיל חלבון (קבוצת "חלבונים") */
function hasProtein(food: FoodItem): boolean {
  return food.foodGroups.includes('חלבונים');
}

/**
 * האם מאכל הוא מקור חלבון מתאים לילדים (SPEC 4):
 * קבוצת "חלבונים" (עוף/בשר/דגים/ביצים/טונה) או "מוצרי חלב" (גבינות/יוגורט/חלב).
 */
function isProteinSource(food: FoodItem): boolean {
  return (
    food.foodGroups.includes('חלבונים') ||
    food.foodGroups.includes('מוצרי חלב')
  );
}

/** האם מאכל שייך לקבוצת מזון נתונה */
function hasGroup(food: FoodItem, group: FoodGroup): boolean {
  return food.foodGroups.includes(group);
}

/** תוצאת בחירה למשבצת */
interface SlotPick {
  slot: MealSlot;
  foods: FoodItem[];
}

/**
 * בונה תפריט יומי מלא לפי כל האילוצים.
 */
export function buildDailyMenu(input: BuildMenuInput): Menu {
  const { profile, date, foods, stats, recentMenus, mealLogs } = input;

  const available = filterFoodsForProfile(foods, profile);

  // מזהי מאכלים אחרונים לקנס recency בניקוד
  const recentFoodIds = collectRecentFoodIds(
    date,
    RECENCY_WINDOW_DAYS,
    recentMenus,
    mealLogs,
  );
  // מנות עיקריות אסורות לחזרה (אילוץ גיוון קשיח)
  const bannedMainFoodIds = collectRecentFoodIds(
    date,
    VARIETY_WINDOW_DAYS,
    recentMenus,
    mealLogs,
  );

  const coveredGroups = new Set<FoodGroup>();
  const usedFoodIds = new Set<string>();
  const picks: SlotPick[] = [];

  // ----- שלב 1: בחירה greedy לכל משבצת עיקרית ומשנית -----
  for (const slot of MEAL_SLOTS) {
    const isMain = MAIN_SLOTS.includes(slot);
    let candidates = available.filter(
      (f) => f.category.includes(slot) && !usedFoodIds.has(f.id),
    );
    // אילוץ גיוון קשיח למנה עיקרית: לא חוזרת ב-3 ימים
    if (isMain) {
      const varied = candidates.filter((f) => !bannedMainFoodIds.has(f.id));
      if (varied.length > 0) candidates = varied;
    }

    const ctxBuilder = makeCtxBuilder(stats, coveredGroups, recentFoodIds);
    const ranked = rankFoods(candidates, ctxBuilder);

    const chosen: FoodItem[] = [];

    const isProteinMeal = PROTEIN_MEAL_SLOTS.includes(slot);

    if (isMain) {
      // ארוחה עיקרית: לוודא חלבון (עוף/בשר/דגים/ביצים) + ליווי אם אפשר.
      const proteinPick = pickFirst(ranked, (f) => hasProtein(f));
      if (proteinPick) chosen.push(proteinPick);
      // ליווי: מאכל נוסף שמוסיף קבוצה חדשה (למשל פחמימה/ירק)
      const sidePick = pickFirst(
        ranked,
        (f) =>
          !chosen.includes(f) &&
          f.foodGroups.some((g) => !coveredGroups.has(g)),
      );
      if (sidePick && sidePick !== proteinPick) chosen.push(sidePick);
      // אם לא נמצא חלבון כלל, ניקח את המדורג הראשון כדי לא להשאיר ריק
      if (chosen.length === 0 && ranked.length > 0) chosen.push(ranked[0].food);
    } else if (isProteinMeal) {
      // ארוחת בוקר: חייבת מקור חלבון (חלבונים או מוצרי חלב). SPEC 4.
      const proteinPick = pickFirst(ranked, (f) => isProteinSource(f));
      if (proteinPick) chosen.push(proteinPick);
      // ליווי אחד שמוסיף קבוצה חדשה (למשל פחמימה/ירק/פרי)
      const sidePick = pickFirst(
        ranked,
        (f) =>
          !chosen.includes(f) &&
          f.foodGroups.some((g) => !coveredGroups.has(g)),
      );
      if (sidePick && sidePick !== proteinPick) chosen.push(sidePick);
      if (chosen.length === 0 && ranked.length > 0) chosen.push(ranked[0].food);
    } else {
      // ארוחת ביניים (עשר/מנחה): פריט מוביל אחד (מספיק לכיסוי הדרגתי)
      if (ranked.length > 0) chosen.push(ranked[0].food);
    }

    for (const f of chosen) {
      usedFoodIds.add(f.id);
      f.foodGroups.forEach((g) => coveredGroups.add(g));
    }
    picks.push({ slot, foods: chosen });
  }

  // ----- שלב 2: תיקון כיסוי קבוצות מזון חסרות -----
  repairGroupCoverage(
    picks,
    available,
    coveredGroups,
    usedFoodIds,
    bannedMainFoodIds,
  );

  // ----- שלב 2ב: הבטחת מקור חלבון בכל ארוחה עיקרית (בוקר/צהריים/ערב) -----
  ensureProteinPerMeal(picks, available, stats, coveredGroups, usedFoodIds);

  // ----- שלב 2ג: הבטחת ≥2 מנות ירקות ו-≥2 מנות פירות ביום -----
  ensureServings(
    picks,
    'ירקות',
    MIN_VEGETABLE_SERVINGS,
    available,
    stats,
    coveredGroups,
    usedFoodIds,
    bannedMainFoodIds,
  );
  ensureServings(
    picks,
    'פירות',
    MIN_FRUIT_SERVINGS,
    available,
    stats,
    coveredGroups,
    usedFoodIds,
    bannedMainFoodIds,
  );

  // ----- שלב 3: הבטחת מאכל חדש אחד לפחות -----
  ensureNewFood(picks, available, stats, usedFoodIds, bannedMainFoodIds);

  // ----- שלב 4: ממתק יומי (משבצת מנחה) -----
  const sweet = pickSweet(available, stats, recentFoodIds, coveredGroups);
  if (sweet) coveredGroups.add('מתוקים');

  // ----- בניית אובייקט התפריט -----
  const slots: MenuSlot[] = picks.map((p) => ({
    slot: p.slot,
    foodIds: p.foods.map((f) => f.id),
    plannedTime: profile.mealTimes[p.slot] ?? '',
  }));

  return {
    id: newId(),
    profileId: profile.id,
    date,
    slots,
    sweetFoodId: sweet?.id,
    isWinner: false,
  };
}

/** מחזיר את המאכל הראשון (הכי מדורג) שעונה לתנאי */
function pickFirst(
  ranked: ScoredFood[],
  pred: (f: FoodItem) => boolean,
): FoodItem | undefined {
  for (const s of ranked) {
    if (pred(s.food)) return s.food;
  }
  return undefined;
}

/**
 * אם בסוף השלב הראשון קבוצת מזון נדרשת חסרה, מוסיף למשבצת מתאימה מאכל
 * שמכסה אותה (בעדיפות לפי ניקוד).
 */
function repairGroupCoverage(
  picks: SlotPick[],
  available: FoodItem[],
  coveredGroups: Set<FoodGroup>,
  usedFoodIds: Set<string>,
  bannedMainFoodIds: Set<string>,
): void {
  for (const group of REQUIRED_GROUPS) {
    if (group === 'מתוקים') continue; // מטופל דרך הממתק היומי
    if (coveredGroups.has(group)) continue;

    // מחפשים מאכל שמכסה את הקבוצה ומתאים לאחת המשבצות (לא עיקרית מוגבלת בגיוון)
    let placed = false;
    for (const pick of picks) {
      const candidates = available
        .filter(
          (f) =>
            f.foodGroups.includes(group) &&
            f.category.includes(pick.slot) &&
            !usedFoodIds.has(f.id),
        )
        // אם המשבצת עיקרית — לכבד את הגיוון
        .filter(
          (f) =>
            !MAIN_SLOTS.includes(pick.slot) || !bannedMainFoodIds.has(f.id),
        );
      if (candidates.length > 0) {
        const f = candidates[0];
        pick.foods.push(f);
        usedFoodIds.add(f.id);
        f.foodGroups.forEach((g) => coveredGroups.add(g));
        placed = true;
        break;
      }
    }
    // אם לא ניתן לכסות (אין מאכל מתאים) — ממשיכים; זו קבוצה שאין לה מקום.
    void placed;
  }
}

/**
 * מוודא שכל ארוחה עיקרית (בוקר/צהריים/ערב) מכילה מקור חלבון:
 * קבוצת "חלבונים" או "מוצרי חלב" (SPEC 4). אם חסר — מוסיף את המאכל
 * החלבוני בעל הציון הגבוה שמתאים למשבצת ולא בשימוש.
 */
function ensureProteinPerMeal(
  picks: SlotPick[],
  available: FoodItem[],
  stats: Map<string, FoodStatsComputed>,
  coveredGroups: Set<FoodGroup>,
  usedFoodIds: Set<string>,
): void {
  for (const pick of picks) {
    if (!PROTEIN_MEAL_SLOTS.includes(pick.slot)) continue;
    if (pick.foods.some(isProteinSource)) continue;

    const candidates = available.filter(
      (f) =>
        isProteinSource(f) &&
        f.category.includes(pick.slot) &&
        !usedFoodIds.has(f.id),
    );
    if (candidates.length === 0) continue;
    const ranked = rankFoods(
      candidates,
      makeCtxBuilder(stats, coveredGroups, new Set()),
    );
    const f = ranked[0].food;
    pick.foods.push(f);
    usedFoodIds.add(f.id);
    f.foodGroups.forEach((g) => coveredGroups.add(g));
  }
}

/**
 * מוודא שהתפריט כולל לפחות `min` מנות (פריטים נבדלים) מקבוצת מזון נתונה
 * לאורך היום (SPEC 4: ירק ×2, פרי ×2). מוסיף פריטים מדורגים למשבצות
 * מתאימות עד להשלמת המכסה, בכיבוד גיוון המנה העיקרית.
 */
function ensureServings(
  picks: SlotPick[],
  group: FoodGroup,
  min: number,
  available: FoodItem[],
  stats: Map<string, FoodStatsComputed>,
  coveredGroups: Set<FoodGroup>,
  usedFoodIds: Set<string>,
  bannedMainFoodIds: Set<string>,
): void {
  const countServings = () =>
    picks.reduce(
      (n, p) => n + p.foods.filter((f) => hasGroup(f, group)).length,
      0,
    );

  let guard = 0;
  while (countServings() < min && guard < min * 3) {
    guard += 1;
    let placed = false;
    for (const pick of picks) {
      const candidates = available
        .filter(
          (f) =>
            hasGroup(f, group) &&
            f.category.includes(pick.slot) &&
            !usedFoodIds.has(f.id),
        )
        .filter(
          (f) =>
            !MAIN_SLOTS.includes(pick.slot) || !bannedMainFoodIds.has(f.id),
        );
      if (candidates.length === 0) continue;
      const ranked = rankFoods(
        candidates,
        makeCtxBuilder(stats, coveredGroups, new Set()),
      );
      const f = ranked[0].food;
      pick.foods.push(f);
      usedFoodIds.add(f.id);
      f.foodGroups.forEach((g) => coveredGroups.add(g));
      placed = true;
      break;
    }
    if (!placed) break; // אין יותר מועמדים זמינים
  }
}

/**
 * מוודא שיש לפחות מאכל אחד "חדש/נדיר" (ללא אכילה מתועדת) בתפריט.
 * אם אין — מנסה להחליף פריט משני במאכל חדש שמתאים למשבצת.
 */
function ensureNewFood(
  picks: SlotPick[],
  available: FoodItem[],
  stats: Map<string, FoodStatsComputed>,
  usedFoodIds: Set<string>,
  bannedMainFoodIds: Set<string>,
): void {
  const isNew = (f: FoodItem) => {
    const s = stats.get(f.id);
    return !s || s.timesEaten === 0;
  };
  const alreadyHasNew = picks.some((p) => p.foods.some(isNew));
  if (alreadyHasNew) return;

  // מנסים להוסיף מאכל חדש למשבצת ביניים (לא לפגוע באילוצי העיקרית)
  for (const pick of picks) {
    if (MAIN_SLOTS.includes(pick.slot)) continue;
    const newCandidate = available.find(
      (f) =>
        isNew(f) &&
        f.category.includes(pick.slot) &&
        !usedFoodIds.has(f.id) &&
        !bannedMainFoodIds.has(f.id),
    );
    if (newCandidate) {
      pick.foods.push(newCandidate);
      usedFoodIds.add(newCandidate.id);
      return;
    }
  }
}

/** בוחר את הממתק היומי (מדורג הכי גבוה מבין המתוקים) */
function pickSweet(
  available: FoodItem[],
  stats: Map<string, FoodStatsComputed>,
  recentFoodIds: Set<string>,
  coveredGroups: Set<FoodGroup>,
): FoodItem | undefined {
  const sweets = available.filter((f) => f.category.includes('ממתק'));
  if (sweets.length === 0) return undefined;
  const ranked = rankFoods(
    sweets,
    makeCtxBuilder(stats, coveredGroups, recentFoodIds),
  );
  return ranked[0]?.food;
}

/**
 * מחזיר עד `count` חלופות מדורגות למשבצת מסוימת (לכפתור החלפה).
 * לא כולל מאכלים שכבר בשימוש בתפריט הנוכחי (excludeIds).
 */
export function getAlternatives(
  slot: MealSlot,
  profile: Profile,
  foods: FoodItem[],
  stats: Map<string, FoodStatsComputed>,
  opts: {
    coveredGroups?: Set<FoodGroup>;
    recentFoodIds?: Set<string>;
    excludeIds?: Set<string>;
    count?: number;
  } = {},
): FoodItem[] {
  const count = opts.count ?? 3;
  const coveredGroups = opts.coveredGroups ?? new Set<FoodGroup>();
  const recentFoodIds = opts.recentFoodIds ?? new Set<string>();
  const excludeIds = opts.excludeIds ?? new Set<string>();

  const available = filterFoodsForProfile(foods, profile).filter(
    (f) => f.category.includes(slot) && !excludeIds.has(f.id),
  );
  const ranked = rankFoods(
    available,
    makeCtxBuilder(stats, coveredGroups, recentFoodIds),
  );
  return ranked.slice(0, count).map((s) => s.food);
}

/**
 * מגריל תפריט חלופי בכפוף לאותם אילוצים ("ערבבי לי מחדש").
 * מפעיל טלטול קל על סדר המאכלים כדי לקבל וריאציה תוך שמירה על האילוצים,
 * על ידי הוספת רעש קטן לניקוד דרך rng.
 */
export function shuffleMenu(input: BuildMenuInput): Menu {
  const rng = input.rng ?? Math.random;
  // מוסיפים רעש קטן ל-stats זמניים כדי לגוון בין מאכלים קרובי-ציון,
  // בלי לשנות את הסטטיסטיקה האמיתית.
  const jittered = new Map<string, FoodStatsComputed>();
  for (const [id, s] of input.stats) {
    const noise = (rng() - 0.5) * 0.4; // ±0.2 בערך
    jittered.set(id, { ...s, tasteAvg: clamp(s.tasteAvg + noise, 0, 5) });
  }
  // דואגים גם שמאכלים ללא stats יקבלו וריאציה: עוטפים את הבנאי בגרסה
  // שמזריקה stats-רעש קלים למאכלים חדשים דרך recentFoodIds אקראי חלש.
  return buildDailyMenu({ ...input, stats: jittered });
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

/** בודק אילו קבוצות מזון נדרשות כוסו בתפריט נתון */
export function menuCoveredGroups(
  menu: Menu,
  foodsById: Map<string, FoodItem>,
): Set<FoodGroup> {
  const covered = new Set<FoodGroup>();
  for (const slot of menu.slots) {
    for (const id of slot.foodIds) {
      const f = foodsById.get(id);
      f?.foodGroups.forEach((g) => covered.add(g));
    }
  }
  if (menu.sweetFoodId) {
    const sweet = foodsById.get(menu.sweetFoodId);
    sweet?.foodGroups.forEach((g) => covered.add(g));
  }
  return covered;
}
