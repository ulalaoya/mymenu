// ===== מנוע היסק מקומי לזיהוי קבוצות מזון מתוך שם מאכל =====
// SPEC סעיפים 4, 6.4 — הילדה מקלידה שם בלבד, והאפליקציה מזהה
// אוטומטית "ממה המאכל עשוי" (קבוצות מזון) ומציעה emoji.
//
// מקומי לחלוטין: אין רשת, אין API. שלוש שכבות:
//   1. התאמה למאגר הידוע (ירושת foodGroups + emoji מהמאכל הדומה ביותר).
//   2. לקסיקון עברי של מילות מפתח (150+ ערכים) → קבוצות (+emoji אופציונלי).
//   3. ברירת מחדל: ריק, matchedBy 'none' (הילדה תסמן ידנית).
//
// לוגיקה טהורה וטסטבילית — מופרדת לחלוטין מה-UI.

import type { FoodGroup, FoodItem } from '../types';

/** תוצאת ההיסק */
export interface InferenceResult {
  foodGroups: FoodGroup[];
  emoji?: string;
  matchedBy: 'exact' | 'known-food' | 'lexicon' | 'none';
}

/** ערך בלקסיקון: מילת מפתח → קבוצות מזון (+emoji אופציונלי) */
interface LexEntry {
  groups: FoodGroup[];
  emoji?: string;
}

