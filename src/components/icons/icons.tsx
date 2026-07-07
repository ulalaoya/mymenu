import { IconBase, type IconProps } from './iconBase';

// אקסנטים קבועים לפי הפלטה
const CORAL = 'var(--coral)';
const YELLOW = 'var(--yellow)';

/** נצנוץ צהוב קטן ✦ — מוטיב חוזר */
export function Sparkle({ size = 24, color = YELLOW, ...p }: IconProps) {
  return (
    <IconBase size={size} color={color} {...p}>
      <path d="M12 3.5c.4 2.7 1.8 4.1 4.5 4.5-2.7.4-4.1 1.8-4.5 4.5-.4-2.7-1.8-4.1-4.5-4.5 2.7-.4 4.1-1.8 4.5-4.5Z" fill={color} stroke="none" />
      <path d="M18.5 14.5c.2 1.3.9 2 2.2 2.2-1.3.2-2 .9-2.2 2.2-.2-1.3-.9-2-2.2-2.2 1.3-.2 2-.9 2.2-2.2Z" fill={color} stroke="none" />
    </IconBase>
  );
}

/** עלה כחול קטן 🍃 — מוטיב חוזר */
export function Leaf({ size = 24, color, ...p }: IconProps) {
  return (
    <IconBase size={size} color={color} {...p}>
      <path d="M5 19c0-7 5-12 14-12 0 9-5 14-12 14-1 0-2-.2-2-.2" />
      <path d="M9 15c2-2 4-3 6-3.5" />
    </IconBase>
  );
}

/** בית 🏠 */
export function Home({ size = 24, color, ...p }: IconProps) {
  return (
    <IconBase size={size} color={color} {...p}>
      <path d="M4 11.5 12 4l8 7.5" />
      <path d="M6 10.5V20h12v-9.5" />
      <path d="M10 20v-5h4v5" stroke={CORAL} />
    </IconBase>
  );
}

/** יומן / פתקים 📓 */
export function Journal({ size = 24, color, ...p }: IconProps) {
  return (
    <IconBase size={size} color={color} {...p}>
      <rect x="5" y="3.5" width="14" height="17" rx="2.5" />
      <path d="M9 8h6M9 12h6M9 16h4" />
      <path d="M5 7.5h2M5 12h2M5 16h2" stroke={CORAL} />
    </IconBase>
  );
}

/** ארוחת בוקר ☀️🍳 */
export function Breakfast({ size = 24, color, ...p }: IconProps) {
  return (
    <IconBase size={size} color={color} {...p}>
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="1.6" fill={YELLOW} stroke="none" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" stroke={YELLOW} />
    </IconBase>
  );
}

/** ארוחת צהריים 🍽️ */
export function Lunch({ size = 24, color, ...p }: IconProps) {
  return (
    <IconBase size={size} color={color} {...p}>
      <circle cx="12" cy="12" r="7" />
      <circle cx="12" cy="12" r="3" stroke={CORAL} />
    </IconBase>
  );
}

/** ארוחת ערב 🌙 */
export function Dinner({ size = 24, color, ...p }: IconProps) {
  return (
    <IconBase size={size} color={color} {...p}>
      <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
      <path d="M16 5.5c.2 1 .8 1.6 1.8 1.8-1 .2-1.6.8-1.8 1.8-.2-1-.8-1.6-1.8-1.8 1-.2 1.6-.8 1.8-1.8Z" fill={YELLOW} stroke="none" />
    </IconBase>
  );
}

/** חטיף / הפסקת עשר 🥨 */
export function Snack({ size = 24, color, ...p }: IconProps) {
  return (
    <IconBase size={size} color={color} {...p}>
      <path d="M7 8c-2 0-3 1.5-3 3.5S5 15 7 15c1.5 0 2.3-1 3-2M17 8c2 0 3 1.5 3 3.5S19 15 17 15c-1.5 0-2.3-1-3-2" />
      <path d="M8 10c1.5 1 2.5 2.5 4 2.5S14.5 11 16 10" stroke={CORAL} />
    </IconBase>
  );
}

/** מים 💧 */
export function Water({ size = 24, color, ...p }: IconProps) {
  return (
    <IconBase size={size} color={color} {...p}>
      <path d="M12 3.5c4 4.5 6 7.5 6 10.2A6 6 0 0 1 6 13.7c0-2.7 2-5.7 6-10.2Z" />
      <path d="M9.5 14.5a2.5 2.5 0 0 0 2 2.3" stroke={CORAL} />
    </IconBase>
  );
}

/** ירקות ופירות 🥦🍎 */
export function FruitsVeggies({ size = 24, color, ...p }: IconProps) {
  return (
    <IconBase size={size} color={color} {...p}>
      <path d="M14 9c3 0 5 2 5 5.5S16.5 20 14 20c-1 0-1.6-.4-2-.4s-1 .4-2 .4c-2.5 0-5-2-5-5.5S7 9 10 9c1 0 1.6.4 2 .4S13 9 14 9Z" />
      <path d="M12 9V6c0-1.2 1-2.2 2.2-2.2" stroke={CORAL} />
      <path d="M14.2 3.8c1 0 1.8.6 2.2 1.5-1 0-1.8-.6-2.2-1.5Z" fill={CORAL} stroke="none" />
    </IconBase>
  );
}

