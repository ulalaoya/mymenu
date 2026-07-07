// ===== טיפ יומי — SPEC סעיף 5.4 =====
// טיפ אחד ליום, מתחלף בחצות, לא חוזר עד שנגמר הסבב ואז מתאפס.
// דטרמיניסטי לפי (פרופיל, תאריך): אותו יום → אותו טיפ.

import type { Tip, TipHistory } from '../types';
import { db } from '../db/database';

/**
 * בוחר את טיפ היום (טהור).
 * אם כבר נבחר טיפ לתאריך הזה — מחזיר אותו (יציבות ביום).
 * אחרת בוחר את הטיפ הבא שלא הוצג בסבב הנוכחי; כשכולם הוצגו — מתחיל סבב חדש.
 *
 * @param date תאריך "YYYY-MM-DD"
 * @param tips מאגר הטיפים
 * @param history היסטוריית הטיפים שהוצגו לפרופיל
 */
export function selectDailyTip(
  date: string,
  tips: Tip[],
  history: TipHistory[],
): Tip | undefined {
  if (tips.length === 0) return undefined;

  // אם כבר יש טיפ שנרשם לתאריך הזה — נשארים איתו (מתחלף רק בחצות).
  const todayEntry = history.find((h) => tipDate(h.shownAt) === date);
  if (todayEntry) {
    const t = tips.find((x) => x.id === todayEntry.tipId);
    if (t) return t;
  }

  // כמה טיפים כבר הוצגו בסבב הנוכחי: מספר ההצגות מודולו גודל המאגר.
  const shownCountInRound = history.length % tips.length;
  // מזהי הטיפים שהוצגו בסבב הנוכחי (ההצגות האחרונות)
  const roundStart = history.length - shownCountInRound;
  const currentRoundIds = new Set(
    history.slice(roundStart).map((h) => h.tipId),
  );

  const available = tips.filter((t) => !currentRoundIds.has(t.id));
  const pool = available.length > 0 ? available : tips;

  // בחירה דטרמיניסטית לפי התאריך (יציבות בין קריאות באותו יום)
  const idx = hashDate(date) % pool.length;
  return pool[idx];
}

/** ממיר timestamp לתאריך "YYYY-MM-DD" מקומי */
function tipDate(ts: number): string {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** ממיר מחרוזת "YYYY-MM-DD" ל-timestamp של אמצע היום המקומי */
function dateToNoonTs(date: string): number {
  return new Date(`${date}T12:00:00`).getTime();
}

/** hash יציב וקטן ממחרוזת תאריך */
function hashDate(date: string): number {
  let h = 0;
  for (let i = 0; i < date.length; i++) {
    h = (h * 31 + date.charCodeAt(i)) >>> 0;
  }
  return h;
}

/**
 * Wrapper ל-Dexie: מחזיר את טיפ היום; אם עדיין לא נרשם להיום — רושם ב-tipHistory.
 * שומר על "לא חוזר עד סוף הסבב" דרך ההיסטוריה המצטברת.
 */
export async function getDailyTip(
  profileId: string,
  date: string,
  // ברירת המחדל: אמצע היום של ה-date הלוגי, כדי ש-tipDate(shownAt)===date
  // תמיד יתקיים (יציבות "אותו יום → אותו טיפ") ללא תלות בשעון הקיר.
  now: number = dateToNoonTs(date),
): Promise<Tip | undefined> {
  const [tips, history] = await Promise.all([
    db.tips.toArray(),
    db.tipHistory.where('profileId').equals(profileId).sortBy('shownAt'),
  ]);

  const tip = selectDailyTip(date, tips, history);
  if (!tip) return undefined;

  // רישום להיסטוריה רק אם עדיין אין רשומה להיום.
  const alreadyToday = history.some((h) => tipDate(h.shownAt) === date);
  if (!alreadyToday) {
    await db.tipHistory.add({
      id: crypto.randomUUID(),
      profileId,
      tipId: tip.id,
      shownAt: now,
    });
  }
  return tip;
}
