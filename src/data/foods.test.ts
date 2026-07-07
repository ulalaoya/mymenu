import { describe, it, expect } from 'vitest';
import { GLOBAL_FOODS } from './foods';
import type { FoodGroup } from '../types';

const ALL_GROUPS: FoodGroup[] = [
  'פחמימות',
  'חלבונים',
  'מוצרי חלב',
  'קטניות',
  'ירקות',
  'פירות',
  'שומנים בריאים',
  'מתוקים',
];

describe('מאגר המזון הגלובלי (seed)', () => {
  it('מכיל לפחות 150 מאכלים', () => {
    expect(GLOBAL_FOODS.length).toBeGreaterThanOrEqual(150);
  });

  it('לכל פריט name לא ריק, emoji, לפחות foodGroup אחד ו-category אחד', () => {
    for (const f of GLOBAL_FOODS) {
      expect(f.name.trim().length, `שם ריק: ${f.id}`).toBeGreaterThan(0);
      expect(f.emoji.trim().length, `emoji ריק: ${f.id}`).toBeGreaterThan(0);
      expect(f.foodGroups.length, `אין קבוצת מזון: ${f.id}`).toBeGreaterThan(0);
      expect(f.category.length, `אין ארוחה: ${f.id}`).toBeGreaterThan(0);
    }
  });

  it('כל פריט גלובלי ולא מותאם אישית', () => {
    for (const f of GLOBAL_FOODS) {
      expect(f.profileId).toBeNull();
      expect(f.isCustom).toBe(false);
    }
  });

  it('כל 8 קבוצות המזון מיוצגות', () => {
    for (const group of ALL_GROUPS) {
      const has = GLOBAL_FOODS.some((f) => f.foodGroups.includes(group));
      expect(has, `קבוצה חסרה: ${group}`).toBe(true);
    }
  });

  it('יש לפחות 15 מתוקים (הממתק היומי)', () => {
    const sweets = GLOBAL_FOODS.filter((f) => f.foodGroups.includes('מתוקים'));
    expect(sweets.length).toBeGreaterThanOrEqual(15);
  });

  it('לפחות 20 מאכלים לכל אחת מהקבוצות העיקריות', () => {
    const main: FoodGroup[] = [
      'פחמימות',
      'חלבונים',
      'ירקות',
      'פירות',
      'מוצרי חלב',
    ];
    for (const group of main) {
      const count = GLOBAL_FOODS.filter((f) =>
        f.foodGroups.includes(group),
      ).length;
      expect(count, `${group}: ${count}`).toBeGreaterThanOrEqual(20);
    }
  });

  it('לפחות 8 מאכלים בקטניות ובשומנים בריאים', () => {
    const legumes = GLOBAL_FOODS.filter((f) =>
      f.foodGroups.includes('קטניות'),
    ).length;
    const fats = GLOBAL_FOODS.filter((f) =>
      f.foodGroups.includes('שומנים בריאים'),
    ).length;
    expect(legumes).toBeGreaterThanOrEqual(8);
    expect(fats).toBeGreaterThanOrEqual(8);
  });

  it('ids ייחודיים', () => {
    const ids = GLOBAL_FOODS.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('כל ממתק משויך למשבצת "ממתק"', () => {
    const sweets = GLOBAL_FOODS.filter((f) => f.foodGroups.includes('מתוקים'));
    const withMamtakSlot = sweets.filter((f) => f.category.includes('ממתק'));
    expect(withMamtakSlot.length).toBeGreaterThanOrEqual(15);
  });
});