/** חלבון 🍗 */
export function Protein({ size = 24, color, ...p }: IconProps) {
  return (
    <IconBase size={size} color={color} {...p}>
      <path d="M15.5 4.5c2.5 0 4 1.8 4 4 0 2-1.3 3.4-3 3.8L9 19.8c-.7.7-1.8.7-2.5 0l-.3-.3c-.7-.7-.7-1.8 0-2.5l7.5-7.5c.4-1.7 1.8-3 3.8-3Z" />
      <path d="M6.5 17.5 5 19" stroke={CORAL} />
    </IconBase>
  );
}

/** מתוקים 🧁 */
export function Sweets({ size = 24, color, ...p }: IconProps) {
  return (
    <IconBase size={size} color={color} {...p}>
      <path d="M6 11h12l-1.2 8.2a1.5 1.5 0 0 1-1.5 1.3H8.7a1.5 1.5 0 0 1-1.5-1.3L6 11Z" />
      <path d="M7 11a5 5 0 0 1 10 0" stroke={CORAL} />
      <path d="M12 3.5v2.5" stroke={YELLOW} />
      <circle cx="12" cy="3" r="1" fill={CORAL} stroke="none" />
    </IconBase>
  );
}

/** הוספה ➕ */
export function Add({ size = 24, color, ...p }: IconProps) {
  return (
    <IconBase size={size} color={color} {...p}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 8.5v7M8.5 12h7" stroke={CORAL} />
    </IconBase>
  );
}

/** עריכה ✏️ */
export function Edit({ size = 24, color, ...p }: IconProps) {
  return (
    <IconBase size={size} color={color} {...p}>
      <path d="M14.5 5.5 18.5 9.5 8.5 19.5 4 20l.5-4.5 10-10Z" />
      <path d="M13 7 17 11" stroke={CORAL} />
    </IconBase>
  );
}

/** לוח שנה 📅 */
export function Calendar({ size = 24, color, ...p }: IconProps) {
  return (
    <IconBase size={size} color={color} {...p}>
      <rect x="4" y="5.5" width="16" height="14" rx="2.5" />
      <path d="M4 9.5h16M8 3.5v4M16 3.5v4" />
      <circle cx="12" cy="14" r="1.3" fill={CORAL} stroke="none" />
    </IconBase>
  );
}

/** שעה ⏰ */
export function Clock({ size = 24, color, ...p }: IconProps) {
  return (
    <IconBase size={size} color={color} {...p}>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 7.5V12l3 2" stroke={CORAL} />
    </IconBase>
  );
}

/** ארוחה הושלמה ✓ */
export function CompletedMeal({ size = 24, color, ...p }: IconProps) {
  return (
    <IconBase size={size} color={color} {...p}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M8 12.5 11 15.5 16 9" stroke={'var(--success)'} />
    </IconBase>
  );
}

/** מצב רוח 😊 */
export function Mood({ size = 24, color, ...p }: IconProps) {
  return (
    <IconBase size={size} color={color} {...p}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M8.5 14.5a4.5 4.5 0 0 0 7 0" stroke={CORAL} />
      <circle cx="9" cy="10" r="0.9" fill={color ?? 'var(--blue)'} stroke="none" />
      <circle cx="15" cy="10" r="0.9" fill={color ?? 'var(--blue)'} stroke="none" />
    </IconBase>
  );
}

/** רמת שובע/רעב 🍽️ */
export function HungerLevel({ size = 24, color, ...p }: IconProps) {
  return (
    <IconBase size={size} color={color} {...p}>
      <path d="M4 20a8 8 0 0 1 16 0Z" />
      <path d="M12 12V4" stroke={CORAL} />
      <path d="M9 6.5c0 1.5 1.3 2.5 3 2.5s3-1 3-2.5" stroke={CORAL} />
    </IconBase>
  );
}

/** התקדמות 📈 */
export function Progress({ size = 24, color, ...p }: IconProps) {
  return (
    <IconBase size={size} color={color} {...p}>
      <path d="M4 19h16" />
      <path d="M6 15l3.5-4 3 2.5L18 7" stroke={CORAL} />
      <circle cx="18" cy="7" r="1.2" fill={YELLOW} stroke="none" />
    </IconBase>
  );
}

/** כוכב מלא ⭐ */
export function StarFilled({ size = 24, color = YELLOW, ...p }: IconProps) {
  return (
    <IconBase size={size} color={color} {...p}>
      <path
        d="M12 3.5l2.5 5.3 5.8.7-4.3 3.9 1.1 5.7L12 16.9 6.9 19.1l1.1-5.7L3.7 9.5l5.8-.7L12 3.5Z"
        fill={color}
      />
    </IconBase>
  );
}

