'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/api/axios-instance';

interface StravaRoute {
  id: string;
  name: string;
  distance: number;       // meters
  elevation_gain: number; // meters
}

interface Props {
  activityId: string;
  onImported: () => void;
  /** 'button' (default): floating popover triggered by a button.
   *  'inline': standalone panel that auto-loads and renders inline. */
  mode?: 'button' | 'inline';
  onClose?: () => void;
}

export default function StravaRouteImport({ activityId, onImported, mode = 'button', onClose }: Props) {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [routes, setRoutes] = useState<StravaRoute[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    apiClient
      .get<{ data?: { connected: boolean }; connected?: boolean }>('/strava/status')
      .then((res) => {
        const d = (res.data as any)?.data ?? res.data;
        setConnected(!!d?.connected);
      })
      .catch(() => setConnected(false));
  }, []);

  // In inline mode, auto-load routes as soon as we know the user is connected
  useEffect(() => {
    if (mode === 'inline' && connected === true) {
      loadRoutes();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, connected]);

  async function loadRoutes() {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<unknown>('/strava/routes');
      const list = ((res.data as any)?.data ?? res.data) as StravaRoute[];
      setRoutes(Array.isArray(list) ? list : []);
      setOpen(true);
    } catch {
      setError('Kunne ikke hente ruter fra Strava. Prøv igen.');
    } finally {
      setLoading(false);
    }
  }

  async function handleImport(routeId: string) {
    setImporting(routeId);
    setError(null);
    try {
      await apiClient.post(`/strava/routes/${routeId}/import/${activityId}`);
      if (mode === 'button') setOpen(false);
      onImported();
    } catch {
      setError('Import fejlede. Prøv igen.');
    } finally {
      setImporting(null);
    }
  }

  if (connected === null || !connected) return null;

  // ── Shared route list ──────────────────────────────────────────────────────
  const routeList = (
    <>
      {loading && <p className="text-sm text-gray-500 py-2">Henter ruter fra Strava…</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
      {routes !== null && routes.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-4">
          Ingen cykelruter fundet på din Strava-konto.
        </p>
      )}
      {routes !== null && routes.length > 0 && (
        <ul className="space-y-2 max-h-80 overflow-y-auto pr-0.5">
          {routes.map((r) => (
            <li key={r.id} className="rounded-xl border-2 border-gray-200 bg-white px-4 py-3 space-y-2.5">
              <div className="flex items-start gap-3 min-w-0">
                <span className="text-xl shrink-0 mt-0.5" aria-hidden>🚲</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate mb-1">{r.name}</p>
                  <div className="flex flex-wrap gap-3 text-sm">
                    <span className="font-semibold text-gray-900">{(r.distance / 1000).toFixed(1)} km</span>
                    <span className="text-green-700">↑ {Math.round(r.elevation_gain)} m</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleImport(r.id)}
                disabled={importing !== null}
                className="btn-primary text-sm w-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {importing === r.id ? 'Importerer…' : 'Brug denne'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );

  // ── Inline mode ────────────────────────────────────────────────────────────
  if (mode === 'inline') {
    return (
      <div className="rounded-xl border border-brand-100 bg-brand-50/40 p-4 space-y-3">
        <p className="text-sm font-medium text-gray-700">Vælg en Strava-rute</p>
        {routeList}
        {onClose && (
          <button onClick={onClose} className="btn-secondary text-sm w-full">
            Annuller
          </button>
        )}
      </div>
    );
  }

  // ── Button mode (floating popover) ─────────────────────────────────────────
  return (
    <div className="relative">
      <button
        onClick={loadRoutes}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold text-white"
        style={{ background: '#FC4C02' }}
      >
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor" aria-hidden>
          <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
        </svg>
        {loading ? 'Henter…' : 'Import fra Strava'}
      </button>

      {open && routes && (
        <div className="absolute left-0 sm:left-auto sm:right-0 top-full mt-2 z-50 w-80 sm:w-96 max-w-[calc(100vw-1rem)] rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
              Dine Strava-cykelruter
            </span>
            <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
          </div>
          <div className="p-3 space-y-3">
            {routeList}
          </div>
        </div>
      )}
    </div>
  );
}
