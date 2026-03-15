'use client';

import dynamic from 'next/dynamic';
import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import ElevationProfile from '@/components/activities/ElevationProfile';
import {
  useRoutesControllerPlan,
  useRoutesControllerCreate,
  getRoutesControllerFindAllQueryKey,
} from '@/api/generated/routes/routes';
import type { PlannedRouteDto } from '@/api/generated/models/plannedRouteDto';
import type { PlanRouteDtoSurface } from '@/api/generated/models/planRouteDtoSurface';
import type { WaypointDto } from '@/api/generated/models/waypointDto';

const RoutePlannerMap = dynamic(() => import('@/components/routes/RoutePlannerMap'), { ssr: false });

const SURFACE_DESCRIPTIONS: Record<RouteSurface, string> = {
  auto: 'Automatisk — ORS finder den bedste cykelrute',
  paved: 'Asfalt — foretrækker befæstede veje og cykelstier',
  unpaved: 'Grus — foretrækker grus og ubefæstede stier',
};

export default function NewRoutePage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [surface, setSurface] = useState<PlanRouteDtoSurface>('auto');
  const [waypoints, setWaypoints] = useState<WaypointDto[]>([]);
  const [plannedRoute, setPlannedRoute] = useState<PlannedRouteDto | null>(null);
  const [planError, setPlanError] = useState<string | null>(null);
  const [hoveredDistKm, setHoveredDistKm] = useState<number | null>(null);

  const planDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { mutateAsync: planRoute, isPending: isPlanning } = useRoutesControllerPlan();
  const { mutateAsync: createRoute, isPending: isSaving } = useRoutesControllerCreate();

  // ── Auto-plan whenever waypoints or surface changes (debounced) ──
  const triggerPlan = useCallback(
    (wps: WaypointDto[], suf: PlanRouteDtoSurface) => {
      if (planDebounceRef.current) clearTimeout(planDebounceRef.current);
      if (wps.length < 2) {
        setPlannedRoute(null);
        setPlanError(null);
        return;
      }
      planDebounceRef.current = setTimeout(async () => {
        setPlanError(null);
        try {
          const result = await planRoute({ data: { waypoints: wps, surface: suf } });
          setPlannedRoute(result);
        } catch (err: unknown) {
          const msg =
            (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
            'Ruteplanlægning fejlede. Tjek at ORS_API_KEY er konfigureret.';
          setPlanError(msg);
          setPlannedRoute(null);
        }
      }, 600);
    },
    [planRoute],
  );

  const handleWaypointsChange = useCallback(
    (wps: WaypointDto[]) => {
      setWaypoints(wps);
      triggerPlan(wps, surface);
    },
    [surface, triggerPlan],
  );

  const handleSurfaceChange = useCallback(
    (s: PlanRouteDtoSurface) => {
      setSurface(s);
      triggerPlan(waypoints, s);
    },
    [waypoints, triggerPlan],
  );

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (planDebounceRef.current) clearTimeout(planDebounceRef.current);
    };
  }, []);

  async function handleSave() {
    if (!plannedRoute || !name.trim() || waypoints.length < 2) return;
    await createRoute({
      data: {
        name: name.trim(),
        description: description.trim() || undefined,
        surface,
        waypoints,
      },
    });
    await queryClient.invalidateQueries({ queryKey: getRoutesControllerFindAllQueryKey() });
    router.push('/routes');
  }

  const canSave = !!plannedRoute && name.trim().length >= 2 && !isSaving && !isPlanning;

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 sm:px-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
          <a href="/routes" className="hover:text-brand-600 transition-colors">Ruter</a>
          <span>/</span>
          <span>Ny rute</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Planlæg rute</h1>
        <p className="text-sm text-gray-500 mt-1">
          Klik på kortet for at tilføje waypoints — ruten beregnes automatisk kun via cykelvenlige veje.
        </p>
      </div>

      <div className="space-y-6">
        {/* Route name + description */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-900">Ruteoplysninger</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Navn *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="F.eks. Søndagstur til Dyrehaven"
              className="input w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Beskrivelse</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Valgfri beskrivelse af ruten…"
              rows={2}
              className="input w-full resize-none"
            />
          </div>
        </div>

        {/* Map + surface selector */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Ruteplanlægning</h2>
            <span className="text-xs text-gray-500">{SURFACE_DESCRIPTIONS[surface]}</span>
          </div>

          <RoutePlannerMap
            surface={surface}
            onSurfaceChange={handleSurfaceChange}
            onWaypointsChange={handleWaypointsChange}
            plannedRoute={plannedRoute}
            isPlanning={isPlanning}
          />
        </div>

        {/* Error */}
        {planError && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
            <strong>Fejl:</strong> {planError}
          </div>
        )}

        {/* Elevation profile + stats */}
        {plannedRoute && plannedRoute.trackPoints.length > 1 && (
          <div className="card">
            <h2 className="font-semibold text-gray-900 mb-4">Højdeprofil</h2>
            <ElevationProfile
              trackPoints={plannedRoute.trackPoints}
              elevationGainM={plannedRoute.elevationGainM}
              elevationLossM={plannedRoute.elevationLossM}
              maxElevationM={plannedRoute.maxElevationM}
              minElevationM={plannedRoute.minElevationM}
              hoveredDistKm={hoveredDistKm}
              onHoverDistKm={setHoveredDistKm}
            />
          </div>
        )}

        {/* Save button */}
        <div className="flex items-center justify-between gap-4 pt-2">
          <a href="/routes" className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
            ← Tilbage til ruter
          </a>
          <div className="flex items-center gap-3">
            {waypoints.length < 2 && (
              <p className="text-xs text-gray-400">Tilføj mindst 2 waypoints for at gemme</p>
            )}
            {waypoints.length >= 2 && !plannedRoute && !isPlanning && !planError && (
              <p className="text-xs text-gray-400">Beregner rute…</p>
            )}
            <button
              onClick={handleSave}
              disabled={!canSave}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Gemmer…' : 'Gem rute'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
