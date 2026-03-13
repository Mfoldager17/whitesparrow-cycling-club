import Link from 'next/link';
import { format } from 'date-fns';
import { da } from 'date-fns/locale';
import {
  ActivityTypeBadge,
  DifficultyBadge,
} from '@/components/ui/Badge';

interface ActivityCardProps {
  id: string;
  title: string;
  type: string;
  startsAt: string | Date;
  startLocation: string | null;
  approxKm: number | null;
  difficulty: string | null;
  organizerName: string;
  registeredCount: number;
  waitlistCount: number;
  maxParticipants: number | null;
  isCancelled: boolean;
}

export function ActivityCard({
  id,
  title,
  type,
  startsAt,
  startLocation,
  approxKm,
  difficulty,
  organizerName,
  registeredCount,
  waitlistCount,
  maxParticipants,
  isCancelled,
}: ActivityCardProps) {
  const date = new Date(startsAt);
  const spotsLeft = maxParticipants !== null ? maxParticipants - registeredCount : null;

  return (
    <Link href={`/activities/${id}`}>
      <article
        className={`card hover:shadow-md transition-shadow cursor-pointer ${
          isCancelled ? 'opacity-60' : ''
        }`}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex flex-wrap gap-1.5">
            <ActivityTypeBadge type={type} />
            {difficulty && <DifficultyBadge difficulty={difficulty} />}
            {isCancelled && (
              <span className="badge bg-red-100 text-red-700">Aflyst</span>
            )}
          </div>
          {approxKm && (
            <span className="text-sm font-semibold text-brand-700 shrink-0">
              {approxKm} km
            </span>
          )}
        </div>

        {/* Title */}
        <h2 className="text-base font-semibold text-gray-900 mb-1 line-clamp-2">
          {title}
        </h2>

        {/* Meta */}
        <div className="flex flex-col gap-1 text-sm text-gray-500 mb-4">
          <span>
            📅{' '}
            {format(date, "EEEE 'd.' d. MMMM 'kl.' HH:mm", { locale: da })}
          </span>
          {startLocation && <span>📍 {startLocation}</span>}
          <span>👤 Arrangeret af {organizerName}</span>
        </div>

        {/* Participants */}
        <div className="flex items-center gap-4 text-sm">
          <span className="text-green-700 font-medium">
            ✅ {registeredCount} tilmeldt
            {maxParticipants ? ` / ${maxParticipants}` : ''}
          </span>
          {waitlistCount > 0 && (
            <span className="text-yellow-700">⏳ {waitlistCount} på venteliste</span>
          )}
          {spotsLeft !== null && spotsLeft > 0 && (
            <span className="text-gray-500">{spotsLeft} pladser tilbage</span>
          )}
          {spotsLeft === 0 && (
            <span className="text-red-600 font-medium">Fuldt belægt</span>
          )}
        </div>
      </article>
    </Link>
  );
}
