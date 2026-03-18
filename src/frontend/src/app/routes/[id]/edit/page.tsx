'use client';

import dynamic from 'next/dynamic';
import { useState, useCallback, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { PageSpinner } from '@/components/ui/Spinner';
import ElevationProfile from '@/components/activities/ElevationProfile';
import {
  useRoutesControllerFindOne,
  useRoutesControllerUpdate,
  useRoutesControllerPlan,
  getRoutesControllerFindAllQueryKey,
  getRoutesControllerFindOneQueryKey,
} from '@/api/generated/routes/routes';
import { useAuth } from '@/contexts/AuthContext';
import type { PlannedRouteDto } from '@/api/generated/models/plannedRouteDto';
import type { PlanRouteDtoSurface } from '@/api/generated/models/planRouteDtoSurface';
import type { WaypointDto } from '@/api/generated/models/waypointDto';

const RoutePlannerMap = dynamic(() => import('@/components/routes/RoutePlannerMap'), { ssr: false });

export default function EditRoutePage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: routeData, isLoading } = useRoutesControllerFindOne(id);
  const { mutateAsync: updateRoute, isPending: isSaving } = useRoutesControllerUpdate();
  const { mutateAsync: planRoute, isPending: isPlanning } = useRoutesControllerPlan();

  const [initialized, setInitialized] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [surface, setSurface] = useState<PlanRouteDtoSurface>('auto');
  const [waypoints, setWaypoints] = useState<WaypointDto[]>([]);
  const [plannedRoute, setPlannedRoute] = useState<PlannedRouteDto | null>(null);
  const [planError, setPlanError] = useState<string | null>(null);
  const [hoveredDistKm, setHoveredDistKm] = useState<number | null>(null);

  const planDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const route = Array.isArray(routeData)
    ? routeData[0]
    : ((routeData as any)?.data ?? routeData);

  // Initialise form from loaded route (once)
  useEffect(() => {
    if (!route || initialized) return;
    setName(route.name ?? '');
    setDescription(route.description ?? '');
    setSurface((route.surface as PlanRouteDtoSurface) ?? 'auto');
    const wps = (route.waypoints ?? []) as WaypointDto[];
    setWaypoints(wps);
    // Show existing track as planned route immediately
    if (route.trackPoints?.length > 1) {
      setPlannedRoute({
        trackPoints: route.trackPoints,
        waypoints: wps,
        surface: route.surface as PlanRouteDtoSurface,
        totalDistanceKm: route.totalDistanceKm,
        elevationGainM: route.elevationGainM,
        elevationLossM: route.elevationLossM,
        maxElevationM: route.maxElevationM,
        minElevationM: route.minElevationM,
        boundingBox: route.boundingBox,
      } as PlannedRouteDto);
    }
    setInitialized(true);
  }, [route, initialized]);

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
          setPlannedRoute(result as PlannedRouteDto);
        } catch (err: unknown) {
          const msg =
            (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
            'Ruteplanlægning fejlede.';
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

  useEffect(() => {
    return () => {
      if (planDebounceRef.current) clearTimeout(planDebounceRef.current);
    };
  }, []);

  async function handleSave() {
    if (!name.trim() || waypoints.length < 2) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await updateRoute({ id, data: { name: name.trim(), description: description.trim() || undefined, surface, waypoints } as any });
    await queryClient.invalidateQueries({ queryKey: getRoutesControllerFindOneQueryKey(id) });
    await queryClient.invalidateQueries({ queryKey: getRoutesControllerFindAllQueryKey() });
    router.push(`/routes/${id}`);
  }

  if (isLoading || !initialized) return <PageSpinner />;
  if (!route) return <p className="p-8 text-center text-gray-500">Rute ikke fundet.</p>;

  const isOwner = user?.userId === route.createdBy;
  if (!isOwner) {
    return <p className="p-8 text-center text-gray-500">Du har ikke adgang til at redigere denne rute.</p>;
  }

  const canSave = name.trim().length >= 2 && waypoints.length >= 2 && !isSaving && !isPlanning;

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 sm:px-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <a href="/routes" className="hover:text-brand-600 transition-colors">Ruter</a>
        <span>/</span>
        <a href={`/routes/${id}`} className="hover:text-brand-600 transition-colors truncate max-w-[160px]">{route.name}</a>
        <span>/</span>
        <span>Rediger</span>
      </div>

      <h1 className="text-3xl font-bold text-gray-900 mb-6">Rediger rute</h1>

      <div className="space-y-6">
        {/* Name + description */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-900">Ruteoplysninger</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Navn *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Beskrivelse</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="input w-full resize-none"
            />
          </div>
        </div>

        {/* Map */}
        <div className="card">
          <div className="mb-4">
            <h2 className="font-semibold text-gray-900">Waypoints</h2>
            <p className="text-xs text-gray-500 mt-0.5">Træk markørerne for at flytte dem, klik på kortet for at tilføje nye.</p>
          </div>
          <RoutePlannerMap
            initialWaypoints={waypoints}
            surface={surface}
            onSurfaceChange={handleSurfaceChange}
            onWaypointsChange={handleWaypointsChange}
            plannedRoute={plannedRoute}
            isPlanning={isPlanning}
          />
        </div>

        {planError && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
            <strong>Fejl:</strong> {planError}
          </div>
        )}

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

        <div className="flex items-center justify-between gap-4 pt-2">
          <a href={`/routes/${id}`} className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
            ← Annuller
          </a>
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Gemmer…' : isPlanning ? 'Beregner rute…' : 'Gem ændringer'}
          </button>
        </div>
      </div>
    </div>
  );
}
