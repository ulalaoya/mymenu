// ===== אחסון קבוע — מניעת מחיקת IndexedDB (SPEC סעיף 3, 7) =====
// ב-Android/Chrome, בלי בקשת אחסון קבוע הדפדפן רשאי למחוק את ה-IndexedDB
// (במיוחד ב-PWA מותקן, תחת לחץ אחסון). זה מוחק פרופילים והגדרות ומאלץ
// הרשמה מחדש. קריאה אחת ל-navigator.storage.persist() מונעת זאת.

/**
 * מבקש אחסון קבוע לדפדפן, פעם אחת. בטוח לקריאה חוזרת (idempotent) ולא
 * זורק גם בסביבות ללא תמיכה (בדיקות/דפדפנים ישנים). מחזיר את מצב הקביעות.
 */
export async function ensurePersistentStorage(): Promise<boolean> {
  try {
    if (
      typeof navigator === 'undefined' ||
      !navigator.storage ||
      typeof navigator.storage.persist !== 'function'
    ) {
      return false;
    }
    // אם כבר קבוע — אין צורך לבקש שוב.
    if (typeof navigator.storage.persisted === 'function') {
      const already = await navigator.storage.persisted();
      if (already) return true;
    }
    return await navigator.storage.persist();
  } catch {
    // סביבה ללא תמיכה או דחייה — לא חוסם את האפליקציה.
    return false;
  }
}
