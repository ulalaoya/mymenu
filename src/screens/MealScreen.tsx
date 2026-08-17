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
  setFoodQuantity,
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
  FoodQuantity,
  FoodStats,
  SatietyRating,
} from '../types';
import { todayString } from '../utils/date';
import {
  SLOT_ICONS,
  FOOD_GROUP_COLORS,
  SATIETY_FACES,
  AMOUNT_OPTIONS,
  BUILTIN_UNIT_OPTIONS,
  DEFAULT_AMOUNT,
  DEFAULT_UNIT,
} from '../utils/menuDisplay';
import { getCustomUnits, addCustomUnit } from '../utils/units';
import { BottomSheet } from '../components/BottomSheet';
import { AddFoodSheet } from '../components/AddFoodSheet';
import { FoodSymbol } from '../components/FoodSymbol';
import { Confetti } from '../components/Confetti';
import { Add, Sparkle } from '../components/icons';

/** ערך-דגל בבורר היחידה לפתיחת הוספת יחידה חדשה */
const ADD_UNIT_VALUE = '__add_unit__';
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
  const isAdult = profile?.isAdult ?? false;
  const navigate = useNavigate();
  const { key = '' } = useParams();
  const date = todayString();

  const [satiety, setSatiety] = useState<SatietyRating | 0>(0);
  const [addOpen, setAddOpen] = useState(false);
  const [addCustomOpen, setAddCustomOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [alternatives, setAlternatives] = useState<FoodItem[]>([]);
  const [celebrate, setCelebrate] = useState<string | null>(null);
  const [ratingsLoaded, setRatingsLoaded] = useState(false);
  // יחידות מדידה מותאמות שהמשתמשת הוסיפה (נטענות מ-localStorage)
  const [customUnits, setCustomUnits] = useState<string[]>([]);
  // המאכל שעבורו פתוחה כרגע הוספת יחידה חדשה, והטקסט שהוקלד
  const [addingUnitFor, setAddingUnitFor] = useState<string | null>(null);
  const [newUnit, setNewUnit] = useState('');

  useEffect(() => {
    setCustomUnits(getCustomUnits());
  }, []);

  // רשימת היחידות לבורר: המובנות + המותאמות (ללא כפילויות)
  const unitOptions = useMemo(
    () => Array.from(new Set([...BUILTIN_UNIT_OPTIONS, ...customUnits])),
    [customUnits],
  );

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

  // טעינת דירוג השובע הקיים פעם אחת (אם הארוחה כבר נרשמה)
  useEffect(() => {
    if (!profile || ratingsLoaded) return;
    void getSlotLog(profile.id, date, key).then((log) => {
      if (log) {
        setSatiety((log.satietyRating as SatietyRating) ?? 0);
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

  /** כמות נוכחית של מאכל בסלוט (עם ברירת מחדל) */
  function currentQuantity(foodId: string): FoodQuantity {
    return (
      slot?.quantities[foodId] ?? { amount: DEFAULT_AMOUNT, unit: DEFAULT_UNIT }
    );
  }

  async function handleAmount(foodId: string, amount: string) {
    if (!menu) return;
    await setFoodQuantity(menu.id, key, foodId, {
      amount,
      unit: currentQuantity(foodId).unit,
    });
  }

  async function handleUnit(foodId: string, value: string) {
    if (!menu) return;
    if (value === ADD_UNIT_VALUE) {
      setNewUnit('');
      setAddingUnitFor(foodId);
      return;
    }
    await setFoodQuantity(menu.id, key, foodId, {
      amount: currentQuantity(foodId).amount,
      unit: value,
    });
  }

  async function confirmAddUnit(foodId: string) {
    if (!menu) return;
    const unit = newUnit.trim();
    if (!unit) return;
    setCustomUnits(addCustomUnit(unit));
    await setFoodQuantity(menu.id, key, foodId, {
      amount: currentQuantity(foodId).amount,
      unit,
    });
    setAddingUnitFor(null);
    setNewUnit('');
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
      quantities: slot.quantities,
      plannedTime: slot.plannedTime,
      satietyRating: satiety === 0 ? undefined : satiety,
    });
    setCelebrate('כל הכבוד על המעקב!');
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
          {slotFoods.map((f) => {
            const q = currentQuantity(f.id);
            // מוודאים שהיחידה הנוכחית תמיד קיימת בבורר (גם אם נמחקה מהמאגר)
            const unitsForFood = unitOptions.includes(q.unit)
              ? unitOptions
              : [q.unit, ...unitOptions];
            return (
              <div key={f.id} className={styles.foodRow}>
                <div className={styles.foodTop}>
                  <span className={styles.foodEmoji}>
                    <FoodSymbol symbol={f.emoji} size={22} />
                  </span>
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

                <div className={styles.foodQty}>
                  <label className={styles.qtyField}>
                    <span className={styles.qtyCaption}>כמות</span>
                    <select
                      className={styles.qtySelect}
                      value={q.amount}
                      onChange={(e) => handleAmount(f.id, e.target.value)}
                      aria-label={`כמות של ${f.name}`}
                    >
                      {AMOUNT_OPTIONS.map((a) => (
                        <option key={a} value={a}>
                          {a}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className={styles.qtyField}>
                    <span className={styles.qtyCaption}>יחידה</span>
                    <select
                      className={styles.qtySelect}
                      value={q.unit}
                      onChange={(e) => handleUnit(f.id, e.target.value)}
                      aria-label={`יחידת מדידה של ${f.name}`}
                    >
                      {unitsForFood.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                      <option value={ADD_UNIT_VALUE}>➕ יחידה חדשה…</option>
                    </select>
                  </label>
                </div>

                {addingUnitFor === f.id && (
                  <div className={styles.addUnitRow}>
                    <input
                      type="text"
                      className={styles.addUnitInput}
                      value={newUnit}
                      onChange={(e) => setNewUnit(e.target.value)}
                      placeholder="שם היחידה (למשל: קופסה)"
                      autoComplete="off"
                      autoFocus
                    />
                    <button
                      type="button"
                      className={styles.addUnitBtn}
                      onClick={() => confirmAddUnit(f.id)}
                      disabled={!newUnit.trim()}
                    >
                      הוספה
                    </button>
                    <button
                      type="button"
                      className={styles.addUnitCancel}
                      onClick={() => {
                        setAddingUnitFor(null);
                        setNewUnit('');
                      }}
                    >
                      ביטול
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <button type="button" className={styles.addBtn} onClick={openAdd}>
          <Add size={20} color="var(--coral)" />
          הוספת מאכל
        </button>
      </section>

      {/* ===== דירוג שובע (המדד החשוב ביותר) — לא מוצג למבוגר ===== */}
      {!isAdult && (
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
      )}

      <button
        type="button"
        className={styles.saveBtn}
        onClick={handleSave}
        disabled={!canSave}
      >
        {eaten ? 'עדכון הארוחה 💾' : isAdult ? 'סיימתי 🎉' : 'אכלתי! 🎉'}
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
        {/* חיפוש תמיד בראש המגירה */}
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
                <span className={styles.foodEmoji}>
                  <FoodSymbol symbol={f.emoji} size={22} />
                </span>
                <span className={styles.foodName}>{f.name}</span>
                <Add size={20} color="var(--blue)" />
              </button>
            ))}
          </>
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
