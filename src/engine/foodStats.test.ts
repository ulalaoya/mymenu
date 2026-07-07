import { describe, it, expect } from 'vitest';
import { computeFoodStats, buildOfferedCounts } from './foodStats';
import { makeLog } from './testHelpers';

describe('computeFoodStats', () => {
  it('מחשב ממוצעי טעם ושובע נכון', () => {
    const logs = [
      makeLog({ foodIds: ['a'], tasteRating: 4, satietyRating: 5, date: '2026-07-01' }),
      makeLog({ foodIds: ['a'], tasteRating: 2, satietyRating: 3, date: '2026-07-02' }),
    ];
    const stats = computeFoodStats('profile-test', logs);
    const a = stats.get('a')!;
    expect(a.tasteAvg).toBe(3);
    expect(a.satietyAvg).toBe(4);
    expect(a.timesEaten).toBe(2);
    expect(a.lastEatenDate).toBe('2026-07-02');
  });

  it('רישום ללא דירוג לא משתתף בממוצע', () => {
    const logs = [
      makeLog({ foodIds: ['a'], tasteRating: 4 }),
      makeLog({ foodIds: ['a'] }), // ללא דירוג
    ];
    const a = computeFoodStats('profile-test', logs).get('a')!;
    expect(a.tasteAvg).toBe(4);
    expect(a.timesEaten).toBe(2);
  });

  it('מסנן לפי profileId', () => {
    const logs = [
      makeLog({ foodIds: ['a'], profileId: 'me' }),
      makeLog({ foodIds: ['b'], profileId: 'other' }),
    ];
    const stats = computeFoodStats('me', logs);
    expect(stats.has('a')).toBe(true);
    expect(stats.has('b')).toBe(false);
  });

  it('actuallyAteRate מחושב מול ספירת הצעות', () => {
    const logs = [makeLog({ foodIds: ['a'] })]; // נאכל פעם אחת
    const offered = new Map([['a', { count: 4, lastDate: '2026-07-01' }]]);
    const a = computeFoodStats('profile-test', logs, undefined, offered).get('a')!;
    expect(a.timesOffered).toBe(4);
    expect(a.actuallyAteRate).toBe(0.25);
  });

  it('ללא נתוני הצעה — timesOffered=timesEaten ו-ateRate=1', () => {
    const logs = [makeLog({ foodIds: ['a'] }), makeLog({ foodIds: ['a'] })];
    const a = computeFoodStats('profile-test', logs).get('a')!;
    expect(a.timesOffered).toBe(2);
    expect(a.actuallyAteRate).toBe(1);
  });
});

describe('buildOfferedCounts', () => {
  it('סופר הופעות במשבצות וב-sweetFoodId', () => {
    const menus = [
      {
        date: '2026-07-01',
        slots: [{ foodIds: ['a', 'b'] }, { foodIds: ['a'] }],
        sweetFoodId: 'c',
      },
      { date: '2026-07-02', slots: [{ foodIds: ['a'] }] },
    ];
    const counts = buildOfferedCounts(menus);
    expect(counts.get('a')!.count).toBe(3);
    expect(counts.get('a')!.lastDate).toBe('2026-07-02');
    expect(counts.get('b')!.count).toBe(1);
    expect(counts.get('c')!.count).toBe(1);
  });
});
