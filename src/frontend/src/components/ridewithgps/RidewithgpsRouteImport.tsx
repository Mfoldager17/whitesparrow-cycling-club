'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/api/axios-instance';

interface RwgpsRoute {
  id: number;
  name: string;
  distance: number;       // meters
  elevation_gain: number; // meters
}

interface Props {
  activityId: string;
  onImported: () => void;
}

export default function RidewithgpsRouteImport({ activityId, onImported }: Props) {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [routes, setRoutes] = useState<RwgpsRoute[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    apiClient
      .get<{ data?: { connected: boolean }; connected?: boolean }>('/ridewithgps/status')
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
      const res = await apiClient.get<unknown>('/ridewithgps/routes');
      const list = ((res.data as any)?.data ?? res.data) as RwgpsRoute[];
      setRoutes(Array.isArray(list) ? list : []);
      setOpen(true);
    } catch {
      setError('Kunne ikke hente ruter fra RideWithGPS. Prøv igen.');
    } finally {
      setLoading(false);
    }
  }

  async function handleImport(routeId: number) {
    setImporting(routeId);
    setError(null);
    try {
      await apiClient.post(`/ridewithgps/routes/${routeId}/import/${activityId}`);
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
        style={{ background: '#FB5A00' }}
      >
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor" aria-hidden={true}>
          <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 3a7 7 0 1 1 0 14A7 7 0 0 1 12 5zm-1 3v5l4 2.5-.75-1.3L13 13V8h-2z" />
        </svg>
        {loading ? 'Henter…' : 'Import fra RideWithGPS'}
      </button>

      {open && routes && (
        <div className="absolute left-0 sm:left-auto sm:right-0 top-full mt-2 z-50 w-80 sm:w-96 max-w-[calc(100vw-1rem)] rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
              Dine RideWithGPS-ruter
            </span>
            <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
          </div>

          {error && <p className="px-4 py-2 text-xs text-red-600">{error}</p>}

          {routes.length === 0 ? (
            <p className="px-4 py-6 text-sm text-gray-400 text-center">
              Ingen ruter fundet på din RideWithGPS-konto.
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
