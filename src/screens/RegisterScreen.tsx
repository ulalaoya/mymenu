// ===== מסך הרשמה — פרופיל חדש (SPEC סעיף 3.2) =====
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { AVATARS, PROFILE_COLORS, RECOVERY_QUESTIONS } from '../db/constants';
import { Sparkle } from '../components/icons';
import styles from './RegisterScreen.module.css';

export function RegisterScreen() {
  const navigate = useNavigate();
  const { createProfile } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [recoveryQ, setRecoveryQ] = useState<string>(RECOVERY_QUESTIONS[0]);
  const [recoveryA, setRecoveryA] = useState('');
  const [avatar, setAvatar] = useState<string>(AVATARS[0]);
  const [color, setColor] = useState<string>(PROFILE_COLORS[0]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!username.trim()) {
      setError('צריך לבחור שם משתמש 😊');
      return;
    }
    if (password.length < 4) {
      setError('הסיסמה צריכה להיות באורך 4 תווים לפחות');
      return;
    }
    if (!recoveryA.trim()) {
      setError('צריך לענות על שאלת השחזור');
      return;
    }

    setBusy(true);
    try {
      await createProfile({
        username: username.trim(),
        password,
        recoveryQ,
        recoveryA,
        avatar,
        color,
      });
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'משהו השתבש, נסי שוב');
      setBusy(false);
    }
  }

  return (
    <div className={styles.wrap}>
      <header className={styles.header}>
        <h1 className={styles.title}>
          פרופיל חדש <Sparkle size={26} />
        </h1>
        <p className={styles.subtitle}>בואי ניצור לך פרופיל משלך!</p>
      </header>

      <form className={styles.form} onSubmit={handleSubmit}>
        <label className={styles.field}>
          <span className={styles.label}>איך קוראים לך?</span>
          <input
            className={styles.input}
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="שם משתמש"
            autoComplete="off"
          />
        </label>

        <label className={styles.field}>
          <span className={styles.label}>בחרי סיסמה (4 תווים לפחות)</span>
          <input
            className={styles.input}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="סיסמה"
            autoComplete="new-password"
          />
        </label>

        <fieldset className={styles.fieldset}>
          <legend className={styles.label}>בחרי אווטאר</legend>
          <div className={styles.avatarGrid}>
            {AVATARS.map((a) => (
              <button
                key={a}
                type="button"
                className={
                  a === avatar
                    ? `${styles.avatarBtn} ${styles.avatarActive}`
                    : styles.avatarBtn
                }
                onClick={() => setAvatar(a)}
                aria-pressed={a === avatar}
                aria-label={`אווטאר ${a}`}
              >
                {a}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className={styles.fieldset}>
          <legend className={styles.label}>הצבע שלך</legend>
          <div className={styles.colorRow}>
            {PROFILE_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className={
                  c === color
                    ? `${styles.colorBtn} ${styles.colorActive}`
                    : styles.colorBtn
                }
                style={{ background: c }}
                onClick={() => setColor(c)}
                aria-pressed={c === color}
                aria-label={`צבע ${c}`}
              />
            ))}
          </div>
        </fieldset>

        <label className={styles.field}>
          <span className={styles.label}>שאלת שחזור (למקרה ששכחת סיסמה)</span>
          <select
            className={styles.input}
            value={recoveryQ}
            onChange={(e) => setRecoveryQ(e.target.value)}
          >
            {RECOVERY_QUESTIONS.map((q) => (
              <option key={q} value={q}>
                {q}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.field}>
          <span className={styles.label}>התשובה שלך</span>
          <input
            className={styles.input}
            type="text"
            value={recoveryA}
            onChange={(e) => setRecoveryA(e.target.value)}
            placeholder="התשובה שרק את יודעת"
            autoComplete="off"
          />
        </label>

        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          className={`btn btn-primary ${styles.submit}`}
          disabled={busy}
        >
          {busy ? 'רגע...' : 'יוצרים פרופיל!'}
        </button>
        <button
          type="button"
          className={`btn btn-ghost ${styles.back}`}
          onClick={() => navigate('/login')}
        >
          חזרה
        </button>
      </form>
    </div>
  );
}
