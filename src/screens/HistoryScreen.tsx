// ===== היסטוריה והתקדמות — SPEC סעיף 6.5 =====
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import {
  getMonthCalendar,
  getDayDetails,
  computeStreak,
  getMostEatenThisWeek,
  getWeeklyGroupVariety,
  startOfWeek,
  type MonthCalendar,
  type DayDetails,
  type MostEatenFood,
  type WeeklyVariety,
} from '../db/historyService';
import { todayString } from '../utils/date';
import { SLOT_LABELS, SATIETY_FACES } from '../utils/menuDisplay';
import { BottomSheet } from '../components/BottomSheet';
import { FoodSymbol } from '../components/FoodSymbol';
import { Progress, Calendar, Sparkle } from '../components/icons';
import styles from './HistoryScreen.module.css';

/** כותרות ימי השבוע (ראשון..שבת) */
const WEEKDAY_LABELS = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];
const MONTH_NAMES = [
  'ינואר',
  'פברואר',
  'מרץ',
  'אפריל',
  'מאי',
  'יוני',
  'יולי',
  'אוגוסט',
  'ספטמבר',
  'אוקטובר',
  'נובמבר',
  'דצמבר',
];

/** מציג תאריך YYYY-MM-DD בעברית ידידותית */
function prettyDate(date: string): string {
  const [, m, d] = date.split('-').map(Number);
  return `${d} ב${MONTH_NAMES[m - 1]}`;
}

