'use client';

import { useState } from 'react';
import RouteUpload from '@/components/activities/RouteUpload';
import StravaRouteImport from '@/components/strava/StravaRouteImport';
import RidewithgpsRouteImport from '@/components/ridewithgps/RidewithgpsRouteImport';

interface ActivityRouteStepProps {
  activityId: string;
  onDone: () => void;
}

export function ActivityRouteStep({ activityId, onDone }: ActivityRouteStepProps) {
  const [hasRoute, setHasRoute] = useState(false);

  function handleRouteAdded() {
    setHasRoute(true);
  }

  return (
    <div className="space-y-5">
      <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 flex items-center gap-3">
        <svg className="w-5 h-5 text-green-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        <p className="text-sm text-green-800 font-medium">Aktivitet oprettet!</p>
      </div>

      <div>
        <p className="text-sm font-medium text-gray-700 mb-3">Tilføj en GPX-rute (valgfrit)</p>
        <div className="flex flex-wrap gap-2">
          <StravaRouteImport activityId={activityId} onImported={handleRouteAdded} />
          <RidewithgpsRouteImport activityId={activityId} onImported={handleRouteAdded} />
          <RouteUpload activityId={activityId} hasRoute={hasRoute} onSuccess={handleRouteAdded} />
        </div>
      </div>

      <div className="pt-2">
        <button onClick={onDone} className="btn-primary w-full">
          {hasRoute ? 'Færdig' : 'Spring over'}
        </button>
      </div>
    </div>
  );
}
