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
import { ActivityForm } from '@/components/activities/ActivityForm';
import { ActivityRouteStep } from '@/components/activities/ActivityRouteStep';
import { Modal } from '@/components/ui/Modal';
import { PageSpinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAuth } from '@/contexts/AuthContext';
import {
  useActivitiesControllerFindAll,
  useActivitiesControllerCreate,
} from '@/api/generated/activities/activities';
import { useMyRegistrationsControllerGetMyRegistrations } from '@/api/generated/registrations/registrations';
import { groupByDate } from '@/lib/groupByDate';

export default function ActivitiesPage() {
  const { user, isAdmin } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [createdActivityId, setCreatedActivityId] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const { data: activities, isLoading, refetch } = useActivitiesControllerFindAll();
  const { mutateAsync: createActivity, isPending } = useActivitiesControllerCreate();
  const { data: myRegsData } = useMyRegistrationsControllerGetMyRegistrations();

  const myRegs = (Array.isArray(myRegsData) ? myRegsData : ((myRegsData as any)?.data ?? [])) as Array<{ activityId: string; status: string }>;

  const registeredActivityIds = useMemo(
    () => new Set(myRegs.filter((r) => r.status !== 'cancelled').map((r) => r.activityId)),
    [myRegs],
  );

  const activityDates = useMemo(
    () => activities?.map((a) => new Date(a.startsAt)),
    [activities],
  );

  const registeredDates = useMemo(
    () =>
      (activities ?? [])
        .filter((a) => registeredActivityIds.has(a.id))
        .map((a) => new Date(a.startsAt)),
    [activities, registeredActivityIds],
  );

  const visibleActivities = useMemo(() => {
    const sorted = [...(activities ?? [])].sort(
      (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
    );
    if (selectedDate) {
      return sorted.filter((a) => isSameDay(new Date(a.startsAt), selectedDate));
    }
    return sorted.filter((a) => isSameMonth(new Date(a.startsAt), currentMonth));
  }, [activities, selectedDate, currentMonth]);

  const grouped = useMemo(
    () => groupByDate(visibleActivities, (a) => a.startsAt),
    [visibleActivities],
  );

  function handleDayClick(date: Date) {
    setSelectedDate((prev) => (prev && isSameDay(prev, date) ? null : date));
  }

  async function handleCreate(formData: Parameters<typeof createActivity>[0]['data']) {
    const created = await createActivity({ data: formData });
    await refetch();
    const id = (created as { id?: string } | null | undefined)?.id;
    if (id) {
      setCreatedActivityId(id);
    } else {
      setShowForm(false);
    }
  }

  function handleModalClose() {
    setShowForm(false);
    setCreatedActivityId(null);
  }

  if (isLoading) return <PageSpinner />;

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 sm:px-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Aktiviteter</h1>
          <p className="text-sm text-gray-500 mt-1">Kommende ture og klubarrangementer</p>
        </div>
        {user && (
          <button onClick={() => setShowForm(true)} className="btn-primary shrink-0">
            + Ny aktivitet
          </button>
        )}
      </div>

      {/* Calendar card */}
      <div className="card mb-8">
        <CalendarNav
          currentMonth={currentMonth}
          onPrev={() => { setCurrentMonth((m) => subMonths(m, 1)); setSelectedDate(null); }}
          onNext={() => { setCurrentMonth((m) => addMonths(m, 1)); setSelectedDate(null); }}
        />
        <CalendarGrid
          year={currentMonth.getFullYear()}
          month={currentMonth.getMonth()}
          highlightedDates={activityDates ?? []}
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
        <ActivityDateList grouped={grouped} registeredActivityIds={registeredActivityIds} />
      )}

      {/* New activity modal */}
      <Modal open={showForm} onClose={handleModalClose} title={createdActivityId ? 'Tilføj rute' : 'Opret aktivitet'}>
        {createdActivityId ? (
          <ActivityRouteStep activityId={createdActivityId} onDone={handleModalClose} />
        ) : (
          <ActivityForm
            isAdmin={isAdmin}
            isLoading={isPending}
            onSubmit={handleCreate as Parameters<typeof ActivityForm>[0]['onSubmit']}
          />
        )}
      </Modal>
    </div>
  );
}
