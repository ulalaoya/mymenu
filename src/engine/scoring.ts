// ===== אלגוריתם הניקוד — SPEC סעיף 5.2 =====
// לוגיקה טהורה לחלוטין: scoreFood(food, ctx) מחזיר ציון מספרי.
// שובע הוא המלך (משקל 3.0). כל רכיב מיוצא בנפרד כדי שהטסטים יוכלו לבודד אותו.

import type { FoodGroup, FoodItem } from '../types';
import type { FoodStatsComputed } from './foodStats';

/** משקלי הניקוד — בדיוק לפי הנוסחה ב-SPEC 5.2 */
export const WEIGHTS = {
  satiety: 3.0,
  taste: 2.0,
  ateRate: 1.5,
  nutritionFit: 1.0,
  recency: 2.5,
  disliked: 4.0,
} as const;

/** ערך ניטרלי לדירוג חסר (מאכל חדש) — לא מעניש ולא מתגמל */
export const NEUTRAL_RATING = 3;
/** סף "לא אהבתי": דירוג טעם או שובע ≤ 2 */
export const DISLIKE_THRESHOLD = 2;
/** boost קטן למאכל חדש/נדיר כדי להבטיח גיוון (SPEC 5.2) */
export const NEW_FOOD_BOOST = 0.5;

/** הקשר לחישוב ציון מאכל בודד למשבצת מסוימת */
export interface ScoreContext {
  /** סטטיסטיקת המאכל (undefined = מאכל חדש שלא הוצע/נאכל מעולם) */
  stats?: FoodStatsComputed;
  /** קבוצות מזון שכבר כוסו היום עד כה (לחישוב nutritionFit) */
  coveredGroups: Set<FoodGroup>;
  /**
   * מזהי מאכלים שהוצעו/נאכלו ב-3 הימים האחרונים (לקנס גיוון).
   */
  recentFoodIds: Set<string>;
}

/** ממוצע שובע לניקוד: ניטרלי אם אין דירוג */
export function effectiveSatiety(stats?: FoodStatsComputed): number {
  if (!stats || stats.satietyAvg <= 0) return NEUTRAL_RATING;
  return stats.satietyAvg;
}

/** ממוצע טעם לניקוד: ניטרלי אם אין דירוג */
export function effectiveTaste(stats?: FoodStatsComputed): number {
  if (!stats || stats.tasteAvg <= 0) return NEUTRAL_RATING;
  return stats.tasteAvg;
}

/** actuallyAteRate: 0 אם אין נתונים (מאכל חדש) */
export function effectiveAteRate(stats?: FoodStatsComputed): number {
  if (!stats) return 0;
  return stats.actuallyAteRate;
}

/**
 * nutritionFit: כמה המאכל משלים קבוצות מזון שעדיין חסרות היום.
 * מוחזר יחס ב-[0,1]: (קבוצות חדשות שהמאכל מוסיף) / (מספר קבוצות המאכל).
 * מאכל שכל קבוצותיו כבר כוסו → 0. מאכל שכולן חדשות → 1.
 */
export function nutritionFit(
  food: FoodItem,
  coveredGroups: Set<FoodGroup>,
): number {
  const groups = food.foodGroups;
  if (groups.length === 0) return 0;
  let newGroups = 0;
  for (const g of groups) {
    if (!coveredGroups.has(g)) newGroups += 1;
  }
  return newGroups / groups.length;
}

/** recencyPenalty: 1 אם הוצע/נאכל ב-3 הימים האחרונים, אחרת 0 */
export function recencyPenalty(
  food: FoodItem,
  recentFoodIds: Set<string>,
): number {
  return recentFoodIds.has(food.id) ? 1 : 0;
}

/** dislikedFlag: 1 אם tasteAvg≤2 או satietyAvg≤2 (רק אם יש דירוג בפועל) */
export function dislikedFlag(stats?: FoodStatsComputed): number {
  if (!stats) return 0;
  const taste = stats.tasteAvg;
  const satiety = stats.satietyAvg;
  const dislikedTaste = taste > 0 && taste <= DISLIKE_THRESHOLD;
  const dislikedSatiety = satiety > 0 && satiety <= DISLIKE_THRESHOLD;
  return dislikedTaste || dislikedSatiety ? 1 : 0;
}

/** האם המאכל חדש (אין לו סטטיסטיקה כלל) — לצורך boost הגיוון */
export function isNewFood(stats?: FoodStatsComputed): boolean {
  return !stats || stats.timesEaten === 0;
}

/** פירוק הציון לרכיבים (לשקיפות ולטסטים) */
export interface ScoreBreakdown {
  satiety: number;
  taste: number;
  ateRate: number;
  nutritionFit: number;
  recencyPenalty: number;
  dislikedFlag: number;
  newFoodBoost: number;
  total: number;
}

/** מחשב את פירוק הציון המלא של מאכל בהקשר נתון */
export function scoreBreakdown(
  food: FoodItem,
  ctx: ScoreContext,
): ScoreBreakdown {
  const satiety = WEIGHTS.satiety * effectiveSatiety(ctx.stats);
  const taste = WEIGHTS.taste * effectiveTaste(ctx.stats);
  const ateRate = WEIGHTS.ateRate * effectiveAteRate(ctx.stats);
  const fit = WEIGHTS.nutritionFit * nutritionFit(food, ctx.coveredGroups);
  const recency =
    WEIGHTS.recency * recencyPenalty(food, ctx.recentFoodIds);
  const disliked = WEIGHTS.disliked * dislikedFlag(ctx.stats);
  const newBoost = isNewFood(ctx.stats) ? NEW_FOOD_BOOST : 0;

  const total = satiety + taste + ateRate + fit - recency - disliked + newBoost;

  return {
    satiety,
    taste,
    ateRate,
    nutritionFit: fit,
    recencyPenalty: recency,
    dislikedFlag: disliked,
    newFoodBoost: newBoost,
    total,
  };
}

/** מחשב את הציון הסופי של מאכל (SPEC 5.2) */
export function scoreFood(food: FoodItem, ctx: ScoreContext): number {
  return scoreBreakdown(food, ctx).total;
}

/** מאכל עם הציון שלו — לצורך מיון ובחירה */
export interface ScoredFood {
  food: FoodItem;
  score: number;
  breakdown: ScoreBreakdown;
}

/**
 * מדרג רשימת מאכלים לפי ציון (גבוה→נמוך).
 * שובר שוויון: מאכל חדש עדיף, ואז לפי שם (יציבות).
 */
export function rankFoods(
  foods: FoodItem[],
  buildCtx: (food: FoodItem) => ScoreContext,
): ScoredFood[] {
  const scored = foods.map((food) => {
    const ctx = buildCtx(food);
    const breakdown = scoreBreakdown(food, ctx);
    return { food, score: breakdown.total, breakdown };
  });
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.food.name.localeCompare(b.food.name, 'he');
  });
  return scored;
}
