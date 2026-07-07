import { NavLink } from 'react-router-dom';
import { Home, Journal, Progress } from './icons';
import styles from './BottomNav.module.css';

interface NavItem {
  to: string;
  label: string;
  Icon: typeof Home;
}

const items: NavItem[] = [
  { to: '/', label: 'בית', Icon: Home },
  { to: '/history', label: 'היסטוריה', Icon: Progress },
  { to: '/settings', label: 'הגדרות', Icon: Journal },
];

export function BottomNav() {
  return (
    <nav className={styles.nav} aria-label="ניווט ראשי">
      {items.map(({ to, label, Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) =>
            isActive ? `${styles.item} ${styles.active}` : styles.item
          }
        >
          {({ isActive }) => (
            <>
              <Icon size={26} color={isActive ? 'var(--coral)' : 'var(--blue)'} />
              <span className={styles.label}>{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
