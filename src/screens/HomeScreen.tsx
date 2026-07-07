// ===== מסך הבית — SPEC סעיף 6.2 =====
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { useAuth } from '../hooks/useAuth';
import { db } from '../db/database';
import { getProfileFoods } from '../db/foodRepo';
import {
  getOrCreateTodayMenu,
  getWaterCups,
  setWaterCups,
  WATER_GOAL_CUPS,
} from '../db/menuService';
import { getDailyTip } from '../engine';
import type { FoodItem, MealSlot, Tip } from '../types';
import { todayString, minutesOfDay, timeToMinutes } from '../utils/date';
import {
  DAY_SLOTS,
  SLOT_LABELS,
  SLOT_ICONS,
  ALL_FOOD_GROUPS,
  FOOD_GROUP_COLORS,
  greetingForHour,
  greetingEmoji,
} from '../utils/menuDisplay';
import { Sparkle, Add, Water, CompletedMeal, Clock } from '../components/icons';
import styles from './HomeScreen.module.css';

/** חלון "הגיע הזמן" סביב השעה המתוכננת (בדקות) */
const DUE_WINDOW = 45;

export function HomeScreen() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const date = todayString();
  const now = new Date();
  const hour = now.getHours();

  // התפריט של היום (נבנה פעם אחת, אידמפוטנטי)
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

  // קבוצות מזון שכוסו בפועל היום (מתוך רישומי הארוחות)
  const coveredGroups = useMemo(() => {
    const s = new Set<string>();
    for (const log of mealLogs ?? []) {
      for (const id of log.foodIds) {
        foodsById.get(id)?.foodGroups.forEach((g) => s.add(g));
      }
    }
    return s;
  }, [mealLogs, foodsById]);

  // מיפוי משבצת → האם נרשמה ארוחה
  const loggedSlots = useMemo(() => {
    const s = new Set<MealSlot>();
    (mealLogs ?? []).forEach((l) => s.add(l.slot));
    return s;
  }, [mealLogs]);

  function slotStatus(slot: MealSlot, plannedTime: string) {
    if (loggedSlots.has(slot)) return 'eaten' as const;
    const planned = timeToMinutes(plannedTime);
    const nowMin = minutesOfDay(now);
    if (planned == null) return 'future' as const;
    if (Math.abs(nowMin - planned) <= DUE_WINDOW) return 'due' as const;
    if (nowMin > planned + DUE_WINDOW) return 'skipped' as const;
    return 'future' as const;
  }

  async function handleWaterCup(target: number) {
    if (!profile) return;
    // לחיצה על כוס מלאה מבטלת עד אליה (target-1); אחרת ממלאים עד היעד
    const next = waterCups === target ? target - 1 : target;
    await setWaterCups(profile.id, date, next);
  }

  const greeting = `${greetingForHour(hour)}, ${profile?.username ?? ''}! ${greetingEmoji(hour)}`;

  return (
    <div className={styles.wrap}>
      <header className={styles.header}>
        <h1 className={styles.logo}>
          MyMenu <Sparkle size={26} />
        </h1>
        <p className={styles.greeting}>{greeting}</p>
      </header>

      {/* ===== ציר הזמן של הארוחות ===== */}
      <section className="card">
        <div className={styles.cardTitle}>
          <Clock size={22} />
          <h2>התפריט של היום</h2>
        </div>
        <ol className={styles.timeline}>
          {DAY_SLOTS.map((slot) => {
            const menuSlot = menu?.slots.find((s) => s.slot === slot);
            const Icon = SLOT_ICONS[slot];
            const status = slotStatus(slot, menuSlot?.plannedTime ?? '');
            const names = (menuSlot?.foodIds ?? [])
              .map((id) => foodsById.get(id)?.name)
              .filter(Boolean) as string[];
            return (
              <li
                key={slot}
                className={`${styles.mealRow} ${styles[`status_${status}`]}`}
                onClick={() => navigate('/menu')}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') navigate('/menu');
                }}
              >
                <div className={styles.mealTime}>
                  {menuSlot?.plannedTime || '—'}
                </div>
                <div className={styles.mealIcon}>
                  <Icon size={26} />
                </div>
                <div className={styles.mealBody}>
                  <div className={styles.mealName}>{SLOT_LABELS[slot]}</div>
                  <div className={styles.mealFoods}>
                    {names.length > 0 ? names.join(' · ') : 'עוד לא נבחר'}
                  </div>
                </div>
                <div className={styles.mealStatus}>
                  {status === 'eaten' && <CompletedMeal size={24} />}
                  {status === 'due' && (
                    <span className={styles.dueBadge}>הגיע הזמן!</span>
                  )}
                  {status === 'skipped' && (
                    <span className={styles.skippedBadge}>דולגה</span>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
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

      {/* ===== כפתור צף ===== */}
      <button
        type="button"
        className={styles.fab}
        onClick={() => navigate('/log')}
        aria-label="רשמי מה אכלת"
      >
        <Add size={26} color="#fff" />
        <span>רשמי מה אכלת</span>
      </button>
    </div>
  );
}
