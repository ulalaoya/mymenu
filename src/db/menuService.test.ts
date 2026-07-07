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
  getDiarySlots,
  addFoodToSlot,
  removeFoodFromSlot,
  setSlotTime,
  addCustomSlot,
  removeCustomSlot,
  logSlotMeal,
  getSlotLog,
  deleteSlotLog,
  SWEET_KEY,
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

describe('יומן דינמי — getDiarySlots', () => {
  it('מחזיר 5 ארוחות קבועות + ממתק, ממוין לפי שעה', async () => {
    const menu = await getOrCreateTodayMenu(profile, DATE);
    const slots = getDiarySlots(menu, profile);
    expect(slots).toHaveLength(6); // 5 קבועות + ממתק
    const keys = slots.map((s) => s.key);
    expect(keys).toContain('בוקר');
    expect(keys).toContain(SWEET_KEY);
    // ממוין עולה לפי שעה
    const times = slots
      .map((s) => s.plannedTime)
      .filter(Boolean)
      .map((t) => Number(t.replace(':', '')));
    const sorted = [...times].sort((a, b) => a - b);
    expect(times).toEqual(sorted);
  });
});

describe('יומן דינמי — הוספה/הורדת מאכלים ושעה', () => {
  it('מוסיף ומסיר מאכל בסלוט קבוע', async () => {
    const menu = await getOrCreateTodayMenu(profile, DATE);
    const food = (await db.foods.toArray()).find((f) =>
      f.category.includes('בוקר'),
    )!;
    await addFoodToSlot(menu.id, 'בוקר', food.id);
    let updated = (await db.menus.get(menu.id))!;
    let breakfast = getDiarySlots(updated, profile).find((s) => s.key === 'בוקר')!;
    expect(breakfast.foodIds).toContain(food.id);

    await removeFoodFromSlot(menu.id, 'בוקר', food.id);
    updated = (await db.menus.get(menu.id))!;
    breakfast = getDiarySlots(updated, profile).find((s) => s.key === 'בוקר')!;
    expect(breakfast.foodIds).not.toContain(food.id);
  });

  it('הוספה לממתק קובעת sweetFoodId', async () => {
    const menu = await getOrCreateTodayMenu(profile, DATE);
    const sweet = (await db.foods.toArray()).find((f) =>
      f.category.includes('ממתק'),
    )!;
    await addFoodToSlot(menu.id, SWEET_KEY, sweet.id);
    const updated = (await db.menus.get(menu.id))!;
    expect(updated.sweetFoodId).toBe(sweet.id);
  });

  it('setSlotTime מעדכן שעה של סלוט קבוע ושל הממתק', async () => {
    const menu = await getOrCreateTodayMenu(profile, DATE);
    await setSlotTime(menu.id, 'בוקר', '06:15');
    await setSlotTime(menu.id, SWEET_KEY, '17:45');
    const updated = (await db.menus.get(menu.id))!;
    const slots = getDiarySlots(updated, profile);
    expect(slots.find((s) => s.key === 'בוקר')!.plannedTime).toBe('06:15');
    expect(slots.find((s) => s.key === SWEET_KEY)!.plannedTime).toBe('17:45');
  });
});

describe('יומן דינמי — סלוטים מותאמים', () => {
  it('addCustomSlot מוסיף ארוחה ומחזיר מזהה; removeCustomSlot מסיר', async () => {
    const menu = await getOrCreateTodayMenu(profile, DATE);
    const id = await addCustomSlot(menu.id, {
      label: 'חטיף אחה״צ',
      plannedTime: '15:00',
    });
    expect(id).toBeDefined();

    let updated = (await db.menus.get(menu.id))!;
    let custom = getDiarySlots(updated, profile).find((s) => s.key === id);
    expect(custom).toBeDefined();
    expect(custom!.custom).toBe(true);
    expect(custom!.label).toBe('חטיף אחה״צ');

    await removeCustomSlot(menu.id, id!);
    updated = (await db.menus.get(menu.id))!;
    custom = getDiarySlots(updated, profile).find((s) => s.key === id);
    expect(custom).toBeUndefined();
  });

  it('reshuffle שומר על סלוטים מותאמים', async () => {
    const menu = await getOrCreateTodayMenu(profile, DATE);
    const id = await addCustomSlot(menu.id, {
      label: 'ארוחת לילה',
      plannedTime: '21:00',
    });
    await reshuffleTodayMenu(profile, DATE);
    const updated = (await db.menus.get(menu.id))!;
    const custom = getDiarySlots(updated, profile).find((s) => s.key === id);
    expect(custom, 'סלוט מותאם אבד בערבוב').toBeDefined();
  });
});

describe('יומן דינמי — רישום נאכל פר-סלוט', () => {
  it('logSlotMeal רושם, נטען ב-getSlotLog, ומחיקה מסירה', async () => {
    const menu = await getOrCreateTodayMenu(profile, DATE);
    const food = (await db.foods.toArray())[0];
    await addFoodToSlot(menu.id, 'עשר', food.id);

    await logSlotMeal(profile.id, DATE, {
      slotKey: 'עשר',
      slot: 'עשר',
      foodIds: [food.id],
      plannedTime: '10:00',
      tasteRating: 5,
      satietyRating: 4,
    });

    const log = await getSlotLog(profile.id, DATE, 'עשר');
    expect(log).toBeDefined();
    expect(log!.slotId).toBe('עשר');
    expect(log!.foodIds).toContain(food.id);
    // foodStats התעדכנו
    const stats = await db.foodStats.get(`${profile.id}::${food.id}`);
    expect(stats!.timesEaten).toBeGreaterThanOrEqual(1);

    await deleteSlotLog(profile.id, DATE, 'עשר');
    expect(await getSlotLog(profile.id, DATE, 'עשר')).toBeUndefined();
  });

  it('logSlotMeal הוא upsert — לא יוצר כפילות לאותו סלוט', async () => {
    const food = (await db.foods.toArray())[0];
    await logSlotMeal(profile.id, DATE, {
      slotKey: 'בוקר',
      slot: 'בוקר',
      foodIds: [food.id],
      plannedTime: '07:00',
      tasteRating: 3,
    });
    await logSlotMeal(profile.id, DATE, {
      slotKey: 'בוקר',
      slot: 'בוקר',
      foodIds: [food.id],
      plannedTime: '07:30',
      tasteRating: 5,
    });
    const logs = await db.mealLogs
      .where('[profileId+date]')
      .equals([profile.id, DATE])
      .toArray();
    const breakfastLogs = logs.filter((l) => (l.slotId ?? l.slot) === 'בוקר');
    expect(breakfastLogs).toHaveLength(1);
    expect(breakfastLogs[0].tasteRating).toBe(5);
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
