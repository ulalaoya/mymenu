import { describe, it, expect } from 'vitest';
import {
  isFoodIcon,
  FOOD_ICON_TOKENS,
  FOOD_ICONS,
  FOOD_ICON_PREFIX,
} from './FoodSymbol';

describe('FoodSymbol — זיהוי סמל', () => {
  it('מזהה טוקן אייקון תקין', () => {
    expect(isFoodIcon('icon:apple')).toBe(true);
    expect(isFoodIcon('icon:watermelon')).toBe(true);
  });

  it("אימוג'י רגיל אינו אייקון", () => {
    expect(isFoodIcon('🍎')).toBe(false);
    expect(isFoodIcon('')).toBe(false);
  });

  it('טוקן ללא אייקון מתאים אינו נחשב אייקון', () => {
    expect(isFoodIcon('icon:banana-split')).toBe(false);
  });

  it('רשימת הטוקנים תואמת למפתח האייקונים', () => {
    expect(FOOD_ICON_TOKENS).toHaveLength(Object.keys(FOOD_ICONS).length);
    expect(FOOD_ICON_TOKENS.every((t) => t.startsWith(FOOD_ICON_PREFIX))).toBe(
      true,
    );
    expect(FOOD_ICON_TOKENS).toContain('icon:sip');
  });
});
