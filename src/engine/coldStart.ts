// ===== שאלון היכרות (cold-start) — SPEC סעיף 5.2 =====
// למשתמשת חדשה מציגים קלפי מאכלים מייצגים לסימון לב/איקס, ומזה בונים
// foodStats התחלתיים: אהוב → tasteAvg גבוה; לא-אהוב → tasteAvg נמוך
// (כדי שיקבל dislikedFlag ולמעשה לא יוצע).

import type { FoodGroup, FoodItem, FoodStats } from '../types';
import { db } from '../db/database';
import { getGlobalFoods } from '../db/foodRepo';
import { foodStatsId } from './foodStats';

/** ערך tasteAvg למאכל שסומן "אהבתי" בשאלון */
export const COLD_START_LIKED_TASTE = 5;
/** ערך שובע התחלתי למאכל אהוב (חיובי אך לא ניטרלי-שלילי) */
export const COLD_START_LIKED_SATIETY = 4;
/** ערך tasteAvg למאכל שסומן "לא אהבתי" — מתחת לסף כדי לקבל dislikedFlag */
export const COLD_START_DISLIKED_TASTE = 1;

/** כמה קלפים להציג לכל קבוצת מזון בשאלון */
const CARDS_PER_GROUP = 3;
/** קבוצות המזון המיוצגות בשאלון (מגוון רחב) */
const QUESTIONNAIRE_GROUPS: FoodGroup[] = [
  'פחמימות',
  'חלבונים',
  'מוצרי חלב',
  'ירקות',
  'פירות',
  'קטניות',
  'שומנים בריאים',
  'מתוקים',
];

/**
 * בוחר סט קלפי מאכלים מייצג לשאלון ההיכרות — מגוון קבוצות.
 * טהור: מקבל את רשימת המאכלים ומחזיר תת-קבוצה. (wrapper ל-DB בהמשך.)
 */
export function selectColdStartFoods(foods: FoodItem[]): FoodItem[] {
  const chosen: FoodItem[] = [];
  const usedIds = new Set<string>();
  for (const group of QUESTIONNAIRE_GROUPS) {
    const candidates = foods.filter(
      (f) => f.foodGroups.includes(group) && !usedIds.has(f.id),
    );
    for (let i = 0; i < CARDS_PER_GROUP && i < candidates.length; i++) {
      chosen.push(candidates[i]);
      usedIds.add(candidates[i].id);
    }
  }
  return chosen;
}

/** Wrapper ל-Dexie: מחזיר את קלפי השאלון מהמאגר הגלובלי */
export async function getColdStartFoods(): Promise<FoodItem[]> {
  const foods = await getGlobalFoods();
  return selectColdStartFoods(foods);
}

/**
 * בונה foodStats התחלתיים מתוך תשובות השאלון (טהור).
 * liked → טעם/שובע גבוהים; disliked → טעם נמוך (dislikedFlag).
 * timesOffered/timesEaten=0 כי אלה אותות מהשאלון, לא אכילה בפועל.
 */
export function buildColdStartStats(
  profileId: string,
  liked: string[],
  disliked: string[],
): FoodStats[] {
  const rows: FoodStats[] = [];
  for (const foodId of liked) {
    rows.push({
      id: foodStatsId(profileId, foodId),
      profileId,
      foodId,
      tasteAvg: COLD_START_LIKED_TASTE,
      satietyAvg: COLD_START_LIKED_SATIETY,
      timesOffered: 0,
      timesEaten: 0,
    });
  }
  for (const foodId of disliked) {
    rows.push({
      id: foodStatsId(profileId, foodId),
      profileId,
      foodId,
      tasteAvg: COLD_START_DISLIKED_TASTE,
      satietyAvg: COLD_START_DISLIKED_TASTE,
      timesOffered: 0,
      timesEaten: 0,
    });
  }
  return rows;
}

/**
 * Wrapper ל-Dexie: שומר את ה-foodStats ההתחלתיים מהשאלון.
 */
export async function applyColdStartPreferences(
  profileId: string,
  liked: string[],
  disliked: string[],
): Promise<void> {
  const rows = buildColdStartStats(profileId, liked, disliked);
  if (rows.length > 0) await db.foodStats.bulkPut(rows);
}
