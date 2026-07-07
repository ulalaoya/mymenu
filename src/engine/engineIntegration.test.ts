import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { db, seedIfEmpty } from '../db/database';
import { addCustomFood, getProfileFoods } from '../db/foodRepo';
import { recalcAndSaveFoodStats, loadFoodStats } from './foodStats';
import { getDailyTip } from './dailyTip';
import { applyColdStartPreferences } from './coldStart';
import { buildDailyMenu } from './menuBuilder';
import { markWinnerMenus, pickWinnerTemplate } from './winnerMenu';
import { makeProfile } from './testHelpers';
import type { MealLog, Menu } from '../types';

const PROFILE_ID = 'profile-1';

beforeEach(async () => {
  await db.foods.clear();
  await db.tips.clear();
  await db.mealLogs.clear();
  await db.menus.clear();
  await db.foodStats.clear();
  await db.tipHistory.clear();
});

describe('recalcAndSaveFoodStats (Dexie)', () => {
  it('מחשב ושומר סטטיסטיקה מהיומנים', async () => {
    const logs: MealLog[] = [
      {
        id: '1',
        profileId: PROFILE_ID,
        date: '2026-07-05',
        slot: 'צהריים',
        foodIds: ['food-025'],
        eatenAt: Date.now(),
        tasteRating: 5,
        satietyRating: 5,
        wasFromPlan: true,
      },
    ];
    await db.mealLogs.bulkAdd(logs);
    await recalcAndSaveFoodStats(PROFILE_ID);

    const stats = await loadFoodStats(PROFILE_ID);
    expect(stats.get('food-025')?.satietyAvg).toBe(5);
    expect(stats.get('food-025')?.timesEaten).toBe(1);
  });

  it('recalculate מלא — לא מכפיל בקריאה חוזרת', async () => {
    await db.mealLogs.add({
      id: '1',
      profileId: PROFILE_ID,
      date: '2026-07-05',
      slot: 'צהריים',
      foodIds: ['food-025'],
      eatenAt: Date.now(),
      tasteRating: 4,
      wasFromPlan: true,
    });
    await recalcAndSaveFoodStats(PROFILE_ID);
    await recalcAndSaveFoodStats(PROFILE_ID);
    const rows = await db.foodStats
      .where('profileId')
      .equals(PROFILE_ID)
      .toArray();
    expect(rows.filter((r) => r.foodId === 'food-025')).toHaveLength(1);
  });
});

describe('מאכל חדש שנרשם מופיע בהצעות עתידיות (קריטריון 5, end-to-end)', () => {
  it('addCustomFood + stats גבוה → נבחר בתפריט', async () => {
    await seedIfEmpty();
    const custom = await addCustomFood(PROFILE_ID, {
      name: 'עוף של אמא',
      emoji: '🍗',
      category: ['צהריים', 'ערב'],
      foodGroups: ['חלבונים'],
      tags: [],
    });

    // רושמים שאכלה אותו עם דירוג גבוה
    await db.mealLogs.add({
      id: 'log-1',
      profileId: PROFILE_ID,
      date: '2026-07-01',
      slot: 'צהריים',
      foodIds: [custom.id],
      eatenAt: Date.now(),
      tasteRating: 5,
      satietyRating: 5,
      wasFromPlan: false,
    });
    const statsMap = await recalcAndSaveFoodStats(PROFILE_ID);

    const foods = await getProfileFoods(PROFILE_ID);
    const menu = buildDailyMenu({
      profile: makeProfile({ id: PROFILE_ID }),
      date: '2026-07-06',
      foods,
      stats: statsMap,
      recentMenus: [],
      mealLogs: [],
    });
    const allIds = menu.slots.flatMap((s) => s.foodIds);
    expect(allIds).toContain(custom.id);
  });
});

describe('cold-start disliked → לא נבחר (קריטריון 7, end-to-end)', () => {
  it('מאכל שסומן disliked בשאלון לא נכנס כמנה עיקרית', async () => {
    await seedIfEmpty();
    // מסמנים את כל אפשרויות החלבון העיקריות הגלובליות כ-disliked חוץ מאחת
    await applyColdStartPreferences(
      PROFILE_ID,
      ['food-026'], // חזה עוף אהוב
      ['food-025'], // שניצל לא אהוב
    );
    const foods = await getProfileFoods(PROFILE_ID);
    const stats = await loadFoodStats(PROFILE_ID);
    // ממירים ל-computed (הוספת actuallyAteRate)
    const computed = new Map(
      [...stats].map(([k, v]) => [
        k,
        { ...v, actuallyAteRate: v.timesOffered ? v.timesEaten / v.timesOffered : 0 },
      ]),
    );
    const menu = buildDailyMenu({
      profile: makeProfile({ id: PROFILE_ID }),
      date: '2026-07-06',
      foods,
      stats: computed,
      recentMenus: [],
      mealLogs: [],
    });
    const lunch = menu.slots.find((s) => s.slot === 'צהריים')!;
    const dinner = menu.slots.find((s) => s.slot === 'ערב')!;
    expect([...lunch.foodIds, ...dinner.foodIds]).not.toContain('food-025');
  });
});

describe('getDailyTip (Dexie, קריטריון 9)', () => {
  it('אותו יום → אותו טיפ; רושם ל-tipHistory פעם אחת', async () => {
    await seedIfEmpty();
    const a = await getDailyTip(PROFILE_ID, '2026-07-06');
    const b = await getDailyTip(PROFILE_ID, '2026-07-06');
    expect(a!.id).toBe(b!.id);
    const history = await db.tipHistory
      .where('profileId')
      .equals(PROFILE_ID)
      .toArray();
    expect(history).toHaveLength(1);
  });

  it('יום אחר → טיפ אחר (בסבב)', async () => {
    await seedIfEmpty();
    const a = await getDailyTip(PROFILE_ID, '2026-07-06');
    const b = await getDailyTip(PROFILE_ID, '2026-07-07');
    expect(a!.id).not.toBe(b!.id);
  });
});

describe('תפריט מנצח', () => {
  it('markWinnerMenus מסמן לפי overallRating', () => {
    const menus: Menu[] = [
      {
        id: '1',
        profileId: PROFILE_ID,
        date: '2026-07-01',
        slots: [],
        overallRating: 5,
        isWinner: false,
      },
      {
        id: '2',
        profileId: PROFILE_ID,
        date: '2026-07-02',
        slots: [],
        overallRating: 2,
        isWinner: false,
      },
    ];
    const marked = markWinnerMenus(menus);
    expect(marked[0].isWinner).toBe(true);
    expect(marked[1].isWinner).toBe(false);
    const template = pickWinnerTemplate(marked);
    expect(template?.id).toBe('1');
  });
});