// ===== הלקסיקון העברי =====
// המפתחות מנורמלים (ראה normalize) — ללא ניקוד, גרשיים אחידים.
// כל ערך ממופה לקבוצה אחת או יותר. emoji מוגדר רק כשהוא חד-משמעי.
const LEXICON: Record<string, LexEntry> = {
  // ---------- פחמימות ----------
  לחם: { groups: ['פחמימות'], emoji: '🍞' },
  פיתה: { groups: ['פחמימות'], emoji: '🫓' },
  לחמניה: { groups: ['פחמימות'], emoji: '🍞' },
  לחמנייה: { groups: ['פחמימות'], emoji: '🍞' },
  בגט: { groups: ['פחמימות'], emoji: '🥖' },
  טורטייה: { groups: ['פחמימות'], emoji: '🌯' },
  טורטיה: { groups: ['פחמימות'], emoji: '🌯' },
  ראפ: { groups: ['פחמימות'], emoji: '🌯' },
  פסטה: { groups: ['פחמימות'], emoji: '🍝' },
  ספגטי: { groups: ['פחמימות'], emoji: '🍝' },
  אטריות: { groups: ['פחמימות'], emoji: '🍜' },
  נודלס: { groups: ['פחמימות'], emoji: '🍜' },
  לזניה: { groups: ['פחמימות', 'מוצרי חלב'], emoji: '🍝' },
  רביולי: { groups: ['פחמימות'], emoji: '🍝' },
  ניוקי: { groups: ['פחמימות'], emoji: '🥟' },
  אורז: { groups: ['פחמימות'], emoji: '🍚' },
  ריזוטו: { groups: ['פחמימות'], emoji: '🍚' },
  סושי: { groups: ['פחמימות'], emoji: '🍣' },
  פירה: { groups: ['פחמימות'], emoji: '🥔' },
  בטטה: { groups: ['פחמימות'], emoji: '🍠' },
  קוסקוס: { groups: ['פחמימות'], emoji: '🍚' },
  פתיתים: { groups: ['פחמימות'], emoji: '🍚' },
  בורגול: { groups: ['פחמימות'], emoji: '🍚' },
  קינואה: { groups: ['פחמימות'], emoji: '🍚' },
  פריכיות: { groups: ['פחמימות'] },
  קרקר: { groups: ['פחמימות'], emoji: '🍘' },
  קרקרים: { groups: ['פחמימות'], emoji: '🍘' },
  מצה: { groups: ['פחמימות'], emoji: '🫓' },
  מצות: { groups: ['פחמימות'], emoji: '🫓' },
  בייגלה: { groups: ['פחמימות'], emoji: '🥨' },
  בייגל: { groups: ['פחמימות'], emoji: '🥯' },
  קרואסון: { groups: ['פחמימות'], emoji: '🥐' },
  פיצה: { groups: ['פחמימות', 'מוצרי חלב'], emoji: '🍕' },
  בורקס: { groups: ['פחמימות'], emoji: '🥟' },
  מלאווח: { groups: ['פחמימות'], emoji: '🫓' },
  'ג׳חנון': { groups: ['פחמימות'], emoji: '🫓' },
  קובה: { groups: ['פחמימות'], emoji: '🥟' },
  בצק: { groups: ['פחמימות'] },
  קרפ: { groups: ['פחמימות'], emoji: '🥞' },
  פנקייק: { groups: ['פחמימות'], emoji: '🥞' },
  פנקייקים: { groups: ['פחמימות'], emoji: '🥞' },
  וופל: { groups: ['פחמימות'], emoji: '🧇' },
  וופלים: { groups: ['פחמימות'], emoji: '🧇' },
  טוסט: { groups: ['פחמימות'], emoji: '🥪' },
  כריך: { groups: ['פחמימות'], emoji: '🥪' },
  כריכון: { groups: ['פחמימות'], emoji: '🥪' },
  סנדוויץ: { groups: ['פחמימות'], emoji: '🥪' },
  שווארמה: { groups: ['פחמימות', 'חלבונים'], emoji: '🌯' },
  קורנפלקס: { groups: ['פחמימות'], emoji: '🥣' },
  גרנולה: { groups: ['פחמימות'], emoji: '🥣' },
  'דגני בוקר': { groups: ['פחמימות'], emoji: '🥣' },
  דגנים: { groups: ['פחמימות'], emoji: '🥣' },
  'שיבולת שועל': { groups: ['פחמימות'], emoji: '🥣' },
  קוואקר: { groups: ['פחמימות'], emoji: '🥣' },
  דייסה: { groups: ['פחמימות'], emoji: '🥣' },
  'צ׳יפס': { groups: ['פחמימות'], emoji: '🍟' },
  תפוציפס: { groups: ['פחמימות'], emoji: '🥔' },

  // ---------- חלבונים ----------
  עוף: { groups: ['חלבונים'], emoji: '🍗' },
  הודו: { groups: ['חלבונים'], emoji: '🍗' },
  פרגית: { groups: ['חלבונים'], emoji: '🍗' },
  שניצל: { groups: ['חלבונים'], emoji: '🍗' },
  שניצלים: { groups: ['חלבונים'], emoji: '🍗' },
  בשר: { groups: ['חלבונים'], emoji: '🍖' },
  בקר: { groups: ['חלבונים'], emoji: '🍖' },
  אנטריקוט: { groups: ['חלבונים'], emoji: '🥩' },
  סטייק: { groups: ['חלבונים'], emoji: '🥩' },
  קציצה: { groups: ['חלבונים'], emoji: '🍖' },
  קציצות: { groups: ['חלבונים'], emoji: '🍖' },
  קבב: { groups: ['חלבונים'], emoji: '🍢' },
  שיפוד: { groups: ['חלבונים'], emoji: '🍢' },
  שיפודים: { groups: ['חלבונים'], emoji: '🍢' },
  המבורגר: { groups: ['חלבונים'], emoji: '🍔' },
  נקניקיה: { groups: ['חלבונים'], emoji: '🌭' },
  נקניקייה: { groups: ['חלבונים'], emoji: '🌭' },
  נקניק: { groups: ['חלבונים'], emoji: '🌭' },
  דג: { groups: ['חלבונים'], emoji: '🐟' },
  דגים: { groups: ['חלבונים'], emoji: '🐟' },
  טונה: { groups: ['חלבונים'], emoji: '🐟' },
  סלמון: { groups: ['חלבונים'], emoji: '🐟' },
  בורי: { groups: ['חלבונים'], emoji: '🐟' },
  דניס: { groups: ['חלבונים'], emoji: '🐟' },
  קרפיון: { groups: ['חלבונים'], emoji: '🐟' },
  ביצה: { groups: ['חלבונים'], emoji: '🥚' },
  ביצים: { groups: ['חלבונים'], emoji: '🥚' },
  חביתה: { groups: ['חלבונים'], emoji: '🍳' },
  שקשוקה: { groups: ['חלבונים', 'ירקות'], emoji: '🍳' },
  אומלט: { groups: ['חלבונים'], emoji: '🍳' },
  טופו: { groups: ['חלבונים'], emoji: '🧈' },
  סייטן: { groups: ['חלבונים'] },
  שניצלוני: { groups: ['חלבונים'], emoji: '🍗' },

  // ---------- מוצרי חלב ----------
  חלב: { groups: ['מוצרי חלב'], emoji: '🥛' },
  גבינה: { groups: ['מוצרי חלב'], emoji: '🧀' },
  'גבינה צהובה': { groups: ['מוצרי חלב'], emoji: '🧀' },
  צהובה: { groups: ['מוצרי חלב'], emoji: '🧀' },
  'קוטג׳': { groups: ['מוצרי חלב'], emoji: '🧀' },
  קוטג: { groups: ['מוצרי חלב'], emoji: '🧀' },
  בולגרית: { groups: ['מוצרי חלב'], emoji: '🧀' },
  מוצרלה: { groups: ['מוצרי חלב'], emoji: '🧀' },
  פטה: { groups: ['מוצרי חלב'], emoji: '🧀' },
  ריקוטה: { groups: ['מוצרי חלב'], emoji: '🧀' },
  שמנת: { groups: ['מוצרי חלב'] },
  יוגורט: { groups: ['מוצרי חלב'], emoji: '🥛' },
  מעדן: { groups: ['מוצרי חלב'] },
  לבן: { groups: ['מוצרי חלב'], emoji: '🥛' },
  אשל: { groups: ['מוצרי חלב'] },
  חמאה: { groups: ['מוצרי חלב'], emoji: '🧈' },
  לאבנה: { groups: ['מוצרי חלב'] },
  מילקי: { groups: ['מוצרי חלב', 'מתוקים'] },
  דנונה: { groups: ['מוצרי חלב'] },
  גיל: { groups: ['מוצרי חלב'] },
  שוקו: { groups: ['מוצרי חלב', 'מתוקים'], emoji: '🥛' },

  // ---------- קטניות ----------
  חומוס: { groups: ['קטניות'] },
  עדשים: { groups: ['קטניות'] },
  שעועית: { groups: ['קטניות'] },
  אפונה: { groups: ['קטניות', 'ירקות'], emoji: '🫛' },
  גרגרי: { groups: ['קטניות'] },
  'גרגרי חומוס': { groups: ['קטניות'] },
  פול: { groups: ['קטניות'] },
  אדממה: { groups: ['קטניות'], emoji: '🫛' },
  פלאפל: { groups: ['קטניות'], emoji: '🧆' },
  'מג׳דרה': { groups: ['קטניות', 'פחמימות'] },
  טופואים: { groups: ['קטניות'] },

  // ---------- ירקות ----------
  עגבניה: { groups: ['ירקות'], emoji: '🍅' },
  עגבנייה: { groups: ['ירקות'], emoji: '🍅' },
  מלפפון: { groups: ['ירקות'], emoji: '🥒' },
  גזר: { groups: ['ירקות'], emoji: '🥕' },
  פלפל: { groups: ['ירקות'], emoji: '🫑' },
  חסה: { groups: ['ירקות'], emoji: '🥬' },
  כרוב: { groups: ['ירקות'], emoji: '🥬' },
  ברוקולי: { groups: ['ירקות'], emoji: '🥦' },
  כרובית: { groups: ['ירקות'], emoji: '🥦' },
  תירס: { groups: ['ירקות', 'פחמימות'], emoji: '🌽' },
  קישוא: { groups: ['ירקות'], emoji: '🥒' },
  קישואים: { groups: ['ירקות'], emoji: '🥒' },
  חציל: { groups: ['ירקות'], emoji: '🍆' },
  בצל: { groups: ['ירקות'], emoji: '🧅' },
  תרד: { groups: ['ירקות'], emoji: '🥬' },
  סלק: { groups: ['ירקות'] },
  צנונית: { groups: ['ירקות'] },
  קולרבי: { groups: ['ירקות'] },
  פטריות: { groups: ['ירקות'], emoji: '🍄' },
  פטרייה: { groups: ['ירקות'], emoji: '🍄' },
  דלעת: { groups: ['ירקות'], emoji: '🎃' },
  בטטות: { groups: ['פחמימות'], emoji: '🍠' },
  שום: { groups: ['ירקות'], emoji: '🧄' },
  סלט: { groups: ['ירקות'], emoji: '🥗' },
  'סלט ירקות': { groups: ['ירקות'], emoji: '🥗' },
  מרק: { groups: ['ירקות'], emoji: '🍲' },
  'מרק ירקות': { groups: ['ירקות'], emoji: '🍲' },

  // ---------- פירות ----------
  תפוח: { groups: ['פירות'], emoji: '🍎' },
  'תפוח עץ': { groups: ['פירות'], emoji: '🍎' },
  בננה: { groups: ['פירות'], emoji: '🍌' },
  ענבים: { groups: ['פירות'], emoji: '🍇' },
  תות: { groups: ['פירות'], emoji: '🍓' },
  תותים: { groups: ['פירות'], emoji: '🍓' },
  אבטיח: { groups: ['פירות'], emoji: '🍉' },
  מלון: { groups: ['פירות'], emoji: '🍈' },
  אפרסק: { groups: ['פירות'], emoji: '🍑' },
  נקטרינה: { groups: ['פירות'], emoji: '🍑' },
  שזיף: { groups: ['פירות'] },
  אגס: { groups: ['פירות'], emoji: '🍐' },
  קלמנטינה: { groups: ['פירות'], emoji: '🍊' },
  מנדרינה: { groups: ['פירות'], emoji: '🍊' },
  תפוז: { groups: ['פירות'], emoji: '🍊' },
  מנגו: { groups: ['פירות'], emoji: '🥭' },
  אננס: { groups: ['פירות'], emoji: '🍍' },
  קיווי: { groups: ['פירות'], emoji: '🥝' },
  רימון: { groups: ['פירות'] },
  תמר: { groups: ['פירות'] },
  תמרים: { groups: ['פירות'] },
  צימוקים: { groups: ['פירות'] },
  אשכולית: { groups: ['פירות'] },
  ליצי: { groups: ['פירות'] },
  דובדבן: { groups: ['פירות'], emoji: '🍒' },
  דובדבנים: { groups: ['פירות'], emoji: '🍒' },
  לימון: { groups: ['פירות'], emoji: '🍋' },

  // ---------- שומנים בריאים ----------
  אבוקדו: { groups: ['שומנים בריאים'], emoji: '🥑' },
  טחינה: { groups: ['שומנים בריאים'] },
  זית: { groups: ['שומנים בריאים'], emoji: '🫒' },
  זיתים: { groups: ['שומנים בריאים'], emoji: '🫒' },
  'שמן זית': { groups: ['שומנים בריאים'] },
  אגוזים: { groups: ['שומנים בריאים'], emoji: '🥜' },
  אגוז: { groups: ['שומנים בריאים'], emoji: '🥜' },
  שקדים: { groups: ['שומנים בריאים'], emoji: '🥜' },
  בוטנים: { groups: ['שומנים בריאים'], emoji: '🥜' },
  'חמאת בוטנים': { groups: ['שומנים בריאים'], emoji: '🥜' },
  קשיו: { groups: ['שומנים בריאים'], emoji: '🥜' },
  פקאן: { groups: ['שומנים בריאים'], emoji: '🥜' },
  גרעינים: { groups: ['שומנים בריאים'] },
  'צ׳יה': { groups: ['שומנים בריאים'] },
  'זרעי פשתן': { groups: ['שומנים בריאים'] },

  // ---------- מתוקים ----------
  שוקולד: { groups: ['מתוקים'], emoji: '🍫' },
  'שוקולד חלב': { groups: ['מתוקים', 'מוצרי חלב'], emoji: '🍫' },
  עוגה: { groups: ['מתוקים'], emoji: '🍰' },
  עוגת: { groups: ['מתוקים'], emoji: '🍰' },
  עוגיה: { groups: ['מתוקים'], emoji: '🍪' },
  עוגייה: { groups: ['מתוקים'], emoji: '🍪' },
  עוגיות: { groups: ['מתוקים'], emoji: '🍪' },
  גלידה: { groups: ['מתוקים'], emoji: '🍦' },
  ארטיק: { groups: ['מתוקים'], emoji: '🍡' },
  סוכריה: { groups: ['מתוקים'], emoji: '🍬' },
  סוכרייה: { groups: ['מתוקים'], emoji: '🍬' },
  ממתק: { groups: ['מתוקים'], emoji: '🍬' },
  סוכר: { groups: ['מתוקים'] },
  דונאט: { groups: ['מתוקים'], emoji: '🍩' },
  סופגניה: { groups: ['מתוקים'], emoji: '🍩' },
  סופגנייה: { groups: ['מתוקים'], emoji: '🍩' },
  קרמבו: { groups: ['מתוקים'] },
  במבה: { groups: ['מתוקים'] },
  ביסלי: { groups: ['פחמימות'] },
  חטיף: { groups: ['מתוקים'] },
  דבש: { groups: ['מתוקים'], emoji: '🍯' },
  ריבה: { groups: ['מתוקים'] },
  מאפין: { groups: ['מתוקים'], emoji: '🧁' },
  קאפקייק: { groups: ['מתוקים'], emoji: '🧁' },
  בראוניז: { groups: ['מתוקים'] },
  בראוני: { groups: ['מתוקים'] },
  פודינג: { groups: ['מתוקים'] },
  מוס: { groups: ['מתוקים'] },
  נוטלה: { groups: ['מתוקים'] },
  קינדר: { groups: ['מתוקים'], emoji: '🍫' },
  לביבה: { groups: ['פחמימות'] },
  מרשמלו: { groups: ['מתוקים'] },
  טופי: { groups: ['מתוקים'], emoji: '🍬' },
  מסטיק: { groups: ['מתוקים'] },
};

