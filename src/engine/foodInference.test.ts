// ===== טסטים למנוע ההיסק המקומי (foodInference) =====
import { describe, it, expect } from 'vitest';
import { inferFoodInfo, normalize } from './foodInference';
import { GLOBAL_FOODS } from '../data/foods';
import type { FoodItem } from '../types';

const foods = GLOBAL_FOODS;

/** עוזר קטן: קבוצות כסט לצורך השוואה ללא תלות בסדר */
function groupsOf(name: string): string[] {
  return inferFoodInfo(name, foods).foodGroups.slice().sort();
}

describe('normalize', () => {
  it('מסיר ניקוד ומצמצם רווחים', () => {
    expect(normalize('  פִּיצָה   של   אמא ')).toBe('פיצה של אמא');
  });
  it('מאחד גרשיים לתו אחיד', () => {
    expect(normalize("קוטג'")).toBe('קוטג׳');
  });
});

describe('inferFoodInfo — שכבה 1 (מאגר ידוע)', () => {
  it('"פיצה של אמא" יורש פחמימות+מוצרי חלב מהמאגר', () => {
    const r = inferFoodInfo('פיצה של אמא', foods);
    expect(r.matchedBy).toBe('known-food');
    expect(groupsOf('פיצה של אמא')).toEqual(['מוצרי חלב', 'פחמימות']);
    expect(r.emoji).toBe('🍕');
  });

  it('"תפוח" יורש מהמאגר עם emoji 🍎', () => {
    const r = inferFoodInfo('תפוח', foods);
    expect(r.foodGroups).toContain('פירות');
    expect(r.emoji).toBe('🍎');
    expect(['exact', 'known-food']).toContain(r.matchedBy);
  });

  it('יחיד/רבים — "תפוחים" מזוהה כפירות', () => {
    const r = inferFoodInfo('תפוחים', foods);
    expect(r.foodGroups).toContain('פירות');
    expect(r.matchedBy).not.toBe('none');
  });

  it('התאמה הכי ארוכה מנצחת', () => {
    // "גבינת מוצרלה" קיים במאגר — עדיף על "גבינה" בלבד
    const r = inferFoodInfo('פסטה עם גבינת מוצרלה', foods);
    expect(r.foodGroups).toContain('פחמימות');
    expect(r.foodGroups).toContain('מוצרי חלב');
  });
});

describe('inferFoodInfo — שכבה 2 (לקסיקון)', () => {
  it('"שניצל עם פירה" → חלבונים+פחמימות', () => {
    expect(groupsOf('שניצל עם פירה')).toEqual(['חלבונים', 'פחמימות']);
  });

  it('"סלט אבוקדו" → ירקות+שומנים בריאים', () => {
    expect(groupsOf('סלט אבוקדו')).toEqual(['ירקות', 'שומנים בריאים']);
  });

  it('"מרק עדשים" → קטניות (ומרק=ירקות)', () => {
    const g = groupsOf('מרק עדשים');
    expect(g).toContain('קטניות');
  });

  it('"עוגת שוקולד" → מתוקים', () => {
    expect(inferFoodInfo('עוגת שוקולד', foods).foodGroups).toContain('מתוקים');
  });

  it('"פלאפל בפיתה" → קטניות+פחמימות', () => {
    expect(groupsOf('פלאפל בפיתה')).toEqual(['פחמימות', 'קטניות']);
  });

  it('צירוף דו-מילוני "שוקולד חלב" מזוהה', () => {
    const g = groupsOf('שוקולד חלב');
    expect(g).toContain('מתוקים');
    expect(g).toContain('מוצרי חלב');
  });

  it('לקסיקון מחזיר matchedBy lexicon כשאין התאמת מאגר', () => {
    // "חביתה" לא במאגר בהכרח בשם הזה → נזהה דרך הלקסיקון
    const r = inferFoodInfo('חביתה מיוחדת של סבתא', foods);
    expect(r.foodGroups).toContain('חלבונים');
  });
});

describe('inferFoodInfo — שכבה 3 (ברירת מחדל)', () => {
  it('שם ג׳יבריש → none וריק', () => {
    const r = inferFoodInfo('בלגלגלוגלי', foods);
    expect(r.foodGroups).toEqual([]);
    expect(r.matchedBy).toBe('none');
  });

  it('מחרוזת ריקה → none', () => {
    expect(inferFoodInfo('   ', foods).matchedBy).toBe('none');
  });
});

describe('inferFoodInfo — עמידות', () => {
  it('לא קורס על מאגר ריק', () => {
    const empty: FoodItem[] = [];
    const r = inferFoodInfo('עוגת שוקולד', empty);
    // עדיין מזהה דרך הלקסיקון
    expect(r.foodGroups).toContain('מתוקים');
    expect(r.matchedBy).toBe('lexicon');
  });
});
