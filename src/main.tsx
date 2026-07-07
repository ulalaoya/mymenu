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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
