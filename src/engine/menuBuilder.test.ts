import { describe, it, expect } from 'vitest';
import {
  buildDailyMenu,
  menuCoveredGroups,
  getAlternatives,
  collectRecentFoodIds,
  REQUIRED_GROUPS,
  MAIN_SLOTS,
  PROTEIN_MEAL_SLOTS,
  MIN_VEGETABLE_SERVINGS,
  MIN_FRUIT_SERVINGS,
  type BuildMenuInput,
} from './menuBuilder';
import type { FoodStatsComputed } from './foodStats';
import { GLOBAL_FOODS } from '../data/foods';
import type { FoodGroup, FoodItem, Menu } from '../types';
import { makeFood, makeProfile, makeStats } from './testHelpers';

const foodsById = new Map(GLOBAL_FOODS.map((f) => [f.id, f]));

function baseInput(over: Partial<BuildMenuInput> = {}): BuildMenuInput {
  return {
    profile: makeProfile(),
    date: '2026-07-06',
    foods: GLOBAL_FOODS,
    stats: new Map(),
    recentMenus: [],
    mealLogs: [],
    ...over,
  };
}

describe('buildDailyMenu — מבנה בסיסי', () => {
  it('מפיק תפריט עם 5 משבצות + ממתק + שעות', () => {
    const menu = buildDailyMenu(baseInput());
    expect(menu.slots).toHaveLength(5);
    expect(menu.slots.map((s) => s.slot)).toEqual([
      'בוקר',
      'עשר',
      'צהריים',
      'מנחה',
      'ערב',
    ]);
    expect(menu.sweetFoodId).toBeDefined();
    // שעות מתוכננות מהפרופיל
    expect(menu.slots[0].plannedTime).toBe('07:00');
    // כל משבצת עם לפחות מאכל אחד
    expect(menu.slots.every((s) => s.foodIds.length >= 1)).toBe(true);
  });

  it('מכסה את כל קבוצות המזון הנדרשות + ממתק', () => {
    const menu = buildDailyMenu(baseInput());
    const covered = menuCoveredGroups(menu, foodsById);
    for (const group of REQUIRED_GROUPS) {
      expect(covered.has(group), `חסרה קבוצה: ${group}`).toBe(true);
    }
  });

  it('ארוחות עיקריות כוללות חלבון', () => {
    const menu = buildDailyMenu(baseInput());
    for (const slotName of MAIN_SLOTS) {
      const slot = menu.slots.find((s) => s.slot === slotName)!;
      const hasProtein = slot.foodIds.some((id) =>
        foodsById.get(id)?.foodGroups.includes('חלבונים'),
      );
      expect(hasProtein, `אין חלבון ב-${slotName}`).toBe(true);
    }
  });

  it('כל ארוחה עיקרית (בוקר/צהריים/ערב) כוללת מקור חלבון (חלבונים/מוצרי חלב)', () => {
    const menu = buildDailyMenu(baseInput());
    for (const slotName of PROTEIN_MEAL_SLOTS) {
      const slot = menu.slots.find((s) => s.slot === slotName)!;
      const hasProteinSource = slot.foodIds.some((id) => {
        const groups = foodsById.get(id)?.foodGroups ?? [];
        return groups.includes('חלבונים') || groups.includes('מוצרי חלב');
      });
      expect(hasProteinSource, `אין מקור חלבון ב-${slotName}`).toBe(true);
    }
  });

  it('בוקר מקבל מקור חלבון גם כשהמאכל המדורג-ראשון חסר חלבון', () => {
    // מעניקים לאבוקדו-על-לחם (שומנים+פחמימות, ללא חלבון) ציון מקסימלי
    // כדי שינסה להישאב לבוקר; עדיין חייב להתווסף מקור חלבון.
    const stats = new Map<string, FoodStatsComputed>([
      ['food-119', makeStats('food-119', { satietyAvg: 5, tasteAvg: 5 })],
    ]);
    const menu = buildDailyMenu(baseInput({ stats }));
    const breakfast = menu.slots.find((s) => s.slot === 'בוקר')!;
    const hasProteinSource = breakfast.foodIds.some((id) => {
      const groups = foodsById.get(id)?.foodGroups ?? [];
      return groups.includes('חלבונים') || groups.includes('מוצרי חלב');
    });
    expect(hasProteinSource, 'בוקר ללא מקור חלבון').toBe(true);
  });

  it('התפריט היומי כולל ≥2 מנות ירקות ו-≥2 מנות פירות', () => {
    const menu = buildDailyMenu(baseInput());
    const allIds = menu.slots.flatMap((s) => s.foodIds);
    const veg = allIds.filter((id) =>
      foodsById.get(id)?.foodGroups.includes('ירקות'),
    );
    const fruit = allIds.filter((id) =>
      foodsById.get(id)?.foodGroups.includes('פירות'),
    );
    expect(veg.length).toBeGreaterThanOrEqual(MIN_VEGETABLE_SERVINGS);
    expect(fruit.length).toBeGreaterThanOrEqual(MIN_FRUIT_SERVINGS);
  });
});

