import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { db, seedIfEmpty } from './database';
import { createProfile } from './profiles';
import type { CreateProfileInput } from './profiles';
import {
  getOrCreateTodayMenu,
  replaceSlotFood,
  setSweet,
  reshuffleTodayMenu,
  logMeal,
  getWaterCups,
  setWaterCups,
  WATER_GOAL_CUPS,
} from './menuService';
import type { Profile } from '../types';

const baseInput: CreateProfileInput = {
  username: 'noa',
  password: 'sod1234',
  recoveryQ: 'מה שם חיית המחמד שלך?',
  recoveryA: 'פלאפי',
  avatar: '🦄',
  color: '#5B9BD5',
};

const DATE = '2026-07-06';
let profile: Profile;

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
});

describe('getOrCreateTodayMenu', () => {
  it('בונה תפריט חדש עם 5 משבצות ושומר', async () => {
    const menu = await getOrCreateTodayMenu(profile, DATE);
    expect(menu.profileId).toBe(profile.id);
    expect(menu.date).toBe(DATE);
    expect(menu.slots).toHaveLength(5);
    const stored = await db.menus.get(menu.id);
    expect(stored).toBeDefined();
  });

  it('אידמפוטנטי: קריאה חוזרת מחזירה את אותו תפריט', async () => {
    const a = await getOrCreateTodayMenu(profile, DATE);
    const b = await getOrCreateTodayMenu(profile, DATE);
    expect(b.id).toBe(a.id);
    const count = await db.menus
      .where('[profileId+date]')
      .equals([profile.id, DATE])
      .count();
    expect(count).toBe(1);
  });

  it('בונה תפריט תקין גם כשיש רישומים ישנים (חודש+) שאינם נטענים', async () => {
    // רישום ארוחה ישן (חודש לפני DATE) — מחוץ לחלון 14 הימים.
    // אמור פשוט לא להיטען, אך לא לשבור את בניית התפריט.
    const food = (await db.foods.toArray())[0];
    await db.mealLogs.add({
      id: crypto.randomUUID(),
      profileId: profile.id,
      date: '2026-06-01', // 35+ ימים לפני DATE (2026-07-06)
      slot: 'בוקר',
      foodIds: [food.id],
      eatenAt: new Date('2026-06-01T08:00:00').getTime(),
      wasFromPlan: true,
    });
    // תפריט ישן מחוץ לחלון
    await db.menus.add({
      id: crypto.randomUUID(),
      profileId: profile.id,
      date: '2026-06-01',
      slots: [],
      isWinner: false,
    });

    const menu = await getOrCreateTodayMenu(profile, DATE);
    expect(menu.slots).toHaveLength(5);
    // התפריט אכן נבנה עם מאכלים (לא ריק)
    const totalFoods = menu.slots.reduce((n, s) => n + s.foodIds.length, 0);
    expect(totalFoods).toBeGreaterThan(0);
  });
});

describe('replaceSlotFood', () => {
  it('מחליף מאכל במשבצת ושומר', async () => {
    const menu = await getOrCreateTodayMenu(profile, DATE);
    const breakfast = menu.slots.find((s) => s.slot === 'בוקר')!;
    const oldId = breakfast.foodIds[0];
    // מוצאים מאכל בוקר אחר
    const allFoods = await db.foods.toArray();
    const other = allFoods.find(
      (f) => f.category.includes('בוקר') && f.id !== oldId,
    )!;
    const updated = await replaceSlotFood(menu.id, 'בוקר', other.id, oldId);
    const newBreakfast = updated!.slots.find((s) => s.slot === 'בוקר')!;
    expect(newBreakfast.foodIds).toContain(other.id);
    expect(newBreakfast.foodIds).not.toContain(oldId);
  });
});

describe('setSweet', () => {
  it('קובע ממתק יומי', async () => {
    const menu = await getOrCreateTodayMenu(profile, DATE);
    const sweet = (await db.foods.toArray()).find((f) =>
      f.category.includes('ממתק'),
    )!;
    const updated = await setSweet(menu.id, sweet.id);
    expect(updated!.sweetFoodId).toBe(sweet.id);
  });
});

describe('reshuffleTodayMenu', () => {
  it('שומר על מזהה התפריט הקיים', async () => {
    const menu = await getOrCreateTodayMenu(profile, DATE);
    const reshuffled = await reshuffleTodayMenu(profile, DATE);
    expect(reshuffled.id).toBe(menu.id);
    const count = await db.menus
      .where('[profileId+date]')
      .equals([profile.id, DATE])
      .count();
    expect(count).toBe(1);
  });
});

describe('logMeal', () => {
  it('שומר רישום ומעדכן foodStats', async () => {
    const food = (await db.foods.toArray())[0];
    await logMeal({
      profileId: profile.id,
      date: DATE,
      slot: 'בוקר',
      foodIds: [food.id],
      eatenAt: Date.now(),
      tasteRating: 5,
      satietyRating: 4,
      wasFromPlan: true,
    });
    const logs = await db.mealLogs
      .where('profileId')
      .equals(profile.id)
      .toArray();
    expect(logs).toHaveLength(1);
    const stats = await db.foodStats.get(`${profile.id}::${food.id}`);
    expect(stats).toBeDefined();
    expect(stats!.tasteAvg).toBe(5);
    expect(stats!.satietyAvg).toBe(4);
    expect(stats!.timesEaten).toBe(1);
  });
});

describe('water meter', () => {
  it('ברירת מחדל 0 ונשמר ונצמד ליעד', async () => {
    expect(await getWaterCups(profile.id, DATE)).toBe(0);
    await setWaterCups(profile.id, DATE, 3);
    expect(await getWaterCups(profile.id, DATE)).toBe(3);
    // נצמד ליעד המקסימלי
    const clamped = await setWaterCups(profile.id, DATE, 99);
    expect(clamped).toBe(WATER_GOAL_CUPS);
    expect(await getWaterCups(profile.id, DATE)).toBe(WATER_GOAL_CUPS);
    // לא יורד מתחת ל-0
    const min = await setWaterCups(profile.id, DATE, -5);
    expect(min).toBe(0);
  });
});