/** מפריד ניקוד עברי (U+0591–U+05C7) להסרה */
const NIKUD_RE = /[֑-ׇ]/g;

/**
 * נרמול טקסט עברי להשוואה:
 * - הסרת ניקוד/טעמים.
 * - איחוד גרשיים/מירכאות (' ' ` ״ ׳) לתו אחיד ׳.
 * - צמצום רווחים כפולים ו-trim.
 */
export function normalize(text: string): string {
  return text
    .replace(NIKUD_RE, '')
    .replace(/["'`׳״‘’“”]/g, '׳')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * מייצר צורות חלופיות פשוטות של מילה לצורך התאמה (יחיד/רבים):
 * - סיומת רבים ים/ות → הסרה (תפוחים→תפוח, עוגות→עוג...).
 * - הוספת ים/ות למילה יחידה.
 * מחזיר סט הכולל את המילה עצמה.
 */
function wordForms(word: string): string[] {
  const forms = new Set<string>([word]);
  if (word.length > 3) {
    if (word.endsWith('ים') || word.endsWith('ות')) {
      forms.add(word.slice(0, -2));
      forms.add(word.slice(0, -2) + 'ה');
    }
  }
  if (word.length >= 2) {
    forms.add(word + 'ים');
    forms.add(word + 'ות');
    if (word.endsWith('ה')) forms.add(word.slice(0, -1) + 'ות');
  }
  return [...forms];
}

/** איחוד שתי רשימות קבוצות ללא כפילויות, בשמירה על סדר */
function unionGroups(a: FoodGroup[], b: FoodGroup[]): FoodGroup[] {
  const out: FoodGroup[] = [];
  for (const g of [...a, ...b]) {
    if (!out.includes(g)) out.push(g);
  }
  return out;
}

/**
 * שכבה 1 — התאמה למאגר הידוע.
 * מחזיר את המאכל הידוע שהשם החדש מכיל את שמו (או להיפך),
 * תוך העדפת ההתאמה הארוכה ביותר. תומך בצורות יחיד/רבים פשוטות.
 */
function matchKnownFood(
  normName: string,
  knownFoods: FoodItem[],
): FoodItem | null {
  // עדיפויות: 3=התאמה מדויקת, 2=שם המאכל מוכל בשם החדש (למשל "פיצה" בתוך
  // "פיצה של אמא"), 1=השם החדש מוכל בשם המאכל (למשל "תפוח" בתוך "תפוח אדמה").
  // בתוך אותה עדיפות — ההתאמה הארוכה ביותר מנצחת.
  let best: FoodItem | null = null;
  let bestPriority = 0;
  let bestLen = 0;

  const consider = (food: FoodItem, priority: number, matchLen: number) => {
    if (
      priority > bestPriority ||
      (priority === bestPriority && matchLen > bestLen)
    ) {
      best = food;
      bestPriority = priority;
      bestLen = matchLen;
    }
  };

  for (const food of knownFoods) {
    const foodNorm = normalize(food.name);
    if (foodNorm.length === 0) continue;

    if (foodNorm === normName) {
      consider(food, 3, foodNorm.length);
      continue;
    }
    if (normName.includes(foodNorm)) {
      // שם המאכל מוכל בשם החדש — עדיפות גבוהה, לפי אורך שם המאכל.
      consider(food, 2, foodNorm.length);
      continue;
    }
    if (foodNorm.includes(normName)) {
      // השם החדש מוכל בשם המאכל — עדיפות נמוכה יותר.
      consider(food, 1, normName.length);
      continue;
    }
    // התאמת צורות יחיד/רבים של שם המאכל (למאכלים חד-מיליים).
    if (!foodNorm.includes(' ')) {
      for (const form of wordForms(foodNorm)) {
        if (normName.includes(form)) {
          consider(food, 2, foodNorm.length);
          break;
        }
      }
    }
  }

  return best;
}

/**
 * שכבה 2 — לקסיקון עברי.
 * מפרק את השם למילים, בודק כל מילה + צירופים דו-מילוניים מול הלקסיקון,
 * ומחזיר איחוד קבוצות + emoji ראשון שנמצא.
 */
function matchLexicon(normName: string): {
  groups: FoodGroup[];
  emoji?: string;
} {
  const words = normName.split(' ').filter((w) => w.length > 0);
  let groups: FoodGroup[] = [];
  let emoji: string | undefined;

  const applyEntry = (entry: LexEntry | undefined) => {
    if (!entry) return;
    groups = unionGroups(groups, entry.groups);
    if (!emoji && entry.emoji) emoji = entry.emoji;
  };

  // צירופים דו-מילוניים קודם (למשל "שוקולד חלב", "שמן זית", "דגני בוקר").
  for (let i = 0; i < words.length - 1; i++) {
    const bigram = words[i] + ' ' + words[i + 1];
    applyEntry(LEXICON[bigram]);
  }

  // מילים בודדות, כולל צורות יחיד/רבים.
  for (const word of words) {
    if (LEXICON[word]) {
      applyEntry(LEXICON[word]);
      continue;
    }
    for (const form of wordForms(word)) {
      if (LEXICON[form]) {
        applyEntry(LEXICON[form]);
        break;
      }
    }
  }

  return { groups, emoji };
}

/**
 * ההיסק המרכזי — מזהה ממה מאכל עשוי מתוך שמו בלבד.
 *
 * שכבה 1 (מאגר ידוע) עדיפה ל-emoji ולזיהוי מדויק; שכבה 2 (לקסיקון)
 * משלימה קבוצות נוספות. אם אין שום התאמה — matchedBy 'none'.
 *
 * @param name שם המאכל שהקלידה הילדה
 * @param knownFoods המאגר המלא (גלובלי + אישי) להתאמה
 */
export function inferFoodInfo(
  name: string,
  knownFoods: FoodItem[],
): InferenceResult {
  const normName = normalize(name);
  if (normName.length === 0) {
    return { foodGroups: [], matchedBy: 'none' };
  }

  // שכבה 1 — מאגר ידוע.
  const known = matchKnownFood(normName, knownFoods);

  // שכבה 2 — לקסיקון.
  const lex = matchLexicon(normName);

  if (known) {
    const merged = unionGroups(known.foodGroups, lex.groups);
    const knownExact = normalize(known.name) === normName;
    return {
      foodGroups: merged,
      emoji: known.emoji || lex.emoji,
      matchedBy: knownExact ? 'exact' : 'known-food',
    };
  }

  if (lex.groups.length > 0) {
    return {
      foodGroups: lex.groups,
      emoji: lex.emoji,
      matchedBy: 'lexicon',
    };
  }

  return { foodGroups: [], matchedBy: 'none' };
}
