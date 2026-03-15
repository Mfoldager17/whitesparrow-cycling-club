'use client';

import { useState } from 'react';
import RouteUpload from '@/components/activities/RouteUpload';
import StravaRouteImport from '@/components/strava/StravaRouteImport';
import RidewithgpsRouteImport from '@/components/ridewithgps/RidewithgpsRouteImport';
import { RouteCard } from '@/components/routes/RouteCard';
import {
  useRoutesControllerFindAll,
} from '@/api/generated/routes/routes';
import { useActivitiesControllerUpdate } from '@/api/generated/activities/activities';
import type { SavedRouteSummaryDto } from '@/api/generated/models/savedRouteSummaryDto';

interface ActivityRouteStepProps {
  activityId: string;
  onDone: () => void;
}

type Tab = 'saved' | 'gpx';

export function ActivityRouteStep({ activityId, onDone }: ActivityRouteStepProps) {
  const [tab, setTab] = useState<Tab>('saved');
  const [hasRoute, setHasRoute] = useState(false);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [linking, setLinking] = useState(false);

  const { data: routesData } = useRoutesControllerFindAll();
  const { mutateAsync: linkRoute } = useActivitiesControllerUpdate();

  const routes = (
    Array.isArray(routesData) ? routesData : ((routesData as any)?.data ?? [])
  ) as SavedRouteSummaryDto[];

  function handleRouteAdded() {
    setHasRoute(true);
  }

  async function handleLinkSavedRoute() {
    if (!selectedRouteId) return;
    setLinking(true);
    try {
      await linkRoute({ id: activityId, data: { savedRouteId: selectedRouteId as any } });
      setHasRoute(true);
    } finally {
      setLinking(false);
    }
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
        <p className="text-sm font-medium text-gray-700 mb-3">Tilføj rute (valgfrit)</p>

        {/* Tab switcher */}
        <div className="flex rounded-lg border border-gray-200 overflow-hidden mb-4 w-fit">
          <button
            onClick={() => setTab('saved')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              tab === 'saved' ? 'bg-brand-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            🗺️ Gemt rute
          </button>
          <button
            onClick={() => setTab('gpx')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              tab === 'gpx' ? 'bg-brand-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            📁 GPX / Import
          </button>
        </div>

        {tab === 'saved' && (
          <div className="space-y-3">
            {routes.length === 0 ? (
              <div className="text-sm text-gray-500 rounded-xl border border-dashed border-gray-200 px-4 py-8 text-center space-y-1">
                <p className="font-medium text-gray-600">Ingen gemte ruter endnu</p>
                <p>
                  <a href="/routes/new" target="_blank" className="text-brand-600 hover:underline font-medium">
                    Planlæg en rute
                  </a>{' '}
                  og kom tilbage.
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-2 max-h-72 overflow-y-auto pr-0.5">
                  {routes.map((r) => (
                    <RouteCard
                      key={r.id}
                      mode="selectable"
                      route={r}
                      selected={selectedRouteId === r.id}
                      onSelect={() => setSelectedRouteId(r.id === selectedRouteId ? null : r.id)}
                    />
                  ))}
                </div>
                <button
                  onClick={handleLinkSavedRoute}
                  disabled={!selectedRouteId || linking || hasRoute}
                  className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {linking ? 'Tilknytter…' : hasRoute ? '✓ Rute tilknyttet' : 'Tilknyt valgt rute'}
                </button>
              </>
            )}
          </div>
        )}

        {tab === 'gpx' && (
          <div className="flex flex-wrap gap-2">
            <StravaRouteImport activityId={activityId} onImported={handleRouteAdded} />
            <RidewithgpsRouteImport activityId={activityId} onImported={handleRouteAdded} />
            <RouteUpload activityId={activityId} hasRoute={hasRoute} onSuccess={handleRouteAdded} />
          </div>
        )}
      </div>

      <div className="pt-2">
        <button onClick={onDone} className="btn-primary w-full">
          {hasRoute ? 'Færdig' : 'Spring over'}
        </button>
      </div>
    </div>
  );
}

