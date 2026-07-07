import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { db, seedIfEmpty } from './database';
import { createProfile } from './profiles';
import type { CreateProfileInput } from './profiles';
import { logMeal, setWaterCups } from './menuService';
import { addCustomFood, getGlobalFoods } from './foodRepo';
import {
  getMonthCalendar,
  getDayDetails,
  computeStreak,
  computeStreakFromDates,
  computeCompleteness,
  getNewFoodsTried,
  getWinnerMenus,
  getWeeklyGroupVariety,
  startOfWeek,
} from './historyService';
import type { FoodItem, MealSlot, Profile } from '../types';

const baseInput: CreateProfileInput = {
  username: 'noa',
  password: 'sod1234',
  recoveryQ: 'מה שם חיית המחמד שלך?',
  recoveryA: 'פלאפי',
  avatar: '🦄',
  color: '#5B9BD5',
};

let profile: Profile;
let globalFoods: FoodItem[];

/** קיצור לרישום ארוחה בתאריך/משבצת עם מאכלים */
async function log(
  date: string,
  slot: MealSlot,
  foodIds: string[],
  extra: { taste?: number; satiety?: number } = {},
) {
  await logMeal({
    profileId: profile.id,
    date,
    slot,
    foodIds,
    eatenAt: new Date(date + 'T12:00:00').getTime(),
    tasteRating: extra.taste as never,
    satietyRating: extra.satiety as never,
    wasFromPlan: false,
  });
}

beforeEach(async () => {
  await Promise.all([
    db.profiles.clear(),
    db.foods.clear(),
    db.menus.clear(),
    db.mealLogs.clear(),
    db.waterLogs.clear(),
    db.foodStats.clear(),
    db.tips.clear(),
    db.tipHistory.clear(),
    db.session.clear(),
  ]);
  await seedIfEmpty();
  profile = await createProfile(baseInput);
  globalFoods = await getGlobalFoods();
});

describe('computeCompleteness', () => {
  it('יום ריק לגמרי = 0', () => {
    expect(computeCompleteness(0, 0)).toBe(0);
  });
  it('ארוחה אחת = 1', () => {
    expect(computeCompleteness(1, 0)).toBe(1);
  });
  it('כל הארוחות + מים = 4', () => {
    expect(computeCompleteness(5, 8)).toBe(4);
  });
  it('כל הארוחות בלי מים = 3', () => {
    expect(computeCompleteness(5, 0)).toBe(3);
  });
});

describe('getMonthCalendar', () => {
  it('מחזיר יום לכל יום בחודש עם רמת שלמות', async () => {
    await log('2026-07-06', 'בוקר', [globalFoods[0].id]);
    await log('2026-07-06', 'צהריים', [globalFoods[1].id]);
    await setWaterCups(profile.id, '2026-07-06', 8);

    const cal = await getMonthCalendar(profile.id, 2026, 7);
    expect(cal.days).toHaveLength(31);
    const d6 = cal.days.find((d) => d.day === 6)!;
    expect(d6.mealsLogged).toBe(2);
    expect(d6.waterCups).toBe(8);
    expect(d6.completeness).toBeGreaterThan(0);
    const d7 = cal.days.find((d) => d.day === 7)!;
    expect(d7.completeness).toBe(0);
  });

  it('אותה משבצת שנרשמה פעמיים נספרת פעם אחת', async () => {
    await log('2026-07-10', 'בוקר', [globalFoods[0].id]);
    await log('2026-07-10', 'בוקר', [globalFoods[1].id]);
    const cal = await getMonthCalendar(profile.id, 2026, 7);
    const d10 = cal.days.find((d) => d.day === 10)!;
    expect(d10.mealsLogged).toBe(1);
  });
});

describe('getDayDetails', () => {
  it('מחזיר את המאכלים, הדירוגים והמים של היום', async () => {
    await log('2026-07-06', 'צהריים', [globalFoods[0].id], {
      taste: 5,
      satiety: 4,
    });
    await setWaterCups(profile.id, '2026-07-06', 5);

    const details = await getDayDetails(profile.id, '2026-07-06');
    expect(details.meals).toHaveLength(1);
    expect(details.meals[0].foodNames[0]).toBe(globalFoods[0].name);
    expect(details.meals[0].tasteRating).toBe(5);
    expect(details.meals[0].satietyRating).toBe(4);
    expect(details.waterCups).toBe(5);
  });

  it('ממיין ארוחות לפי סדר היום', async () => {
    await log('2026-07-06', 'ערב', [globalFoods[0].id]);
    await log('2026-07-06', 'בוקר', [globalFoods[1].id]);
    const details = await getDayDetails(profile.id, '2026-07-06');
    expect(details.meals[0].slot).toBe('בוקר');
    expect(details.meals[1].slot).toBe('ערב');
  });
});

