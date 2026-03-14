import Link from 'next/link';
import { format } from 'date-fns';
import { da } from 'date-fns/locale';
import { ActivityTypeBadge, DifficultyBadge, RegistrationStatusBadge } from '@/components/ui/Badge';

interface ActivityCardProps {
  id: string;
  title: string;
  type: string;
  startsAt: string | Date;
  startLocation?: string | null;
  approxKm?: number | null;
  difficulty?: string | null;
  organizerName?: string | null;
  registeredCount?: number;
  waitlistCount?: number;
  maxParticipants?: number | null;
  isCancelled?: boolean;
  isRegistered?: boolean;
  isPast?: boolean;
  registrationStatus?: string | null;
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
  isCancelled = false,
  isRegistered = false,
  isPast = false,
  registrationStatus,
}: ActivityCardProps) {
  return (
    <Link href={`/activities/${id}`}>
      <article
        className={`relative card hover:shadow-md transition-shadow cursor-pointer overflow-hidden ${
          isCancelled || isPast ? 'opacity-60' : ''
        } ${isRegistered ? 'bg-green-50/60 border-green-100' : ''}`}
      >
        {isRegistered && (
          <span className="absolute bottom-3 right-3 flex items-center gap-1 text-[11px] font-semibold text-green-700 bg-green-100/80 rounded-full px-2 py-0.5">
            <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Tilmeldt
          </span>
        )}
        <div className="flex items-start gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap gap-1.5 mb-1.5">
              <ActivityTypeBadge type={type} />
              {difficulty && <DifficultyBadge difficulty={difficulty} />}
              {isCancelled && <span className="badge bg-red-100 text-red-700">Aflyst</span>}
              {isPast && !isCancelled && <span className="badge bg-gray-100 text-gray-500">Overstået</span>}
              {!isPast && registrationStatus && <RegistrationStatusBadge status={registrationStatus} />}
            </div>
            <h4 className="font-semibold text-gray-900 leading-snug">{title}</h4>
            <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-gray-500 mt-0.5">
              <span className="inline-flex items-center gap-1">
                <span>🕐</span>
                <span>{format(new Date(startsAt), 'HH:mm', { locale: da })}</span>
              </span>
              {startLocation && (
                <span className="inline-flex items-center gap-1">
                  <span aria-hidden className="text-gray-300">·</span>
                  <span>📍</span>
                  <span>{startLocation}</span>
                </span>
              )}
            </p>
            {organizerName && (
              <p className="flex items-center gap-1 text-sm text-gray-400 mt-0.5">
                <span>👤</span>
                <span>{organizerName}</span>
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            {approxKm != null && (
              <span className="text-sm font-bold text-brand-700">{String(approxKm)} km</span>
            )}
            {registeredCount != null && (
              <span className="text-xs text-gray-500">
                {registeredCount}
                {maxParticipants ? `/${maxParticipants}` : ''} tilmeldt
              </span>
            )}
            {waitlistCount != null && waitlistCount > 0 && (
              <span className="text-xs text-yellow-700">+{waitlistCount} venteliste</span>
            )}
          </div>
        </div>
      </article>
    </Link>
  );
}
