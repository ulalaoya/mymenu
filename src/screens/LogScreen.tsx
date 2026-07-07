// ===== רישום ארוחה — SPEC סעיף 6.4 =====
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { useAuth } from '../hooks/useAuth';
import { db } from '../db/database';
import {
  getProfileFoods,
  filterFoodsForProfile,
  addCustomFood,
  type AddCustomFoodInput,
} from '../db/foodRepo';
import { logMeal } from '../db/menuService';
import type {
  FoodItem,
  MealSlot,
  SatietyRating,
  TasteRating,
} from '../types';
import { todayString, toTimeString, minutesOfDay, timeToMinutes } from '../utils/date';
import {
  DAY_SLOTS,
  SLOT_LABELS,
  SLOT_ICONS,
  SATIETY_FACES,
  MOODS,
  randomEncouragement,
} from '../utils/menuDisplay';
import { Confetti } from '../components/Confetti';
import { AddFoodSheet } from '../components/AddFoodSheet';
import { StarFilled, StarEmpty, Add } from '../components/icons';
import styles from './LogScreen.module.css';

/** בוחר משבצת ברירת מחדל לפי השעה הנוכחית (הקרובה ביותר שלא עברה מדי) */
function defaultSlotForNow(
  slotTimes: Map<MealSlot, string>,
  nowMin: number,
): MealSlot {
  let best: MealSlot = 'בוקר';
  let bestDiff = Infinity;
  for (const slot of DAY_SLOTS) {
    const t = timeToMinutes(slotTimes.get(slot) ?? '');
    if (t == null) continue;
    const diff = Math.abs(nowMin - t);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = slot;
    }
  }
  return best;
}

