'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/api/axios-instance';

interface Props {
  /** RWGPS numeric route ID to embed */
  routeId: number;
}

/**
 * Embeds a RideWithGPS route map in an <iframe>.
 *
 * Before rendering the iframe the component calls `GET /ridewithgps/session`,
 * which makes the backend call RWGPS's `/users/current.json` endpoint with the
 * stored Bearer token.  RWGPS responds with `set-cookie` headers that establish
 * a session for the ridewithgps.com domain — so the user is transparently
 * authenticated with RideWithGPS and does not need a separate login.
 */
export default function RidewithgpsIframeEmbed({ routeId }: Props) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    apiClient
      .get('/ridewithgps/session', { signal: controller.signal })
      .then(() => { if (!cancelled) setReady(true); })
      .catch(() => {
        if (!cancelled) {
          // Session call failed (e.g. not connected) — still try to show the
          // public embed so public routes remain visible.
          setReady(true);
          setError(true);
        }
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  if (!ready) {
    return (
      <div className="flex items-center justify-center h-64 rounded-xl bg-gray-50 border border-gray-200">
        <p className="text-sm text-gray-400">Indlæser kort…</p>
      </div>
    );
  }

  const embedUrl =
    `https://ridewithgps.com/embeds?type=route&id=${routeId}&sampleGraph=true&woodGrain=true`;

  return (
    <div className="space-y-1">
      {error && (
        <p className="text-xs text-amber-600">
          RideWithGPS-session kunne ikke etableres – kortet vises som offentlig visning.
        </p>
      )}
      <iframe
        src={embedUrl}
        title={`RideWithGPS rute ${routeId}`}
        className="w-full rounded-xl border border-gray-200"
        style={{ height: 500 }}
        allowFullScreen
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </div>
  );
}