/** כוכב ריק ☆ */
export function StarEmpty({ size = 24, color = YELLOW, ...p }: IconProps) {
  return (
    <IconBase size={size} color={color} {...p}>
      <path d="M12 3.5l2.5 5.3 5.8.7-4.3 3.9 1.1 5.7L12 16.9 6.9 19.1l1.1-5.7L3.7 9.5l5.8-.7L12 3.5Z" />
    </IconBase>
  );
}

/** לב ❤️ */
export function Heart({ size = 24, color = CORAL, ...p }: IconProps) {
  return (
    <IconBase size={size} color={color} {...p}>
      <path d="M12 20s-6.5-4.4-8.5-8.1C2.2 9.4 3.3 6.5 6.2 6.5c1.8 0 2.9 1.1 3.8 2.3.9-1.2 2-2.3 3.8-2.3 2.9 0 4 2.9 2.7 5.4C18.5 15.6 12 20 12 20Z" fill={color} stroke="none" />
    </IconBase>
  );
}

/** לייק 👍 */
export function ThumbsUp({ size = 24, color, ...p }: IconProps) {
  return (
    <IconBase size={size} color={color} {...p}>
      <path d="M7 10.5 10.5 4c1.3 0 2 .9 2 2v3h4.8c1.2 0 2 1 1.8 2.2l-1.1 6c-.2 1-1 1.6-2 1.6H7" />
      <path d="M7 10.5v9H5c-.6 0-1-.4-1-1v-7c0-.6.4-1 1-1h2Z" stroke={CORAL} />
    </IconBase>
  );
}

/** דיסלייק 👎 */
export function ThumbsDown({ size = 24, color, ...p }: IconProps) {
  return (
    <IconBase size={size} color={color} {...p}>
      <path d="M7 13.5 10.5 20c1.3 0 2-.9 2-2v-3h4.8c1.2 0 2-1 1.8-2.2l-1.1-6c-.2-1-1-1.6-2-1.6H7" />
      <path d="M7 13.5v-9H5c-.6 0-1 .4-1 1v7c0 .6.4 1 1 1h2Z" stroke={CORAL} />
    </IconBase>
  );
}

/** רענון / ערבוב 🔄 */
export function Refresh({ size = 24, color, ...p }: IconProps) {
  return (
    <IconBase size={size} color={color} {...p}>
      <path d="M19 8A7.5 7.5 0 0 0 6 6.5L4.5 8" />
      <path d="M5 16a7.5 7.5 0 0 0 13 1.5L19.5 16" stroke={CORAL} />
      <path d="M4.5 4.5V8H8M19.5 19.5V16H16" />
    </IconBase>
  );
}

/** אזהרת אלרגיה ⚠️ */
export function AllergyWarning({ size = 24, color = CORAL, ...p }: IconProps) {
  return (
    <IconBase size={size} color={color} {...p}>
      <path d="M12 4 3.5 19h17L12 4Z" />
      <path d="M12 10v4" />
      <circle cx="12" cy="16.5" r="0.9" fill={color} stroke="none" />
    </IconBase>
  );
}

/** צמחונית / טבעוני 🌱 */
export function Vegetarian({ size = 24, color = 'var(--success)', ...p }: IconProps) {
  return (
    <IconBase size={size} color={color} {...p}>
      <path d="M12 20v-7" />
      <path d="M12 13c0-4 3-7 7-7 0 4-3 7-7 7Z" />
      <path d="M12 15c0-3-2.5-5-5.5-5 0 3 2.5 5 5.5 5Z" stroke={color} />
    </IconBase>
  );
}

/** קבוצות מזון 🍱 */
export function FoodGroups({ size = 24, color, ...p }: IconProps) {
  return (
    <IconBase size={size} color={color} {...p}>
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="M12 4v16M4 12h16" />
      <circle cx="8" cy="8" r="1.2" fill={CORAL} stroke="none" />
      <circle cx="16" cy="16" r="1.2" fill={YELLOW} stroke="none" />
    </IconBase>
  );
}

/** קערה 🥣 */
export function Bowl({ size = 24, color, ...p }: IconProps) {
  return (
    <IconBase size={size} color={color} {...p}>
      <path d="M3.5 10.5h17a8.5 8.5 0 0 1-17 0Z" />
      <path d="M9 7c0-1.5 1.3-2.5 3-2.5s3 1 3 2.5" stroke={CORAL} />
    </IconBase>
  );
}

/** שמירה / הצלחה 🏆 */
export function Save({ size = 24, color, ...p }: IconProps) {
  return (
    <IconBase size={size} color={color} {...p}>
      <path d="M7 4h10v4a5 5 0 0 1-10 0V4Z" />
      <path d="M7 6H4.5v1.5A3 3 0 0 0 7 10M17 6h2.5v1.5A3 3 0 0 1 17 10" stroke={CORAL} />
      <path d="M10 13.5V17h4v-3.5M8 20h8" />
    </IconBase>
  );
}