export function HistoryScreen() {
  const { profile } = useAuth();
  const today = todayString();

  // ניווט חודשי
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1); // 1..12

  const [calendar, setCalendar] = useState<MonthCalendar | null>(null);
  const [streak, setStreak] = useState(0);
  const [mostEaten, setMostEaten] = useState<MostEatenFood[]>([]);
  const [variety, setVariety] = useState<WeeklyVariety | null>(null);
  const [selectedDay, setSelectedDay] = useState<DayDetails | null>(null);

  // טעינת נתוני לוח השנה בכל שינוי חודש/פרופיל
  useEffect(() => {
    if (!profile) return;
    let cancelled = false;
    void getMonthCalendar(profile.id, year, month).then((c) => {
      if (!cancelled) setCalendar(c);
    });
    return () => {
      cancelled = true;
    };
  }, [profile?.id, year, month]);

  // טעינת נתוני התקדמות (רצף, מה הכי אכלתי השבוע, גיוון)
  useEffect(() => {
    if (!profile) return;
    let cancelled = false;
    const weekStart = startOfWeek(today);
    void Promise.all([
      computeStreak(profile.id, today),
      getMostEatenThisWeek(profile.id, weekStart),
      getWeeklyGroupVariety(profile.id, weekStart),
    ]).then(([s, m, v]) => {
      if (cancelled) return;
      setStreak(s);
      setMostEaten(m);
      setVariety(v);
    });
    return () => {
      cancelled = true;
    };
  }, [profile?.id, today]);

  function goPrevMonth() {
    setMonth((m) => {
      if (m === 1) {
        setYear((y) => y - 1);
        return 12;
      }
      return m - 1;
    });
  }
  function goNextMonth() {
    setMonth((m) => {
      if (m === 12) {
        setYear((y) => y + 1);
        return 1;
      }
      return m + 1;
    });
  }

  async function openDay(date: string) {
    if (!profile) return;
    const details = await getDayDetails(profile.id, date);
    setSelectedDay(details);
  }

  // רשת ימי החודש עם ריפוד לתחילת השבוע
  const grid = useMemo(() => {
    if (!calendar) return [];
    const cells: (MonthCalendar['days'][number] | null)[] = [];
    for (let i = 0; i < calendar.startWeekday; i++) cells.push(null);
    calendar.days.forEach((d) => cells.push(d));
    return cells;
  }, [calendar]);

  const maxVariety = variety?.maxGroups ?? 8;

  return (
    <div className={styles.wrap}>
      <header className={styles.header}>
        <h1 className={styles.title}>
          <Progress size={28} /> ההתקדמות שלי
        </h1>
      </header>

      {/* ===== לוח שנה חודשי ===== */}
      <section className="card">
        <div className={styles.calHead}>
          {/* RTL: החץ ל"קדימה בזמן" נמצא בצד שמאל */}
          <button
            type="button"
            className={styles.navArrow}
            onClick={goNextMonth}
            aria-label="חודש הבא"
          >
            ‹
          </button>
          <div className={styles.calTitle}>
            <Calendar size={20} />
            <span>
              {MONTH_NAMES[month - 1]} {year}
            </span>
          </div>
          <button
            type="button"
            className={styles.navArrow}
            onClick={goPrevMonth}
            aria-label="חודש קודם"
          >
            ›
          </button>
        </div>

        <div className={styles.weekdays}>
          {WEEKDAY_LABELS.map((w) => (
            <span key={w} className={styles.weekday}>
              {w}
            </span>
          ))}
        </div>

        <div className={styles.calGrid}>
          {grid.map((cell, i) =>
            cell ? (
              <button
                key={cell.date}
                type="button"
                className={`${styles.dayCell} ${
                  styles[`c${cell.completeness}`]
                } ${cell.date === today ? styles.dayToday : ''}`}
                onClick={() => openDay(cell.date)}
                title={
                  cell.star
                    ? 'יום מעולה! ⭐'
                    : cell.completeness >= 4
                      ? 'יום מלא - כל הכבוד!'
                      : `${cell.mealsLogged} ארוחות`
                }
                aria-label={
                  cell.star
                    ? `${cell.day} — יום מעולה, הרבה ירק ופרי ומים`
                    : `${cell.day} — ${cell.mealsLogged} ארוחות`
                }
              >
                {cell.day}
                {cell.star && <span className={styles.dayStar}>⭐</span>}
              </button>
            ) : (
              <span key={`e${i}`} className={styles.dayEmpty} />
            ),
          )}
        </div>

        <div className={styles.legend}>
          <span className={`${styles.legendDot} ${styles.c1}`} />
          <span className={styles.legendText}>מעט</span>
          <span className={`${styles.legendDot} ${styles.c4}`} />
          <span className={styles.legendText}>יום מלא - כל הכבוד!</span>
          <span className={styles.legendStar}>⭐</span>
          <span className={styles.legendText}>
            יום מעולה (4 מנות ירק/פרי + 8 כוסות מים)
          </span>
        </div>
      </section>

      {/* ===== רצף + מה הכי אכלתי השבוע ===== */}
      <section className="card">
        {/* רצף ימים — ימים רצופים שבהם מילאת את התפריט */}
        <div className={styles.sectionTitle}>
          <Sparkle size={22} />
          <h2>הרצף שלי</h2>
        </div>
        <div className={styles.streakBox}>
          <span className={styles.streakFlame}>🔥</span>
          <div>
            <div className={styles.streakNum}>{streak}</div>
            <div className={styles.streakLabel}>
              {streak === 0
                ? 'עוד לא התחלת רצף — כל יום שתמלאי את התפריט נספר!'
                : streak === 1
                  ? 'יום רצוף שמילאת את התפריט 🎉'
                  : 'ימים רצופים שמילאת את התפריט! 🎉'}
            </div>
          </div>
        </div>

        {/* מה הכי אכלתי השבוע */}
        <h3 className={styles.subTitle}>מה הכי אכלתי השבוע? 🍽️</h3>
        {mostEaten.length === 0 ? (
          <p className={styles.emptyHint}>
            כשתרשמי ארוחות השבוע, המאכלים הכי נפוצים יופיעו כאן.
          </p>
        ) : (
          <div className={styles.chips}>
            {mostEaten.map((f) => (
              <span key={f.id} className={styles.chip}>
                <span className={styles.chipEmoji}>
                  <FoodSymbol symbol={f.emoji} size={18} />
                </span>
                {f.name}
                <span className={styles.chipCount}>×{f.count}</span>
              </span>
            ))}
          </div>
        )}
      </section>

      {/* ===== גרף גיוון שבועי ===== */}
      <section className="card">
        <div className={styles.sectionTitle}>
          <Sparkle size={22} />
          <h2>כמה מגוון אכלת השבוע! 🌈</h2>
        </div>
        <p className={styles.chartHint}>
          כל עמודה מראה מכמה קבוצות מזון שונות נהנית באותו יום
        </p>
        <div className={styles.chart}>
          {(variety?.days ?? []).map((d) => {
            const pct = Math.round((d.groupCount / maxVariety) * 100);
            return (
              <div key={d.date} className={styles.barCol}>
                <div className={styles.barTrack}>
                  <div
                    className={styles.barFill}
                    style={{
                      height: `${Math.max(pct, d.groupCount > 0 ? 8 : 0)}%`,
                    }}
                  >
                    {d.groupCount > 0 && (
                      <span className={styles.barValue}>{d.groupCount}</span>
                    )}
                  </div>
                </div>
                <span className={styles.barLabel}>
                  {WEEKDAY_LABELS[d.weekday]}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* ===== פירוט יום ===== */}
      <BottomSheet
        open={selectedDay !== null}
        title={selectedDay ? `היום שלי — ${prettyDate(selectedDay.date)}` : ''}
        onClose={() => setSelectedDay(null)}
      >
        {selectedDay && selectedDay.meals.length === 0 && (
          <p className={styles.emptyHint}>ביום הזה עוד לא נרשמו ארוחות.</p>
        )}
        {selectedDay?.meals.map((m, i) => {
          const face = SATIETY_FACES.find((f) => f.value === m.satietyRating);
          return (
            <div key={i} className={styles.dayMeal}>
              <div className={styles.dayMealTitle}>
                {m.slotLabel ?? SLOT_LABELS[m.slot]}
              </div>
              <div className={styles.dayMealFoods}>
                {m.foodEmojis.map((e, k) => {
                  const qty = m.foodQuantities[k];
                  return (
                    <span key={k} className={styles.dayFood}>
                      <FoodSymbol symbol={e} size={16} /> {m.foodNames[k]}
                      {qty ? ` ${qty}` : ''}
                    </span>
                  );
                })}
              </div>
              <div className={styles.dayMealMeta}>
                {m.tasteRating != null && (
                  <span className={styles.metaItem}>
                    {'⭐'.repeat(m.tasteRating)}
                  </span>
                )}
                {face && (
                  <span className={styles.metaItem} title={face.label}>
                    {face.emoji} {face.label}
                  </span>
                )}
              </div>
            </div>
          );
        })}
        {selectedDay && (
          <div className={styles.dayWater}>
            💧 {selectedDay.waterCups} כוסות מים
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
