import { describe, it, expect } from 'vitest';
import { selectDailyTip } from './dailyTip';
import type { Tip, TipHistory } from '../types';

const TIPS: Tip[] = [
  { id: 't1', text: 'א', category: 'שתייה' },
  { id: 't2', text: 'ב', category: 'שתייה' },
  { id: 't3', text: 'ג', category: 'תנועה' },
];

function hist(entries: { tipId: string; day: string }[]): TipHistory[] {
  return entries.map((e, i) => ({
    id: `h-${i}`,
    profileId: 'p',
    tipId: e.tipId,
    shownAt: new Date(`${e.day}T09:00:00`).getTime(),
  }));
}

describe('selectDailyTip', () => {
  it('אותו יום → אותו טיפ (יציבות)', () => {
    const a = selectDailyTip('2026-07-06', TIPS, []);
    const b = selectDailyTip('2026-07-06', TIPS, []);
    expect(a!.id).toBe(b!.id);
  });

  it('אם כבר נבחר טיפ להיום — מחזיר אותו', () => {
    const history = hist([{ tipId: 't3', day: '2026-07-06' }]);
    const tip = selectDailyTip('2026-07-06', TIPS, history);
    expect(tip!.id).toBe('t3');
  });

  it('לא חוזר על טיפ שהוצג בסבב הנוכחי', () => {
    // הוצגו t1,t2 בסבב הנוכחי — הבחירה החדשה חייבת להיות t3
    const history = hist([
      { tipId: 't1', day: '2026-07-04' },
      { tipId: 't2', day: '2026-07-05' },
    ]);
    const tip = selectDailyTip('2026-07-06', TIPS, history);
    expect(tip!.id).toBe('t3');
  });

  it('אחרי שהסבב נגמר — מתאפס וניתן לחזור', () => {
    // הוצגו כל 3 → סבב הבא מתחיל, כל הטיפים זמינים שוב
    const history = hist([
      { tipId: 't1', day: '2026-07-01' },
      { tipId: 't2', day: '2026-07-02' },
      { tipId: 't3', day: '2026-07-03' },
    ]);
    const tip = selectDailyTip('2026-07-06', TIPS, history);
    expect(tip).toBeDefined();
    // הסבב התאפס: הטיפ הנבחר הוא מהמאגר המלא
    expect(TIPS.map((t) => t.id)).toContain(tip!.id);
  });

  it('מאגר ריק → undefined', () => {
    expect(selectDailyTip('2026-07-06', [], [])).toBeUndefined();
  });
});
