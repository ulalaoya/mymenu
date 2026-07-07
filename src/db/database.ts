// ===== שכבת הנתונים של MyMenu — Dexie (SPEC סעיף 7) =====
import Dexie from 'dexie';
import type { Table } from 'dexie';
import type {
  Profile,
  FoodItem,
  Menu,
  MealLog,
  WaterLog,
  Tip,
  TipHistory,
  FoodStats,
  Session,
} from '../types';

/** מזהה קבוע לרשומת ה-session היחידה */
export const SESSION_ID = 'device';

/**
 * מסד הנתונים המרכזי של MyMenu.
 * כל הנתונים מקומיים (IndexedDB) — אין קריאות רשת.
 */
export class MyMenuDB extends Dexie {
  profiles!: Table<Profile, string>;
  foods!: Table<FoodItem, string>;
  menus!: Table<Menu, string>;
  mealLogs!: Table<MealLog, string>;
  waterLogs!: Table<WaterLog, string>;
  tips!: Table<Tip, string>;
  tipHistory!: Table<TipHistory, string>;
  foodStats!: Table<FoodStats, string>;
  session!: Table<Session, string>;

  constructor() {
    super('MyMenuDB');

    this.version(1).stores({
      // שם משתמש ייחודי לזיהוי מהיר בהתחברות
      profiles: 'id, &username, createdAt',
      // מזון גלובלי (profileId=null) או אישי; חיפוש לפי פרופיל
      foods: 'id, profileId, name, isCustom',
      // תפריט יומי לפי פרופיל+תאריך
      menus: 'id, profileId, date, [profileId+date], isWinner',
      // רישומי ארוחות לפי פרופיל+תאריך ולפי משבצת
      mealLogs: 'id, profileId, date, [profileId+date], [profileId+slot], eatenAt',
      // מים: רשומה אחת ליום לכל פרופיל
      waterLogs: 'id, profileId, date, [profileId+date]',
      // מאגר טיפים גלובלי (seed)
      tips: 'id, category',
      // היסטוריית טיפים שהוצגו לפרופיל
      tipHistory: 'id, profileId, tipId, [profileId+tipId], shownAt',
      // סטטיסטיקת מזון מחושבת (cache) לפי פרופיל+מאכל
      foodStats: 'id, profileId, foodId, [profileId+foodId]',
      // רשומת session יחידה (זיהוי מכשיר)
      session: 'id',
    });
  }
}

/** מופע יחיד של מסד הנתונים בשימוש כל האפליקציה */
export const db = new MyMenuDB();

// ===== פונקציות עזר בסיסיות לגישה =====

/** שולף פרופיל לפי מזהה */
export function getProfile(id: string): Promise<Profile | undefined> {
  return db.profiles.get(id);
}

/** שולף פרופיל לפי שם משתמש (ייחודי) */
export function getProfileByUsername(
  username: string,
): Promise<Profile | undefined> {
  return db.profiles.where('username').equals(username).first();
}

/** כל הפרופילים (למסך בחירת פרופיל) */
export function getAllProfiles(): Promise<Profile[]> {
  return db.profiles.orderBy('createdAt').toArray();
}

/** רשומת ה-session (זיהוי מכשיר) — עשויה להיות undefined לפני התחברות ראשונה */
export function getSession(): Promise<Session | undefined> {
  return db.session.get(SESSION_ID);
}

/**
 * מזון הזמין לפרופיל: המאגר הגלובלי (profileId=null) + המאגר האישי.
 * profileId=null אינו ניתן לאינדוקס ב-IndexedDB, לכן שולפים אותו בסינון.
 */
export async function getFoodsForProfile(
  profileId: string,
): Promise<FoodItem[]> {
  const [personal, global] = await Promise.all([
    db.foods.where('profileId').equals(profileId).toArray(),
    db.foods.filter((f) => f.profileId === null).toArray(),
  ]);
  return [...global, ...personal];
}

/**
 * נקודת כניסה ל-seed של המאגר (מאכלים + טיפים).
 * אידמפוטנטי: זורע רק אם הטבלה הרלוונטית ריקה, ולכן לא מכפיל בטעינות חוזרות.
 */
export async function seedIfEmpty(): Promise<void> {
  // ספירת המזון הגלובלי בלבד (profileId=null) — מזון אישי לא נחשב.
  const globalFoodsCount = await db.foods
    .filter((f) => f.profileId === null)
    .count();
  const tipsCount = await db.tips.count();

  if (globalFoodsCount === 0) {
    const { GLOBAL_FOODS } = await import('../data/foods');
    await db.foods.bulkAdd(GLOBAL_FOODS);
  }

  if (tipsCount === 0) {
    const { TIPS } = await import('../data/tips');
    await db.tips.bulkAdd(TIPS);
  }
}
