'use client';

import { format, isToday } from 'date-fns';
import { da } from 'date-fns/locale';
import { ActivityCard } from './ActivityCard';

export interface ActivityDateListItem {
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
  isPast?: boolean;
  registrationStatus?: string | null;
}

interface ActivityDateListProps {
  grouped: [string, ActivityDateListItem[]][];
  registeredActivityIds?: Set<string>;
}

export function ActivityDateList({ grouped, registeredActivityIds = new Set() }: ActivityDateListProps) {
  return (
    <div className="space-y-10">
      {grouped.map(([dateKey, items]) => (
        <section key={dateKey}>
          {/* Date header */}
          <div className="flex items-center gap-3 mb-3">
            <div className="flex flex-col items-center justify-center w-11 h-11 rounded-xl bg-brand-600 text-white shrink-0">
              <span className="text-[10px] font-semibold leading-none uppercase">
                {format(new Date(dateKey), 'MMM', { locale: da })}
              </span>
              <span className="text-xl font-bold leading-tight">
                {format(new Date(dateKey), 'd')}
              </span>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800 capitalize">
                {format(new Date(dateKey), 'EEEE', { locale: da })}
              </p>
              {isToday(new Date(dateKey)) && (
                <span className="text-xs text-brand-600 font-medium">I dag</span>
              )}
            </div>
          </div>

          {/* Cards */}
          <div className="flex flex-col gap-3">
            {items.map((a) => (
              <ActivityCard
                key={a.id}
                id={a.id}
                title={a.title}
                type={a.type}
                startsAt={a.startsAt}
                startLocation={a.startLocation}
                approxKm={a.approxKm}
                difficulty={a.difficulty}
                organizerName={a.organizerName}
                registeredCount={a.registeredCount}
                waitlistCount={a.waitlistCount}
                maxParticipants={a.maxParticipants}
                isCancelled={a.isCancelled}
                isPast={a.isPast}
                registrationStatus={a.registrationStatus}
                isRegistered={registeredActivityIds.has(a.id)}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
