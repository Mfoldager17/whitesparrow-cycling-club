'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/api/axios-instance';

interface RwgpsStatus {
  connected: boolean;
  userName?: string;
  userAvatar?: string;
}

interface ConnectedService {
  name: string;
  connected: boolean;
}

const SERVICE_ICONS: Record<string, string> = {
  strava: '🟠',
  garmin: '🟦',
  wahoo: '⚫',
  komoot: '🟢',
  apple: '⬛',
  suunto: '🔵',
  polar: '🔴',
  coros: '⚪',
};

function serviceIcon(name: string) {
  return SERVICE_ICONS[name.toLowerCase()] ?? '🔗';
}

function serviceLabel(name: string) {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

export default function RidewithgpsConnect() {
  const [status, setStatus] = useState<RwgpsStatus | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);
  const [connectedServices, setConnectedServices] = useState<ConnectedService[] | null>(null);
  const [loadingServices, setLoadingServices] = useState(false);

  async function fetchStatus() {
    try {
      const res = await apiClient.get<{ data: RwgpsStatus }>('/ridewithgps/status');
      const s = (res.data as any)?.data ?? res.data;
      setStatus(s);
      if (s?.connected) {
        void fetchConnectedServices();
      }
    } catch {
      setStatus({ connected: false });
    }
  }

  async function fetchConnectedServices() {
    setLoadingServices(true);
    try {
      const res = await apiClient.get<{ data: ConnectedService[] }>('/ridewithgps/connected-services');
      setConnectedServices((res.data as any)?.data ?? res.data);
    } catch {
      setConnectedServices([]);
    } finally {
      setLoadingServices(false);
    }
  }

  useEffect(() => {
    void fetchStatus();

    // Handle redirect back from RideWithGPS OAuth
    const params = new URLSearchParams(window.location.search);
    const rwgpsResult = params.get('rwgps');
    if (rwgpsResult) {
      const url = new URL(window.location.href);
      url.searchParams.delete('rwgps');
      window.history.replaceState({}, '', url.toString());
      void fetchStatus();
    }
  }, []);

  async function handleDisconnect() {
    if (!confirm('Er du sikker på, at du vil frakoble RideWithGPS?')) return;
    setDisconnecting(true);
    try {
      await apiClient.delete('/ridewithgps/disconnect');
      setStatus({ connected: false });
      setConnectedServices(null);
    } finally {
      setDisconnecting(false);
    }
  }

  async function handleConnect() {
    try {
      const res = await apiClient.get<{ url: string } | { data: { url: string } }>('/ridewithgps/connect');
      const url = (res.data as any)?.data?.url ?? (res.data as any)?.url;
      if (url) window.location.href = url;
    } catch {
      // ignore
    }
  }

  if (!status) return null;

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2">
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="#FB5A00" aria-hidden>
            <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 3a7 7 0 1 1 0 14A7 7 0 0 1 12 5zm-1 3v5l4 2.5-.75-1.3L13 13V8h-2z" />
          </svg>
          RideWithGPS
        </h2>
        {status.connected && (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">
            ✓ Forbundet
          </span>
        )}
      </div>

      {status.connected ? (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            {status.userAvatar && (
              <img
                src={status.userAvatar}
                alt=""
                className="w-10 h-10 rounded-full object-cover border border-gray-200"
              />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {status.userName}
              </p>
              <p className="text-xs text-gray-500">
                Din RideWithGPS-konto er tilknyttet.
              </p>
            </div>
            <button
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="btn-danger text-xs py-1.5 px-3 shrink-0"
            >
              {disconnecting ? 'Frakobler…' : 'Frakobl'}
            </button>
          </div>

          {/* Connected devices/services */}
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              Forbundne enheder
            </p>
            {loadingServices ? (
              <p className="text-xs text-gray-400">Henter enheder…</p>
            ) : connectedServices && connectedServices.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {connectedServices.map((s) => (
                  <span
                    key={s.name}
                    className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700"
                  >
                    <span aria-hidden>{serviceIcon(s.name)}</span>
                    {serviceLabel(s.name)}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400">Ingen forbundne enheder fundet.</p>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-gray-500">
            Forbind din RideWithGPS-konto for at importere ruter direkte til aktiviteter.
          </p>
          <button
            onClick={handleConnect}
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white"
            style={{ background: '#FB5A00' }}
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor" aria-hidden>
              <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 3a7 7 0 1 1 0 14A7 7 0 0 1 12 5zm-1 3v5l4 2.5-.75-1.3L13 13V8h-2z" />
            </svg>
            Forbind med RideWithGPS
          </button>
        </div>
      )}
    </div>
  );
}
