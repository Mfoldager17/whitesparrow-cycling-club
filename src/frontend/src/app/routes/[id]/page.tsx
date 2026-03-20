'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
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
import { apiClient } from '@/api/axios-instance';
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
  const [exportResult, setExportResult] = useState<{ url: string } | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [rwgpsConnected, setRwgpsConnected] = useState(false);

  const { data: routeData, isLoading } = useRoutesControllerFindOne(id);
  const { mutateAsync: updateRoute, isPending: updating } = useRoutesControllerUpdate();
  const { mutateAsync: deleteRoute, isPending: deleting } = useRoutesControllerDelete();

  useEffect(() => {
    apiClient
      .get<{ data: { connected: boolean } } | { connected: boolean }>('/ridewithgps/status')
      .then((res) => {
        const connected = (res.data as any)?.data?.connected ?? (res.data as any)?.connected ?? false;
        setRwgpsConnected(connected);
      })
      .catch(() => setRwgpsConnected(false));
  }, []);

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
    await deleteRoute({ id });
    await queryClient.invalidateQueries({ queryKey: getRoutesControllerFindAllQueryKey() });
    router.push('/routes');
  }

  async function handleExportToRwgps() {
    setExportResult(null);
    setExportError(null);
    setExporting(true);
    try {
      const res = await apiClient.post<{ data: { url: string; rwgpsRouteId: number } } | { url: string; rwgpsRouteId: number }>(
        `/ridewithgps/export/${id}`,
      );
      const data = (res.data as any)?.data ?? res.data;
      setExportResult({ url: data.url });
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.message ?? 'Eksport fejlede';
      setExportError(msg);
    } finally {
      setExporting(false);
    }
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
              onClick={() => router.push(`/routes/${id}/edit`)}
              className="btn-secondary text-sm"
              title="Rediger rute og waypoints"
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

      {/* Export to RideWithGPS */}
      {isOwner && rwgpsConnected && (
        <div className="mt-6 rounded-lg border border-gray-200 bg-white px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" fill="#FB5A00" aria-hidden>
                <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 3a7 7 0 1 1 0 14A7 7 0 0 1 12 5zm-1 3v5l4 2.5-.75-1.3L13 13V8h-2z" />
              </svg>
              <span className="text-sm font-medium text-gray-900">Eksporter til RideWithGPS</span>
            </div>
            <button
              onClick={handleExportToRwgps}
              disabled={exporting}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white shrink-0"
              style={{ background: exporting ? '#ccc' : '#FB5A00' }}
            >
              {exporting ? 'Eksporterer…' : 'Eksporter rute'}
            </button>
          </div>

          {exportResult && (
            <div className="mt-3 rounded-md bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-800">
              ✅ Rute oprettet på RideWithGPS!{' '}
              <a
                href={exportResult.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold underline hover:text-green-900"
              >
                Åbn på RWGPS →
              </a>
            </div>
          )}

          {exportError && (
            <div className="mt-3 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
              ❌ {exportError}
            </div>
          )}
        </div>
      )}

      {/* Link to use on activities */}
      <div className="mt-6 rounded-lg bg-brand-50 border border-brand-200 px-4 py-3 text-sm text-brand-800">
        💡 Du kan tilknytte denne rute til en aktivitet via rute-fanen, når du opretter eller redigerer en aktivitet.
      </div>
    </div>
  );
}

