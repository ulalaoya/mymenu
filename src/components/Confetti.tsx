// ===== קונפטי חגיגה עדין (CSS בלבד, ללא ספריות) — SPEC 6.4 =====
import { useMemo } from 'react';
import styles from './Confetti.module.css';

const COLORS = ['#5B9BD5', '#F0806C', '#F5B041', '#7DCEA0', '#F06292'];

/** מציג פיזור פיסות קונפטי צבעוניות שנופלות פעם אחת. */
export function Confetti({ pieces = 24 }: { pieces?: number }) {
  const bits = useMemo(
    () =>
      Array.from({ length: pieces }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.3,
        duration: 1.1 + Math.random() * 0.8,
        color: COLORS[i % COLORS.length],
        rotate: Math.random() * 360,
        size: 7 + Math.random() * 6,
      })),
    [pieces],
  );

  return (
    <div className={styles.wrap} aria-hidden="true">
      {bits.map((b) => (
        <span
          key={b.id}
          className={styles.piece}
          style={{
            left: `${b.left}%`,
            background: b.color,
            width: `${b.size}px`,
            height: `${b.size}px`,
            animationDelay: `${b.delay}s`,
            animationDuration: `${b.duration}s`,
            transform: `rotate(${b.rotate}deg)`,
          }}
        />
      ))}
    </div>
  );
}
