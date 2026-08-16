// ===== הגדרות — SPEC סעיף 6.6 =====
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { updateProfile } from '../db/profiles';
import { reshuffleTodayMenu } from '../db/menuService';
import { AVATARS, ADULT_AVATARS, PROFILE_COLORS } from '../db/constants';
import { DEFAULT_MEAL_TIMES } from '../db/profiles';
import { DAY_SLOTS, SLOT_LABELS } from '../utils/menuDisplay';
import { todayString } from '../utils/date';
import type {
  MealSlot,
  ProfileMeasurements,
  MeasurementEntry,
  PlankEntry,
} from '../types';
import {
  Journal,
  Clock,
  AllergyWarning,
  Vegetarian,
  Save,
  Add,
} from '../components/icons';
import styles from './SettingsScreen.module.css';

/** צבע ההדגשה של הפרופיל (נקבע גלובלית לפי הצבע הנבחר בהגדרות) */
const ACCENT = 'var(--accent, var(--blue))';

/** שדות ההיקפים (בס"מ) — מוצגים רק לפרופיל מבוגר */
const MEASUREMENT_FIELDS: { key: keyof ProfileMeasurements; label: string }[] = [
  { key: 'navel', label: 'היקף טבור' },
  { key: 'aboveNavel', label: 'מעל הטבור' },
  { key: 'belowNavel', label: 'מתחת הטבור' },
];

/** מציג תאריך YYYY-MM-DD כ-DD.MM.YYYY */
function formatDate(d: string): string {
  const [y, m, day] = d.split('-');
  return `${day}.${m}.${y}`;
}

/** מציג משך פלאנק (שניות) עם יחידות ברורות, למשל "54 שנ׳" או "2 דק׳ 30 שנ׳" */
function formatPlank(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m > 0 && s > 0) return `${m} דק׳ ${s} שנ׳`;
  if (m > 0) return `${m} דק׳`;
  return `${s} שנ׳`;
}

