// ===== דיאלוג הוספת מאכל אישי (SPEC 5.3(5), 6.4) =====
// מאפשר לילדה להוסיף מאכל חדש שווה-ערך למאגר המובנה:
// emoji, קבוצות מזון מרובות, ומשבצות מרובות — כדי שיתרום לצ'קליסט
// הבית, ל-nutritionFit במנוע, ויוצע לכל הארוחות המתאימות.
import { useEffect, useMemo, useState } from 'react';
import type { FoodGroup, FoodItem, MealSlot } from '../types';
import type { AddCustomFoodInput } from '../db/foodRepo';
import {
  ALL_FOOD_GROUPS,
  FOOD_GROUP_COLORS,
  SLOT_LABELS,
} from '../utils/menuDisplay';
import { inferFoodInfo } from '../engine/foodInference';
import { BottomSheet } from './BottomSheet';
import styles from './AddFoodSheet.module.css';

/** כל המשבצות כולל הממתק היומי — לבחירה "לאילו ארוחות מתאים" */
const ALL_SLOTS: MealSlot[] = [
  'בוקר',
  'עשר',
  'צהריים',
  'מנחה',
  'ערב',
  'ממתק',
];

/** מבחר אימוג'י אוכל נפוצים לבחירה (ברירת מחדל 🍽️) */
const EMOJI_CHOICES: string[] = [
  '🍽️',
  '🍕',
  '🍔',
  '🍟',
  '🌭',
  '🍿',
  '🥗',
  '🥪',
  '🌮',
  '🌯',
  '🥙',
  '🧆',
  '🍝',
  '🍜',
  '🍲',
  '🍛',
  '🍣',
  '🍤',
  '🥟',
  '🍚',
  '🥞',
  '🧇',
  '🍳',
  '🥘',
  '🍦',
  '🍩',
  '🍪',
  '🎂',
  '🧁',
  '🍫',
  '🍬',
  '🍭',
  '🍎',
  '🍌',
  '🍓',
  '🍇',
  '🥕',
  '🥒',
  '🍞',
  '🧀',
  '🥛',
  '🥤',
];

interface AddFoodSheetProps {
  open: boolean;
  /** שם התחלתי (מחרוזת החיפוש) */
  initialName: string;
  /** משבצת ברירת מחדל שתסומן מראש */
  defaultSlot: MealSlot;
  /** המאגר המלא (גלובלי + אישי) לזיהוי אוטומטי של קבוצות מזון */
  knownFoods: FoodItem[];
  onClose: () => void;
  /** נקרא בשמירה עם הנתונים המלאים */
  onSave: (input: AddCustomFoodInput) => void;
}

/** צ'יפ נבחר/לא-נבחר (עוזר קטן להימנע מכפילות סגנון) */
function toggleInSet<T>(set: Set<T>, value: T): Set<T> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

