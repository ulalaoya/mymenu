import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from './database';
import {
  createProfile,
  login,
  getLastProfile,
  switchProfile,
  recoverPassword,
  logout,
  DEFAULT_MEAL_TIMES,
} from './profiles';
import type { CreateProfileInput } from './profiles';

const baseInput: CreateProfileInput = {
  username: 'noa',
  password: 'sod1234',
  recoveryQ: 'מה שם חיית המחמד שלך?',
  recoveryA: 'פלאפי',
  avatar: '🦄',
  color: '#5B9BD5',
};

beforeEach(async () => {
  // איפוס מלא בין טסטים לבידוד
  await db.profiles.clear();
  await db.foods.clear();
  await db.menus.clear();
  await db.mealLogs.clear();
  await db.session.clear();
});

describe('createProfile', () => {
  it('יוצר פרופיל עם שעות ארוחה ברירת מחדל ושדות ריקים', async () => {
    const p = await createProfile(baseInput);
    expect(p.username).toBe('noa');
    expect(p.allergies).toEqual([]);
    expect(p.vegetarian).toBe(false);
    expect(p.mealTimes).toEqual(DEFAULT_MEAL_TIMES);
    expect(p.mealTimes.בוקר).toBe('07:00');
    expect(p.mealTimes.צהריים).toBe('13:30');
    // הסיסמה לא נשמרת בטקסט גלוי
    expect(p.passwordHash).not.toBe('sod1234');
    expect(p.salt.length).toBeGreaterThan(0);
  });

  it('דוחה שם משתמש כפול', async () => {
    await createProfile(baseInput);
    await expect(createProfile(baseInput)).rejects.toThrow();
  });

  it('דוחה סיסמה קצרה מדי', async () => {
    await expect(
      createProfile({ ...baseInput, password: 'ab' }),
    ).rejects.toThrow();
  });
});

describe('login', () => {
  it('התחברות מצליחה עם הסיסמה הנכונה ומעדכנת session', async () => {
    const created = await createProfile(baseInput);
    const p = await login('noa', 'sod1234');
    expect(p).not.toBeNull();
    expect(p!.id).toBe(created.id);

    const session = await db.session.get('device');
    expect(session?.lastProfileId).toBe(created.id);
    expect(session?.deviceToken).toBeTruthy();
  });

  it('נכשלת עם סיסמה שגויה', async () => {
    await createProfile(baseInput);
    const p = await login('noa', 'wrong');
    expect(p).toBeNull();
  });

  it('נכשלת עם שם משתמש לא קיים', async () => {
    const p = await login('mystery', 'sod1234');
    expect(p).toBeNull();
  });
});

describe('getLastProfile — זיהוי מכשיר', () => {
  it('מחזיר את הפרופיל האחרון אחרי התחברות', async () => {
    const created = await createProfile(baseInput);
    await login('noa', 'sod1234');
    const last = await getLastProfile();
    expect(last?.id).toBe(created.id);
  });

  it('מחזיר null כשאין session', async () => {
    const last = await getLastProfile();
    expect(last).toBeNull();
  });
});

describe('switchProfile', () => {
  it('דורש סיסמה נכונה למעבר', async () => {
    await createProfile(baseInput);
    const second = await createProfile({
      ...baseInput,
      username: 'dana',
      password: 'abcd',
    });

    const fail = await switchProfile(second.id, 'wrong');
    expect(fail).toBeNull();

    const ok = await switchProfile(second.id, 'abcd');
    expect(ok?.id).toBe(second.id);

    const session = await db.session.get('device');
    expect(session?.lastProfileId).toBe(second.id);
  });
});

describe('recoverPassword', () => {
  it('משחזר סיסמה עם תשובת שחזור נכונה', async () => {
    await createProfile(baseInput);
    const recovered = await recoverPassword('noa', 'פלאפי', 'newpass');
    expect(recovered).not.toBeNull();

    // הסיסמה הישנה כבר לא עובדת, החדשה כן
    expect(await login('noa', 'sod1234')).toBeNull();
    expect(await login('noa', 'newpass')).not.toBeNull();
  });

  it('מקבל תשובת שחזור עם רווחים ואותיות גדולות (נרמול)', async () => {
    await createProfile(baseInput);
    const recovered = await recoverPassword('noa', '  פלאפי ', 'newpass');
    expect(recovered).not.toBeNull();
  });

  it('נכשל עם תשובת שחזור שגויה', async () => {
    await createProfile(baseInput);
    const recovered = await recoverPassword('noa', 'רקסי', 'newpass');
    expect(recovered).toBeNull();
  });
});

describe('logout', () => {
  it('מנקה lastProfileId אך שומר deviceToken', async () => {
    await createProfile(baseInput);
    await login('noa', 'sod1234');
    const before = await db.session.get('device');
    const token = before!.deviceToken;

    await logout();
    const after = await db.session.get('device');
    expect(after?.lastProfileId).toBeUndefined();
    expect(after?.deviceToken).toBe(token);
    expect(await getLastProfile()).toBeNull();
  });
});

describe('בידוד בין פרופילים', () => {
  it('פרופיל אחד לא רואה מזון אישי של פרופיל אחר', async () => {
    const noa = await createProfile(baseInput);
    const dana = await createProfile({
      ...baseInput,
      username: 'dana',
      password: 'abcd',
    });

    await db.foods.add({
      id: 'f-noa',
      profileId: noa.id,
      name: 'שוקו של נועה',
      emoji: '🥤',
      category: ['בוקר'],
      foodGroups: ['מוצרי חלב'],
      tags: [],
      isCustom: true,
    });

    const danaFoods = await db.foods
      .where('profileId')
      .equals(dana.id)
      .toArray();
    expect(danaFoods).toHaveLength(0);

    const noaFoods = await db.foods
      .where('profileId')
      .equals(noa.id)
      .toArray();
    expect(noaFoods).toHaveLength(1);
  });
});