export function SettingsScreen() {
  const { profile, updateActiveProfile, logout } = useAuth();
  const navigate = useNavigate();
  const date = todayString();

  const [username, setUsername] = useState(profile?.username ?? '');
  const [avatar, setAvatar] = useState(profile?.avatar ?? AVATARS[0]);
  const [color, setColor] = useState(profile?.color ?? PROFILE_COLORS[0]);
  const [mealTimes, setMealTimes] = useState<Partial<Record<MealSlot, string>>>(
    () => ({ ...DEFAULT_MEAL_TIMES, ...(profile?.mealTimes ?? {}) }),
  );
  const [allergies, setAllergies] = useState<string[]>(
    profile?.allergies ?? [],
  );
  const [vegetarian, setVegetarian] = useState(profile?.vegetarian ?? false);
  const [newAllergy, setNewAllergy] = useState('');
  // טיוטת מדידת היקפים חדשה + תאריך
  const [measurements, setMeasurements] = useState<ProfileMeasurements>({});
  const [measureDate, setMeasureDate] = useState(date);
  // טיוטת מדידת פלאנק חדשה + תאריך
  const [plankMin, setPlankMin] = useState('');
  const [plankSec, setPlankSec] = useState('');
  const [plankDate, setPlankDate] = useState(date);

  const [savedMsg, setSavedMsg] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // האם השינוי משפיע על התפריט (מגביל) — כדי לבנות מחדש
  const dirtyRestrictive = useMemo(() => {
    if (!profile) return false;
    const sameAllergies =
      allergies.length === profile.allergies.length &&
      allergies.every((a) => profile.allergies.includes(a));
    const sameVeg = vegetarian === profile.vegetarian;
    const sameTimes = DAY_SLOTS.every(
      (s) => (mealTimes[s] ?? '') === (profile.mealTimes[s] ?? ''),
    );
    return !sameAllergies || !sameVeg || !sameTimes;
  }, [profile, allergies, vegetarian, mealTimes]);

  function addAllergy() {
    const a = newAllergy.trim();
    if (!a || allergies.includes(a)) {
      setNewAllergy('');
      return;
    }
    setAllergies((prev) => [...prev, a]);
    setNewAllergy('');
  }

  function removeAllergy(a: string) {
    setAllergies((prev) => prev.filter((x) => x !== a));
  }

  function setMealTime(slot: MealSlot, value: string) {
    setMealTimes((prev) => ({ ...prev, [slot]: value }));
  }

  function setMeasure(key: keyof ProfileMeasurements, value: string) {
    setMeasurements((prev) => {
      const next = { ...prev };
      const n = Number(value);
      if (value.trim() === '' || Number.isNaN(n)) delete next[key];
      else next[key] = n;
      return next;
    });
  }

  function flashSaved(msg: string) {
    setSavedMsg(msg);
    window.setTimeout(() => setSavedMsg(''), 3000);
  }

  /** מוסיף מדידת היקפים מתוארכת ליומן ושומר */
  async function addMeasurement() {
    if (!profile) return;
    const hasAny =
      measurements.navel != null ||
      measurements.aboveNavel != null ||
      measurements.belowNavel != null;
    if (!hasAny) {
      setError('צריך להזין לפחות היקף אחד');
      return;
    }
    setError('');
    const entry: MeasurementEntry = { date: measureDate, ...measurements };
    const log = [...(profile.measurementLog ?? []), entry];
    const updated = await updateProfile(profile.id, { measurementLog: log });
    if (updated) {
      updateActiveProfile(updated);
      setMeasurements({});
      flashSaved('המדידה נשמרה 💙');
    }
  }

  /** מוחק רשומת מדידת היקפים ספציפית */
  async function removeMeasurement(entry: MeasurementEntry) {
    if (!profile) return;
    const log = (profile.measurementLog ?? []).filter((x) => x !== entry);
    const updated = await updateProfile(profile.id, { measurementLog: log });
    if (updated) {
      updateActiveProfile(updated);
      flashSaved('המדידה נמחקה');
    }
  }

  /** מוחק רשומת פלאנק ספציפית */
  async function removePlank(entry: PlankEntry) {
    if (!profile) return;
    const log = (profile.plankLog ?? []).filter((x) => x !== entry);
    const updated = await updateProfile(profile.id, { plankLog: log });
    if (updated) {
      updateActiveProfile(updated);
      flashSaved('המדידה נמחקה');
    }
  }

  /** מוסיף מדידת פלאנק מתוארכת ליומן ושומר */
  async function addPlank() {
    if (!profile) return;
    const seconds = (Number(plankMin) || 0) * 60 + (Number(plankSec) || 0);
    if (seconds <= 0) {
      setError('צריך להזין משך גדול מאפס');
      return;
    }
    setError('');
    const entry: PlankEntry = { date: plankDate, seconds };
    const log = [...(profile.plankLog ?? []), entry];
    const updated = await updateProfile(profile.id, { plankLog: log });
    if (updated) {
      updateActiveProfile(updated);
      setPlankMin('');
      setPlankSec('');
      flashSaved('מדידת הפלאנק נשמרה 💙');
    }
  }

  async function handleSave() {
    if (!profile) return;
    setError('');
    setSavedMsg('');
    setBusy(true);
    try {
      const willRebuild = dirtyRestrictive;
      const updated = await updateProfile(profile.id, {
        username: username.trim(),
        avatar,
        color,
        allergies,
        vegetarian,
        mealTimes,
      });
      if (!updated) {
        setError('משהו השתבש, נסי שוב');
        setBusy(false);
        return;
      }
      updateActiveProfile(updated);

      // שינוי מגביל → בונים מחדש את תפריט היום בהתאם
      if (willRebuild) {
        await reshuffleTodayMenu(updated, date);
        setSavedMsg('נשמר! התפריט של היום התעדכן בהתאם ✨');
      } else {
        setSavedMsg('נשמר! 💙');
      }
      window.setTimeout(() => setSavedMsg(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'משהו השתבש, נסי שוב');
    } finally {
      setBusy(false);
    }
  }

  async function handleSwitchUser() {
    await logout();
    navigate('/login', { replace: true });
  }

  if (!profile) return null;

  // יומני המדידות, החדשים קודם (לתצוגה)
  const measurementLog = [...(profile.measurementLog ?? [])].sort((a, b) =>
    b.date.localeCompare(a.date),
  );
  const plankLog = [...(profile.plankLog ?? [])].sort((a, b) =>
    b.date.localeCompare(a.date),
  );

  return (
    <div className={styles.wrap}>
      <header className={styles.header}>
        <h1 className={styles.title}>
          <Journal size={28} color={ACCENT} /> הגדרות
        </h1>
      </header>

      {/* ===== עריכת פרופיל ===== */}
      <section className="card">
        <h2 className={styles.sectionTitle}>הפרופיל שלי</h2>

        <label className={styles.field}>
          <span className={styles.label}>שם</span>
          <input
            className={styles.input}
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="שם משתמש"
            autoComplete="off"
          />
        </label>

        <span className={styles.label}>אווטאר</span>
        <div className={styles.avatarGrid}>
          {(profile.isAdult ? ADULT_AVATARS : AVATARS).map((a) => (
            <button
              key={a}
              type="button"
              className={`${styles.avatarBtn} ${
                a === avatar ? styles.avatarActive : ''
              }`}
              onClick={() => setAvatar(a)}
              aria-pressed={a === avatar}
              aria-label={`אווטאר ${a}`}
            >
              {a}
            </button>
          ))}
        </div>

        <span className={styles.label}>הצבע שלי</span>
        <div className={styles.colorRow}>
          {PROFILE_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              className={`${styles.colorBtn} ${
                c === color ? styles.colorActive : ''
              }`}
              style={{ background: c }}
              onClick={() => setColor(c)}
              aria-pressed={c === color}
              aria-label={`צבע ${c}`}
            />
          ))}
        </div>
      </section>

      {/* ===== שעות ארוחה ===== */}
      <section className="card">
        <div className={styles.sectionTitle}>
          <Clock size={22} color={ACCENT} /> <span>שעות הארוחות שלי</span>
        </div>
        <p className={styles.hint}>
          האפליקציה לומדת מתי את אוכלת, אבל את תמיד יכולה לקבוע בעצמך 😊
        </p>
        <div className={styles.timesList}>
          {DAY_SLOTS.map((slot) => (
            <label key={slot} className={styles.timeRow}>
              <span className={styles.timeLabel}>{SLOT_LABELS[slot]}</span>
              <input
                type="time"
                className={styles.timeInput}
                value={mealTimes[slot] ?? ''}
                onChange={(e) => setMealTime(slot, e.target.value)}
              />
            </label>
          ))}
        </div>
      </section>

      {/* ===== אלרגיות + צמחונות ===== */}
      <section className="card">
        <div className={styles.sectionTitle}>
          <AllergyWarning size={22} color={ACCENT} /> <span>מאכלים שאסור לי</span>
        </div>
        <p className={styles.hint}>
          מאכלים שנוסיף כאן פשוט לא יופיעו בהמלצות שלך.
        </p>
        <div className={styles.allergyInputRow}>
          <input
            className={styles.input}
            type="text"
            value={newAllergy}
            onChange={(e) => setNewAllergy(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addAllergy();
              }
            }}
            placeholder="למשל: בוטנים, אגוזים..."
            autoComplete="off"
          />
          <button
            type="button"
            className={styles.addBtn}
            onClick={addAllergy}
            aria-label="הוספה"
          >
            <Add size={22} color="#fff" />
          </button>
        </div>
        {allergies.length > 0 && (
          <div className={styles.chips}>
            {allergies.map((a) => (
              <button
                key={a}
                type="button"
                className={styles.allergyChip}
                onClick={() => removeAllergy(a)}
                aria-label={`הסרת ${a}`}
              >
                {a} <span className={styles.chipX}>✕</span>
              </button>
            ))}
          </div>
        )}

        <label className={styles.toggleRow}>
          <span className={styles.toggleLabel}>
            <Vegetarian size={22} /> אני צמחונית
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={vegetarian}
            className={`${styles.switch} ${vegetarian ? styles.switchOn : ''}`}
            onClick={() => setVegetarian((v) => !v)}
          >
            <span className={styles.knob} />
          </button>
        </label>
      </section>

      {/* ===== היקפים מתוארכים (רק לפרופיל מבוגר) ===== */}
      {profile.isAdult && (
        <section className="card">
          <div className={styles.sectionTitle}>
            <span aria-hidden="true">📏</span> <span>היקפים (ס״מ)</span>
          </div>
          <p className={styles.hint}>
            מעקב אישי אחת לתקופה — בחרו תאריך והזינו היקפים.
          </p>
          <label className={styles.timeRow}>
            <span className={styles.timeLabel}>תאריך המדידה</span>
            <input
              type="date"
              className={styles.timeInput}
              value={measureDate}
              onChange={(e) => setMeasureDate(e.target.value)}
            />
          </label>
          <div className={styles.timesList}>
            {MEASUREMENT_FIELDS.map(({ key, label }) => (
              <label key={key} className={styles.timeRow}>
                <span className={styles.timeLabel}>{label}</span>
                <span className={styles.measureField}>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    className={styles.measureInput}
                    value={measurements[key] ?? ''}
                    onChange={(e) => setMeasure(key, e.target.value)}
                    placeholder="0"
                  />
                  <span className={styles.measureUnit}>ס״מ</span>
                </span>
              </label>
            ))}
          </div>
          <button
            type="button"
            className={styles.addMeasureBtn}
            onClick={addMeasurement}
          >
            הוספת מדידה
          </button>
          {measurementLog.length > 0 && (
            <div className={styles.logList}>
              {measurementLog.map((e, i) => (
                <div key={i} className={styles.logRow}>
                  <span className={styles.logDate}>{formatDate(e.date)}</span>
                  <span className={styles.logVals}>
                    {[
                      e.navel != null ? `טבור ${e.navel}` : null,
                      e.aboveNavel != null ? `מעל ${e.aboveNavel}` : null,
                      e.belowNavel != null ? `מתחת ${e.belowNavel}` : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}{' '}
                    ס״מ
                  </span>
                  <button
                    type="button"
                    className={styles.logDelete}
                    onClick={() => removeMeasurement(e)}
                    aria-label={`מחיקת מדידה מ-${formatDate(e.date)}`}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ===== פלאנק מתוארך (רק לפרופיל מבוגר) ===== */}
      {profile.isAdult && (
        <section className="card">
          <div className={styles.sectionTitle}>
            <span aria-hidden="true">🧘</span> <span>פלאנק</span>
          </div>
          <p className={styles.hint}>
            מעקב אחת לתקופה — משך הפלאנק בדקות ושניות.
          </p>
          <label className={styles.timeRow}>
            <span className={styles.timeLabel}>תאריך המדידה</span>
            <input
              type="date"
              className={styles.timeInput}
              value={plankDate}
              onChange={(e) => setPlankDate(e.target.value)}
            />
          </label>
          <label className={styles.timeRow}>
            <span className={styles.timeLabel}>משך</span>
            {/* RTL: השדה הראשון מוצג מימין — שניות מימין, דקות משמאל */}
            <span className={styles.measureField}>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                max="59"
                className={styles.measureInput}
                value={plankSec}
                onChange={(e) => setPlankSec(e.target.value)}
                placeholder="0"
                aria-label="שניות"
              />
              <span className={styles.measureUnit}>שנ׳</span>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                className={styles.measureInput}
                value={plankMin}
                onChange={(e) => setPlankMin(e.target.value)}
                placeholder="0"
                aria-label="דקות"
              />
              <span className={styles.measureUnit}>דק׳</span>
            </span>
          </label>
          <button
            type="button"
            className={styles.addMeasureBtn}
            onClick={addPlank}
          >
            הוספת מדידה
          </button>
          {plankLog.length > 0 && (
            <div className={styles.logList}>
              {plankLog.map((e, i) => (
                <div key={i} className={styles.logRow}>
                  <span className={styles.logDate}>{formatDate(e.date)}</span>
                  <span className={styles.logVals}>{formatPlank(e.seconds)}</span>
                  <button
                    type="button"
                    className={styles.logDelete}
                    onClick={() => removePlank(e)}
                    aria-label={`מחיקת מדידה מ-${formatDate(e.date)}`}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {savedMsg && (
        <p className={styles.savedMsg} role="status">
          {savedMsg}
        </p>
      )}
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      <button
        type="button"
        className={`btn btn-primary ${styles.saveBtn}`}
        onClick={handleSave}
        disabled={busy}
      >
        <Save size={22} color="#fff" />
        {busy ? 'שומרים...' : 'שמירת ההגדרות'}
      </button>

      {/* ===== החלפת משתמש ===== */}
      <button
        type="button"
        className={`btn btn-ghost ${styles.switchBtn}`}
        onClick={handleSwitchUser}
      >
        החלפת משתמש
      </button>
    </div>
  );
}
