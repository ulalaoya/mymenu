// ===== עזרי בדיקה משותפים למנוע (לא נכללים בפרודקשן־UI) =====
import type {
  FoodGroup,
  FoodItem,
  MealLog,
  MealSlot,
  Profile,
  TasteRating,
  SatietyRating,
} from '../types';
import type { FoodStatsComputed } from './foodStats';
import { foodStatsId } from './foodStats';

let foodCounter = 0;

/** יוצר FoodItem לבדיקה */
export function makeFood(over: Partial<FoodItem> = {}): FoodItem {
  foodCounter += 1;
  return {
    id: over.id ?? `f-${foodCounter}`,
    profileId: null,
    name: over.name ?? `מאכל-${foodCounter}`,
    emoji: '🍽️',
    category: over.category ?? (['צהריים'] as MealSlot[]),
    foodGroups: over.foodGroups ?? (['פחמימות'] as FoodGroup[]),
    tags: over.tags ?? [],
    isCustom: over.isCustom ?? false,
    ...over,
  };
}

/** יוצר Profile לבדיקה */
export function makeProfile(over: Partial<Profile> = {}): Profile {
  return {
    id: 'profile-test',
    username: 'noa',
    passwordHash: 'x',
    salt: 'x',
    recoveryQ: 'q',
    recoveryAHash: 'x',
    avatar: '🦄',
    color: '#5B9BD5',
    allergies: [],
    vegetarian: false,
    mealTimes: {
      בוקר: '07:00',
      עשר: '10:00',
      צהריים: '13:30',
      מנחה: '16:00',
      ערב: '19:00',
    },
    createdAt: Date.now(),
    ...over,
  };
}

/** יוצר FoodStatsComputed לבדיקה */
export function makeStats(
  foodId: string,
  over: Partial<FoodStatsComputed> = {},
): FoodStatsComputed {
  const timesOffered = over.timesOffered ?? 1;
  const timesEaten = over.timesEaten ?? 1;
  return {
    id: foodStatsId('profile-test', foodId),
    profileId: 'profile-test',
    foodId,
    tasteAvg: over.tasteAvg ?? 3,
    satietyAvg: over.satietyAvg ?? 3,
    timesOffered,
    timesEaten,
    actuallyAteRate:
      over.actuallyAteRate ??
      (timesOffered > 0 ? timesEaten / timesOffered : 0),
    lastEatenDate: over.lastEatenDate,
    lastOfferedDate: over.lastOfferedDate,
    ...over,
  };
}

/** יוצר MealLog לבדיקה */
export function makeLog(over: Partial<MealLog> = {}): MealLog {
  return {
    id: over.id ?? crypto.randomUUID(),
    profileId: over.profileId ?? 'profile-test',
    date: over.date ?? '2026-07-06',
    slot: over.slot ?? ('צהריים' as MealSlot),
    foodIds: over.foodIds ?? [],
    eatenAt: over.eatenAt ?? Date.now(),
    tasteRating: over.tasteRating as TasteRating | undefined,
    satietyRating: over.satietyRating as SatietyRating | undefined,
    mood: over.mood,
    wasFromPlan: over.wasFromPlan ?? true,
    ...over,
  };
}
