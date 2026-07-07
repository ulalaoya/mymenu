import { lazy, Suspense } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { BottomNav } from './components/BottomNav';
import { RequireAuth } from './components/RequireAuth';
import styles from './App.module.css';

// טעינה עצלה של המסכים (code splitting) — כל מסך ב-chunk נפרד,
// כדי שהטעינה הראשונית של האפליקציה תהיה קלה יותר. המסכים מיוצאים
// כ-named exports, לכן ממפים ל-default כדי ש-React.lazy יעבוד.
const HomeScreen = lazy(() =>
  import('./screens/HomeScreen').then((m) => ({ default: m.HomeScreen })),
);
const MenuScreen = lazy(() =>
  import('./screens/MenuScreen').then((m) => ({ default: m.MenuScreen })),
);
const LogScreen = lazy(() =>
  import('./screens/LogScreen').then((m) => ({ default: m.LogScreen })),
);
const HistoryScreen = lazy(() =>
  import('./screens/HistoryScreen').then((m) => ({ default: m.HistoryScreen })),
);
const SettingsScreen = lazy(() =>
  import('./screens/SettingsScreen').then((m) => ({
    default: m.SettingsScreen,
  })),
);
const LoginScreen = lazy(() =>
  import('./screens/LoginScreen').then((m) => ({ default: m.LoginScreen })),
);
const RegisterScreen = lazy(() =>
  import('./screens/RegisterScreen').then((m) => ({
    default: m.RegisterScreen,
  })),
);

/** מסך ביניים מינימלי בזמן טעינת ה-chunk של המסך */
function ScreenFallback() {
  return (
    <div className={styles.fallback} role="status" aria-live="polite">
      טוען…
    </div>
  );
}

export default function App() {
  const location = useLocation();
  const hideNav =
    location.pathname === '/login' || location.pathname === '/register';

  return (
    <div className={styles.app}>
      <main className={styles.main}>
        <Suspense fallback={<ScreenFallback />}>
        <Routes>
          <Route path="/login" element={<LoginScreen />} />
          <Route path="/register" element={<RegisterScreen />} />
          <Route
            path="/"
            element={
              <RequireAuth>
                <HomeScreen />
              </RequireAuth>
            }
          />
          <Route
            path="/menu"
            element={
              <RequireAuth>
                <MenuScreen />
              </RequireAuth>
            }
          />
          <Route
            path="/log"
            element={
              <RequireAuth>
                <LogScreen />
              </RequireAuth>
            }
          />
          <Route
            path="/history"
            element={
              <RequireAuth>
                <HistoryScreen />
              </RequireAuth>
            }
          />
          <Route
            path="/settings"
            element={
              <RequireAuth>
                <SettingsScreen />
              </RequireAuth>
            }
          />
        </Routes>
        </Suspense>
      </main>
      {!hideNav && <BottomNav />}
    </div>
  );
}
