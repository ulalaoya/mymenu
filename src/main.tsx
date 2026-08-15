import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

// פונט Rubik מקומי (אופליין) — משקלים 400/500/700
import '@fontsource/rubik/400.css';
import '@fontsource/rubik/500.css';
import '@fontsource/rubik/700.css';

import './styles/tokens.css';
import './styles/global.css';
import App from './App';
import { AuthProvider } from './hooks/useAuth';
import { seedIfEmpty } from './db/database';
import { ensurePersistentStorage } from './utils/storage';

// בקשת אחסון קבוע — מונע מ-Android/Chrome למחוק את ה-IndexedDB (פרופילים
// והגדרות). קריטי כדי שההרשמה תישמר ולא תתבקש שוב בכל פתיחה.
void ensurePersistentStorage();

// זריעת מאגר בסיסי אם ריק (המימוש המלא בשלב 3)
void seedIfEmpty();

// בבנייה ל-GitHub Pages האפליקציה יושבת תחת /mymenu/, ולכן ה-router חייב
// לדעת את קידומת הבסיס — אחרת נתיב השורש (/mymenu/) לא תואם לאף route
// ומסך הבית נראה ריק. בפיתוח BASE_URL='/' וה-basename יוצא '/'.
const routerBasename = import.meta.env.BASE_URL.replace(/\/$/, '') || '/';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={routerBasename}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
