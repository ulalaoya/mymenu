// ===== עזרי תצוגה משותפים למסכי התפריט =====
// מטא-דאטה לתצוגה בלבד (אייקונים, צבעים, טקסטים) — ללא לוגיקת מנוע.

import type { ComponentType } from 'react';
import type { FoodGroup, MealSlot } from '../types';
import {
  Breakfast,
  Lunch,
  Dinner,
  Snack,
  Sweets,
  type IconProps,
} from '../components/icons';

/** סדר המשבצות במהלך היום (כולל ממתק בסוף) */
export const DAY_SLOTS: MealSlot[] = [
  'בוקר',
  'עשר',
  'צהריים',
  'מנחה',
  'ערב',
];

/** שם ידידותי למשבצת ארוחה */
export const SLOT_LABELS: Record<MealSlot, string> = {
  בוקר: 'ארוחת בוקר',
  עשר: 'הפסקת עשר',
  צהריים: 'ארוחת צהריים',
  מנחה: 'ארוחת מנחה',
  ערב: 'ארוחת ערב',
  ממתק: 'הממתק היומי',
};

/** אייקון מתאים לכל משבצת */
export const SLOT_ICONS: Record<MealSlot, ComponentType<IconProps>> = {
  בוקר: Breakfast,
  עשר: Snack,
  צהריים: Lunch,
  מנחה: Snack,
  ערב: Dinner,
  ממתק: Sweets,
};

/** צבע ידידותי לכל קבוצת מזון (לתגיות ולצ'קליסט) */
export const FOOD_GROUP_COLORS: Record<FoodGroup, string> = {
  פחמימות: '#F5B041', // צהוב-שמש
  חלבונים: '#F0806C', // אלמוגי
  'מוצרי חלב': '#5B9BD5', // כחול
  קטניות: '#A78BFA', // סגול רך
  ירקות: '#7DCEA0', // ירוק
  פירות: '#F06292', // ורוד
  'שומנים בריאים': '#4DB6AC', // טורקיז
  מתוקים: '#E57373', // אדום רך
};

/** כל קבוצות המזון בסדר קבוע לצ'קליסט (SPEC 6.2) */
export const ALL_FOOD_GROUPS: FoodGroup[] = [
  'פחמימות',
  'חלבונים',
  'מוצרי חלב',
  'קטניות',
  'ירקות',
  'פירות',
  'שומנים בריאים',
  'מתוקים',
];

/** ברכה אישית לפי שעת היום */
export function greetingForHour(hour: number): string {
  if (hour >= 5 && hour < 12) return 'בוקר טוב';
  if (hour >= 12 && hour < 17) return 'צהריים טובים';
  if (hour >= 17 && hour < 21) return 'ערב טוב';
  return 'לילה טוב';
}

/** אימוג'י שמש/ירח לברכה לפי שעה */
export function greetingEmoji(hour: number): string {
  if (hour >= 5 && hour < 17) return '☀️';
  if (hour >= 17 && hour < 21) return '🌇';
  return '🌙';
}

/** פרצופי שובע (סקאלת 1–5) — מ"עדיין רעבה" ל"שבעה ומרוצה" */
export const SATIETY_FACES: { value: 1 | 2 | 3 | 4 | 5; emoji: string; label: string }[] = [
  { value: 1, emoji: '😟', label: 'עדיין רעבה' },
  { value: 2, emoji: '🙁', label: 'קצת רעבה' },
  { value: 3, emoji: '😐', label: 'בסדר' },
  { value: 4, emoji: '🙂', label: 'שבעה' },
  { value: 5, emoji: '😄', label: 'שבעה ומרוצה' },
];

/** מצבי רוח אופציונליים לרישום */
export const MOODS: { emoji: string; label: string }[] = [
  { emoji: '😄', label: 'שמחה' },
  { emoji: '😊', label: 'מרוצה' },
  { emoji: '😐', label: 'רגילה' },
  { emoji: '😴', label: 'עייפה' },
];

/** משפטי עידוד רנדומליים אחרי רישום (SPEC 6.4) */
export const ENCOURAGEMENTS: string[] = [
  'כל הכבוד! 🎉',
  'איזה יופי! 🌟',
  'מעולה, ככה ממשיכים! 💪',
  'איזה יופי של גיוון! 🥦',
  'הצלחת! את אלופה 🏆',
  'ואו, כמה כיף! ✨',
];

/** בוחר משפט עידוד רנדומלי */
export function randomEncouragement(): string {
  return ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)];
}
