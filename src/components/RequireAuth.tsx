// ===== שמירת נתיבים — הפניה ל-/login אם אין פרופיל פעיל =====
import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';

export function RequireAuth({ children }: { children: ReactNode }) {
  const { profile, loading } = useAuth();

  // עדיין טוענים את הפרופיל האחרון (כניסה אוטומטית) — לא מפנים בטעות
  if (loading) {
    return null;
  }

  if (!profile) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
