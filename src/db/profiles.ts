// ===== לוגיקת פרופילים והתחברות (SPEC סעיפים 3, 5.1) =====
import type { MealSlot, Profile } from '../types';
import {
  db,
  SESSION_ID,
  getProfileByUsername,
  getSession,
  getAllProfiles,
} from './database';
import {
  generateSalt,
  hashPassword,
  verifyPassword,
  isValidPassword,
} from './auth';
import { ensurePersistentStorage } from '../utils/storage';

/** שעות ארוחה ברירת מחדל (SPEC סעיף 5.1) */
export const DEFAULT_MEAL_TIMES: Partial<Record<MealSlot, string>> = {
  בוקר: '07:00',
  עשר: '10:00',
  צהריים: '13:30',
  מנחה: '16:00',
  ערב: '19:00',
  ממתק: '16:30',
};

/** קלט ליצירת פרופיל חדש */
export interface CreateProfileInput {
  username: string;
  password: string;
  recoveryQ: string;
  recoveryA: string;
  avatar: string;
  color: string;
}

/** מזהה ייחודי (crypto.randomUUID זמין בדפדפן וב-Node 24) */
function newId(): string {
  return crypto.randomUUID();
}

/**
 * יוצר פרופיל חדש עם hash לסיסמה ולתשובת השחזור.
 * זורק שגיאה אם הסיסמה קצרה מדי או אם שם המשתמש כבר קיים.
 */
export async function createProfile(
  input: CreateProfileInput,
): Promise<Profile> {
  const username = input.username.trim();

  if (!username) {
    throw new Error('צריך לבחור שם משתמש');
  }
  if (!isValidPassword(input.password)) {
    throw new Error('הסיסמה צריכה להיות באורך 4 תווים לפחות');
  }

  const existing = await getProfileByUsername(username);
  if (existing) {
    throw new Error('שם המשתמש הזה כבר תפוס, נסי שם אחר');
  }

  // מחוות המשתמש (לחיצת "יוצרים פרופיל") היא הזמן הטוב ביותר לבקש אחסון קבוע.
  await ensurePersistentStorage();

  const salt = generateSalt();
  const passwordHash = await hashPassword(input.password, salt);

  const recoverySalt = generateSalt();
  const recoveryAHash = await hashPassword(
    normalizeAnswer(input.recoveryA),
    recoverySalt,
  );

  const profile: Profile = {
    id: newId(),
    username,
    passwordHash,
    salt,
    recoveryQ: input.recoveryQ,
    recoveryAHash,
    recoverySalt,
    avatar: input.avatar,
    color: input.color,
    allergies: [],
    vegetarian: false,
    mealTimes: { ...DEFAULT_MEAL_TIMES },
    createdAt: Date.now(),
  };

  await db.profiles.add(profile);
  return profile;
}

/** מנרמל תשובת שחזור: trim + אותיות קטנות (השוואה סלחנית) */
function normalizeAnswer(answer: string): string {
  return answer.trim().toLowerCase();
}

/** שדות בפרופיל שמותר לעדכן מהגדרות (לא סיסמה/hash/מזהה) */
export type ProfilePatch = Partial<
  Pick<
    Profile,
    'username' | 'avatar' | 'color' | 'allergies' | 'vegetarian' | 'mealTimes'
  >
>;

/**
 * מעדכן שדות פרופיל (שם, אווטאר, צבע, אלרגיות, צמחונות, שעות ארוחה).
 * אם משנים שם משתמש — מוודא שאינו תפוס על ידי פרופיל אחר.
 * מחזיר את הפרופיל המעודכן, או null אם אינו קיים.
 */
export async function updateProfile(
  profileId: string,
  patch: ProfilePatch,
): Promise<Profile | null> {
  const profile = await db.profiles.get(profileId);
  if (!profile) {
    return null;
  }

  const clean: ProfilePatch = { ...patch };

  if (typeof clean.username === 'string') {
    const username = clean.username.trim();
    if (!username) {
      throw new Error('צריך לבחור שם משתמש');
    }
    const existing = await getProfileByUsername(username);
    if (existing && existing.id !== profileId) {
      throw new Error('שם המשתמש הזה כבר תפוס, נסי שם אחר');
    }
    clean.username = username;
  }

  await db.profiles.update(profileId, clean);
  return { ...profile, ...clean };
}

/**
 * מוודא שקיימת רשומת session עם deviceToken; יוצר אחד אם חסר.
 * מחזיר את ה-deviceToken.
 */
async function ensureDeviceToken(): Promise<string> {
  const session = await getSession();
  if (session?.deviceToken) {
    return session.deviceToken;
  }
  const deviceToken = crypto.randomUUID();
  await db.session.put({ id: SESSION_ID, deviceToken });
  return deviceToken;
}

