// ===== סמל מאכל: אימוג'י או אייקון-קו מותאם =====
// סמל של מאכל (FoodItem.emoji) יכול להיות אימוג'י רגיל ("🍎") או טוקן
// לאייקון-קו בסגנון האפליקציה ("icon:apple"). קומפוננטה זו מרנדרת את הנכון,
// כך שאפשר לבחור אייקונים מותאמים בבורר הסמל וגם להציג אותם בכל מקום.

import type { ComponentType } from 'react';
import {
  Watermelon,
  Melon,
  Peach,
  Grapes,
  Orange,
  Banana,
  Plum,
  Apple,
  Sip,
  type IconProps,
} from './icons';

/** קידומת שמזהה סמל מסוג אייקון (בניגוד לאימוג'י טקסטואלי) */
export const FOOD_ICON_PREFIX = 'icon:';

/** מיפוי מפתח → קומפוננטת אייקון */
export const FOOD_ICONS: Record<string, ComponentType<IconProps>> = {
  watermelon: Watermelon,
  melon: Melon,
  peach: Peach,
  grapes: Grapes,
  orange: Orange,
  banana: Banana,
  plum: Plum,
  apple: Apple,
  sip: Sip,
};

/** טוקנים לבחירה בבורר הסמל (למשל "icon:apple") */
export const FOOD_ICON_TOKENS: string[] = Object.keys(FOOD_ICONS).map(
  (k) => FOOD_ICON_PREFIX + k,
);

/** האם סמל נתון הוא אייקון מותאם */
export function isFoodIcon(symbol: string): boolean {
  return (
    typeof symbol === 'string' &&
    symbol.startsWith(FOOD_ICON_PREFIX) &&
    !!FOOD_ICONS[symbol.slice(FOOD_ICON_PREFIX.length)]
  );
}

interface FoodSymbolProps {
  /** הסמל מתוך FoodItem.emoji — אימוג'י או טוקן אייקון */
  symbol: string;
  /** גודל האייקון (מתעלם עבור אימוג'י — נשלט ב-CSS של ההורה) */
  size?: number;
}

/**
 * מרנדר סמל מאכל: אייקון-קו אם זהו טוקן "icon:...", אחרת האימוג'י כטקסט
 * (כדי שעיצוב האימוג'י הקיים ב-CSS של ההורה יישאר כמו שהיה).
 */
export function FoodSymbol({ symbol, size = 22 }: FoodSymbolProps) {
  if (symbol?.startsWith(FOOD_ICON_PREFIX)) {
    const Icon = FOOD_ICONS[symbol.slice(FOOD_ICON_PREFIX.length)];
    if (Icon) return <Icon size={size} />;
  }
  return <>{symbol}</>;
}
