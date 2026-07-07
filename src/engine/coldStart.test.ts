import { describe, it, expect } from 'vitest';
import {
  selectColdStartFoods,
  buildColdStartStats,
  COLD_START_DISLIKED_TASTE,
  COLD_START_LIKED_TASTE,
} from './coldStart';
import { dislikedFlag } from './scoring';
import { makeFood } from './testHelpers';
import type { FoodStatsComputed } from './foodStats';

describe('selectColdStartFoods', () => {
  it('בוחר מגוון קבוצות מזון', () => {
    const foods = [
      makeFood({ id: 'c1', foodGroups: ['פחמימות'] }),
      makeFood({ id: 'p1', foodGroups: ['חלבונים'] }),
      makeFood({ id: 'd1', foodGroups: ['מוצרי חלב'] }),
      makeFood({ id: 'v1', foodGroups: ['ירקות'] }),
      makeFood({ id: 'fr1', foodGroups: ['פירות'] }),
      makeFood({ id: 's1', foodGroups: ['מתוקים'] }),
    ];
    const chosen = selectColdStartFoods(foods);
    const groups = new Set(chosen.flatMap((f) => f.foodGroups));
    expect(groups.size).toBeGreaterThanOrEqual(5);
  });
});

describe('buildColdStartStats', () => {
  it('disliked מקבל טעם נמוך → dislikedFlag פעיל → לא ייבחר', () => {
    const rows = buildColdStartStats('p', ['likeId'], ['hateId']);
    const hate = rows.find((r) => r.foodId === 'hateId')!;
    expect(hate.tasteAvg).toBe(COLD_START_DISLIKED_TASTE);

    // מוסיפים actuallyAteRate כדי להתאים לחתימת dislikedFlag
    const computed: FoodStatsComputed = { ...hate, actuallyAteRate: 0 };
    expect(dislikedFlag(computed)).toBe(1);
  });

  it('liked מקבל טעם גבוה', () => {
    const rows = buildColdStartStats('p', ['likeId'], []);
    expect(rows[0].tasteAvg).toBe(COLD_START_LIKED_TASTE);
  });
});