export function AddFoodSheet({
  open,
  initialName,
  defaultSlot,
  knownFoods,
  onClose,
  onSave,
}: AddFoodSheetProps) {
  const [name, setName] = useState(initialName);
  const [emoji, setEmoji] = useState('🍽️');
  const [groups, setGroups] = useState<Set<FoodGroup>>(new Set());
  const [slots, setSlots] = useState<Set<MealSlot>>(new Set([defaultSlot]));
  // האם הילדה נגעה ידנית בקבוצות/אימוג'י — אם כן, לא לדרוס בזיהוי הבא
  const [groupsTouched, setGroupsTouched] = useState(false);
  const [emojiTouched, setEmojiTouched] = useState(false);
  // הקבוצות שזוהו אוטומטית (להצגת השורה הידידותית)
  const [inferred, setInferred] = useState<FoodGroup[]>([]);

  // כשנפתחת מחדש — לאתחל לפי הקלט הנוכחי
  useEffect(() => {
    if (!open) return;
    setName(initialName);
    setEmoji('🍽️');
    setGroups(new Set());
    setSlots(new Set([defaultSlot]));
    setGroupsTouched(false);
    setEmojiTouched(false);
    setInferred([]);
  }, [open, initialName, defaultSlot]);

  // זיהוי אוטומטי מקומי של "ממה המאכל עשוי" מתוך השם (עם debounce קצר).
  // מסמן מראש קבוצות + מציע emoji, אבל לא דורס בחירה ידנית של הילדה.
  useEffect(() => {
    if (!open) return;
    const handle = window.setTimeout(() => {
      const result = inferFoodInfo(name, knownFoods);
      setInferred(result.foodGroups);
      if (!groupsTouched) {
        setGroups(new Set(result.foodGroups));
      }
      if (!emojiTouched && result.emoji) {
        setEmoji(result.emoji);
      }
    }, 250);
    return () => window.clearTimeout(handle);
  }, [open, name, knownFoods, groupsTouched, emojiTouched]);

  function handleToggleGroup(g: FoodGroup) {
    setGroupsTouched(true);
    setGroups((s) => toggleInSet(s, g));
  }

  const nameValid = name.trim().length > 0;
  const showGroupHint = useMemo(() => groups.size === 0, [groups]);
  const inferMsg = useMemo(
    () => (inferred.length > 0 ? inferred.join(', ') : ''),
    [inferred],
  );

  function handleSave() {
    if (!nameValid) return;
    // אם לא נבחרה אף משבצת — נשתמש בברירת המחדל כדי שהמאכל יוצע לפחות פעם אחת
    const category: MealSlot[] =
      slots.size > 0 ? [...slots] : [defaultSlot];
    onSave({
      name: name.trim(),
      emoji,
      category,
      foodGroups: [...groups],
      tags: [],
    });
  }

  return (
    <BottomSheet open={open} title="הוספת מאכל חדש 🌟" onClose={onClose}>
      {/* שם המאכל */}
      <div className={styles.field}>
        <label className={styles.label} htmlFor="add-food-name">
          איך קוראים למאכל?
        </label>
        <input
          id="add-food-name"
          type="text"
          className={styles.input}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="למשל: פיצה של אמא"
          autoComplete="off"
        />
      </div>

      {/* בחירת אימוג'י */}
      <div className={styles.field}>
        <span className={styles.label}>בחרי סמל</span>
        <div className={styles.emojiGrid}>
          {EMOJI_CHOICES.map((e) => (
            <button
              key={e}
              type="button"
              className={`${styles.emojiBtn} ${
                emoji === e ? styles.emojiOn : ''
              }`}
              onClick={() => {
                setEmojiTouched(true);
                setEmoji(e);
              }}
              aria-label={`סמל ${e}`}
              aria-pressed={emoji === e}
            >
              {e}
            </button>
          ))}
        </div>
      </div>

      {/* קבוצות מזון */}
      <div className={styles.field}>
        <span className={styles.label}>ממה המאכל עשוי?</span>
        {inferMsg ? (
          <p className={styles.inferred}>
            נראה לי שזה עשוי מ: {inferMsg} 😊 אפשר לתקן אם טעיתי!
          </p>
        ) : (
          <p className={styles.hint}>זה עוזר לי להמליץ לך על תפריט מגוון 😊</p>
        )}
        <div className={styles.chips}>
          {ALL_FOOD_GROUPS.map((g) => {
            const on = groups.has(g);
            return (
              <button
                key={g}
                type="button"
                className={`${styles.chip} ${on ? styles.chipOn : ''}`}
                style={
                  on
                    ? {
                        background: FOOD_GROUP_COLORS[g],
                        borderColor: FOOD_GROUP_COLORS[g],
                      }
                    : { borderColor: FOOD_GROUP_COLORS[g] }
                }
                onClick={() => handleToggleGroup(g)}
                aria-pressed={on}
              >
                {g}
              </button>
            );
          })}
        </div>
      </div>

      {/* משבצות מתאימות */}
      <div className={styles.field}>
        <span className={styles.label}>לאילו ארוחות זה מתאים?</span>
        <div className={styles.chips}>
          {ALL_SLOTS.map((s) => {
            const on = slots.has(s);
            return (
              <button
                key={s}
                type="button"
                className={`${styles.chip} ${styles.slotChip} ${
                  on ? styles.slotChipOn : ''
                }`}
                onClick={() => setSlots((prev) => toggleInSet(prev, s))}
                aria-pressed={on}
              >
                {SLOT_LABELS[s]}
              </button>
            );
          })}
        </div>
      </div>

      {showGroupHint && (
        <p className={styles.gentle}>
          אפשר גם בלי, אבל זה עוזר לי להמליץ לך 😊
        </p>
      )}

      <button
        type="button"
        className={styles.saveBtn}
        onClick={handleSave}
        disabled={!nameValid}
      >
        שמירת המאכל
      </button>
    </BottomSheet>
  );
}
