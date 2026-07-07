// ===== Repository שאילתות מזון — SPEC סעיפים 4, 5.3 =====
// שכבת גישה למאגר המזון שתשרת את מנוע ההמלצות והמסכים בשלבים הבאים.

import type { FoodItem, FoodGroup, MealSlot, Profile } from '../types';
import { db } from './database';

/** מזהה ייחודי (crypto.randomUUID זמין בדפדפן וב-Node 24) */
function newId(): string {
  return crypto.randomUUID();
}

/** כל המזון הגלובלי (profileId=null). לא ניתן לאנדקס null, לכן סינון. */
export function getGlobalFoods(): Promise<FoodItem[]> {
  return db.foods.filter((f) => f.profileId === null).toArray();
}

/**
 * כל המזון הזמין לפרופיל: המאגר הגלובלי + המאגר האישי, מאוחדים.
 * הגלובלי קודם, אחריו האישי.
 */
export async function getProfileFoods(profileId: string): Promise<FoodItem[]> {
  const [global, personal] = await Promise.all([
    getGlobalFoods(),
    db.foods.where('profileId').equals(profileId).toArray(),
  ]);
  return [...global, ...personal];
}

/** מזון שמתאים למשבצת ארוחה מסוימת (מתוך המאגר הזמין לפרופיל) */
export async function getFoodsForSlot(
  profileId: string,
  slot: MealSlot,
): Promise<FoodItem[]> {
  const foods = await getProfileFoods(profileId);
  return foods.filter((f) => f.category.includes(slot));
}

/** שליפת מאכל בודד לפי מזהה */
export function getFoodById(id: string): Promise<FoodItem | undefined> {
  return db.foods.get(id);
}

/** קלט להוספת מאכל אישי חדש */
export interface AddCustomFoodInput {
  name: string;
  emoji: string;
  category: MealSlot[];
  foodGroups: FoodGroup[];
  tags: string[];
}

/**
 * מוסיף מאכל אישי (isCustom=true) למאגר האישי של הפרופיל ומחזיר את הפריט.
 * SPEC 5.3(5): מאכל שנרשם ידנית נשמר אוטומטית למאגר האישי לשימוש עתידי.
 */
export async function addCustomFood(
  profileId: string,
  input: AddCustomFoodInput,
): Promise<FoodItem> {
  const food: FoodItem = {
    id: newId(),
    profileId,
    name: input.name,
    emoji: input.emoji,
    category: input.category,
    foodGroups: input.foodGroups,
    tags: input.tags,
    isCustom: true,
  };
  await db.foods.add(food);
  return food;
}

/** האם מאכל מכיל בשר/עוף/דגים — לפי tag "בשרי" (מסומן ב-seed) */
export function isMeatFood(food: FoodItem): boolean {
  return food.tags.includes('בשרי');
}

/**
 * האם מאכל מכיל אלרגן שסומן בפרופיל.
 * התאמה פשוטה: אלרגן שמופיע בשם המאכל או ברשימת ה-tags שלו.
 */
export function foodHasAllergen(food: FoodItem, allergies: string[]): boolean {
  if (allergies.length === 0) return false;
  const haystack = [food.name, ...food.tags];
  return allergies.some((allergen) => {
    const a = allergen.trim();
    if (a.length === 0) return false;
    return haystack.some((h) => h.includes(a));
  });
}

/**
 * מסנן רשימת מאכלים לפי אילוצי הפרופיל:
 * - צמחונית → מסיר מאכלים בשריים (בשר/עוף/דגים).
 * - אלרגיות → מסיר מאכלים שמכילים אלרגן מסומן.
 */
export function filterFoodsForProfile(
  foods: FoodItem[],
  profile: Pick<Profile, 'allergies' | 'vegetarian'>,
): FoodItem[] {
  return foods.filter((f) => {
    if (profile.vegetarian && isMeatFood(f)) return false;
    if (foodHasAllergen(f, profile.allergies)) return false;
    return true;
  });
}
