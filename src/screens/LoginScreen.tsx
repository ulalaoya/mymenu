// ===== מסך בחירת פרופיל / התחברות (SPEC סעיפים 3.2, 6.1) =====
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { useAuth } from '../hooks/useAuth';
import { getAllProfiles } from '../db/database';
import { Add } from '../components/icons';
import type { Profile } from '../types';
import styles from './LoginScreen.module.css';

export function LoginScreen() {
  const navigate = useNavigate();
  const { profile: active, login } = useAuth();

  const profiles = useLiveQuery(() => getAllProfiles(), []);

  const [selected, setSelected] = useState<Profile | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // אם כבר יש פרופיל פעיל (כניסה אוטומטית) — הביתה
  if (active) {
    navigate('/', { replace: true });
    return null;
  }

  function pickProfile(p: Profile) {
    setSelected(p);
    setPassword('');
    setError('');
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setError('');
    setBusy(true);
    const ok = await login(selected.username, password);
    setBusy(false);
    if (ok) {
      navigate('/', { replace: true });
    } else {
      setError('הסיסמה לא נכונה, נסי שוב 😊');
    }
  }

  // מצב הזנת סיסמה לפרופיל שנבחר
  if (selected) {
    return (
      <div className={styles.wrap}>
        <div className={styles.pickedHeader}>
          <span
            className={styles.pickedAvatar}
            style={{ background: selected.color }}
          >
            {selected.avatar}
          </span>
          <h1 className={styles.title}>שלום, {selected.username}!</h1>
        </div>

        <form className={styles.form} onSubmit={handleLogin}>
          <label className={styles.field}>
            <span className={styles.label}>מה הסיסמה שלך?</span>
            <input
              className={styles.input}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="סיסמה"
              autoComplete="off"
              autoFocus
            />
          </label>

          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            className={`btn btn-primary ${styles.wide}`}
            disabled={busy}
          >
            {busy ? 'רגע...' : 'כניסה'}
          </button>
          <button
            type="button"
            className={`btn btn-ghost ${styles.wide}`}
            onClick={() => setSelected(null)}
          >
            חזרה לרשימה
          </button>
        </form>
      </div>
    );
  }

  // מצב בחירת פרופיל
  return (
    <div className={styles.wrap}>
      <header className={styles.header}>
        <h1 className={styles.title}>מי משתמשת עכשיו?</h1>
        <p className={styles.subtitle}>בחרי את הפרופיל שלך</p>
      </header>

      <div className={styles.cards}>
        {profiles?.map((p) => (
          <button
            key={p.id}
            className={styles.card}
            onClick={() => pickProfile(p)}
          >
            <span
              className={styles.avatar}
              style={{ background: p.color }}
            >
              {p.avatar}
            </span>
            <span className={styles.username}>{p.username}</span>
          </button>
        ))}

        <button
          className={`${styles.card} ${styles.newCard}`}
          onClick={() => navigate('/register')}
        >
          <span className={styles.newIcon}>
            <Add size={30} color="var(--blue)" />
          </span>
          <span className={styles.username}>פרופיל חדש</span>
        </button>
      </div>
    </div>
  );
}
