import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { db, seedIfEmpty } from './database';
import {
  getGlobalFoods,
  getProfileFoods,
  getFoodsForSlot,
  getFoodById,
  addCustomFood,
  filterFoodsForProfile,
  isMeatFood,
  foodHasAllergen,
} from './foodRepo';
import type { FoodItem, Profile } from '../types';

const PROFILE_ID = 'profile-1';

function makeProfile(over: Partial<Profile> = {}): Profile {
  return {
    id: PROFILE_ID,
    username: 'noa',
    passwordHash: 'x',
    salt: 'x',
    recoveryQ: 'q',
    recoveryAHash: 'x',
    avatar: '🦄',
    color: '#5B9BD5',
    allergies: [],
    vegetarian: false,
    mealTimes: {},
    createdAt: Date.now(),
    ...over,
  };
}

beforeEach(async () => {
  await db.foods.clear();
  await db.tips.clear();
});

describe('seedIfEmpty', () => {
  it('ממלא את המזון הגלובלי והטיפים בטעינה ראשונה', async () => {
    await seedIfEmpty();
    const foods = await getGlobalFoods();
    const tips = await db.tips.count();
    expect(foods.length).toBeGreaterThanOrEqual(150);
    expect(tips).toBeGreaterThanOrEqual(60);
  });

  it('אידמפוטנטי — לא מכפיל בטעינה חוזרת', async () => {
    await seedIfEmpty();
    const firstFoods = (await getGlobalFoods()).length;
    const firstTips = await db.tips.count();

    await seedIfEmpty();
    const secondFoods = (await getGlobalFoods()).length;
    const secondTips = await db.tips.count();

    expect(secondFoods).toBe(firstFoods);
    expect(secondTips).toBe(firstTips);
  });
});

describe('getProfileFoods', () => {
  it('מאחד מזון גלובלי + אישי', async () => {
    await seedIfEmpty();
    const globalCount = (await getGlobalFoods()).length;

    await addCustomFood(PROFILE_ID, {
      name: 'שוקו של נועה',
      emoji: '🥤',
      category: ['בוקר'],
      foodGroups: ['מוצרי חלב'],
      tags: [],
    });

    const foods = await getProfileFoods(PROFILE_ID);
    expect(foods.length).toBe(globalCount + 1);
  });

  it('לא מחזיר מזון אישי של פרופיל אחר', async () => {
    await addCustomFood('profile-other', {
      name: 'סוד',
      emoji: '🤫',
      category: ['בוקר'],
      foodGroups: ['פחמימות'],
      tags: [],
    });
    const foods = await getProfileFoods(PROFILE_ID);
    expect(foods.some((f) => f.name === 'סוד')).toBe(false);
  });
});

describe('addCustomFood', () => {
  it('מוסיף מאכל אישי ומחזיר אותו; מופיע ב-getProfileFoods', async () => {
    const created = await addCustomFood(PROFILE_ID, {
      name: 'פנקייק של אמא',
      emoji: '🥞',
      category: ['בוקר', 'ממתק'],
      foodGroups: ['פחמימות'],
      tags: ['חם'],
    });

    expect(created.isCustom).toBe(true);
    expect(created.profileId).toBe(PROFILE_ID);
    expect(created.id).toBeTruthy();

    const stored = await getFoodById(created.id);
    expect(stored?.name).toBe('פנקייק של אמא');

    const foods = await getProfileFoods(PROFILE_ID);
    expect(foods.some((f) => f.id === created.id)).toBe(true);
  });

  it('שומר קבוצות מזון מרובות ומשבצות מרובות במדויק', async () => {
    const created = await addCustomFood(PROFILE_ID, {
      name: 'פיצה של אמא',
      emoji: '🍕',
      category: ['צהריים', 'ערב'],
      foodGroups: ['פחמימות', 'מוצרי חלב'],
      tags: [],
    });

    const stored = await getFoodById(created.id);
    expect(stored?.emoji).toBe('🍕');
    expect(stored?.category).toEqual(['צהריים', 'ערב']);
    expect(stored?.foodGroups).toEqual(['פחמימות', 'מוצרי חלב']);

    // מופיע כמאכל מתאים לכל אחת מהמשבצות שנבחרו
    const lunch = await getFoodsForSlot(PROFILE_ID, 'צהריים');
    const dinner = await getFoodsForSlot(PROFILE_ID, 'ערב');
    expect(lunch.some((f) => f.id === created.id)).toBe(true);
    expect(dinner.some((f) => f.id === created.id)).toBe(true);
  });

  it('מאכל אישי עם קבוצות תורם לצ׳קליסט קבוצות המזון של היום', async () => {
    // מדמה את הלוגיקה שבמסך הבית: איסוף קבוצות מזון מרישומי הארוחות
    const custom = await addCustomFood(PROFILE_ID, {
      name: 'פיצה של אמא',
      emoji: '🍕',
      category: ['צהריים'],
      foodGroups: ['פחמימות', 'מוצרי חלב'],
      tags: [],
    });

    const foods = await getProfileFoods(PROFILE_ID);
    const byId = new Map(foods.map((f) => [f.id, f]));

    const eatenFoodIds = [custom.id];
    const covered = new Set<string>();
    for (const id of eatenFoodIds) {
      byId.get(id)?.foodGroups.forEach((g) => covered.add(g));
    }
    expect(covered.has('פחמימות')).toBe(true);
    expect(covered.has('מוצרי חלב')).toBe(true);
  });
});