/**
 * מאמת שם משתמש+סיסמה. בהצלחה מעדכן את ה-session (deviceToken + lastProfileId).
 * מחזיר את הפרופיל, או null אם האימות נכשל.
 */
export async function login(
  username: string,
  password: string,
): Promise<Profile | null> {
  const profile = await getProfileByUsername(username.trim());
  if (!profile) {
    return null;
  }
  const ok = await verifyPassword(password, profile.salt, profile.passwordHash);
  if (!ok) {
    return null;
  }

  const deviceToken = await ensureDeviceToken();
  await db.session.put({
    id: SESSION_ID,
    deviceToken,
    lastProfileId: profile.id,
  });
  return profile;
}

/**
 * מחזיר את הפרופיל לכניסה אוטומטית (זיהוי מכשיר):
 * 1. אם ה-session מצביע על פרופיל קיים — הוא.
 * 2. אחרת, אם קיים פרופיל כלשהו במכשיר — הפרופיל האחרון שנוצר (נפילה עמידה
 *    למקרה שרשומת ה-session אבדה/אופסה, כדי לא לבקש הרשמה מחדש בטעות).
 * 3. אם אין אף פרופיל — null.
 * במקרה של נפילה (2) מעדכן את ה-session כדי שהזיהוי יהיה יציב מכאן והלאה.
 */
export async function getLastProfile(): Promise<Profile | null> {
  const session = await getSession();
  if (session?.lastProfileId) {
    const profile = await db.profiles.get(session.lastProfileId);
    if (profile) return profile;
  }

  // נפילה עמידה: רק כשאין רשומת session כלל (למשל אחרי איפוס/מחיקה חלקית של
  // ה-IndexedDB) — נכנסים אוטומטית לפרופיל האחרון שנוצר, כדי לא לבקש הרשמה
  // מחדש בטעות. יציאה מפורשת ("החלפת משתמש") משאירה רשומת session עם
  // lastProfileId ריק, ולכן שם לא נכנסים אוטומטית — מוצג מסך בחירת הפרופיל.
  if (!session) {
    const all = await getAllProfiles(); // ממויין לפי createdAt עולה
    const fallback = all.length > 0 ? all[all.length - 1] : null;
    if (fallback) {
      const deviceToken = await ensureDeviceToken();
      await db.session.put({
        id: SESSION_ID,
        deviceToken,
        lastProfileId: fallback.id,
      });
      return fallback;
    }
  }
  return null;
}

/**
 * מעבר לפרופיל אחר — דורש סיסמה. מזהה לפי id.
 * מחזיר את הפרופיל בהצלחה, אחרת null.
 */
export async function switchProfile(
  profileId: string,
  password: string,
): Promise<Profile | null> {
  const profile = await db.profiles.get(profileId);
  if (!profile) {
    return null;
  }
  const ok = await verifyPassword(password, profile.salt, profile.passwordHash);
  if (!ok) {
    return null;
  }

  const deviceToken = await ensureDeviceToken();
  await db.session.put({
    id: SESSION_ID,
    deviceToken,
    lastProfileId: profile.id,
  });
  return profile;
}

/**
 * שחזור סיסמה דרך שאלת השחזור. מאמת את התשובה מול ה-hash,
 * ואם תואם — מאפס לסיסמה חדשה. מחזיר את הפרופיל, אחרת null.
 */
export async function recoverPassword(
  username: string,
  recoveryAnswer: string,
  newPassword: string,
): Promise<Profile | null> {
  const profile = await getProfileByUsername(username.trim());
  if (!profile) {
    return null;
  }
  const salt = profile.recoverySalt;
  if (!salt) {
    return null;
  }
  const ok = await verifyPassword(
    normalizeAnswer(recoveryAnswer),
    salt,
    profile.recoveryAHash,
  );
  if (!ok) {
    return null;
  }
  if (!isValidPassword(newPassword)) {
    throw new Error('הסיסמה צריכה להיות באורך 4 תווים לפחות');
  }

  const newSalt = generateSalt();
  const passwordHash = await hashPassword(newPassword, newSalt);
  await db.profiles.update(profile.id, { passwordHash, salt: newSalt });

  return { ...profile, passwordHash, salt: newSalt };
}

/**
 * יציאה: מנקה את lastProfileId אבל שומר את ה-deviceToken (זיהוי המכשיר נשאר).
 */
export async function logout(): Promise<void> {
  const session = await getSession();
  if (!session) {
    return;
  }
  await db.session.put({
    id: SESSION_ID,
    deviceToken: session.deviceToken,
    lastProfileId: undefined,
  });
}
