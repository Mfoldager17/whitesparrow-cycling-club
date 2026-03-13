'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  addMonths,
  subMonths,
} from 'date-fns';
import { da } from 'date-fns/locale';
import { CalendarGrid } from '@/components/ui/CalendarGrid';
import { PageSpinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { ActivityTypeBadge, DifficultyBadge, RegistrationStatusBadge } from '@/components/ui/Badge';
import { useMyRegistrationsControllerGetMyRegistrations } from '@/api/generated/registrations/registrations';

export default function MyRidesPage() {
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const { data, isLoading } = useMyRegistrationsControllerGetMyRegistrations();

  const registrations = useMemo(() => {
    const raw: NonNullable<typeof data> = Array.isArray(data) ? (data as any) : ((data as any)?.data ?? []);
    return raw
      .filter((r) => r.status !== 'cancelled')
      .sort((a, b) => {
        const ta = a.startsAt ? new Date(a.startsAt).getTime() : 0;
        const tb = b.startsAt ? new Date(b.startsAt).getTime() : 0;
        return ta - tb;
      });
  }, [data]);

  const rideDates = useMemo(
    () => registrations.filter((r) => r.startsAt).map((r) => new Date(r.startsAt!)),
    [registrations],
  );

  const monthRegistrations = useMemo(
    () =>
      registrations.filter(
        (r) => r.startsAt && isSameMonth(new Date(r.startsAt), currentMonth),
      ),
    [registrations, currentMonth],
  );

  const visibleRegistrations = useMemo(() => {
    if (selectedDate) {
      return registrations.filter(
        (r) => r.startsAt && isSameDay(new Date(r.startsAt), selectedDate),
      );
    }
    return monthRegistrations;
  }, [registrations, monthRegistrations, selectedDate]);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof visibleRegistrations>();
    for (const r of visibleRegistrations) {
      if (!r.startsAt) continue;
      const key = format(new Date(r.startsAt), 'yyyy-MM-dd');
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    }
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [visibleRegistrations]);

  const monthKm = monthRegistrations.reduce((sum, r) => sum + (Number(r.approxKm) || 0), 0);
  const totalKm = registrations.reduce((sum, r) => sum + (Number(r.approxKm) || 0), 0);

  if (isLoading) return <PageSpinner />;

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 sm:px-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Mine ture</h1>
        <p className="text-sm text-gray-500 mt-1">
          {registrations.length} ture · {totalKm} km samlet
        </p>
      </div>

      <div className="card mb-6">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => {
              setCurrentMonth((m) => subMonths(m, 1));
              setSelectedDate(null);
            }}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors text-xl leading-none"
          >
            ‹
          </button>
          <h2 className="text-base font-semibold text-gray-800 capitalize">
            {format(currentMonth, 'MMMM yyyy', { locale: da })}
          </h2>
          <button
            onClick={() => {
              setCurrentMonth((m) => addMonths(m, 1));
              setSelectedDate(null);
            }}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors text-xl leading-none"
          >
            ›
          </button>
        </div>

        <CalendarGrid
          year={currentMonth.getFullYear()}
          month={currentMonth.getMonth()}
          highlightedDates={rideDates}
          selectedDate={selectedDate}
          onDayClick={(d) =>
            setSelectedDate((prev) => (prev && isSameDay(prev, d) ? null : d))
          }
        />

        <div className="mt-4 pt-4 border-t border-gray-100 flex gap-8">
          <div>
            <p className="text-2xl font-bold text-gray-900">{monthRegistrations.length}</p>
            <p className="text-xs text-gray-500">
              ture i {format(currentMonth, 'MMMM', { locale: da })}
            </p>
          </div>
          {monthKm > 0 && (
            <div>
              <p className="text-2xl font-bold text-brand-700">{monthKm}</p>
              <p className="text-xs text-gray-500">
                km i {format(currentMonth, 'MMMM', { locale: da })}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
          {selectedDate
            ? format(selectedDate, "EEEE 'd.' d. MMMM", { locale: da })
            : format(currentMonth, 'MMMM yyyy', { locale: da })}
        </h3>
        {selectedDate && (
          <button
            onClick={() => setSelectedDate(null)}
            className="text-xs text-brand-600 hover:text-brand-800 transition-colors"
          >
            Vis hele måneden →
          </button>
        )}
      </div>

      {grouped.length === 0 ? (
        <EmptyState
          title={selectedDate ? 'Ingen ture denne dag' : 'Ingen ture denne måned'}
          description="Prøv en anden måned eller find en aktivitet at tilmelde dig."
          action={
            <Link href="/activities" className="btn-primary">
              Se aktiviteter
            </Link>
          }
        />
      ) : (
        <div className="space-y-8">
          {grouped.map(([dateKey, regs]) => (
            <section key={dateKey}>
              <div className="flex items-center gap-3 mb-3">
                <div className="flex flex-col items-center justify-center w-11 h-11 rounded-xl bg-brand-600 text-white shrink-0">
                  <span className="text-[10px] font-semibold leading-none uppercase">
                    {format(new Date(dateKey), 'MMM', { locale: da })}
                  </span>
                  <span className="text-xl font-bold leading-tight">
                    {format(new Date(dateKey), 'd')}
                  </span>
                </div>
                <p className="text-sm font-semibold text-gray-800 capitalize">
                  {format(new Date(dateKey), 'EEEE', { locale: da })}
                </p>
              </div>

              <div className="ml-14 space-y-3">
                {regs.map((reg) => {
                  const isPast = reg.startsAt ? new Date(reg.startsAt) < new Date() : false;
                  return (
                    <Link href={`/activities/${reg.activityId}`} key={reg.id}>
                      <article
                        className={`card hover:shadow-md transition-shadow cursor-pointer flex items-center gap-4 ${
                          isPast ? 'opacity-65' : ''
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap gap-1.5 mb-1.5">
                            <ActivityTypeBadge type={reg.type ?? ''} />
                            {reg.difficulty && (
                              <DifficultyBadge difficulty={String(reg.difficulty)} />
                            )}
                            {isPast ? (
                              <span className="badge bg-gray-100 text-gray-500">Overstået</span>
                            ) : (
                              reg.registrationStatus && (
                                <RegistrationStatusBadge
                                  status={String(reg.registrationStatus)}
                                />
                              )
                            )}
                          </div>
                          <h3 className="font-semibold text-gray-900 leading-snug">
                            {reg.title}
                          </h3>
                          <p className="text-sm text-gray-500 mt-0.5">
                            {reg.startsAt
                              ? format(new Date(reg.startsAt), 'HH:mm')
                              : '–'}
                            {reg.startLocation && ` · ${reg.startLocation}`}
                          </p>
                        </div>
                        {reg.approxKm != null && (
                          <span className="text-lg font-bold text-brand-700 shrink-0">
                            {String(reg.approxKm)} km
                          </span>
                        )}
                      </article>
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
