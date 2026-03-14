'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/api/axios-instance';

interface StravaStatus {
  connected: boolean;
  athleteName?: string;
  athleteAvatar?: string;
}

export default function StravaConnect() {
  const [status, setStatus] = useState<StravaStatus | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);

  async function fetchStatus() {
    try {
      const res = await apiClient.get<{ data: StravaStatus }>('/strava/status');
      setStatus((res.data as any)?.data ?? res.data);
    } catch {
      setStatus({ connected: false });
    }
  }

  useEffect(() => {
    void fetchStatus();

    // Handle redirect back from Strava OAuth
    const params = new URLSearchParams(window.location.search);
    const stravaResult = params.get('strava');
    if (stravaResult) {
      // Remove the query param without reload
      const url = new URL(window.location.href);
      url.searchParams.delete('strava');
      window.history.replaceState({}, '', url.toString());
      void fetchStatus();
    }
  }, []);

  async function handleDisconnect() {
    if (!confirm('Er du sikker på, at du vil frakoble Strava?')) return;
    setDisconnecting(true);
    try {
      await apiClient.delete('/strava/disconnect');
      setStatus({ connected: false });
    } finally {
      setDisconnecting(false);
    }
  }

  async function handleConnect() {
    try {
      const res = await apiClient.get<{ url: string } | { data: { url: string } }>('/strava/connect');
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
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="#FC4C02" aria-hidden>
            <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
          </svg>
          Strava
        </h2>
        {status.connected && (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">
            ✓ Forbundet
          </span>
        )}
      </div>

      {status.connected ? (
        <div className="flex items-center gap-3">
          {status.athleteAvatar && (
            <img
              src={status.athleteAvatar}
              alt=""
              className="w-10 h-10 rounded-full object-cover border border-gray-200"
            />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {status.athleteName}
            </p>
            <p className="text-xs text-gray-500">
              Din Strava-konto er tilknyttet. Tokens fornyes automatisk.
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
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-gray-500">
            Forbind din Strava-konto for at importere ruter direkte fra Strava til aktiviteter.
          </p>
          <button
            onClick={handleConnect}
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white"
            style={{ background: '#FC4C02' }}
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor" aria-hidden>
              <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
            </svg>
            Forbind med Strava
          </button>
        </div>
      )}
    </div>
  );
}