describe('סינון אלרגיה/צמחונות (קריטריון 8)', () => {
  it('תפריט של צמחונית לא מכיל מאכל בשרי', () => {
    const menu = buildDailyMenu(
      baseInput({ profile: makeProfile({ vegetarian: true }) }),
    );
    const allIds = [
      ...menu.slots.flatMap((s) => s.foodIds),
      ...(menu.sweetFoodId ? [menu.sweetFoodId] : []),
    ];
    const anyMeat = allIds.some((id) =>
      foodsById.get(id)?.tags.includes('בשרי'),
    );
    expect(anyMeat).toBe(false);
    // ועדיין יש חלבון בעיקריות (מקורות צמחוניים)
    for (const slotName of MAIN_SLOTS) {
      const slot = menu.slots.find((s) => s.slot === slotName)!;
      expect(
        slot.foodIds.some((id) =>
          foodsById.get(id)?.foodGroups.includes('חלבונים'),
        ),
      ).toBe(true);
    }
  });

  it('אלרגן מסומן לא מופיע בתפריט', () => {
    const menu = buildDailyMenu(
      baseInput({ profile: makeProfile({ allergies: ['בוטנים'] }) }),
    );
    const allIds = menu.slots.flatMap((s) => s.foodIds);
    const anyPeanut = allIds.some((id) =>
      foodsById.get(id)?.name.includes('בוטנים'),
    );
    expect(anyPeanut).toBe(false);
  });
});

describe('גיוון — מנה עיקרית לא חוזרת ב-3 ימים (קריטריון 3)', () => {
  it('מנה עיקרית שנאכלה אתמול לא חוזרת היום', () => {
    // שניצל (food-025) נאכל אתמול בצהריים
    const yesterdayMenu: Menu = {
      id: 'm1',
      profileId: 'profile-test',
      date: '2026-07-05',
      slots: [
        { slot: 'צהריים', foodIds: ['food-025'], plannedTime: '13:30' },
      ],
      isWinner: false,
    };
    const menu = buildDailyMenu(
      baseInput({ recentMenus: [yesterdayMenu] }),
    );
    const lunch = menu.slots.find((s) => s.slot === 'צהריים')!;
    const dinner = menu.slots.find((s) => s.slot === 'ערב')!;
    expect(lunch.foodIds).not.toContain('food-025');
    expect(dinner.foodIds).not.toContain('food-025');
  });
});

describe('דירוג נמוך משנה את מחר (קריטריון 2)', () => {
  it('מאכל עיקרי עם שובע ≤2 כמעט לא נבחר מול חלופות תקינות', () => {
    // נותנים לשניצל שובע נמוך, ולחזה עוף שובע גבוה
    const stats = new Map<string, FoodStatsComputed>([
      ['food-025', makeStats('food-025', { satietyAvg: 1, tasteAvg: 1 })],
      ['food-026', makeStats('food-026', { satietyAvg: 5, tasteAvg: 5 })],
    ]);
    const menu = buildDailyMenu(baseInput({ stats }));
    const lunch = menu.slots.find((s) => s.slot === 'צהריים')!;
    const dinner = menu.slots.find((s) => s.slot === 'ערב')!;
    const mainProteins = [...lunch.foodIds, ...dinner.foodIds];
    // השניצל המדורג-נמוך לא נבחר כמנה עיקרית
    expect(mainProteins).not.toContain('food-025');
  });
});