describe('computeStreakFromDates', () => {
  it('רצף של 3 ימים רצופים', () => {
    const dates = new Set(['2026-07-04', '2026-07-05', '2026-07-06']);
    expect(computeStreakFromDates(dates, '2026-07-06')).toBe(3);
  });
  it('רצף נשבר בפער', () => {
    const dates = new Set(['2026-07-01', '2026-07-05', '2026-07-06']);
    expect(computeStreakFromDates(dates, '2026-07-06')).toBe(2);
  });
  it('היום ריק אך אתמול נרשם — לא שובר את הרצף', () => {
    const dates = new Set(['2026-07-04', '2026-07-05']);
    expect(computeStreakFromDates(dates, '2026-07-06')).toBe(2);
  });
  it('אין רישומים כלל = 0', () => {
    expect(computeStreakFromDates(new Set(), '2026-07-06')).toBe(0);
  });
});

describe('computeStreak (DB)', () => {
  it('סופר ימים רצופים עם רישום', async () => {
    await log('2026-07-05', 'בוקר', [globalFoods[0].id]);
    await log('2026-07-06', 'בוקר', [globalFoods[0].id]);
    expect(await computeStreak(profile.id, '2026-07-06')).toBe(2);
  });
});

describe('getNewFoodsTried', () => {
  it('כולל מאכל אישי שנוסף', async () => {
    const custom = await addCustomFood(profile.id, {
      name: 'עוגת גזר של סבתא',
      emoji: '🥕',
      category: ['ממתק'],
      foodGroups: ['מתוקים'],
      tags: [],
    });
    const tried = await getNewFoodsTried(profile.id);
    expect(tried.some((t) => t.id === custom.id)).toBe(true);
    expect(tried.find((t) => t.id === custom.id)!.isCustom).toBe(true);
  });

  it('כולל מאכל גלובלי שנאכל בפועל, ולא כאלה שלא נאכלו', async () => {
    await log('2026-07-06', 'בוקר', [globalFoods[0].id]);
    const tried = await getNewFoodsTried(profile.id);
    expect(tried.some((t) => t.id === globalFoods[0].id)).toBe(true);
    // מאכל אקראי שלא נאכל לא אמור להיכלל
    const notEaten = globalFoods.find(
      (f) => f.id !== globalFoods[0].id,
    )!;
    expect(tried.some((t) => t.id === notEaten.id)).toBe(false);
  });
});

describe('getWinnerMenus', () => {
  it('מחזיר תפריטים עם דירוג גבוה כמנצחים', async () => {
    await db.menus.put({
      id: 'm1',
      profileId: profile.id,
      date: '2026-07-01',
      slots: [
        { slot: 'צהריים', foodIds: [globalFoods[0].id], plannedTime: '13:30' },
      ],
      overallRating: 5,
      isWinner: false,
    });
    await db.menus.put({
      id: 'm2',
      profileId: profile.id,
      date: '2026-07-02',
      slots: [],
      overallRating: 2,
      isWinner: false,
    });

    const winners = await getWinnerMenus(profile.id);
    expect(winners).toHaveLength(1);
    expect(winners[0].id).toBe('m1');
    expect(winners[0].highlights[0]).toBe(globalFoods[0].name);
  });
});

describe('getWeeklyGroupVariety', () => {
  it('סופר קבוצות מזון שונות שכוסו בכל יום', async () => {
    // מאכל עם שתי קבוצות מזון
    const multi = globalFoods.find((f) => f.foodGroups.length >= 2);
    const target = multi ?? globalFoods[0];
    await log('2026-07-06', 'צהריים', [target.id]);

    const week = await getWeeklyGroupVariety(profile.id, '2026-07-05');
    expect(week.days).toHaveLength(7);
    const d6 = week.days.find((d) => d.date === '2026-07-06')!;
    expect(d6.groupCount).toBe(target.foodGroups.length);
    expect(week.maxGroups).toBe(8);
  });

  it('יום בלי רישום = 0 קבוצות', async () => {
    const week = await getWeeklyGroupVariety(profile.id, '2026-07-05');
    expect(week.days.every((d) => d.groupCount === 0)).toBe(true);
  });
});

describe('startOfWeek', () => {
  it('מחזיר את יום ראשון של השבוע', () => {
    // 2026-07-06 הוא יום שני → ראשון הוא 2026-07-05
    expect(startOfWeek('2026-07-06')).toBe('2026-07-05');
  });
});
