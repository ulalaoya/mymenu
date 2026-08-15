// ===== יחידות מדידה שהמשתמשת הוסיפה =====
// יחידות ברירת המחדל מוגדרות ב-menuDisplay (BUILTIN_UNIT_OPTIONS). כאן נשמרות
// יחידות נוספות שהמשתמשת יצרה, מקומית (localStorage) — נשארות זמינות בכל פתיחה
// ולכל הארוחות, בלי קריאות רשת ובלי צורך בשינוי סכמת ה-DB.

const STORAGE_KEY = 'mymenu:customUnits';

/** קורא את רשימת היחידות המותאמות ששמורות מקומית (מחזיר [] אם אין/שגיאה) */
export function getCustomUnits(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((u): u is string => typeof u === 'string' && u.trim().length > 0);
  } catch {
    return [];
  }
}

/**
 * מוסיף יחידת מדידה חדשה (ללא כפילויות) ושומר מקומית. מחזיר את הרשימה
 * המעודכנת. שם ריק או שכבר קיים — לא משנה את הרשימה.
 */
export function addCustomUnit(unit: string): string[] {
  const clean = unit.trim();
  const current = getCustomUnits();
  if (clean.length === 0 || current.includes(clean)) return current;
  const next = [...current, clean];
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // סביבה ללא localStorage — לא חוסם, פשוט לא יישמר בין פתיחות
  }
  return next;
}
