// ===== Context אימות — הפרופיל הפעיל (SPEC סעיף 3) =====
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';
import type { ReactNode } from 'react';
import type { Profile } from '../types';
import {
  login as dbLogin,
  logout as dbLogout,
  switchProfile as dbSwitchProfile,
  createProfile as dbCreateProfile,
  getLastProfile,
} from '../db/profiles';
import type { CreateProfileInput } from '../db/profiles';

interface AuthContextValue {
  /** הפרופיל הפעיל, או null אם אין */
  profile: Profile | null;
  /** true עד שסיימנו לטעון את הפרופיל האחרון (כניסה אוטומטית) */
  loading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  switchProfile: (profileId: string, password: string) => Promise<boolean>;
  createProfile: (input: CreateProfileInput) => Promise<Profile>;
  logout: () => Promise<void>;
  /** מעדכן את הפרופיל הפעיל ב-context אחרי עריכה בהגדרות */
  updateActiveProfile: (updated: Profile) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // כניסה אוטומטית לפרופיל האחרון בעליית האפליקציה (זיהוי מכשיר)
  useEffect(() => {
    let cancelled = false;
    getLastProfile()
      .then((p) => {
        if (!cancelled) setProfile(p);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const p = await dbLogin(username, password);
    if (p) setProfile(p);
    return p !== null;
  }, []);

  const switchProfile = useCallback(
    async (profileId: string, password: string) => {
      const p = await dbSwitchProfile(profileId, password);
      if (p) setProfile(p);
      return p !== null;
    },
    [],
  );

  const createProfile = useCallback(async (input: CreateProfileInput) => {
    const p = await dbCreateProfile(input);
    // אחרי יצירה — מתחברים אוטומטית
    await dbLogin(input.username, input.password);
    setProfile(p);
    return p;
  }, []);

  const logout = useCallback(async () => {
    await dbLogout();
    setProfile(null);
  }, []);

  const updateActiveProfile = useCallback((updated: Profile) => {
    setProfile(updated);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        profile,
        loading,
        login,
        switchProfile,
        createProfile,
        logout,
        updateActiveProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
