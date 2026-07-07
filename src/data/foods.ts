// ===== מאגר המזון הגלובלי (seed) — SPEC סעיף 4 =====
// לפחות 150 מאכלים ישראליים מוכרים לילדים, בעברית בלבד.
// כל פריט תואם ל-interface FoodItem: profileId=null (גלובלי), isCustom=false.
// tag "בשרי" מסמן מאכל שמכיל בשר/עוף/דגים — לצורך סינון צמחונית ואלרגיות.

import type { FoodItem, MealSlot, FoodGroup } from '../types';

/** נתוני seed לפני הוספת השדות הקבועים (profileId, isCustom) */
interface SeedFood {
  id: string;
  name: string;
  emoji: string;
  category: MealSlot[];
  foodGroups: FoodGroup[];
  tags: string[];
}

// קיצורי משבצות לנוחות הכתיבה
const BOKER: MealSlot = 'בוקר';
const ESER: MealSlot = 'עשר';
const TSOHORAYIM: MealSlot = 'צהריים';
const MINCHA: MealSlot = 'מנחה';
const EREV: MealSlot = 'ערב';
const MAMTAK: MealSlot = 'ממתק';

const SEED_FOODS: SeedFood[] = [
  // ===== פחמימות (20+) =====
  { id: 'food-001', name: 'פסטה ברוטב עגבניות', emoji: '🍝', category: [TSOHORAYIM, EREV], foodGroups: ['פחמימות', 'ירקות'], tags: ['חם', 'מבושל'] },
  { id: 'food-002', name: 'אורז לבן', emoji: '🍚', category: [TSOHORAYIM, EREV], foodGroups: ['פחמימות'], tags: ['חם', 'מבושל'] },
  { id: 'food-003', name: 'פתיתים', emoji: '🍚', category: [TSOHORAYIM, EREV], foodGroups: ['פחמימות'], tags: ['חם', 'מבושל'] },
  { id: 'food-004', name: 'פירה תפוחי אדמה', emoji: '🥔', category: [TSOHORAYIM, EREV], foodGroups: ['פחמימות'], tags: ['חם', 'מבושל'] },
  { id: 'food-005', name: 'תפוח אדמה אפוי', emoji: '🥔', category: [TSOHORAYIM, EREV], foodGroups: ['פחמימות'], tags: ['חם', 'מבושל'] },
  { id: 'food-006', name: 'לחם מלא', emoji: '🍞', category: [BOKER, ESER, EREV], foodGroups: ['פחמימות'], tags: ['כריך'] },
  { id: 'food-007', name: 'פיתה', emoji: '🫓', category: [BOKER, TSOHORAYIM, EREV], foodGroups: ['פחמימות'], tags: ['כריך'] },
  { id: 'food-008', name: 'לחמנייה', emoji: '🍞', category: [BOKER, ESER, EREV], foodGroups: ['פחמימות'], tags: ['כריך'] },
  { id: 'food-009', name: 'קוסקוס', emoji: '🍚', category: [TSOHORAYIM, EREV], foodGroups: ['פחמימות'], tags: ['חם', 'מבושל'] },
  { id: 'food-010', name: 'בורגול', emoji: '🍚', category: [TSOHORAYIM, EREV], foodGroups: ['פחמימות'], tags: ['חם', 'מבושל'] },
  { id: 'food-011', name: 'קורנפלקס', emoji: '🥣', category: [BOKER], foodGroups: ['פחמימות'], tags: ['קר', 'מהיר'] },
  { id: 'food-012', name: 'שיבולת שועל', emoji: '🥣', category: [BOKER], foodGroups: ['פחמימות'], tags: ['חם', 'מבושל'] },
  { id: 'food-013', name: 'קרקרים', emoji: '🍘', category: [ESER, MINCHA], foodGroups: ['פחמימות'], tags: ['קר', 'מהיר'] },
  { id: 'food-014', name: 'בייגלה', emoji: '🥨', category: [ESER, MINCHA], foodGroups: ['פחמימות'], tags: ['קר', 'מהיר'] },
  { id: 'food-015', name: 'טוסט גבינה', emoji: '🥪', category: [BOKER, ESER, EREV], foodGroups: ['פחמימות', 'מוצרי חלב'], tags: ['חם', 'כריך'] },
  { id: 'food-016', name: 'פנקייק', emoji: '🥞', category: [BOKER], foodGroups: ['פחמימות'], tags: ['חם'] },
  { id: 'food-017', name: 'וופל בלגי', emoji: '🧇', category: [BOKER, MINCHA], foodGroups: ['פחמימות'], tags: ['חם'] },
  { id: 'food-018', name: 'ג\'חנון', emoji: '🫓', category: [BOKER], foodGroups: ['פחמימות'], tags: ['חם', 'מבושל'] },
  { id: 'food-019', name: 'מלאווח', emoji: '🫓', category: [BOKER], foodGroups: ['פחמימות'], tags: ['חם', 'מבושל'] },
  { id: 'food-020', name: 'בורקס גבינה', emoji: '🥟', category: [BOKER, ESER, TSOHORAYIM], foodGroups: ['פחמימות', 'מוצרי חלב'], tags: ['חם'] },
  { id: 'food-021', name: 'קרואסון', emoji: '🥐', category: [BOKER, ESER], foodGroups: ['פחמימות'], tags: ['קר', 'מהיר'] },
  { id: 'food-022', name: 'תירס חם', emoji: '🌽', category: [ESER, MINCHA, TSOHORAYIM], foodGroups: ['פחמימות', 'ירקות'], tags: ['חם', 'מבושל'] },
  { id: 'food-023', name: 'פסטה ברוטב שמנת', emoji: '🍝', category: [TSOHORAYIM, EREV], foodGroups: ['פחמימות', 'מוצרי חלב'], tags: ['חם', 'מבושל'] },
  { id: 'food-024', name: 'לזניה', emoji: '🍝', category: [TSOHORAYIM, EREV], foodGroups: ['פחמימות', 'מוצרי חלב'], tags: ['חם', 'מבושל'] },

  // ===== חלבונים (20+) — בשרי מסומן ב-tag "בשרי" =====
  { id: 'food-025', name: 'שניצל', emoji: '🍗', category: [TSOHORAYIM, EREV], foodGroups: ['חלבונים'], tags: ['חם', 'מבושל', 'בשרי'] },
  { id: 'food-026', name: 'חזה עוף בגריל', emoji: '🍗', category: [TSOHORAYIM, EREV], foodGroups: ['חלבונים'], tags: ['חם', 'מבושל', 'בשרי'] },
  { id: 'food-027', name: 'קציצות בקר', emoji: '🍖', category: [TSOHORAYIM, EREV], foodGroups: ['חלבונים'], tags: ['חם', 'מבושל', 'בשרי'] },
  { id: 'food-028', name: 'המבורגר', emoji: '🍔', category: [TSOHORAYIM, EREV], foodGroups: ['חלבונים', 'פחמימות'], tags: ['חם', 'מבושל', 'בשרי'] },
  { id: 'food-029', name: 'נקניקיות', emoji: '🌭', category: [TSOHORAYIM, EREV], foodGroups: ['חלבונים'], tags: ['חם', 'מבושל', 'בשרי'] },
  { id: 'food-030', name: 'כדורי עוף ברוטב', emoji: '🍗', category: [TSOHORAYIM, EREV], foodGroups: ['חלבונים'], tags: ['חם', 'מבושל', 'בשרי'] },
  { id: 'food-031', name: 'פרגית בגריל', emoji: '🍗', category: [TSOHORAYIM, EREV], foodGroups: ['חלבונים'], tags: ['חם', 'מבושל', 'בשרי'] },
  { id: 'food-032', name: 'שווארמה בפיתה', emoji: '🌯', category: [TSOHORAYIM, EREV], foodGroups: ['חלבונים', 'פחמימות'], tags: ['חם', 'מבושל', 'כריך', 'בשרי'] },
  { id: 'food-033', name: 'דג סלמון אפוי', emoji: '🐟', category: [TSOHORAYIM, EREV], foodGroups: ['חלבונים', 'שומנים בריאים'], tags: ['חם', 'מבושל', 'בשרי'] },
  { id: 'food-034', name: 'קציצות דג', emoji: '🐟', category: [TSOHORAYIM, EREV], foodGroups: ['חלבונים'], tags: ['חם', 'מבושל', 'בשרי'] },
  { id: 'food-035', name: 'טונה', emoji: '🐟', category: [BOKER, ESER, TSOHORAYIM, EREV], foodGroups: ['חלבונים'], tags: ['קר', 'כריך', 'בשרי'] },
  { id: 'food-036', name: 'ביצה קשה', emoji: '🥚', category: [BOKER, ESER, EREV], foodGroups: ['חלבונים'], tags: ['קר', 'מבושל'] },
  { id: 'food-037', name: 'ביצת עין', emoji: '🍳', category: [BOKER, EREV], foodGroups: ['חלבונים'], tags: ['חם', 'מבושל'] },
  { id: 'food-038', name: 'חביתה', emoji: '🍳', category: [BOKER, EREV], foodGroups: ['חלבונים'], tags: ['חם', 'מבושל'] },
  { id: 'food-039', name: 'שקשוקה', emoji: '🍳', category: [BOKER, EREV], foodGroups: ['חלבונים', 'ירקות'], tags: ['חם', 'מבושל'] },
  { id: 'food-040', name: 'ביצה מקושקשת', emoji: '🍳', category: [BOKER, EREV], foodGroups: ['חלבונים'], tags: ['חם', 'מבושל'] },
  { id: 'food-041', name: 'כרעיים בתנור', emoji: '🍗', category: [TSOHORAYIM, EREV], foodGroups: ['חלבונים'], tags: ['חם', 'מבושל', 'בשרי'] },
  { id: 'food-042', name: 'סטייק בקר', emoji: '🥩', category: [TSOHORAYIM, EREV], foodGroups: ['חלבונים'], tags: ['חם', 'מבושל', 'בשרי'] },
  { id: 'food-043', name: 'שיפודי עוף', emoji: '🍢', category: [TSOHORAYIM, EREV], foodGroups: ['חלבונים'], tags: ['חם', 'מבושל', 'בשרי'] },
  { id: 'food-044', name: 'פסטרמה', emoji: '🥓', category: [BOKER, ESER, EREV], foodGroups: ['חלבונים'], tags: ['קר', 'כריך', 'בשרי'] },
  { id: 'food-045', name: 'טופו מוקפץ', emoji: '🍲', category: [TSOHORAYIM, EREV], foodGroups: ['חלבונים'], tags: ['חם', 'מבושל'] },
  { id: 'food-046', name: 'מרק עוף', emoji: '🍲', category: [TSOHORAYIM, EREV], foodGroups: ['חלבונים', 'ירקות'], tags: ['חם', 'מבושל', 'בשרי'] },

  // ===== מוצרי חלב (20+) =====
  { id: 'food-047', name: 'קוטג\'', emoji: '🧀', category: [BOKER, ESER, EREV], foodGroups: ['מוצרי חלב'], tags: ['קר', 'מהיר'] },
  { id: 'food-048', name: 'גבינה צהובה', emoji: '🧀', category: [BOKER, ESER, EREV], foodGroups: ['מוצרי חלב'], tags: ['קר', 'כריך'] },
  { id: 'food-049', name: 'גבינה לבנה', emoji: '🧀', category: [BOKER, ESER, EREV], foodGroups: ['מוצרי חלב'], tags: ['קר', 'מהיר'] },
  { id: 'food-050', name: 'יוגורט', emoji: '🥛', category: [BOKER, ESER, MINCHA], foodGroups: ['מוצרי חלב'], tags: ['קר', 'מהיר'] },
  { id: 'food-051', name: 'יוגורט עם פירות', emoji: '🥛', category: [BOKER, ESER, MINCHA], foodGroups: ['מוצרי חלב', 'פירות'], tags: ['קר', 'מהיר'] },
  { id: 'food-052', name: 'כוס חלב', emoji: '🥛', category: [BOKER, EREV], foodGroups: ['מוצרי חלב'], tags: ['קר', 'מהיר'] },
  { id: 'food-053', name: 'שוקו', emoji: '🥛', category: [BOKER, ESER], foodGroups: ['מוצרי חלב'], tags: ['קר', 'מהיר'] },
  { id: 'food-054', name: 'גבינת שמנת', emoji: '🧀', category: [BOKER, ESER], foodGroups: ['מוצרי חלב'], tags: ['קר', 'כריך'] },
  { id: 'food-055', name: 'לבנה', emoji: '🧀', category: [BOKER, ESER, EREV], foodGroups: ['מוצרי חלב'], tags: ['קר', 'מהיר'] },
  { id: 'food-056', name: 'גבינת מוצרלה', emoji: '🧀', category: [TSOHORAYIM, EREV], foodGroups: ['מוצרי חלב'], tags: ['קר'] },
  { id: 'food-057', name: 'גבינה בולגרית', emoji: '🧀', category: [BOKER, EREV], foodGroups: ['מוצרי חלב'], tags: ['קר'] },
  { id: 'food-058', name: 'פודינג וניל', emoji: '🍮', category: [ESER, MINCHA], foodGroups: ['מוצרי חלב'], tags: ['קר', 'מהיר'] },
  { id: 'food-059', name: 'מילקי', emoji: '🍮', category: [ESER, MINCHA], foodGroups: ['מוצרי חלב'], tags: ['קר', 'מהיר'] },
  { id: 'food-060', name: 'דנונה', emoji: '🥛', category: [BOKER, ESER, MINCHA], foodGroups: ['מוצרי חלב'], tags: ['קר', 'מהיר'] },
  { id: 'food-061', name: 'גבינת עמק', emoji: '🧀', category: [BOKER, ESER, EREV], foodGroups: ['מוצרי חלב'], tags: ['קר', 'כריך'] },
  { id: 'food-062', name: 'ריקוטה', emoji: '🧀', category: [BOKER, EREV], foodGroups: ['מוצרי חלב'], tags: ['קר'] },
  { id: 'food-063', name: 'שייק בננה וחלב', emoji: '🥤', category: [BOKER, ESER, MINCHA], foodGroups: ['מוצרי חלב', 'פירות'], tags: ['קר', 'מהיר'] },
  { id: 'food-064', name: 'גבינת פטה', emoji: '🧀', category: [TSOHORAYIM, EREV], foodGroups: ['מוצרי חלב'], tags: ['קר'] },
  { id: 'food-065', name: 'יוגורט יווני', emoji: '🥛', category: [BOKER, ESER, MINCHA], foodGroups: ['מוצרי חלב'], tags: ['קר', 'מהיר'] },
  { id: 'food-066', name: 'קרם גבינה עם דבש', emoji: '🧀', category: [BOKER, ESER], foodGroups: ['מוצרי חלב'], tags: ['קר', 'מהיר'] },

  // ===== קטניות (8+) =====
  { id: 'food-067', name: 'חומוס', emoji: '🥣', category: [BOKER, TSOHORAYIM, EREV], foodGroups: ['קטניות'], tags: ['קר'] },
  { id: 'food-068', name: 'פיתה עם חומוס', emoji: '🫓', category: [BOKER, TSOHORAYIM, EREV], foodGroups: ['קטניות', 'פחמימות'], tags: ['חם', 'כריך'] },
  { id: 'food-069', name: 'פלאפל', emoji: '🧆', category: [TSOHORAYIM, EREV], foodGroups: ['קטניות'], tags: ['חם', 'מבושל'] },
  { id: 'food-070', name: 'פלאפל בפיתה', emoji: '🥙', category: [TSOHORAYIM, EREV], foodGroups: ['קטניות', 'פחמימות'], tags: ['חם', 'כריך'] },
  { id: 'food-071', name: 'מרק עדשים', emoji: '🍲', category: [TSOHORAYIM, EREV], foodGroups: ['קטניות', 'ירקות'], tags: ['חם', 'מבושל'] },
  { id: 'food-072', name: 'עדשים ברוטב', emoji: '🍲', category: [TSOHORAYIM, EREV], foodGroups: ['קטניות'], tags: ['חם', 'מבושל'] },
  { id: 'food-073', name: 'אפונה מבושלת', emoji: '🫛', category: [TSOHORAYIM, EREV], foodGroups: ['קטניות'], tags: ['חם', 'מבושל'] },
  { id: 'food-074', name: 'שעועית ברוטב עגבניות', emoji: '🥫', category: [TSOHORAYIM, EREV], foodGroups: ['קטניות'], tags: ['חם', 'מבושל'] },
  { id: 'food-075', name: 'אדממה', emoji: '🫛', category: [ESER, MINCHA, TSOHORAYIM], foodGroups: ['קטניות'], tags: ['קר', 'מהיר'] },
  { id: 'food-076', name: 'מרק אפונה', emoji: '🍲', category: [TSOHORAYIM, EREV], foodGroups: ['קטניות', 'ירקות'], tags: ['חם', 'מבושל'] },

  // ===== ירקות (20+) =====
  { id: 'food-077', name: 'מלפפון', emoji: '🥒', category: [BOKER, ESER, TSOHORAYIM, MINCHA, EREV], foodGroups: ['ירקות'], tags: ['קר', 'מהיר'] },
  { id: 'food-078', name: 'עגבנייה', emoji: '🍅', category: [BOKER, ESER, TSOHORAYIM, MINCHA, EREV], foodGroups: ['ירקות'], tags: ['קר', 'מהיר'] },
  { id: 'food-079', name: 'סלט ירקות קצוץ', emoji: '🥗', category: [BOKER, TSOHORAYIM, EREV], foodGroups: ['ירקות'], tags: ['קר', 'מהיר'] },
  { id: 'food-080', name: 'גזר', emoji: '🥕', category: [ESER, MINCHA, TSOHORAYIM, EREV], foodGroups: ['ירקות'], tags: ['קר', 'מהיר'] },
  { id: 'food-081', name: 'גמבה אדומה', emoji: '🫑', category: [ESER, TSOHORAYIM, EREV], foodGroups: ['ירקות'], tags: ['קר', 'מהיר'] },
  { id: 'food-082', name: 'פלפל צהוב', emoji: '🫑', category: [ESER, TSOHORAYIM, EREV], foodGroups: ['ירקות'], tags: ['קר', 'מהיר'] },
  { id: 'food-083', name: 'ברוקולי מאודה', emoji: '🥦', category: [TSOHORAYIM, EREV], foodGroups: ['ירקות'], tags: ['חם', 'מבושל'] },
  { id: 'food-084', name: 'כרובית בתנור', emoji: '🥦', category: [TSOHORAYIM, EREV], foodGroups: ['ירקות'], tags: ['חם', 'מבושל'] },
  { id: 'food-085', name: 'תירס גרעינים', emoji: '🌽', category: [ESER, TSOHORAYIM, EREV], foodGroups: ['ירקות'], tags: ['קר', 'מהיר'] },
  { id: 'food-086', name: 'חסה', emoji: '🥬', category: [TSOHORAYIM, EREV], foodGroups: ['ירקות'], tags: ['קר', 'מהיר'] },
  { id: 'food-087', name: 'עגבניות שרי', emoji: '🍅', category: [ESER, TSOHORAYIM, MINCHA, EREV], foodGroups: ['ירקות'], tags: ['קר', 'מהיר'] },
  { id: 'food-088', name: 'קישוא מוקפץ', emoji: '🥒', category: [TSOHORAYIM, EREV], foodGroups: ['ירקות'], tags: ['חם', 'מבושל'] },
  { id: 'food-089', name: 'בטטה בתנור', emoji: '🍠', category: [TSOHORAYIM, EREV], foodGroups: ['ירקות', 'פחמימות'], tags: ['חם', 'מבושל'] },
  { id: 'food-090', name: 'ירקות בתנור', emoji: '🍠', category: [TSOHORAYIM, EREV], foodGroups: ['ירקות'], tags: ['חם', 'מבושל'] },
  { id: 'food-091', name: 'מרק ירקות', emoji: '🍲', category: [TSOHORAYIM, EREV], foodGroups: ['ירקות'], tags: ['חם', 'מבושל'] },
  { id: 'food-092', name: 'סלט ישראלי', emoji: '🥗', category: [BOKER, TSOHORAYIM, EREV], foodGroups: ['ירקות'], tags: ['קר', 'מהיר'] },
  { id: 'food-093', name: 'קלחי תירס', emoji: '🌽', category: [ESER, TSOHORAYIM, EREV], foodGroups: ['ירקות'], tags: ['חם', 'מבושל'] },
  { id: 'food-094', name: 'עלי בייבי', emoji: '🥬', category: [TSOHORAYIM, EREV], foodGroups: ['ירקות'], tags: ['קר', 'מהיר'] },
  { id: 'food-095', name: 'צנוניות', emoji: '🥗', category: [TSOHORAYIM, EREV], foodGroups: ['ירקות'], tags: ['קר', 'מהיר'] },
  { id: 'food-096', name: 'בטטה מטוגנת', emoji: '🍠', category: [TSOHORAYIM, EREV], foodGroups: ['ירקות', 'פחמימות'], tags: ['חם', 'מבושל'] },
  { id: 'food-097', name: 'מקלות ירקות', emoji: '🥕', category: [ESER, MINCHA], foodGroups: ['ירקות'], tags: ['קר', 'מהיר'] },
  { id: 'food-098', name: 'סלט כרוב', emoji: '🥗', category: [TSOHORAYIM, EREV], foodGroups: ['ירקות'], tags: ['קר', 'מהיר'] },

  // ===== פירות (20+) =====
  { id: 'food-099', name: 'תפוח', emoji: '🍎', category: [BOKER, ESER, MINCHA, TSOHORAYIM, EREV], foodGroups: ['פירות'], tags: ['קר', 'מהיר'] },
  { id: 'food-100', name: 'בננה', emoji: '🍌', category: [BOKER, ESER, MINCHA], foodGroups: ['פירות'], tags: ['קר', 'מהיר'] },
  { id: 'food-101', name: 'ענבים', emoji: '🍇', category: [ESER, MINCHA], foodGroups: ['פירות'], tags: ['קר', 'מהיר'] },
  { id: 'food-102', name: 'תפוז', emoji: '🍊', category: [BOKER, ESER, MINCHA], foodGroups: ['פירות'], tags: ['קר', 'מהיר'] },
  { id: 'food-103', name: 'קלמנטינה', emoji: '🍊', category: [ESER, MINCHA], foodGroups: ['פירות'], tags: ['קר', 'מהיר'] },
  { id: 'food-104', name: 'אגס', emoji: '🍐', category: [ESER, MINCHA], foodGroups: ['פירות'], tags: ['קר', 'מהיר'] },
  { id: 'food-105', name: 'תות שדה', emoji: '🍓', category: [BOKER, ESER, MINCHA], foodGroups: ['פירות'], tags: ['קר', 'מהיר'] },
  { id: 'food-106', name: 'אבטיח', emoji: '🍉', category: [ESER, MINCHA, EREV], foodGroups: ['פירות'], tags: ['קר', 'מהיר'] },
  { id: 'food-107', name: 'מלון', emoji: '🍈', category: [ESER, MINCHA, EREV], foodGroups: ['פירות'], tags: ['קר', 'מהיר'] },
  { id: 'food-108', name: 'אפרסק', emoji: '🍑', category: [ESER, MINCHA], foodGroups: ['פירות'], tags: ['קר', 'מהיר'] },
  { id: 'food-109', name: 'שזיף', emoji: '🍑', category: [ESER, MINCHA], foodGroups: ['פירות'], tags: ['קר', 'מהיר'] },
  { id: 'food-110', name: 'אננס', emoji: '🍍', category: [ESER, MINCHA], foodGroups: ['פירות'], tags: ['קר', 'מהיר'] },
  { id: 'food-111', name: 'קיווי', emoji: '🥝', category: [BOKER, ESER, MINCHA], foodGroups: ['פירות'], tags: ['קר', 'מהיר'] },
  { id: 'food-112', name: 'מנגו', emoji: '🥭', category: [ESER, MINCHA], foodGroups: ['פירות'], tags: ['קר', 'מהיר'] },
  { id: 'food-113', name: 'אשכולית', emoji: '🍊', category: [BOKER, ESER], foodGroups: ['פירות'], tags: ['קר', 'מהיר'] },
  { id: 'food-114', name: 'רימון', emoji: '🍎', category: [ESER, MINCHA], foodGroups: ['פירות'], tags: ['קר', 'מהיר'] },
  { id: 'food-115', name: 'דובדבנים', emoji: '🍒', category: [ESER, MINCHA], foodGroups: ['פירות'], tags: ['קר', 'מהיר'] },
  { id: 'food-116', name: 'סלט פירות', emoji: '🍓', category: [BOKER, ESER, MINCHA], foodGroups: ['פירות'], tags: ['קר', 'מהיר'] },
  { id: 'food-117', name: 'תמרים', emoji: '🌴', category: [ESER, MINCHA], foodGroups: ['פירות'], tags: ['קר', 'מהיר'] },
  { id: 'food-118', name: 'ליצ\'י', emoji: '🍒', category: [ESER, MINCHA], foodGroups: ['פירות'], tags: ['קר', 'מהיר'] },
  { id: 'food-119', name: 'אבוקדו על לחם', emoji: '🥑', category: [BOKER, ESER, EREV], foodGroups: ['שומנים בריאים', 'פחמימות'], tags: ['קר', 'כריך'] },
  { id: 'food-120', name: 'קרמבו של פרי', emoji: '🍌', category: [ESER, MINCHA], foodGroups: ['פירות'], tags: ['קר', 'מהיר'] },

  // ===== שומנים בריאים (8+) =====
  { id: 'food-121', name: 'אבוקדו', emoji: '🥑', category: [BOKER, ESER, TSOHORAYIM, EREV], foodGroups: ['שומנים בריאים'], tags: ['קר', 'מהיר'] },
  { id: 'food-122', name: 'טחינה', emoji: '🥣', category: [BOKER, TSOHORAYIM, EREV], foodGroups: ['שומנים בריאים'], tags: ['קר'] },
  { id: 'food-123', name: 'אגוזי מלך', emoji: '🌰', category: [ESER, MINCHA], foodGroups: ['שומנים בריאים'], tags: ['קר', 'מהיר'] },
  { id: 'food-124', name: 'שקדים', emoji: '🌰', category: [ESER, MINCHA], foodGroups: ['שומנים בריאים'], tags: ['קר', 'מהיר'] },
  { id: 'food-125', name: 'חמאת בוטנים', emoji: '🥜', category: [BOKER, ESER], foodGroups: ['שומנים בריאים'], tags: ['קר', 'כריך'] },
  { id: 'food-126', name: 'גרעיני דלעת', emoji: '🎃', category: [ESER, MINCHA], foodGroups: ['שומנים בריאים'], tags: ['קר', 'מהיר'] },
  { id: 'food-127', name: 'זיתים', emoji: '🫒', category: [BOKER, TSOHORAYIM, EREV], foodGroups: ['שומנים בריאים'], tags: ['קר', 'מהיר'] },
  { id: 'food-128', name: 'קשיו', emoji: '🥜', category: [ESER, MINCHA], foodGroups: ['שומנים בריאים'], tags: ['קר', 'מהיר'] },
  { id: 'food-129', name: 'בוטנים', emoji: '🥜', category: [ESER, MINCHA], foodGroups: ['שומנים בריאים'], tags: ['קר', 'מהיר'] },
  { id: 'food-130', name: 'גרעיני חמנייה', emoji: '🌻', category: [ESER, MINCHA], foodGroups: ['שומנים בריאים'], tags: ['קר', 'מהיר'] },

  // ===== מתוקים (15+) — הממתק היומי =====
  { id: 'food-131', name: 'עוגיית שוקולד צ\'יפס', emoji: '🍪', category: [MAMTAK], foodGroups: ['מתוקים'], tags: ['קר', 'מהיר'] },
  { id: 'food-132', name: 'גלידה', emoji: '🍦', category: [MAMTAK], foodGroups: ['מתוקים'], tags: ['קר', 'מהיר'] },
  { id: 'food-133', name: 'שוקולד חלב', emoji: '🍫', category: [MAMTAK], foodGroups: ['מתוקים'], tags: ['קר', 'מהיר'] },
  { id: 'food-134', name: 'עוגת שוקולד', emoji: '🍰', category: [MAMTAK], foodGroups: ['מתוקים'], tags: ['קר'] },
  { id: 'food-135', name: 'וופלים', emoji: '🍫', category: [MAMTAK], foodGroups: ['מתוקים'], tags: ['קר', 'מהיר'] },
  { id: 'food-136', name: 'מרשמלו', emoji: '🍬', category: [MAMTAK], foodGroups: ['מתוקים'], tags: ['קר', 'מהיר'] },
  { id: 'food-137', name: 'סוכריית גומי', emoji: '🍬', category: [MAMTAK], foodGroups: ['מתוקים'], tags: ['קר', 'מהיר'] },
  { id: 'food-138', name: 'קרמבו', emoji: '🍥', category: [MAMTAK], foodGroups: ['מתוקים'], tags: ['קר', 'מהיר'] },
  { id: 'food-139', name: 'עוגיית חמאה', emoji: '🍪', category: [MAMTAK], foodGroups: ['מתוקים'], tags: ['קר', 'מהיר'] },
  { id: 'food-140', name: 'דונאט', emoji: '🍩', category: [MAMTAK], foodGroups: ['מתוקים'], tags: ['קר'] },
  { id: 'food-141', name: 'מאפין', emoji: '🧁', category: [MAMTAK], foodGroups: ['מתוקים'], tags: ['קר'] },
  { id: 'food-142', name: 'קאפקייק', emoji: '🧁', category: [MAMTAK], foodGroups: ['מתוקים'], tags: ['קר'] },
  { id: 'food-143', name: 'שלוק', emoji: '🍭', category: [MAMTAK], foodGroups: ['מתוקים'], tags: ['קר', 'מהיר'] },
  { id: 'food-144', name: 'סוכר על מקל', emoji: '🍭', category: [MAMTAK], foodGroups: ['מתוקים'], tags: ['קר', 'מהיר'] },
  { id: 'food-145', name: 'ארטיק', emoji: '🍧', category: [MAMTAK], foodGroups: ['מתוקים'], tags: ['קר', 'מהיר'] },
  { id: 'food-146', name: 'בראוניז', emoji: '🍫', category: [MAMTAK], foodGroups: ['מתוקים'], tags: ['קר'] },
  { id: 'food-147', name: 'עוגת גבינה', emoji: '🍰', category: [MAMTAK], foodGroups: ['מתוקים', 'מוצרי חלב'], tags: ['קר'] },
  { id: 'food-148', name: 'פנקייק עם סירופ', emoji: '🥞', category: [MAMTAK], foodGroups: ['מתוקים'], tags: ['חם'] },
  { id: 'food-149', name: 'שוקולד לבן', emoji: '🍫', category: [MAMTAK], foodGroups: ['מתוקים'], tags: ['קר', 'מהיר'] },
  { id: 'food-150', name: 'ריבת תות על לחם', emoji: '🍓', category: [BOKER, MAMTAK], foodGroups: ['מתוקים', 'פחמימות'], tags: ['קר', 'כריך'] },

  // ===== מאכלים משלימים (מגוון נוסף) =====
  { id: 'food-151', name: 'כריך גבינה וירקות', emoji: '🥪', category: [BOKER, ESER, EREV], foodGroups: ['פחמימות', 'מוצרי חלב', 'ירקות'], tags: ['קר', 'כריך'] },
  { id: 'food-152', name: 'כריך ביצה', emoji: '🥪', category: [BOKER, ESER, EREV], foodGroups: ['פחמימות', 'חלבונים'], tags: ['קר', 'כריך'] },
  { id: 'food-153', name: 'כריך אבוקדו', emoji: '🥪', category: [BOKER, ESER, EREV], foodGroups: ['פחמימות', 'שומנים בריאים'], tags: ['קר', 'כריך'] },
  { id: 'food-154', name: 'פסטה עם ירקות', emoji: '🍝', category: [TSOHORAYIM, EREV], foodGroups: ['פחמימות', 'ירקות'], tags: ['חם', 'מבושל'] },
  { id: 'food-155', name: 'אורז עם ירקות', emoji: '🍚', category: [TSOHORAYIM, EREV], foodGroups: ['פחמימות', 'ירקות'], tags: ['חם', 'מבושל'] },
  { id: 'food-156', name: 'סושי ירקות', emoji: '🍣', category: [TSOHORAYIM, EREV], foodGroups: ['פחמימות', 'ירקות'], tags: ['קר'] },
  { id: 'food-157', name: 'רול אורז וסלמון', emoji: '🍣', category: [TSOHORAYIM, EREV], foodGroups: ['פחמימות', 'חלבונים'], tags: ['קר', 'בשרי'] },
  { id: 'food-158', name: 'פיצה', emoji: '🍕', category: [TSOHORAYIM, EREV], foodGroups: ['פחמימות', 'מוצרי חלב'], tags: ['חם'] },
  { id: 'food-159', name: 'טורטייה עם גבינה', emoji: '🌯', category: [BOKER, TSOHORAYIM, EREV], foodGroups: ['פחמימות', 'מוצרי חלב'], tags: ['חם', 'כריך'] },
  { id: 'food-160', name: 'כדורי אנרגיה תמרים', emoji: '🌰', category: [ESER, MINCHA], foodGroups: ['שומנים בריאים', 'פירות'], tags: ['קר', 'מהיר'] },
];

/** מאגר המזון הגלובלי המלא (מוכן לזריעה) */
export const GLOBAL_FOODS: FoodItem[] = SEED_FOODS.map((f) => ({
  ...f,
  profileId: null,
  isCustom: false,
}));
