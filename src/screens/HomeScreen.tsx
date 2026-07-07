// ===== מסך הבית — יומן האכילה היומי הדינמי (SPEC 6.2, מיזוג 6.3+6.4) =====
import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { useAuth } from '../hooks/useAuth';
import { db } from '../db/database';
import { getProfileFoods } from '../db/foodRepo';
import {
  getOrCreateTodayMenu,
  getWaterCups,
  setWaterCups,
  reshuffleTodayMenu,
  getDiarySlots,
  setSlotTime,
  addCustomSlot,
  removeCustomSlot,
  WATER_GOAL_CUPS,
} from '../db/menuService';
import { getDailyTip } from '../engine';
import type { FoodItem, Tip } from '../types';
import { todayString, toTimeString } from '../utils/date';
import {
  ALL_FOOD_GROUPS,
  FOOD_GROUP_COLORS,
  SLOT_ICONS,
  greetingForHour,
} from '../utils/menuDisplay';
import { PROFILE_COLORS } from '../db/constants';
import { BottomSheet } from '../components/BottomSheet';
import {
  Sparkle,
  Add,
  Water,
  CompletedMeal,
  Clock,
  Refresh,
} from '../components/icons';
import styles from './HomeScreen.module.css';

/**
 * צבע ה"הוספת ארוחה" — הצבע הבא במחזור הפלטה (לא הצבע הנבחר):
 * כחול→אלמוגי, אלמוגי→צהוב, צהוב→ירוק, ירוק→כחול.
 */
function nextPaletteColor(color: string): string {
  const i = (PROFILE_COLORS as readonly string[]).indexOf(color);
  if (i === -1) return PROFILE_COLORS[1];
  return PROFILE_COLORS[(i + 1) % PROFILE_COLORS.length];
}

