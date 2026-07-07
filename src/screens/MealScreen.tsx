// ===== עמוד ארוחה בודדת — עריכה + רישום "נאכל" (מיזוג תפריט+רישום) =====
// SPEC 6.3 (עריכת מאכלים) + 6.4 (דירוגים) לארוחה אחת בלבד. נפתח מהבית.
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { useAuth } from '../hooks/useAuth';
import { db } from '../db/database';
import {
  getProfileFoods,
  filterFoodsForProfile,
  addCustomFood,
  type AddCustomFoodInput,
} from '../db/foodRepo';
import {
  getDiarySlot,
  addFoodToSlot,
  removeFoodFromSlot,
  setSlotTime,
  logSlotMeal,
  deleteSlotLog,
  getSlotLog,
} from '../db/menuService';
import {
  getAlternatives,
  loadFoodStats,
  collectRecentFoodIds,
  type FoodStatsComputed,
} from '../engine';
import type {
  FoodItem,
  FoodStats,
  SatietyRating,
  TasteRating,
} from '../types';
import { todayString } from '../utils/date';
import {
  SLOT_ICONS,
  FOOD_GROUP_COLORS,
  SATIETY_FACES,
  MOODS,
  randomEncouragement,
} from '../utils/menuDisplay';
import { BottomSheet } from '../components/BottomSheet';
import { AddFoodSheet } from '../components/AddFoodSheet';
import { Confetti } from '../components/Confetti';
import { StarFilled, StarEmpty, Add, Sparkle } from '../components/icons';
import styles from './MealScreen.module.css';

function toComputed(raw: Map<string, FoodStats>): Map<string, FoodStatsComputed> {
  const out = new Map<string, FoodStatsComputed>();
  for (const [id, s] of raw) {
    out.set(id, {
      ...s,
      actuallyAteRate: s.timesOffered > 0 ? s.timesEaten / s.timesOffered : 0,
    });
  }
  return out;
}

