'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { da } from 'date-fns/locale';
import { PageSpinner } from '@/components/ui/Spinner';
import ElevationProfile from '@/components/activities/ElevationProfile';
import {
  useRoutesControllerFindOne,
  useRoutesControllerUpdate,
  useRoutesControllerDelete,
  getRoutesControllerFindAllQueryKey,
  getRoutesControllerFindOneQueryKey,
} from '@/api/generated/routes/routes';
import { useAuth } from '@/contexts/AuthContext';

const RouteMap = dynamic(() => import('@/components/activities/RouteMap'), { ssr: false });

const SURFACE_LABELS: Record<string, { label: string; icon: string }> = {
  auto: { label: 'Auto', icon: '🚲' },
  paved: { label: 'Asfalt', icon: '🛣️' },
  unpaved: { label: 'Grus', icon: '🪨' },
};

export default function RouteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [hoveredDistKm, setHoveredDistKm] = useState<number | null>(null);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');

  const { data: routeData, isLoading } = useRoutesControllerFindOne(id);
  const { mutateAsync: updateRoute, isPending: updating } = useRoutesControllerUpdate();
  const { mutateAsync: deleteRoute, isPending: deleting } = useRoutesControllerDelete();

  if (isLoading) return <PageSpinner />;

  const route = Array.isArray(routeData)
    ? routeData[0]
    : ((routeData as any)?.data ?? routeData);

  if (!route) return <p className="p-8 text-center text-gray-500">Rute ikke fundet.</p>;

  const surface = SURFACE_LABELS[route.surface] ?? SURFACE_LABELS.auto;
  const isOwner = user?.userId === route.createdBy;

  function startEdit() {
    setEditName(route.name);
    setEditDesc(route.description ?? '');
    setEditing(true);
  }

  async function saveEdit() {
    await updateRoute({ id, data: { name: editName.trim(), description: editDesc.trim() || undefined } });
    await queryClient.invalidateQueries({ queryKey: getRoutesControllerFindOneQueryKey(id) });
    await queryClient.invalidateQueries({ queryKey: getRoutesControllerFindAllQueryKey() });
    setEditing(false);
  }

  async function handleDelete() {
    if (!confirm(`Slet ruten "${route.name}"?`)) return;
    await deleteRoute(id);
    await queryClient.invalidateQueries({ queryKey: getRoutesControllerFindAllQueryKey() });
    router.push('/routes');
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 sm:px-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <a href="/routes" className="hover:text-brand-600 transition-colors">Ruter</a>
        <span>/</span>
        <span className="truncate">{route.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex-1 min-w-0">
          {editing ? (
            <div className="space-y-2">
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="input text-2xl font-bold w-full"
              />
              <textarea
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                placeholder="Beskrivelse…"
                rows={2}
                className="input w-full resize-none text-sm"
              />
              <div className="flex gap-2">
                <button onClick={saveEdit} disabled={updating} className="btn-primary text-sm py-1.5 px-3">
                  {updating ? 'Gemmer…' : 'Gem ændringer'}
                </button>
                <button onClick={() => setEditing(false)} className="btn-secondary text-sm py-1.5 px-3">
                  Annuller
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-3xl font-bold text-gray-900">{route.name}</h1>
                <span className="text-base">{surface.icon}</span>
                <span className="badge bg-gray-100 text-gray-600">{surface.label}</span>
              </div>
              {route.description && (
                <p className="text-gray-600">{route.description}</p>
              )}
              <p className="text-xs text-gray-400 mt-1">
                Gemt {format(new Date(route.createdAt), "d. MMMM yyyy", { locale: da })}
              </p>
            </>
          )}
        </div>

        {isOwner && !editing && (
          <div className="flex gap-2 shrink-0">
            <button
              onClick={startEdit}
              className="btn-secondary text-sm"
              title="Rediger navn og beskrivelse"
            >
              Rediger
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="text-sm px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
            >
              Slet
            </button>
          </div>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Distance', value: `${route.totalDistanceKm} km`, icon: '📏' },
          { label: 'Stigning', value: `${route.elevationGainM} m`, icon: '↑', className: 'text-green-700' },
          { label: 'Fald', value: `${route.elevationLossM} m`, icon: '↓', className: 'text-red-600' },
          { label: 'Waypoints', value: String(Array.isArray(route.waypoints) ? route.waypoints.length : 0), icon: '📍' },
        ].map(({ label, value, icon, className }) => (
          <div key={label} className="card py-3 text-center">
            <div className={`text-xl font-bold ${className ?? 'text-gray-900'}`}>
              {icon} {value}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Map */}
      {route.trackPoints?.length > 1 && (
        <div className="card mb-6">
          <h2 className="font-semibold text-gray-900 mb-3">Kort</h2>
          <RouteMap
            trackPoints={route.trackPoints}
            boundingBox={route.boundingBox}
            hoveredDistKm={hoveredDistKm}
            onHoverDistKm={setHoveredDistKm}
          />
        </div>
      )}

      {/* Elevation profile */}
      {route.trackPoints?.length > 1 && (
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-3">Højdeprofil</h2>
          <ElevationProfile
            trackPoints={route.trackPoints}
            elevationGainM={route.elevationGainM}
            elevationLossM={route.elevationLossM}
            maxElevationM={route.maxElevationM}
            minElevationM={route.minElevationM}
            hoveredDistKm={hoveredDistKm}
            onHoverDistKm={setHoveredDistKm}
          />
        </div>
      )}

      {/* Link to use on activities */}
      <div className="mt-6 rounded-lg bg-brand-50 border border-brand-200 px-4 py-3 text-sm text-brand-800">
        💡 Du kan tilknytte denne rute til en aktivitet via rute-fanen, når du opretter eller redigerer en aktivitet.
      </div>
    </div>
  );
}
