import { clsx } from 'clsx';

type BadgeVariant = 'blue' | 'green' | 'yellow' | 'red' | 'gray' | 'orange';

const variantClasses: Record<BadgeVariant, string> = {
  blue: 'bg-blue-100 text-blue-800',
  green: 'bg-green-100 text-green-800',
  yellow: 'bg-yellow-100 text-yellow-800',
  red: 'bg-red-100 text-red-800',
  gray: 'bg-gray-100 text-gray-700',
  orange: 'bg-orange-100 text-orange-800',
};

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  className?: string;
}

export function Badge({ label, variant = 'gray', className }: BadgeProps) {
  return (
    <span className={clsx('badge', variantClasses[variant], className)}>{label}</span>
  );
}

export function DifficultyBadge({ difficulty }: { difficulty: string | null }) {
  if (!difficulty) return null;
  const map: Record<string, { label: string; variant: BadgeVariant }> = {
    easy: { label: 'Let', variant: 'green' },
    moderate: { label: 'Moderat', variant: 'blue' },
    hard: { label: 'Hård', variant: 'orange' },
    extreme: { label: 'Ekstrem', variant: 'red' },
  };
  const cfg = map[difficulty] ?? { label: difficulty, variant: 'gray' as BadgeVariant };
  return <Badge label={cfg.label} variant={cfg.variant} />;
}

export function ActivityTypeBadge({ type }: { type: string }) {
  return type === 'event' ? (
    <Badge label="Klubarrangement" variant="blue" />
  ) : (
    <Badge label="Tur" variant="green" />
  );
}

export function RegistrationStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: BadgeVariant }> = {
    registered: { label: 'Tilmeldt', variant: 'green' },
    waitlisted: { label: 'Venteliste', variant: 'yellow' },
    cancelled: { label: 'Afmeldt', variant: 'red' },
  };
  const cfg = map[status] ?? { label: status, variant: 'gray' as BadgeVariant };
  return <Badge label={cfg.label} variant={cfg.variant} />;
}
