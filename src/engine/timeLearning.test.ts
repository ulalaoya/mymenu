import { describe, it, expect } from 'vitest';
import { learnMealTimes, minutesToTime, MIN_SAMPLES } from './timeLearning';
import { makeLog } from './testHelpers';

/** בונה timestamp ליום מסוים לפני now בשעה נתונה */
function at(now: number, daysAgo: number, hh: number, mm: number): number {
  const d = new Date(now);
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hh, mm, 0, 0);
  return d.getTime();
}

describe('minutesToTime', () => {
  it('ממיר דקות ל-HH:MM', () => {
    expect(minutesToTime(8 * 60)).toBe('08:00');
    expect(minutesToTime(13 * 60 + 30)).toBe('13:30');
  });
});

describe('learnMealTimes', () => {
  const NOW = new Date('2026-07-06T12:00:00').getTime();
  const defaults = { בוקר: '07:00', צהריים: '13:30' } as const;

  it('אם רשמו בוקר בעקביות ב-08:00, השעה זזה לכיוון 08:00', () => {
    const logs = [
      makeLog({ slot: 'בוקר', eatenAt: at(NOW, 1, 8, 0) }),
      makeLog({ slot: 'בוקר', eatenAt: at(NOW, 2, 8, 0) }),
      makeLog({ slot: 'בוקר', eatenAt: at(NOW, 3, 8, 0) }),
    ];
    const updated = learnMealTimes(logs, defaults, NOW);
    expect(updated.בוקר).toBe('08:00');
  });

  it('ממוצע נע: 08:00 ו-08:30 → 08:15', () => {
    const logs = [
      makeLog({ slot: 'בוקר', eatenAt: at(NOW, 1, 8, 0) }),
      makeLog({ slot: 'בוקר', eatenAt: at(NOW, 2, 8, 30) }),
      makeLog({ slot: 'בוקר', eatenAt: at(NOW, 3, 8, 0) }),
      makeLog({ slot: 'בוקר', eatenAt: at(NOW, 4, 8, 30) }),
    ];
    const updated = learnMealTimes(logs, defaults, NOW);
    expect(updated.בוקר).toBe('08:15');
  });

  it('פחות מ-MIN_SAMPLES דגימות — נשאר ברירת מחדל', () => {
    const logs = Array.from({ length: MIN_SAMPLES - 1 }, (_, i) =>
      makeLog({ slot: 'בוקר', eatenAt: at(NOW, i + 1, 9, 0) }),
    );
    const updated = learnMealTimes(logs, defaults, NOW);
    expect(updated.בוקר).toBe('07:00');
  });

  it('רישומים ישנים מ-14 יום לא נספרים', () => {
    const logs = [
      makeLog({ slot: 'בוקר', eatenAt: at(NOW, 20, 6, 0) }),
      makeLog({ slot: 'בוקר', eatenAt: at(NOW, 21, 6, 0) }),
      makeLog({ slot: 'בוקר', eatenAt: at(NOW, 22, 6, 0) }),
    ];
    const updated = learnMealTimes(logs, defaults, NOW);
    expect(updated.בוקר).toBe('07:00'); // לא זז ל-06:00
  });
});