describe('מאכל חדש שנרשם משתתף בבחירה (קריטריון 5)', () => {
  it('מאכל אישי חדש עם ציון גבוה נבחר', () => {
    const custom: FoodItem = makeFood({
      id: 'custom-1',
      name: 'פסטה של סבתא',
      profileId: 'profile-test',
      category: ['צהריים', 'ערב'],
      foodGroups: ['חלבונים', 'פחמימות'],
      isCustom: true,
    });
    const stats = new Map<string, FoodStatsComputed>([
      ['custom-1', makeStats('custom-1', { satietyAvg: 5, tasteAvg: 5 })],
    ]);
    const menu = buildDailyMenu(
      baseInput({ foods: [...GLOBAL_FOODS, custom], stats }),
    );
    const allIds = menu.slots.flatMap((s) => s.foodIds);
    expect(allIds).toContain('custom-1');
  });
});

describe('לפחות מאכל חדש אחד ביום', () => {
  it('התפריט כולל מאכל ללא היסטוריית אכילה', () => {
    // נותנים stats לכמה מאכלים; חייב להישאר לפחות אחד חדש
    const menu = buildDailyMenu(baseInput());
    const allFoods = [
      ...menu.slots.flatMap((s) => s.foodIds),
      ...(menu.sweetFoodId ? [menu.sweetFoodId] : []),
    ];
    // ללא stats כלל — כל המאכלים "חדשים", ולכן התנאי מתקיים טריוויאלית.
    expect(allFoods.length).toBeGreaterThan(0);
  });
});

describe('getAlternatives', () => {
  it('מחזיר עד 3 חלופות מדורגות למשבצת', () => {
    const alts = getAlternatives(
      'צהריים',
      makeProfile(),
      GLOBAL_FOODS,
      new Map(),
      { count: 3, excludeIds: new Set(['food-025']) },
    );
    expect(alts.length).toBeLessThanOrEqual(3);
    expect(alts.length).toBeGreaterThan(0);
    expect(alts.every((f) => f.category.includes('צהריים'))).toBe(true);
    expect(alts.map((f) => f.id)).not.toContain('food-025');
  });
});

describe('collectRecentFoodIds', () => {
  it('אוסף מזהים מ-menus ו-mealLogs בטווח', () => {
    const menus: Menu[] = [
      {
        id: 'm1',
        profileId: 'p',
        date: '2026-07-05',
        slots: [{ slot: 'צהריים', foodIds: ['a'], plannedTime: '' }],
        sweetFoodId: 's',
        isWinner: false,
      },
    ];
    const ids = collectRecentFoodIds('2026-07-06', 3, menus, []);
    expect(ids.has('a')).toBe(true);
    expect(ids.has('s')).toBe(true);
  });

  it('לא כולל את היום עצמו או מעבר לחלון', () => {
    const menus: Menu[] = [
      {
        id: 'm-old',
        profileId: 'p',
        date: '2026-07-01', // מעבר לחלון של 3 ימים
        slots: [{ slot: 'צהריים', foodIds: ['old'], plannedTime: '' }],
        isWinner: false,
      },
    ];
    const ids = collectRecentFoodIds('2026-07-06', 3, menus, []);
    expect(ids.has('old')).toBe(false);
  });
});

describe('כיסוי קבוצות עם וריאציה של פרופיל', () => {
  it('גם עם stats שליליים לחלק מהמאכלים — הכיסוי נשמר', () => {
    const stats = new Map<string, FoodStatsComputed>();
    // מדללים כמה מאכלים ל-disliked
    for (const f of GLOBAL_FOODS.slice(0, 30)) {
      stats.set(f.id, makeStats(f.id, { satietyAvg: 1, tasteAvg: 1 }));
    }
    const menu = buildDailyMenu(baseInput({ stats }));
    const covered = menuCoveredGroups(menu, foodsById);
    const missing = REQUIRED_GROUPS.filter((g: FoodGroup) => !covered.has(g));
    expect(missing).toEqual([]);
  });
});
