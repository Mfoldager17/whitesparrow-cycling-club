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
  isToday,
} from 'date-fns';
import { da } from 'date-fns/locale';
import { CalendarGrid } from '@/components/ui/CalendarGrid';
import { ActivityTypeBadge, DifficultyBadge } from '@/components/ui/Badge';
import { ActivityForm } from '@/components/activities/ActivityForm';
import { Modal } from '@/components/ui/Modal';
import { PageSpinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAuth } from '@/contexts/AuthContext';
import {
  useActivitiesControllerFindAll,
  useActivitiesControllerCreate,
} from '@/api/generated/activities/activities';
import { useMyRegistrationsControllerGetMyRegistrations } from '@/api/generated/registrations/registrations';

export default function ActivitiesPage() {
  const { user, isAdmin } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const { data, isLoading, refetch } = useActivitiesControllerFindAll({});
  const { mutateAsync: createActivity, isPending } = useActivitiesControllerCreate();
  const { data: myRegsData } = useMyRegistrationsControllerGetMyRegistrations();

  const activities = (Array.isArray(data) ? data : ((data as any)?.data ?? [])) as NonNullable<typeof data>;

  const myRegs = (Array.isArray(myRegsData) ? myRegsData : ((myRegsData as any)?.data ?? [])) as Array<{ activityId: string; status: string; startsAt?: string }>;

  const registeredActivityIds = useMemo(
    () => new Set(myRegs.filter((r) => r.status !== 'cancelled').map((r) => r.activityId)),
    [myRegs],
  );

  const activityDates = useMemo(
    () => activities.map((a) => new Date(a.startsAt)),
    [activities],
  );

  const registeredDates = useMemo(
    () =>
      activities
        .filter((a) => registeredActivityIds.has(a.id))
        .map((a) => new Date(a.startsAt)),
    [activities, registeredActivityIds],
  );

  const visibleActivities = useMemo(() => {
    const sorted = [...activities].sort(
      (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
    );
    if (selectedDate) {
      return sorted.filter((a) => isSameDay(new Date(a.startsAt), selectedDate));
    }
    return sorted.filter((a) => isSameMonth(new Date(a.startsAt), currentMonth));
  }, [activities, selectedDate, currentMonth]);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof visibleActivities>();
    for (const a of visibleActivities) {
      const key = format(new Date(a.startsAt), 'yyyy-MM-dd');
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(a);
    }
    return Array.from(map.entries());
  }, [visibleActivities]);

  function handleDayClick(date: Date) {
    setSelectedDate((prev) => (prev && isSameDay(prev, date) ? null : date));
  }

  async function handleCreate(formData: Parameters<typeof createActivity>[0]['data']) {
    await createActivity({ data: formData });
    await refetch();
    setShowForm(false);
  }

  if (isLoading) return <PageSpinner />;

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 sm:px-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Aktiviteter</h1>
          <p className="text-sm text-gray-500 mt-1">Kommende ture og klubarrangementer</p>
        </div>
        {user && (
          <button onClick={() => setShowForm(true)} className="btn-primary">
            + Ny aktivitet
          </button>
        )}
      </div>

      {/* Calendar card */}
      <div className="card mb-8">
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
          highlightedDates={activityDates}
          registeredDates={registeredDates}
          selectedDate={selectedDate}
          onDayClick={handleDayClick}
        />
      </div>

      {/* Section label */}
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

      {/* Activity list grouped by date */}
      {grouped.length === 0 ? (
        <EmptyState
          title={selectedDate ? 'Ingen aktiviteter denne dag' : 'Ingen aktiviteter denne måned'}
          description="Prøv en anden dato, eller opret en ny tur."
          action={
            user ? (
              <button onClick={() => setShowForm(true)} className="btn-primary">
                Opret aktivitet
              </button>
            ) : (
              <Link href="/login" className="btn-primary">
                Log ind for at oprette ture
              </Link>
            )
          }
        />
      ) : (
        <div className="space-y-8">
          {grouped.map(([dateKey, acts]) => (
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

              {/* Activities for this date */}
              <div className="ml-14 space-y-3">
                {acts.map((a) => {
                  const isRegistered = registeredActivityIds.has(a.id);
                  return (
                  <Link key={a.id} href={`/activities/${a.id}`}>
                    <article
                      className={`relative card hover:shadow-md transition-shadow cursor-pointer overflow-hidden ${
                        a.isCancelled ? 'opacity-60' : ''
                      } ${isRegistered ? 'bg-green-50/60 border-green-100' : ''}`}
                    >
                      {isRegistered && (
                        <span className="absolute bottom-3 right-3 flex items-center gap-1 text-[11px] font-semibold text-green-700 bg-green-100/80 rounded-full px-2 py-0.5">
                          <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                          Tilmeldt
                        </span>
                      )}
                      <div className="flex items-start gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap gap-1.5 mb-1.5">
                            <ActivityTypeBadge type={a.type} />
                            {a.difficulty && <DifficultyBadge difficulty={a.difficulty} />}
                            {a.isCancelled && (
                              <span className="badge bg-red-100 text-red-700">Aflyst</span>
                            )}
                          </div>
                          <h4 className="font-semibold text-gray-900 leading-snug">{a.title}</h4>
                          <p className="text-sm text-gray-500 mt-0.5">
                            🕐 {format(new Date(a.startsAt), 'HH:mm')}
                            {a.startLocation && ` · 📍 ${a.startLocation}`}
                          </p>
                          <p className="text-sm text-gray-400 mt-0.5">👤 {a.organizerName}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          {a.approxKm && (
                            <span className="text-sm font-bold text-brand-700">
                              {String(a.approxKm)} km
                            </span>
                          )}
                          <span className="text-xs text-gray-500">
                            {a.registeredCount}
                            {a.maxParticipants ? `/${a.maxParticipants}` : ''} tilmeldt
                          </span>
                          {a.waitlistCount > 0 && (
                            <span className="text-xs text-yellow-700">
                              +{a.waitlistCount} venteliste
                            </span>
                          )}
                        </div>
                      </div>
                    </article>
                  </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* New activity modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title="Opret aktivitet">
        <ActivityForm
          isAdmin={isAdmin}
          isLoading={isPending}
          onSubmit={handleCreate as Parameters<typeof ActivityForm>[0]['onSubmit']}
        />
      </Modal>
    </div>
  );
}
