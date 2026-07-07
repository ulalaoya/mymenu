import type { SVGProps } from 'react';

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'color'> {
  /** גודל בפיקסלים (רוחב וגובה) */
  size?: number;
  /** צבע קו ראשי — ברירת מחדל כחול הפלטה */
  color?: string;
}

/**
 * עוטף SVG אחיד לכל האייקונים: line-icon בסגנון MyMenu,
 * stroke מעוגל, פינות רכות. הצבע הראשי ניתן לדריסה ב-prop color.
 */
export function IconBase({
  size = 24,
  color = 'var(--blue)',
  children,
  strokeWidth = 1.8,
  ...rest
}: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}
