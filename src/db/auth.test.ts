import { describe, it, expect } from 'vitest';
import {
  generateSalt,
  hashPassword,
  verifyPassword,
  isValidPassword,
  MIN_PASSWORD_LENGTH,
} from './auth';

describe('auth — hash סיסמאות', () => {
  it('אותה סיסמה + אותו salt נותנים אותו hash', async () => {
    const salt = generateSalt();
    const a = await hashPassword('sod1234', salt);
    const b = await hashPassword('sod1234', salt);
    expect(a).toBe(b);
  });

  it('salt שונה נותן hash שונה לאותה סיסמה', async () => {
    const salt1 = generateSalt();
    const salt2 = generateSalt();
    expect(salt1).not.toBe(salt2);
    const a = await hashPassword('sod1234', salt1);
    const b = await hashPassword('sod1234', salt2);
    expect(a).not.toBe(b);
  });

  it('סיסמה שונה נותנת hash שונה עם אותו salt', async () => {
    const salt = generateSalt();
    const a = await hashPassword('sod1234', salt);
    const b = await hashPassword('sod9999', salt);
    expect(a).not.toBe(b);
  });

  it('hash הוא מחרוזת hex באורך 64 (256 ביט)', async () => {
    const salt = generateSalt();
    const h = await hashPassword('abcd', salt);
    expect(h).toMatch(/^[0-9a-f]{64}$/);
  });

  it('generateSalt מייצר salt הקסדצימלי לא ריק', () => {
    const salt = generateSalt();
    expect(salt).toMatch(/^[0-9a-f]+$/);
    expect(salt.length).toBeGreaterThan(0);
  });

  it('verifyPassword מחזיר true לסיסמה הנכונה', async () => {
    const salt = generateSalt();
    const hash = await hashPassword('nachon', salt);
    expect(await verifyPassword('nachon', salt, hash)).toBe(true);
  });

  it('verifyPassword מחזיר false לסיסמה שגויה', async () => {
    const salt = generateSalt();
    const hash = await hashPassword('nachon', salt);
    expect(await verifyPassword('shguya', salt, hash)).toBe(false);
  });
});

describe('auth — ולידציית סיסמה', () => {
  it('דוחה סיסמה קצרה מהמינימום', () => {
    expect(isValidPassword('abc')).toBe(false);
    expect(isValidPassword('')).toBe(false);
  });

  it('מקבל סיסמה באורך המינימלי ומעלה', () => {
    expect(isValidPassword('a'.repeat(MIN_PASSWORD_LENGTH))).toBe(true);
    expect(isValidPassword('abcdefgh')).toBe(true);
  });
});
