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
}

export default function StravaRouteImport({ activityId, onImported }: Props) {
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
      setOpen(false);
      onImported();
    } catch {
      setError('Import fejlede. Prøv igen.');
    } finally {
      setImporting(null);
    }
  }

  if (connected === null || !connected) return null;

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
        <div className="absolute right-0 top-full mt-2 z-50 w-96 rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
              Dine Strava-cykelruter
            </span>
            <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
          </div>

          {error && <p className="px-4 py-2 text-xs text-red-600">{error}</p>}

          {routes.length === 0 ? (
            <p className="px-4 py-6 text-sm text-gray-400 text-center">
              Ingen cykelruter fundet på din Strava-konto.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100 max-h-72 overflow-y-auto">
              {routes.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{r.name}</p>
                    <p className="text-xs text-gray-500">
                      {(r.distance / 1000).toFixed(1)} km &middot; ↑{Math.round(r.elevation_gain)} m
                    </p>
                  </div>
                  <button
                    onClick={() => handleImport(r.id)}
                    disabled={importing !== null}
                    className="btn-primary text-xs py-1 px-3 shrink-0"
                  >
                    {importing === r.id ? 'Importerer…' : 'Brug denne'}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
