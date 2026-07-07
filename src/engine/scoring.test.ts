import { describe, it, expect } from 'vitest';
import {
  scoreFood,
  scoreBreakdown,
  nutritionFit,
  recencyPenalty,
  dislikedFlag,
  rankFoods,
  WEIGHTS,
  NEUTRAL_RATING,
  type ScoreContext,
} from './scoring';
import { makeFood, makeStats } from './testHelpers';
import type { FoodGroup } from '../types';

function ctx(over: Partial<ScoreContext> = {}): ScoreContext {
  return {
    stats: over.stats,
    coveredGroups: over.coveredGroups ?? new Set<FoodGroup>(),
    recentFoodIds: over.recentFoodIds ?? new Set<string>(),
  };
}

describe('שובע הוא המלך (משקל 3.0)', () => {
  it('שני מאכלים זהים למעט שובע — הגבוה מנצח והמרחק תואם ×3.0', () => {
    const food = makeFood({ id: 'x' });
    const highSatiety = ctx({
      stats: makeStats('x', { satietyAvg: 5, tasteAvg: 3 }),
    });
    const lowSatiety = ctx({
      stats: makeStats('x', { satietyAvg: 2.9, tasteAvg: 3 }),
    });
    // הערה: 2.9 כדי לא להפעיל dislikedFlag (סף ≤2)
    const scoreHigh = scoreFood(food, highSatiety);
    const scoreLow = scoreFood(food, lowSatiety);

    expect(scoreHigh).toBeGreaterThan(scoreLow);
    // הפרש השובע (5-2.9)=2.1 מוכפל ב-3.0
    expect(scoreHigh - scoreLow).toBeCloseTo(2.1 * WEIGHTS.satiety, 5);
  });

  it('שובע גבוה גובר על טעם גבוה כשההפרשים שווים (3.0 > 2.0)', () => {
    const food = makeFood({ id: 'x' });
    // מאכל א: שובע גבוה, טעם ניטרלי
    const a = scoreFood(
      food,
      ctx({ stats: makeStats('x', { satietyAvg: 5, tasteAvg: 3 }) }),
    );
    // מאכל ב: טעם גבוה, שובע ניטרלי (אותו הפרש מהניטרלי)
    const b = scoreFood(
      food,
      ctx({ stats: makeStats('x', { satietyAvg: 3, tasteAvg: 5 }) }),
    );
    expect(a).toBeGreaterThan(b);
  });
});

describe('מאכל חדש מקבל ערך ניטרלי (לא נענש)', () => {
  it('ללא stats — שובע וטעם ניטרליים + boost חדש', () => {
    const food = makeFood({ id: 'new', foodGroups: ['פחמימות'] });
    const b = scoreBreakdown(food, ctx());
    expect(b.satiety).toBeCloseTo(WEIGHTS.satiety * NEUTRAL_RATING);
    expect(b.taste).toBeCloseTo(WEIGHTS.taste * NEUTRAL_RATING);
    expect(b.newFoodBoost).toBeGreaterThan(0);
  });
});

describe('dislikedFlag — דירוג ≤2', () => {
  it('שובע נמוך ≤2 מדליק flag', () => {
    expect(dislikedFlag(makeStats('x', { satietyAvg: 2, tasteAvg: 4 }))).toBe(1);
  });
  it('טעם נמוך ≤2 מדליק flag', () => {
    expect(dislikedFlag(makeStats('x', { tasteAvg: 1, satietyAvg: 4 }))).toBe(1);
  });
  it('דירוגים תקינים לא מדליקים', () => {
    expect(dislikedFlag(makeStats('x', { tasteAvg: 3, satietyAvg: 3 }))).toBe(0);
  });
  it('מאכל שקיבל שובע נמוך מקבל ציון נמוך מאוד (כמעט לא יוצע)', () => {
    const food = makeFood({ id: 'x' });
    const liked = scoreFood(
      food,
      ctx({ stats: makeStats('x', { satietyAvg: 5, tasteAvg: 5 }) }),
    );
    const disliked = scoreFood(
      food,
      ctx({ stats: makeStats('x', { satietyAvg: 1, tasteAvg: 1 }) }),
    );
    expect(disliked).toBeLessThan(liked);
    // הפרש הקנס בלבד לפחות 4.0
    expect(liked - disliked).toBeGreaterThan(WEIGHTS.disliked);
  });
});

describe('nutritionFit', () => {
  it('מאכל שמכסה קבוצה חסרה מקבל fit גבוה', () => {
    const food = makeFood({ foodGroups: ['ירקות'] });
    expect(nutritionFit(food, new Set())).toBe(1);
    expect(nutritionFit(food, new Set(['ירקות']))).toBe(0);
  });
  it('חצי מהקבוצות חדשות → 0.5', () => {
    const food = makeFood({ foodGroups: ['פחמימות', 'ירקות'] });
    expect(nutritionFit(food, new Set(['פחמימות']))).toBe(0.5);
  });
});

describe('recencyPenalty (קנס גיוון)', () => {
  it('מאכל שהוצע ב-3 ימים אחרונים מקבל קנס 1', () => {
    const food = makeFood({ id: 'r' });
    expect(recencyPenalty(food, new Set(['r']))).toBe(1);
    expect(recencyPenalty(food, new Set(['other']))).toBe(0);
  });
  it('בפועל: מאכל שנאכל אתמול מקבל ציון נמוך מזהה שלא', () => {
    const food = makeFood({ id: 'r' });
    const recent = scoreFood(
      food,
      ctx({ recentFoodIds: new Set(['r']), stats: makeStats('r') }),
    );
    const fresh = scoreFood(
      food,
      ctx({ recentFoodIds: new Set(), stats: makeStats('r') }),
    );
    expect(recent).toBeLessThan(fresh);
    expect(fresh - recent).toBeCloseTo(WEIGHTS.recency);
  });
});

describe('rankFoods', () => {
  it('ממיין לפי ציון יורד', () => {
    const foods = [
      makeFood({ id: 'lo', name: 'א' }),
      makeFood({ id: 'hi', name: 'ב' }),
    ];
    const ranked = rankFoods(foods, (f) => ({
      stats:
        f.id === 'hi'
          ? makeStats('hi', { satietyAvg: 5 })
          : makeStats('lo', { satietyAvg: 3 }),
      coveredGroups: new Set(),
      recentFoodIds: new Set(),
    }));
    expect(ranked[0].food.id).toBe('hi');
  });
});
