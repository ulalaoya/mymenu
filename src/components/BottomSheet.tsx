// ===== Bottom Sheet כללי (לפאנל החלפת מאכל / בחירה) =====
import { useEffect } from 'react';
import type { ReactNode } from 'react';
import styles from './BottomSheet.module.css';

interface BottomSheetProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

/** מגירה שנפתחת מלמטה עם רקע כהה. סגירה בלחיצה על הרקע או ✕. */
export function BottomSheet({ open, title, onClose, children }: BottomSheetProps) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={styles.sheet}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.grabber} />
        <div className={styles.head}>
          <h3 className={styles.title}>{title}</h3>
          <button
            type="button"
            className={styles.close}
            onClick={onClose}
            aria-label="סגירה"
          >
            ✕
          </button>
        </div>
        <div className={styles.body}>{children}</div>
      </div>
    </div>
  );
}
