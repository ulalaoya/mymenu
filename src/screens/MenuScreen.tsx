// ===== מסך התפריט היומי — SPEC סעיף 6.3 =====
import { useMemo, useState } from 'react';
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
  replaceSlotFood,
  setSweet,
  reshuffleTodayMenu,
} from '../db/menuService';
import {
  getAlternatives,
  loadFoodStats,
  collectRecentFoodIds,
  type FoodStatsComputed,
} from '../engine';
import type { FoodItem, FoodStats, MealSlot } from '../types';
import { todayString } from '../utils/date';
import {
  DAY_SLOTS,
  SLOT_LABELS,
  SLOT_ICONS,
  FOOD_GROUP_COLORS,
} from '../utils/menuDisplay';
import { BottomSheet } from '../components/BottomSheet';
import { AddFoodSheet } from '../components/AddFoodSheet';
import { Refresh, Sweets, Sparkle, Add } from '../components/icons';
import styles from './MenuScreen.module.css';

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

export function MenuScreen() {
  const { profile } = useAuth();
  const date = todayString();
  const [busy, setBusy] = useState(false);
  // המשבצת שנפתחת בה מגירת החלפה (null = סגור)
  const [sheetSlot, setSheetSlot] = useState<MealSlot | null>(null);
  const [sweetOpen, setSweetOpen] = useState(false);
  const [search, setSearch] = useState('');
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

  // חלופות + חיפוש למשבצת הפתוחה
  const [alternatives, setAlternatives] = useState<FoodItem[]>([]);
  const [replacing, setReplacing] = useState<string | undefined>();

  async function openReplace(slot: MealSlot, oldFoodId: string) {
    if (!profile) return;
    setSheetSlot(slot);
    setReplacing(oldFoodId);
    setSearch('');
    const [rawStats, menus, mealLogs] = await Promise.all([
      loadFoodStats(profile.id),
      db.menus.where('profileId').equals(profile.id).toArray(),
      db.mealLogs.where('profileId').equals(profile.id).toArray(),
    ]);
    const recentFoodIds = collectRecentFoodIds(date, 3, menus, mealLogs);
    const excludeIds = new Set<string>(
      (menu?.slots.flatMap((s) => s.foodIds) ?? []).concat(
        menu?.sweetFoodId ? [menu.sweetFoodId] : [],
      ),
    );
    const alts = getAlternatives(
      slot,
      profile,
      foods ?? [],
      toComputed(rawStats),
      { recentFoodIds, excludeIds, count: 3 },
    );
    setAlternatives(alts);
  }

  async function doReplace(newFoodId: string) {
    if (!profile || !menu || !sheetSlot) return;
    await replaceSlotFood(menu.id, sheetSlot, newFoodId, replacing);
    setSheetSlot(null);
  }

  // הוספת מאכל חדש מתוך מסך התכנון — נשמר למאגר ומחליף במשבצת
  async function handleAddCustomFood(input: AddCustomFoodInput) {
    if (!profile || !menu || !sheetSlot) return;
    const food = await addCustomFood(profile.id, input);
    await replaceSlotFood(menu.id, sheetSlot, food.id, replacing);
    setAddSheetOpen(false);
    setSheetSlot(null);
  }

  async function doReshuffle() {
    if (!profile) return;
    setBusy(true);
    try {
      await reshuffleTodayMenu(profile, date);
    } finally {
      setBusy(false);
    }
  }

  async function chooseSweet(foodId: string) {
    if (!menu) return;
    await setSweet(menu.id, foodId);
    setSweetOpen(false);
  }

  // חיפוש חופשי במאגר המסונן למשבצת הפתוחה
  const searchResults = useMemo(() => {
    if (!profile || !sheetSlot) return [];
    const available = filterFoodsForProfile(foods ?? [], profile).filter(
      (f) => f.category.includes(sheetSlot),
    );
    const q = search.trim();
    const list = q
      ? available.filter((f) => f.name.includes(q))
      : available;
    return list.slice(0, 30);
  }, [profile, sheetSlot, foods, search]);

  // מתוקים לבחירת הממתק היומי
  const sweets = useMemo(() => {
    if (!profile) return [];
    return filterFoodsForProfile(foods ?? [], profile).filter((f) =>
      f.category.includes('ממתק'),
    );
  }, [profile, foods]);

  const sweetFood = menu?.sweetFoodId
    ? foodsById.get(menu.sweetFoodId)
    : undefined;

  return (
    <div className={styles.wrap}>
      <header className={styles.header}>
        <h1 className={styles.title}>התפריט היומי</h1>
        <button
          type="button"
          className={styles.shuffleBtn}
          onClick={doReshuffle}
          disabled={busy}
        >
          <Refresh size={22} color="#fff" />
          ערבבי לי מחדש
        </button>
      </header>

      {DAY_SLOTS.map((slot) => {
        const menuSlot = menu?.slots.find((s) => s.slot === slot);
        const Icon = SLOT_ICONS[slot];
        const slotFoods = (menuSlot?.foodIds ?? [])
          .map((id) => foodsById.get(id))
          .filter(Boolean) as FoodItem[];
        return (
          <section key={slot} className="card">
            <div className={styles.slotHead}>
              <div className={styles.slotTitle}>
                <div className={styles.slotIcon}>
                  <Icon size={24} />
                </div>
                <h2>{SLOT_LABELS[slot]}</h2>
              </div>
              <span className={styles.slotTime}>{menuSlot?.plannedTime}</span>
            </div>

            {slotFoods.length === 0 && (
              <p className={styles.empty}>עוד לא נבחר מאכל</p>
            )}

            {slotFoods.map((f) => (
              <button
                key={f.id}
                type="button"
                className={styles.foodRow}
                onClick={() => openReplace(slot, f.id)}
              >
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
                <span className={styles.swapHint}>החלפה</span>
              </button>
            ))}
          </section>
        );
      })}

      {/* ===== ממתק יומי ===== */}
      <section className="card">
        <div className={styles.slotHead}>
          <div className={styles.slotTitle}>
            <div className={styles.slotIcon}>
              <Sweets size={24} />
            </div>
            <h2>{SLOT_LABELS['ממתק']}</h2>
          </div>
        </div>
        <button
          type="button"
          className={styles.sweetPick}
          onClick={() => setSweetOpen(true)}
        >
          {sweetFood ? (
            <>
              <span className={styles.foodEmoji}>{sweetFood.emoji}</span>
              <span className={styles.foodName}>{sweetFood.name}</span>
              <span className={styles.swapHint}>שינוי</span>
            </>
          ) : (
            <span className={styles.foodName}>בחרי את הממתק שלך 🧁</span>
          )}
        </button>
      </section>

      {/* ===== מגירת החלפת מאכל ===== */}
      <BottomSheet
        open={sheetSlot !== null}
        title={sheetSlot ? `החלפה: ${SLOT_LABELS[sheetSlot]}` : ''}
        onClose={() => setSheetSlot(null)}
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
                onClick={() => doReplace(f.id)}
              >
                <span className={styles.foodEmoji}>{f.emoji}</span>
                <span className={styles.foodName}>{f.name}</span>
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
            onClick={() => doReplace(f.id)}
          >
            <span className={styles.foodEmoji}>{f.emoji}</span>
            <span className={styles.foodName}>{f.name}</span>
          </button>
        ))}

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
      </BottomSheet>

      {/* ===== דיאלוג הוספת מאכל חדש (מתוך התכנון) ===== */}
      <AddFoodSheet
        open={addSheetOpen}
        initialName={search.trim()}
        defaultSlot={sheetSlot ?? 'בוקר'}
        knownFoods={foods ?? []}
        onClose={() => setAddSheetOpen(false)}
        onSave={handleAddCustomFood}
      />

      {/* ===== מגירת בחירת ממתק ===== */}
      <BottomSheet
        open={sweetOpen}
        title="בחירת הממתק היומי 🧁"
        onClose={() => setSweetOpen(false)}
      >
        {sweets.map((f) => (
          <button
            key={f.id}
            type="button"
            className={styles.sheetFood}
            onClick={() => chooseSweet(f.id)}
          >
            <span className={styles.foodEmoji}>{f.emoji}</span>
            <span className={styles.foodName}>{f.name}</span>
          </button>
        ))}
      </BottomSheet>
    </div>
  );
}
