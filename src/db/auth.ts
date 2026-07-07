// ===== אבטחה ואימות — hash סיסמאות (SPEC סעיף 3.2) =====
// שימוש ב-Web Crypto API בלבד (crypto.subtle) — ללא ספריות חיצוניות.

/** אורך סיסמה מינימלי (SPEC: "זו ילדה, לא בנק") */
export const MIN_PASSWORD_LENGTH = 4;

/** ממיר ArrayBuffer למחרוזת hex */
function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * מייצר salt אקראי (16 בייטים) ומחזיר אותו כמחרוזת hex.
 */
export function generateSalt(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * מחשב SHA-256 על צירוף של salt + סיסמה ומחזיר hex.
 * אותה סיסמה + אותו salt → אותו hash תמיד.
 */
export async function hashPassword(
  password: string,
  salt: string,
): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${password}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return bufferToHex(digest);
}

/**
 * מאמת סיסמה מול hash+salt שמורים. מחזיר true רק להתאמה מלאה.
 */
export async function verifyPassword(
  password: string,
  salt: string,
  hash: string,
): Promise<boolean> {
  const computed = await hashPassword(password, salt);
  return computed === hash;
}

/**
 * בודק שסיסמה עומדת באורך המינימלי.
 */
export function isValidPassword(password: string): boolean {
  return password.length >= MIN_PASSWORD_LENGTH;
}
