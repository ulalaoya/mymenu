// ===== מודל הנתונים של MyMenu (SPEC סעיפים 4 ו-7) =====

/** משבצות הארוחות במהלך היום */
export type MealSlot =
  | 'בוקר'
  | 'עשר'
  | 'צהריים'
  | 'מנחה'
  | 'ערב'
  | 'ממתק';

/** קבוצות המזון (SPEC סעיף 4) */
export type FoodGroup =
  | 'פחמימות'
  | 'חלבונים'
  | 'מוצרי חלב'
  | 'קטניות'
  | 'ירקות'
  | 'פירות'
  | 'שומנים בריאים'
  | 'מתוקים';

/** פריט מזון במאגר */
export interface FoodItem {
  id: string;
  /** null = מאגר גלובלי; אחרת מזוהה לפרופיל ספציפי */
  profileId: string | null;
  name: string;
  emoji: string;
  /** לאילו ארוחות מתאים */
  category: MealSlot[];
  foodGroups: FoodGroup[];
  tags: string[];
  /** האם נוסף ידנית על ידי המשתמשת */
  isCustom: boolean;
}

/** פרופיל משתמשת */
export interface Profile {
  id: string;
  username: string;
  passwordHash: string;
  salt: string;
  recoveryQ: string;
  recoveryAHash: string;
  /** salt נפרד ל-hash של תשובת השחזור */
  recoverySalt?: string;
  avatar: string;
  color: string;
  allergies: string[];
  vegetarian: boolean;
  /** שעות ארוחה מועדפות לפי משבצת (למשל { בוקר: "07:00" }) */
  mealTimes: Partial<Record<MealSlot, string>>;
  createdAt: number;
}

/** משבצת בתוך תפריט יומי */
export interface MenuSlot {
  slot: MealSlot;
  foodIds: string[];
  plannedTime: string;
}

/** תפריט יומי מומלץ */
export interface Menu {
  id: string;
  profileId: string;
  /** תאריך בפורמט YYYY-MM-DD */
  date: string;
  slots: MenuSlot[];
  sweetFoodId?: string;
  overallRating?: number;
  isWinner: boolean;
}

/** סקאלת שובע — 5 פרצופים */
export type SatietyRating = 1 | 2 | 3 | 4 | 5;
/** דירוג טעם — כוכבים */
export type TasteRating = 1 | 2 | 3 | 4 | 5;

/** רישום ארוחה בפועל */
export interface MealLog {
  id: string;
  profileId: string;
  date: string;
  slot: MealSlot;
  foodIds: string[];
  /** timestamp של שעת האכילה */
  eatenAt: number;
  tasteRating?: TasteRating;
  satietyRating?: SatietyRating;
  mood?: string;
  /** האם נאכל מתוך התפריט המתוכנן */
  wasFromPlan: boolean;
}

/** רישום שתיית מים ליום */
export interface WaterLog {
  id: string;
  profileId: string;
  date: string;
  cups: number;
}

/** טיפ יומי (seed בלבד) */
export interface Tip {
  id: string;
  text: string;
  category: string;
}

/** היסטוריית טיפים שהוצגו לפרופיל */
export interface TipHistory {
  id: string;
  profileId: string;
  tipId: string;
  shownAt: number;
}

/** סטטיסטיקת מאכל (מחושב, cache) */
export interface FoodStats {
  id: string;
  profileId: string;
  foodId: string;
  tasteAvg: number;
  satietyAvg: number;
  timesOffered: number;
  timesEaten: number;
  lastEatenDate?: string;
  lastOfferedDate?: string;
}

/** מצב הסשן / זיהוי מכשיר */
export interface Session {
  /** מפתח קבוע לרשומה היחידה */
  id: string;
  deviceToken: string;
  lastProfileId?: string;
}