/** תאריך היום בעברית ידידותית (יום בשבוע + יום + חודש) */
function prettyToday(): string {
  try {
    return new Date().toLocaleDateString('he-IL', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  } catch {
    return todayString();
  }
}

export function HomeScreen() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const date = todayString();
  const hour = new Date().getHours();

  const [busy, setBusy] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newTime, setNewTime] = useState(() => toTimeString());

  // התפריט/היומן של היום (נבנה פעם אחת, אידמפוטנטי)
  useEffect(() => {
    if (profile) void getOrCreateTodayMenu(profile, date);
  }, [profile, date]);

  const menu = useLiveQuery(
    () =>
      profile
        ? db.menus.where('[profileId+date]').equals([profile.id, date]).first()
        : undefined,
    [profile?.id, date],
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

  const foods = useLiveQuery(
    () => (profile ? getProfileFoods(profile.id) : []),
    [profile?.id],
  );

  const waterCups =
    useLiveQuery(
      () => (profile ? getWaterCups(profile.id, date) : 0),
      [profile?.id, date],
    ) ?? 0;

  const [tip, setTip] = useState<Tip | undefined>();
  useEffect(() => {
    if (profile) void getDailyTip(profile.id, date).then(setTip);
  }, [profile?.id, date]);

  const foodsById = useMemo(() => {
    const m = new Map<string, FoodItem>();
    (foods ?? []).forEach((f) => m.set(f.id, f));
    return m;
  }, [foods]);

  // סלוטי היומן (ארוחות קבועות + ממתק + מותאמים), ממוינים לפי שעה
  const diarySlots = useMemo(
    () => (menu && profile ? getDiarySlots(menu, profile) : []),
    [menu, profile],
  );

  // אילו סלוטים כבר נאכלו (לפי מפתח)
  const eatenKeys = useMemo(() => {
    const s = new Set<string>();
    (mealLogs ?? []).forEach((l) => s.add(l.slotId ?? l.slot));
    return s;
  }, [mealLogs]);

  // קבוצות מזון שכוסו בפועל היום (מתוך רישומי הארוחות)
  const coveredGroups = useMemo(() => {
    const set = new Set<string>();
    for (const log of mealLogs ?? []) {
      for (const id of log.foodIds) {
        foodsById.get(id)?.foodGroups.forEach((g) => set.add(g));
      }
    }
    return set;
  }, [mealLogs, foodsById]);

  async function handleTime(key: string, value: string) {
    if (!menu) return;
    await setSlotTime(menu.id, key, value);
  }

  async function handleRemoveCustom(key: string) {
    if (!menu) return;
    await removeCustomSlot(menu.id, key);
  }

  async function handleWaterCup(target: number) {
    if (!profile) return;
    const next = waterCups === target ? target - 1 : target;
    await setWaterCups(profile.id, date, next);
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

  async function confirmAddMeal() {
    if (!menu) return;
    const id = await addCustomSlot(menu.id, {
      label: newLabel,
      plannedTime: newTime,
    });
    setAddOpen(false);
    setNewLabel('');
    if (id) navigate(`/meal/${id}`);
  }

  // צבע הפרופיל שנבחר בהגדרות — צובע את הבית (כותרת, אייקונים, רקעי עיגולים).
  // צבע ה"הוספת ארוחה" הוא הצבע הבא במחזור (שונה מהנבחר).
  const accent = profile?.color ?? 'var(--blue)';
  const addAccent = profile ? nextPaletteColor(profile.color) : 'var(--coral)';
  const themeVars = {
    ['--accent']: accent,
    ['--add-accent']: addAccent,
  } as CSSProperties;

  return (
    <div className={styles.wrap} style={themeVars}>
      <header className={styles.header}>
        <h1 className={styles.logo} style={{ color: accent }}>
          MyMenu <Sparkle size={26} color={accent} />
        </h1>
        <p className={styles.greeting}>
          {greetingForHour(hour)}, {profile?.username}
          {profile && (
            <span className={styles.avatarChip}>{profile.avatar}</span>
          )}
        </p>
        <p className={styles.dateText}>{prettyToday()}</p>
      </header>

      {/* ===== יומן הארוחות של היום ===== */}
      <section className="card">
        <div className={styles.cardTitle}>
          <Clock size={22} color={accent} />
          <h2>היומן של היום</h2>
          <button
            type="button"
            className={styles.suggestBtn}
            onClick={doReshuffle}
            disabled={busy}
            aria-label="הצעה חדשה"
          >
            <Refresh size={18} color="var(--blue)" />
            הצעה חדשה
          </button>
        </div>

        <ol className={styles.timeline}>
          {diarySlots.map((s) => {
            const Icon = SLOT_ICONS[s.slot];
            const eaten = eatenKeys.has(s.key);
            const names = s.foodIds
              .map((id) => foodsById.get(id)?.name)
              .filter(Boolean) as string[];
            return (
              <li
                key={s.key}
                className={`${styles.mealRow} ${eaten ? styles.status_eaten : ''}`}
              >
                <input
                  type="time"
                  className={styles.timeEdit}
                  value={s.plannedTime}
                  onChange={(e) => handleTime(s.key, e.target.value)}
                  aria-label={`שעת ${s.label}`}
                />
                <button
                  type="button"
                  className={styles.mealMain}
                  onClick={() => navigate(`/meal/${s.key}`)}
                >
                  <span className={styles.mealIcon}>
                    <Icon size={24} color={accent} />
                  </span>
                  <span className={styles.mealBody}>
                    <span className={styles.mealName}>{s.label}</span>
                    <span className={styles.mealFoods}>
                      {names.length > 0 ? names.join(' · ') : 'הוסיפי מה אכלת'}
                    </span>
                  </span>
                  {eaten && (
                    <span className={styles.mealStatus}>
                      <CompletedMeal size={22} />
                    </span>
                  )}
                </button>
                {s.custom && (
                  <button
                    type="button"
                    className={styles.removeSlot}
                    onClick={() => handleRemoveCustom(s.key)}
                    aria-label={`מחיקת ${s.label}`}
                  >
                    ✕
                  </button>
                )}
              </li>
            );
          })}
        </ol>

        <button
          type="button"
          className={styles.addMealBtn}
          onClick={() => {
            setNewTime(toTimeString());
            setAddOpen(true);
          }}
        >
          <Add size={20} color="var(--add-accent)" />
          הוספת ארוחה
        </button>
      </section>

      {/* ===== מד מים ===== */}
      <section className="card">
        <div className={styles.cardTitle}>
          <Water size={22} />
          <h2>מים היום</h2>
        </div>
        <div className={styles.waterRow}>
          {Array.from({ length: WATER_GOAL_CUPS }, (_, i) => {
            const cupNum = i + 1;
            const filled = cupNum <= waterCups;
            return (
              <button
                key={cupNum}
                type="button"
                className={`${styles.cup} ${filled ? styles.cupFilled : ''}`}
                onClick={() => handleWaterCup(cupNum)}
                aria-label={`כוס ${cupNum}`}
                aria-pressed={filled}
              >
                <Water size={26} color={filled ? '#fff' : 'var(--blue)'} />
              </button>
            );
          })}
        </div>
        <p className={styles.waterHint}>
          {waterCups >= WATER_GOAL_CUPS
            ? 'ואו! שתית מלא מים היום 💙'
            : `${waterCups} מתוך ${WATER_GOAL_CUPS} כוסות — ממשיכים!`}
        </p>
      </section>

      {/* ===== טיפ יומי ===== */}
      {tip && (
        <section className={styles.tipCard}>
          <div className={styles.tipIcon}>
            <Sparkle size={28} color="#fff" />
          </div>
          <div>
            <div className={styles.tipLabel}>טיפ להיום</div>
            <p className={styles.tipText}>{tip.text}</p>
          </div>
        </section>
      )}

      {/* ===== צ'קליסט קבוצות מזון ===== */}
      <section className="card">
        <div className={styles.cardTitle}>
          <Sparkle size={22} />
          <h2>הצבעים של היום</h2>
        </div>
        <p className={styles.groupsIntro}>
          {coveredGroups.size >= 5
            ? 'איזה יופי של גיוון! 🌈'
            : 'כל קבוצה שנרשמת נצבעת — נסי לאסוף כמה שיותר!'}
        </p>
        <div className={styles.groups}>
          {ALL_FOOD_GROUPS.map((g) => {
            const on = coveredGroups.has(g);
            return (
              <span
                key={g}
                className={`${styles.groupTag} ${on ? styles.groupOn : ''}`}
                style={
                  on
                    ? { background: FOOD_GROUP_COLORS[g], borderColor: FOOD_GROUP_COLORS[g] }
                    : undefined
                }
              >
                {g}
              </span>
            );
          })}
        </div>
      </section>

      {/* ===== הוספת ארוחה (סלוט מותאם) ===== */}
      <BottomSheet
        open={addOpen}
        title="הוספת ארוחה ליומן"
        onClose={() => setAddOpen(false)}
      >
        <label className={styles.addField}>
          <span className={styles.addLabel}>איך לקרוא לארוחה?</span>
          <input
            type="text"
            className={styles.addInput}
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="למשל: חטיף אחה״צ"
            autoComplete="off"
          />
        </label>
        <label className={styles.addField}>
          <span className={styles.addLabel}>באיזו שעה?</span>
          <input
            type="time"
            className={styles.addInput}
            value={newTime}
            onChange={(e) => setNewTime(e.target.value)}
          />
        </label>
        <button
          type="button"
          className={styles.addConfirm}
          onClick={confirmAddMeal}
        >
          הוספה ✨
        </button>
      </BottomSheet>
    </div>
  );
}
