import { Sparkle } from '../components/icons';

interface Props {
  title: string;
}

/** מסך placeholder זמני לשלבים הבאים */
export function PlaceholderScreen({ title }: Props) {
  return (
    <div style={{ paddingTop: 'var(--space-4)' }}>
      <h1
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
          marginBottom: 'var(--space-4)',
        }}
      >
        {title} <Sparkle size={24} />
      </h1>
      <div className="card">
        <p style={{ color: 'var(--text-soft)' }}>המסך הזה ייבנה בשלב הבא. 😊</p>
      </div>
    </div>
  );
}
