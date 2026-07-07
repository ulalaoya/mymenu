// ===== הגדרות — SPEC סעיף 6.6 =====
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { updateProfile } from '../db/profiles';
import { reshuffleTodayMenu } from '../db/menuService';
import { AVATARS, PROFILE_COLORS } from '../db/constants';
import { DEFAULT_MEAL_TIMES } from '../db/profiles';
import { DAY_SLOTS, SLOT_LABELS } from '../utils/menuDisplay';
import { todayString } from '../utils/date';
import type { MealSlot } from '../types';
import {
  Journal,
  Clock,
  AllergyWarning,
  Vegetarian,
  Save,
  Add,
} from '../components/icons';
import styles from './SettingsScreen.module.css';

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

  return (
    <div className={styles.wrap}>
      <header className={styles.header}>
        <h1 className={styles.title}>
          <Journal size={28} /> הגדרות
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
          {AVATARS.map((a) => (
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
          <Clock size={22} /> <span>שעות הארוחות שלי</span>
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
          <AllergyWarning size={22} /> <span>מאכלים שאסור לי</span>
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
