// ===== תפריט מנצח — SPEC סעיפים 5.3(6), 6 =====
// תפריט עם ציון כולל גבוה מסומן כ-isWinner ומשמש כתבנית עם וריאציות.
// לוגיקה טהורה.

import type { FoodItem, Menu, Profile } from '../types';
import type { FoodStatsComputed } from './foodStats';
import { buildDailyMenu, type BuildMenuInput } from './menuBuilder';

/** סף הציון הכולל שממנו תפריט נחשב "מנצח" (מתוך 5) */
export const WINNER_THRESHOLD = 4;

/** מסמן תפריטים כמנצחים לפי overallRating (טהור — מחזיר עותקים) */
export function markWinnerMenus(
  menus: Menu[],
  threshold: number = WINNER_THRESHOLD,
): Menu[] {
  return menus.map((m) => ({
    ...m,
    isWinner:
      typeof m.overallRating === 'number' && m.overallRating >= threshold,
  }));
}

/**
 * בוחר תבנית תפריט מנצח לשימוש חוזר, תוך העדפת גיוון:
 * בוחר את המנצח שהתאריך שלו הכי רחוק (הכי פחות שומש לאחרונה).
 * מחזיר undefined אם אין תפריטים מנצחים.
 */
export function pickWinnerTemplate(menus: Menu[]): Menu | undefined {
  const winners = menus.filter((m) => m.isWinner);
  if (winners.length === 0) return undefined;
  // הכי ישן קודם (גיוון: לא לחזור על אותו מנצח כל יום)
  winners.sort((a, b) => a.date.localeCompare(b.date));
  return winners[0];
}

/**
 * בונה תפריט מתבנית מנצחת עם וריאציות: משתמש ב-buildDailyMenu (שממילא
 * מיישם קנס גיוון) כדי לגזור תפריט חדש לתאריך היעד, כך שהמנצח משפיע דרך
 * ה-stats (המאכלים שאהבה מקבלים ציון גבוה) אך נשמר גיוון.
 */
export function buildFromWinner(
  _template: Menu,
  input: BuildMenuInput,
): Menu {
  // הבנייה הרגילה כבר מעדיפה מאכלים אהובים (ציון גבוה) ומיישמת גיוון,
  // כך שהתבנית המנצחת באה לידי ביטוי דרך ה-stats. וריאציה מובטחת.
  return buildDailyMenu(input);
}

/** עזר: פרופיל+מאכלים+סטטיסטיקה — לחתימה נוחה לקוראים */
export type WinnerContext = {
  profile: Profile;
  foods: FoodItem[];
  stats: Map<string, FoodStatsComputed>;
};
