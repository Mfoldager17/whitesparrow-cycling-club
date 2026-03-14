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
import { CalendarNav } from '@/components/ui/CalendarNav';
import { ActivityDateList } from '@/components/activities/ActivityDateList';
import { PageSpinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { useMyRegistrationsControllerGetMyRegistrations } from '@/api/generated/registrations/registrations';
import { groupByDate } from '@/lib/groupByDate';

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

  const grouped = useMemo(
    () =>
      groupByDate<any>(visibleRegistrations, (r) => r.startsAt).sort((a, b) =>
        b[0].localeCompare(a[0]),
      ),
    [visibleRegistrations],
  );

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
        <CalendarNav
          currentMonth={currentMonth}
          onPrev={() => { setCurrentMonth((m) => subMonths(m, 1)); setSelectedDate(null); }}
          onNext={() => { setCurrentMonth((m) => addMonths(m, 1)); setSelectedDate(null); }}
        />

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
        <ActivityDateList
          grouped={grouped.map(([dateKey, regs]) => [
            dateKey,
            regs.map((reg) => ({
              id: reg.activityId,
              title: reg.title ?? '',
              type: reg.type ?? '',
              startsAt: reg.startsAt!,
              startLocation: reg.startLocation,
              approxKm: reg.approxKm != null ? Number(reg.approxKm) : null,
              difficulty: reg.difficulty != null ? String(reg.difficulty) : null,
              isPast: reg.startsAt ? new Date(reg.startsAt) < new Date() : false,
              registrationStatus: reg.registrationStatus != null ? String(reg.registrationStatus) : null,
            })),
          ])}
        />
      )}
    </div>
  );
}