export function LogScreen() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const date = todayString();

  const [slot, setSlot] = useState<MealSlot>('בוקר');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [time, setTime] = useState(() => toTimeString());
  const [taste, setTaste] = useState<TasteRating | 0>(0);
  const [satiety, setSatiety] = useState<SatietyRating | 0>(0);
  const [mood, setMood] = useState<string>('');
  const [search, setSearch] = useState('');
  const [celebrate, setCelebrate] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [slotTouched, setSlotTouched] = useState(false);
  const [addSheetOpen, setAddSheetOpen] = useState(false);

  const menu = useLiveQuery(
    () =>
      profile
        ? db.menus.where('[profileId+date]').equals([profile.id, date]).first()
        : undefined,
    [profile?.id, date],
  );

  const foods = useLiveQuery(
    () => (profile ? getProfileFoods(profile.id) : []),
    [profile?.id],
  );

  const foodsById = useMemo(() => {
    const m = new Map<string, FoodItem>();
    (foods ?? []).forEach((f) => m.set(f.id, f));
    return m;
  }, [foods]);

  // ברירת מחדל למשבצת לפי השעה (רק עד שהמשתמשת נוגעת)
  useEffect(() => {
    if (slotTouched || !menu) return;
    const times = new Map<MealSlot, string>();
    menu.slots.forEach((s) => times.set(s.slot, s.plannedTime));
    setSlot(defaultSlotForNow(times, minutesOfDay()));
  }, [menu, slotTouched]);

  // המאכלים המומלצים למשבצת שנבחרה (מהתפריט)
  const plannedFoods = useMemo(() => {
    const ms = menu?.slots.find((s) => s.slot === slot);
    return (ms?.foodIds ?? [])
      .map((id) => foodsById.get(id))
      .filter(Boolean) as FoodItem[];
  }, [menu, slot, foodsById]);

  // תוצאות חיפוש/הוספה חופשית
  const searchResults = useMemo(() => {
    if (!profile) return [];
    const q = search.trim();
    if (!q) return [];
    const available = filterFoodsForProfile(foods ?? [], profile);
    return available.filter((f) => f.name.includes(q)).slice(0, 20);
  }, [profile, foods, search]);

  function toggleFood(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleAddCustomFood(input: AddCustomFoodInput) {
    if (!profile) return;
    // מאכל חדש → נשמר למאגר האישי עם נתונים מלאים (SPEC 5.3(5), 6.4)
    const food = await addCustomFood(profile.id, input);
    toggleFood(food.id);
    setAddSheetOpen(false);
    setSearch('');
  }

  const plannedIdSet = useMemo(
    () => new Set(plannedFoods.map((f) => f.id)),
    [plannedFoods],
  );

  async function handleSave() {
    if (!profile || selectedIds.size === 0) return;
    setBusy(true);
    const ids = [...selectedIds];
    const wasFromPlan = ids.some((id) => plannedIdSet.has(id));
    const [hh, mm] = time.split(':').map(Number);
    const eatenAt = new Date();
    eatenAt.setHours(hh || 0, mm || 0, 0, 0);
    try {
      await logMeal({
        profileId: profile.id,
        date,
        slot,
        foodIds: ids,
        eatenAt: eatenAt.getTime(),
        tasteRating: taste === 0 ? undefined : taste,
        satietyRating: satiety === 0 ? undefined : satiety,
        mood: mood || undefined,
        wasFromPlan,
      });
      setCelebrate(randomEncouragement());
      window.setTimeout(() => navigate('/'), 1600);
    } catch {
      setBusy(false);
    }
  }

  const canSave = selectedIds.size > 0 && !busy;

  return (
    <div className={styles.wrap}>
      {celebrate && (
        <>
          <Confetti />
          <div className={styles.celebrate}>{celebrate}</div>
        </>
      )}

      <header className={styles.header}>
        <h1 className={styles.title}>מה אכלת?</h1>
      </header>

      {/* ===== בחירת משבצת ===== */}
      <section className="card">
        <h2 className={styles.sectionTitle}>איזו ארוחה?</h2>
        <div className={styles.slotChips}>
          {DAY_SLOTS.map((s) => {
            const Icon = SLOT_ICONS[s];
            const on = s === slot;
            return (
              <button
                key={s}
                type="button"
                className={`${styles.slotChip} ${on ? styles.slotChipOn : ''}`}
                onClick={() => {
                  setSlot(s);
                  setSlotTouched(true);
                }}
              >
                <Icon size={20} color={on ? '#fff' : 'var(--blue)'} />
                {SLOT_LABELS[s]}
              </button>
            );
          })}
        </div>
      </section>

      {/* ===== בחירת מאכלים ===== */}
      <section className="card">
        <h2 className={styles.sectionTitle}>בחרי מהתפריט או הוסיפי</h2>
        {plannedFoods.length > 0 && (
          <div className={styles.foodGrid}>
            {plannedFoods.map((f) => (
              <button
                key={f.id}
                type="button"
                className={`${styles.foodChip} ${
                  selectedIds.has(f.id) ? styles.foodChipOn : ''
                }`}
                onClick={() => toggleFood(f.id)}
              >
                <span className={styles.chipEmoji}>{f.emoji}</span>
                {f.name}
              </button>
            ))}
          </div>
        )}

        <input
          type="text"
          className={styles.searchInput}
          placeholder="חיפוש או הוספת מאכל חדש..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {searchResults.length > 0 && (
          <div className={styles.foodGrid}>
            {searchResults.map((f) => (
              <button
                key={f.id}
                type="button"
                className={`${styles.foodChip} ${
                  selectedIds.has(f.id) ? styles.foodChipOn : ''
                }`}
                onClick={() => toggleFood(f.id)}
              >
                <span className={styles.chipEmoji}>{f.emoji}</span>
                {f.name}
              </button>
            ))}
          </div>
        )}

        {search.trim() &&
          !searchResults.some((f) => f.name === search.trim()) && (
            <button
              type="button"
              className={styles.addFree}
              onClick={() => setAddSheetOpen(true)}
            >
              <Add size={20} color="var(--coral)" />
              הוספת "{search.trim()}" כמאכל חדש
            </button>
          )}
      </section>

      {/* ===== מתי ===== */}
      <section className="card">
        <h2 className={styles.sectionTitle}>מתי?</h2>
        <input
          type="time"
          className={styles.timeInput}
          value={time}
          onChange={(e) => setTime(e.target.value)}
        />
      </section>

      {/* ===== דירוג טעם ===== */}
      <section className="card">
        <h2 className={styles.sectionTitle}>איך היה הטעם?</h2>
        <div className={styles.stars}>
          {[1, 2, 3, 4, 5].map((n) => {
            const Star = n <= taste ? StarFilled : StarEmpty;
            return (
              <button
                key={n}
                type="button"
                className={styles.starBtn}
                onClick={() => setTaste(n as TasteRating)}
                aria-label={`${n} כוכבים`}
              >
                <Star size={36} />
              </button>
            );
          })}
        </div>
      </section>

      {/* ===== דירוג שובע ===== */}
      <section className="card">
        <h2 className={styles.sectionTitle}>כמה את שבעה?</h2>
        <div className={styles.faces}>
          {SATIETY_FACES.map((f) => (
            <button
              key={f.value}
              type="button"
              className={`${styles.faceBtn} ${
                satiety === f.value ? styles.faceOn : ''
              }`}
              onClick={() => setSatiety(f.value)}
              aria-label={f.label}
              title={f.label}
            >
              <span className={styles.faceEmoji}>{f.emoji}</span>
            </button>
          ))}
        </div>
        {satiety !== 0 && (
          <p className={styles.faceLabel}>
            {SATIETY_FACES.find((f) => f.value === satiety)?.label}
          </p>
        )}
      </section>

      {/* ===== מצב רוח (אופציונלי) ===== */}
      <section className="card">
        <h2 className={styles.sectionTitle}>מצב הרוח (רשות)</h2>
        <div className={styles.moods}>
          {MOODS.map((m) => (
            <button
              key={m.emoji}
              type="button"
              className={`${styles.moodBtn} ${
                mood === m.emoji ? styles.moodOn : ''
              }`}
              onClick={() => setMood(mood === m.emoji ? '' : m.emoji)}
              aria-label={m.label}
              title={m.label}
            >
              {m.emoji}
            </button>
          ))}
        </div>
      </section>

      <button
        type="button"
        className={styles.saveBtn}
        onClick={handleSave}
        disabled={!canSave}
      >
        שמירה
      </button>

      <AddFoodSheet
        open={addSheetOpen}
        initialName={search.trim()}
        defaultSlot={slot}
        knownFoods={foods ?? []}
        onClose={() => setAddSheetOpen(false)}
        onSave={handleAddCustomFood}
      />
    </div>
  );
}