export function MealScreen() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { key = '' } = useParams();
  const date = todayString();

  const [taste, setTaste] = useState<TasteRating | 0>(0);
  const [satiety, setSatiety] = useState<SatietyRating | 0>(0);
  const [mood, setMood] = useState<string>('');
  const [addOpen, setAddOpen] = useState(false);
  const [addCustomOpen, setAddCustomOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [alternatives, setAlternatives] = useState<FoodItem[]>([]);
  const [celebrate, setCelebrate] = useState<string | null>(null);
  const [ratingsLoaded, setRatingsLoaded] = useState(false);

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

  const mealLogs = useLiveQuery(
    () =>
      profile
        ? db.mealLogs
            .where('[profileId+date]')
            .equals([profile.id, date])
            .toArray()
        : [],
    [profile?.id, date],
  );

  const foodsById = useMemo(() => {
    const m = new Map<string, FoodItem>();
    (foods ?? []).forEach((f) => m.set(f.id, f));
    return m;
  }, [foods]);

  const slot = useMemo(
    () => (menu && profile ? getDiarySlot(menu, profile, key) : undefined),
    [menu, profile, key],
  );

  const eaten = useMemo(
    () => (mealLogs ?? []).some((l) => (l.slotId ?? l.slot) === key),
    [mealLogs, key],
  );

  // טעינת דירוגים קיימים פעם אחת (אם הארוחה כבר נרשמה)
  useEffect(() => {
    if (!profile || ratingsLoaded) return;
    void getSlotLog(profile.id, date, key).then((log) => {
      if (log) {
        setTaste((log.tasteRating as TasteRating) ?? 0);
        setSatiety((log.satietyRating as SatietyRating) ?? 0);
        setMood(log.mood ?? '');
      }
      setRatingsLoaded(true);
    });
  }, [profile, date, key, ratingsLoaded]);

  const slotFoods = useMemo(
    () =>
      (slot?.foodIds ?? [])
        .map((id) => foodsById.get(id))
        .filter(Boolean) as FoodItem[],
    [slot, foodsById],
  );

  async function openAdd() {
    if (!profile || !slot || !menu) return;
    setSearch('');
    setAddOpen(true);
    const [rawStats, menus, logs] = await Promise.all([
      loadFoodStats(profile.id),
      db.menus.where('profileId').equals(profile.id).toArray(),
      db.mealLogs.where('profileId').equals(profile.id).toArray(),
    ]);
    const recentFoodIds = collectRecentFoodIds(date, 3, menus, logs);
    const excludeIds = new Set<string>(slot.foodIds);
    const alts = getAlternatives(slot.slot, profile, foods ?? [], toComputed(rawStats), {
      recentFoodIds,
      excludeIds,
      count: 4,
    });
    setAlternatives(alts);
  }

  async function addFood(foodId: string) {
    if (!menu) return;
    await addFoodToSlot(menu.id, key, foodId);
    setAddOpen(false);
  }

  async function removeFood(foodId: string) {
    if (!menu) return;
    await removeFoodFromSlot(menu.id, key, foodId);
  }

  async function handleAddCustomFood(input: AddCustomFoodInput) {
    if (!profile || !menu) return;
    const food = await addCustomFood(profile.id, input);
    await addFoodToSlot(menu.id, key, food.id);
    setAddCustomOpen(false);
    setAddOpen(false);
  }

  async function handleTime(value: string) {
    if (!menu) return;
    await setSlotTime(menu.id, key, value);
  }

  async function handleSave() {
    if (!profile || !slot || slot.foodIds.length === 0) return;
    await logSlotMeal(profile.id, date, {
      slotKey: key,
      slot: slot.slot,
      slotLabel: slot.custom ? slot.label : undefined,
      foodIds: slot.foodIds,
      plannedTime: slot.plannedTime,
      tasteRating: taste === 0 ? undefined : taste,
      satietyRating: satiety === 0 ? undefined : satiety,
      mood: mood || undefined,
    });
    setCelebrate(randomEncouragement());
    window.setTimeout(() => navigate('/'), 1400);
  }

  async function handleUnlog() {
    if (!profile) return;
    await deleteSlotLog(profile.id, date, key);
  }

  // חיפוש חופשי בכל המאגר הזמין (לא מוגבל למשבצת — גמישות יומן)
  const searchResults = useMemo(() => {
    if (!profile) return [];
    const q = search.trim();
    if (!q) return [];
    const available = filterFoodsForProfile(foods ?? [], profile).filter(
      (f) => !(slot?.foodIds ?? []).includes(f.id),
    );
    return available.filter((f) => f.name.includes(q)).slice(0, 20);
  }, [profile, foods, search, slot]);

  if (!menu || !slot) {
    return (
      <div className={styles.wrap}>
        <button
          type="button"
          className={styles.backBtn}
          onClick={() => navigate('/')}
        >
          → חזרה
        </button>
        <p className={styles.empty}>הארוחה לא נמצאה.</p>
      </div>
    );
  }

  const Icon = SLOT_ICONS[slot.slot];
  const canSave = slot.foodIds.length > 0;

  return (
    <div className={styles.wrap}>
      {celebrate && (
        <>
          <Confetti />
          <div className={styles.celebrate}>{celebrate}</div>
        </>
      )}

      <header className={styles.header}>
        <button
          type="button"
          className={styles.backBtn}
          onClick={() => navigate('/')}
          aria-label="חזרה"
        >
          →
        </button>
        <span className={styles.headIcon}>
          <Icon size={26} />
        </span>
        <h1 className={styles.title}>{slot.label}</h1>
      </header>

      {/* ===== שעה ===== */}
      <section className="card">
        <h2 className={styles.sectionTitle}>מתי?</h2>
        <input
          type="time"
          className={styles.timeInput}
          value={slot.plannedTime}
          onChange={(e) => handleTime(e.target.value)}
        />
      </section>

      {/* ===== המאכלים בארוחה ===== */}
      <section className="card">
        <h2 className={styles.sectionTitle}>מה יש בארוחה?</h2>
        {slotFoods.length === 0 && (
          <p className={styles.empty}>עוד לא הוספת מאכלים לארוחה הזו</p>
        )}
        <div className={styles.foodList}>
          {slotFoods.map((f) => (
            <div key={f.id} className={styles.foodRow}>
              <span className={styles.foodEmoji}>{f.emoji}</span>
              <span className={styles.foodName}>{f.name}</span>
              <span className={styles.foodGroups}>
                {f.foodGroups.map((g) => (
                  <span
                    key={g}
                    className={styles.groupTag}
                    style={{ background: FOOD_GROUP_COLORS[g] }}
                  >
                    {g}
                  </span>
                ))}
              </span>
              <button
                type="button"
                className={styles.removeBtn}
                onClick={() => removeFood(f.id)}
                aria-label={`הסרת ${f.name}`}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <button type="button" className={styles.addBtn} onClick={openAdd}>
          <Add size={20} color="var(--coral)" />
          הוספת מאכל
        </button>
      </section>

      {/* ===== דירוגים (הכי פחות מימין, הכי הרבה משמאל) ===== */}
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
                <Star size={34} />
              </button>
            );
          })}
        </div>
      </section>

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
        {eaten ? 'עדכון הארוחה 💾' : 'אכלתי! 🎉'}
      </button>
      {eaten && (
        <button type="button" className={styles.unlogBtn} onClick={handleUnlog}>
          ביטול הסימון "נאכל"
        </button>
      )}

      {/* ===== מגירת הוספת מאכל ===== */}
      <BottomSheet
        open={addOpen}
        title={`הוספה ל${slot.label}`}
        onClose={() => setAddOpen(false)}
      >
        {alternatives.length > 0 && (
          <>
            <div className={styles.sheetLabel}>
              <Sparkle size={18} /> ההצעות שלנו
            </div>
            {alternatives.map((f) => (
              <button
                key={f.id}
                type="button"
                className={styles.sheetFood}
                onClick={() => addFood(f.id)}
              >
                <span className={styles.foodEmoji}>{f.emoji}</span>
                <span className={styles.foodName}>{f.name}</span>
                <Add size={20} color="var(--blue)" />
              </button>
            ))}
          </>
        )}
        <div className={styles.sheetLabel}>חיפוש חופשי</div>
        <input
          type="text"
          className={styles.searchInput}
          placeholder="חיפוש מאכל..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {searchResults.map((f) => (
          <button
            key={f.id}
            type="button"
            className={styles.sheetFood}
            onClick={() => addFood(f.id)}
          >
            <span className={styles.foodEmoji}>{f.emoji}</span>
            <span className={styles.foodName}>{f.name}</span>
            <Add size={20} color="var(--blue)" />
          </button>
        ))}
        {search.trim() &&
          !searchResults.some((f) => f.name === search.trim()) && (
            <button
              type="button"
              className={styles.addFree}
              onClick={() => setAddCustomOpen(true)}
            >
              <Add size={20} color="var(--coral)" />
              הוספת "{search.trim()}" כמאכל חדש
            </button>
          )}
      </BottomSheet>

      {/* ===== הוספת מאכל חדש למאגר ===== */}
      <AddFoodSheet
        open={addCustomOpen}
        initialName={search.trim()}
        defaultSlot={slot.slot}
        knownFoods={foods ?? []}
        onClose={() => setAddCustomOpen(false)}
        onSave={handleAddCustomFood}
      />
    </div>
  );
}
