'use client';

import { useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { da } from 'date-fns/locale';
import { PageSpinner } from '@/components/ui/Spinner';
import { ActivityTypeBadge, DifficultyBadge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { ActivityForm } from '@/components/activities/ActivityForm';
import {
  useActivitiesControllerFindAll,
  useActivitiesControllerCreate,
  useActivitiesControllerCancel,
} from '@/api/generated/activities/activities';

export default function AdminActivitiesPage() {
  const { data, isLoading, refetch } = useActivitiesControllerFindAll({ includePast: true, includeCancelled: true });
  const { mutateAsync: createActivity, isPending: creating } = useActivitiesControllerCreate();
  const { mutateAsync: cancelActivity, isPending: cancelling } = useActivitiesControllerCancel();

  const [showForm, setShowForm] = useState(false);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  const activities = data ?? [];

  if (isLoading) return <PageSpinner />;

  async function handleCreate(formData: Parameters<typeof createActivity>[0]['data']) {
    await createActivity({ data: formData });
    await refetch();
    setShowForm(false);
  }

  async function handleCancel() {
    if (!cancelId) return;
    await cancelActivity({ id: cancelId, data: { isCancelled: true, cancellationReason: cancelReason || undefined } });
    await refetch();
    setCancelId(null);
    setCancelReason('');
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-10 sm:px-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin – Aktiviteter</h1>
          <p className="text-sm text-gray-500 mt-1">Alle aktiviteter inkl. aflyste og historik</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          + Ny aktivitet
        </button>
      </div>

      <div className="card overflow-y-hidden overflow-x-auto p-0">
        <table className="min-w-full divide-y divide-gray-100">
          <thead className="bg-gray-50">
            <tr>
              {['Titel', 'Type', 'Dato', 'Sværhed', 'Deltagere', 'Status', ''].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {activities.map((a) => (
              <tr key={a.id} className={`hover:bg-gray-50 transition-colors ${a.isCancelled ? 'opacity-60' : ''}`}>
                <td className="px-4 py-3 text-sm font-medium text-gray-900">
                  <Link href={`/activities/${a.id}`} className="hover:text-brand-600">
                    {a.title}
                  </Link>
                </td>
                <td className="px-4 py-3"><ActivityTypeBadge type={a.type} /></td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {format(new Date(a.startsAt), 'd. MMM yyyy', { locale: da })}
                </td>
                <td className="px-4 py-3">
                  {a.difficulty ? <DifficultyBadge difficulty={a.difficulty} /> : <span className="text-gray-400 text-xs">—</span>}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {a.registeredCount}
                  {a.maxParticipants ? ` / ${a.maxParticipants}` : ''}
                  {a.waitlistCount > 0 && <span className="text-yellow-600 ml-1">(+{a.waitlistCount})</span>}
                </td>
                <td className="px-4 py-3">
                  {a.isCancelled ? (
                    <span className="badge bg-red-100 text-red-700">Aflyst</span>
                  ) : new Date(a.startsAt) < new Date() ? (
                    <span className="badge bg-gray-100 text-gray-600">Overstået</span>
                  ) : (
                    <span className="badge bg-green-100 text-green-700">Aktiv</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {!a.isCancelled && (
                    <button
                      onClick={() => setCancelId(a.id)}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Aflys
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title="Ny aktivitet">
        <ActivityForm isAdmin onSubmit={handleCreate as Parameters<typeof ActivityForm>[0]['onSubmit']} isLoading={creating} />
      </Modal>

      {/* Cancel confirm modal */}
      <Modal open={!!cancelId} onClose={() => setCancelId(null)} title="Aflys aktivitet">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Er du sikker? Alle deltagere kan se aflysningen.</p>
          <div>
            <label className="label">Aflysningsårsag (valgfrit)</label>
            <input
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="input"
              placeholder="Dårligt vejr..."
            />
          </div>
          <div className="flex gap-3">
            <button onClick={() => setCancelId(null)} className="btn-secondary flex-1">
              Annuller
            </button>
            <button onClick={handleCancel} disabled={cancelling} className="btn-danger flex-1">
              {cancelling ? 'Aflyser…' : 'Bekræft aflysning'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