describe('getFoodsForSlot', () => {
  it('מחזיר רק מאכלים שמתאימים למשבצת', async () => {
    await seedIfEmpty();
    const breakfast = await getFoodsForSlot(PROFILE_ID, 'בוקר');
    expect(breakfast.length).toBeGreaterThan(0);
    expect(breakfast.every((f) => f.category.includes('בוקר'))).toBe(true);

    const sweets = await getFoodsForSlot(PROFILE_ID, 'ממתק');
    expect(sweets.every((f) => f.category.includes('ממתק'))).toBe(true);
  });
});

describe('isMeatFood', () => {
  it('מזהה מאכל בשרי לפי tag "בשרי"', () => {
    const schnitzel: FoodItem = {
      id: 't1',
      profileId: null,
      name: 'שניצל',
      emoji: '🍗',
      category: ['צהריים'],
      foodGroups: ['חלבונים'],
      tags: ['בשרי'],
      isCustom: false,
    };
    const egg: FoodItem = { ...schnitzel, id: 't2', name: 'ביצה', tags: [] };
    expect(isMeatFood(schnitzel)).toBe(true);
    expect(isMeatFood(egg)).toBe(false);
  });
});

describe('filterFoodsForProfile — צמחונות', () => {
  it('מסיר מאכלים בשריים כשהפרופיל צמחוני', async () => {
    await seedIfEmpty();
    const all = await getProfileFoods(PROFILE_ID);
    const meatCount = all.filter(isMeatFood).length;
    expect(meatCount).toBeGreaterThan(0);

    const filtered = filterFoodsForProfile(
      all,
      makeProfile({ vegetarian: true }),
    );
    expect(filtered.some(isMeatFood)).toBe(false);
    expect(filtered.length).toBe(all.length - meatCount);
  });

  it('לא מסיר בשרי כשהפרופיל לא צמחוני', async () => {
    await seedIfEmpty();
    const all = await getProfileFoods(PROFILE_ID);
    const filtered = filterFoodsForProfile(all, makeProfile());
    expect(filtered.length).toBe(all.length);
  });
});

describe('foodHasAllergen וסינון אלרגיה', () => {
  const foods: FoodItem[] = [
    {
      id: 'a1',
      profileId: null,
      name: 'חמאת בוטנים',
      emoji: '🥜',
      category: ['בוקר'],
      foodGroups: ['שומנים בריאים'],
      tags: [],
      isCustom: false,
    },
    {
      id: 'a2',
      profileId: null,
      name: 'תפוח',
      emoji: '🍎',
      category: ['עשר'],
      foodGroups: ['פירות'],
      tags: [],
      isCustom: false,
    },
  ];

  it('מזהה אלרגן לפי שם המאכל', () => {
    expect(foodHasAllergen(foods[0], ['בוטנים'])).toBe(true);
    expect(foodHasAllergen(foods[1], ['בוטנים'])).toBe(false);
  });

  it('רשימת אלרגיות ריקה לא מסננת כלום', () => {
    expect(foodHasAllergen(foods[0], [])).toBe(false);
  });

  it('filterFoodsForProfile מסיר מאכל עם אלרגן מסומן', () => {
    const filtered = filterFoodsForProfile(
      foods,
      makeProfile({ allergies: ['בוטנים'] }),
    );
    expect(filtered.map((f) => f.id)).toEqual(['a2']);
  });
});
