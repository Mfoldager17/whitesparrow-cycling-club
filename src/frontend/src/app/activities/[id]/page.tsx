'use client';

import dynamic from 'next/dynamic';
import { useState, useRef, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { format } from 'date-fns';
import { da } from 'date-fns/locale';
import { useQueryClient } from '@tanstack/react-query';
import { ActivityTypeBadge, DifficultyBadge, RegistrationStatusBadge } from '@/components/ui/Badge';
import { PageSpinner } from '@/components/ui/Spinner';
import { CommentList } from '@/components/comments/CommentList';
import { CommentForm } from '@/components/comments/CommentForm';
import { useAuth } from '@/contexts/AuthContext';
import ElevationProfile from '@/components/activities/ElevationProfile';
import RouteUpload from '@/components/activities/RouteUpload';
import StravaRouteImport from '@/components/strava/StravaRouteImport';
import RidewithgpsRouteImport from '@/components/ridewithgps/RidewithgpsRouteImport';
import { RouteCard } from '@/components/routes/RouteCard';
import {
  useRoutesControllerFindAll,
} from '@/api/generated/routes/routes';

const RouteMap = dynamic(() => import('@/components/activities/RouteMap'), { ssr: false });
import {
  useActivitiesControllerFindOne,
  useActivitiesControllerDelete,
  useActivitiesControllerUpdate,
} from '@/api/generated/activities/activities';
import type { SavedRouteSummaryDto } from '@/api/generated/models/savedRouteSummaryDto';
import {
  useCommentsControllerGetForActivity,
  useCommentsControllerCreate,
  useCommentsControllerRemove,
} from '@/api/generated/comments/comments';
import {
  useRegistrationsControllerGetForActivity,
  useRegistrationsControllerRegister,
  useRegistrationsControllerCancel,
  getMyRegistrationsControllerGetMyRegistrationsQueryKey,
} from '@/api/generated/registrations/registrations';

export default function ActivityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [hoveredDistKm, setHoveredDistKm] = useState<number | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [routePanel, setRoutePanel] = useState<null | 'saved' | 'strava' | 'rwgps' | 'gpx'>(null);
  const [pickedRouteId, setPickedRouteId] = useState<string | null>(null);
  const [linkingRoute, setLinkingRoute] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!dropdownOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen]);

const { data: activityData, isLoading, refetch: refetchActivity } = useActivitiesControllerFindOne(id);
  const { data: commentsData, refetch: refetchComments } = useCommentsControllerGetForActivity(id);
  const { data: registrationsData, refetch: refetchRegs } = useRegistrationsControllerGetForActivity(id);
  
  const { mutateAsync: register, isPending: registering } =
    useRegistrationsControllerRegister();
  const { mutateAsync: cancelReg, isPending: cancelling } =
    useRegistrationsControllerCancel();
  const { mutateAsync: postComment, isPending: commenting } =
    useCommentsControllerCreate();
  const { mutateAsync: deleteComment } = useCommentsControllerRemove();
  const { mutateAsync: deleteActivity, isPending: deleting } = useActivitiesControllerDelete();
  const { data: savedRoutesData } = useRoutesControllerFindAll();
  const { mutateAsync: linkSavedRoute } = useActivitiesControllerUpdate();

  const savedRoutesList = (
    Array.isArray(savedRoutesData) ? savedRoutesData : ((savedRoutesData as any)?.data ?? [])
  ) as SavedRouteSummaryDto[];

  async function handleLinkSavedRoute() {
    if (!pickedRouteId) return;
    setLinkingRoute(true);
    try {
      await linkSavedRoute({ id, data: { savedRouteId: pickedRouteId } });
      setRoutePanel(null);
      setPickedRouteId(null);
      setDropdownOpen(false);
      await refetchActivity();
    } finally {
      setLinkingRoute(false);
    }
  }

  async function handleUnlinkSavedRoute() {
    await linkSavedRoute({ id, data: { savedRouteId: null } });
    await refetchActivity();
  }

  if (isLoading) return <PageSpinner />;

  const activity = Array.isArray(activityData) ? activityData[0] : ((activityData as any)?.data ?? activityData);
  if (!activity) return <p className="p-8 text-center text-gray-500">Aktivitet ikke fundet.</p>;

  const comments = (Array.isArray(commentsData) ? commentsData : ((commentsData as any)?.data ?? [])) as NonNullable<typeof commentsData>;
  const registrations = (Array.isArray(registrationsData) ? registrationsData : ((registrationsData as any)?.data ?? [])) as NonNullable<typeof registrationsData>;
  const myReg = registrations.find((r) => r.userId === user?.userId);

  async function handleRegister() {
    await register({ activityId: id, data: {} });
    await queryClient.invalidateQueries({ queryKey: getMyRegistrationsControllerGetMyRegistrationsQueryKey() });
    await refetchRegs();
    await refetchActivity();
  }

  async function handleCancel() {
    await cancelReg({ activityId: id });
    await queryClient.invalidateQueries({ queryKey: getMyRegistrationsControllerGetMyRegistrationsQueryKey() });
    await refetchRegs();
    await refetchActivity();
  }

  async function handleDeleteActivity() {
    if (!confirm('Er du sikker på, at du vil slette denne aktivitet?')) return;
    await deleteActivity({ id });
    await queryClient.invalidateQueries({ queryKey: getMyRegistrationsControllerGetMyRegistrationsQueryKey() });
    router.push('/activities');
  }

  async function handleComment(body: string) {
    await postComment({ activityId: id, data: { body } });
    await refetchComments();
  }

  async function handleDeleteComment(commentId: string) {
    await deleteComment({ activityId: id, id: commentId });
    await refetchComments();
  }

  const spotsLeft =
    activity.maxParticipants !== null && activity.maxParticipants !== undefined
      ? activity.maxParticipants - activity.registeredCount
      : null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 sm:px-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-wrap gap-2 mb-3">
          <ActivityTypeBadge type={activity.type} />
          {activity.difficulty && <DifficultyBadge difficulty={activity.difficulty} />}
          {activity.isCancelled && (
            <span className="badge bg-red-100 text-red-700">Aflyst</span>
          )}
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{activity.title}</h1>
        {activity.description && (
          <p className="text-gray-600 whitespace-pre-wrap">{activity.description}</p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Details column */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card space-y-3">
            <h2 className="font-semibold text-gray-900">Detaljer</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex gap-2">
                <dt className="text-gray-500 w-24 shrink-0">Start</dt>
                <dd className="text-gray-900">
                  {format(new Date(activity.startsAt), "EEEE 'd.' d. MMMM yyyy 'kl.' HH:mm", {
                    locale: da,
                  })}
                </dd>
              </div>
              {activity.endsAt && (
                <div className="flex gap-2">
                  <dt className="text-gray-500 w-24 shrink-0">Slut</dt>
                  <dd className="text-gray-900">
                    {format(new Date(activity.endsAt), "HH:mm", { locale: da })}
                  </dd>
                </div>
              )}
              {activity.startLocation && (
                <div className="flex gap-2">
                  <dt className="text-gray-500 w-24 shrink-0">Mødested</dt>
                  <dd className="text-gray-900">{activity.startLocation}</dd>
                </div>
              )}
              {activity.approxKm && (
                <div className="flex gap-2">
                  <dt className="text-gray-500 w-24 shrink-0">Afstand</dt>
                  <dd className="text-gray-900">{activity.approxKm} km</dd>
                </div>
              )}
              {activity.routeUrl && (
                <div className="flex gap-2">
                  <dt className="text-gray-500 w-24 shrink-0">Rute</dt>
                  <dd>
                    <a
                      href={activity.routeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-600 hover:underline"
                    >
                      Se rute →
                    </a>
                  </dd>
                </div>
              )}
              <div className="flex gap-2">
                <dt className="text-gray-500 w-24 shrink-0">Arrangør</dt>
                <dd className="text-gray-900">{activity.organizerName}</dd>
              </div>
            </dl>
          </div>

          {/* Comments */}
          <div className="card">
            <h2 className="font-semibold text-gray-900 mb-4">
              Kommentarer ({comments.length})
            </h2>
            <CommentList
              comments={comments.map((c) => ({
                ...c,
                authorAvatarUrl: (c.authorAvatarUrl as any) as string | null,
              }))}
              currentUserId={user?.userId}
              isAdmin={isAdmin}
              onDelete={handleDeleteComment}
            />
            {user && (
              <div className="mt-6 pt-6 border-t border-gray-100">
                <CommentForm onSubmit={handleComment} isLoading={commenting} />
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Registration card */}
          <div className="card">
            <h2 className="font-semibold text-gray-900 mb-3">Tilmeldinger</h2>
            <div className="flex flex-col gap-1 text-sm mb-4">
              <span className="inline-flex items-center gap-1.5 text-green-700 font-medium">
                <span>✅</span>
                <span>
                  {activity.registeredCount} tilmeldt
                  {activity.maxParticipants ? ` / ${activity.maxParticipants}` : ''}
                </span>
              </span>
              {activity.waitlistCount > 0 && (
                <span className="inline-flex items-center gap-1.5 text-yellow-700">
                  <span>⏳</span>
                  <span>{activity.waitlistCount} på venteliste</span>
                </span>
              )}
              {spotsLeft !== null && spotsLeft > 0 && (
                <span className="text-gray-500">{spotsLeft} pladser tilbage</span>
              )}
              {spotsLeft === 0 && (
                <span className="text-red-600 font-medium">Fuldt belægt — venteliste aktiv</span>
              )}
            </div>

            {user && !activity.isCancelled && (
              <>
                {myReg && myReg.status !== 'cancelled' ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">Din status:</span>
                      <RegistrationStatusBadge status={myReg.status} />
                    </div>
                    <button
                      onClick={handleCancel}
                      disabled={cancelling}
                      className="btn-danger w-full text-sm"
                    >
                      {cancelling ? 'Afmelder…' : 'Afmeld mig'}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleRegister}
                    disabled={registering}
                    className="btn-primary w-full"
                  >
                    {registering
                      ? 'Tilmelder…'
                      : spotsLeft === 0
                      ? 'Skriv på venteliste'
                      : 'Tilmeld mig'}
                  </button>
                )}
              </>
            )}

            {activity.isCancelled && activity.cancellationReason && (
              <div className="mt-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                <strong>Aflysningsårsag:</strong> {activity.cancellationReason}
              </div>
            )}
          </div>

          {/* Participant list */}
          {registrations.length > 0 && (
            <div className="card">
              <h2 className="font-semibold text-gray-900 mb-3 text-sm">Deltagerliste</h2>
              <ul className="space-y-2.5">
                {registrations
                  .filter((r) => r.status !== 'cancelled')
                  .map((r) => (
                    <li key={r.id} className="flex items-center justify-between gap-3 text-sm">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 font-medium text-gray-800 min-w-0">
                          <span className="shrink-0">{r.status === 'waitlisted' ? '⏳' : '✅'}</span>
                          <span className="truncate">{r.userName ?? r.userId.slice(0, 8) + '…'}</span>
                        </div>
                        {r.userEmail && (
                          <p className="text-xs text-gray-400 truncate">{r.userEmail}</p>
                        )}
                      </div>
                      <RegistrationStatusBadge status={r.status} />
                    </li>
                  ))}
              </ul>
            </div>
          )}

          {/* Delete — only for creator */}
          {user && activity.createdBy === user.userId && (() => {
            const othersJoined = registrations.filter(
              (r) => r.userId !== user.userId && r.status !== 'cancelled',
            ).length > 0;
            return (
              <div className={`card ${othersJoined ? 'border-gray-200 bg-gray-50' : 'border-red-100 bg-red-50/40'}`}>
                <h3 className={`text-sm font-semibold mb-2 ${othersJoined ? 'text-gray-500' : 'text-red-700'}`}>
                  Farezone
                </h3>
                {othersJoined ? (
                  <p className="text-xs text-gray-400">
                    Aktiviteten kan ikke slettes, da andre deltagere er tilmeldt.
                  </p>
                ) : (
                  <>
                    <p className="text-xs text-gray-500 mb-3">
                      Du kan slette aktiviteten så længe ingen andre er tilmeldt.
                    </p>
                    <button
                      onClick={handleDeleteActivity}
                      disabled={deleting}
                      className="btn-danger w-full text-sm"
                    >
                      {deleting ? 'Sletter…' : 'Slet aktivitet'}
                    </button>
                  </>
                )}
              </div>
            );
          })()}
        </div>
      </div>

      {/* Route / GPX — full width */}
      {(() => {
        const routeData = (activity as any).routeData as {
          id: string;
          totalDistanceKm: number;
          elevationGainM: number;
          elevationLossM: number;
          maxElevationM: number;
          minElevationM: number;
          trackPoints: { lat: number; lng: number; ele: number; distanceKm: number }[];
          boundingBox: { minLat: number; maxLat: number; minLng: number; maxLng: number };
        } | null;

        const savedRoute = (activity as any).savedRoute as {
          id: string;
          name: string;
          surface: string;
          totalDistanceKm: number;
          elevationGainM: number;
          elevationLossM: number;
          maxElevationM: number;
          minElevationM: number;
          trackPoints: { lat: number; lng: number; ele: number; distanceKm: number }[];
          boundingBox: { minLat: number; maxLat: number; minLng: number; maxLng: number };
        } | null;

        // Use GPX route data if available, otherwise fall back to the linked saved route
        const displayRoute = routeData ?? (savedRoute?.trackPoints?.length ? savedRoute : null);

        const canManageRoute =
          user && (activity.createdBy === user.userId || isAdmin);

        return (
          <div className="card space-y-4 mt-8">
            {/* Header */}
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <h2 className="font-semibold text-gray-900">Rute</h2>
                {savedRoute && !routeData && (
                  <a
                    href={`/routes/${savedRoute.id}`}
                    className="inline-flex items-center gap-1 mt-0.5 text-xs text-brand-600 hover:underline"
                  >
                    🗺️ {savedRoute.name}
                  </a>
                )}
              </div>

              {canManageRoute && (
                <div className="relative shrink-0" ref={dropdownRef}>
                  <button
                    onClick={() => setDropdownOpen((v) => !v)}
                    className="btn-secondary text-sm inline-flex items-center gap-1.5"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                    </svg>
                    Administrer
                    <svg className={`w-3.5 h-3.5 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {dropdownOpen && (
                    <div className="absolute right-0 top-full mt-1.5 w-56 rounded-xl border border-gray-200 bg-white shadow-lg z-20 py-1 overflow-hidden">
                      <button
                        onClick={() => {
                          setRoutePanel((v) => v === 'saved' ? null : 'saved');
                          setDropdownOpen(false);
                        }}
                        className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <span className="text-base">🗺️</span>
                        {savedRoute && !routeData ? 'Skift gemt rute' : 'Tilknyt gemt rute'}
                      </button>

                      <button
                        onClick={() => {
                          setRoutePanel((v) => v === 'strava' ? null : 'strava');
                          setDropdownOpen(false);
                        }}
                        className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" fill="#FC4C02" aria-hidden>
                          <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
                        </svg>
                        Import fra Strava
                      </button>

                      <button
                        onClick={() => {
                          setRoutePanel((v) => v === 'rwgps' ? null : 'rwgps');
                          setDropdownOpen(false);
                        }}
                        className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" fill="#FB5A00" aria-hidden>
                          <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 3a7 7 0 1 1 0 14A7 7 0 0 1 12 5zm-1 3v5l4 2.5-.75-1.3L13 13V8h-2z" />
                        </svg>
                        Import fra RideWithGPS
                      </button>

                      <div className="border-t border-gray-100 my-0.5" />

                      <button
                        onClick={() => {
                          setRoutePanel((v) => v === 'gpx' ? null : 'gpx');
                          setDropdownOpen(false);
                        }}
                        className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        {routeData ? 'Udskift GPX-rute' : 'Upload GPX-rute'}
                      </button>

                      {savedRoute && !routeData && (
                        <>
                          <div className="border-t border-gray-100 my-0.5" />
                          <button
                            onClick={() => { handleUnlinkSavedRoute(); setDropdownOpen(false); }}
                            className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <span className="text-base">🗑️</span>
                            Fjern tilknyttet rute
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Route panels — rendered inline below the header */}
            {canManageRoute && routePanel === 'saved' && (
              <div className="rounded-xl border border-brand-100 bg-brand-50/40 p-4 space-y-3">
                <p className="text-sm font-medium text-gray-700">Vælg en gemt rute</p>
                {savedRoutesList.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    Ingen gemte ruter.{' '}
                    <a href="/routes/new" target="_blank" className="text-brand-600 hover:underline font-medium">
                      Planlæg en rute →
                    </a>
                  </p>
                ) : (
                  <>
                    <div className="space-y-2 max-h-72 overflow-y-auto pr-0.5">
                      {savedRoutesList.map((r) => (
                        <RouteCard
                          key={r.id}
                          mode="selectable"
                          route={r}
                          selected={pickedRouteId === r.id}
                          onSelect={() => setPickedRouteId(r.id === pickedRouteId ? null : r.id)}
                        />
                      ))}
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={handleLinkSavedRoute}
                        disabled={!pickedRouteId || linkingRoute}
                        className="btn-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {linkingRoute ? 'Tilknytter…' : 'Tilknyt'}
                      </button>
                      <button
                        onClick={() => { setRoutePanel(null); setPickedRouteId(null); }}
                        className="btn-secondary text-sm"
                      >
                        Annuller
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {canManageRoute && routePanel === 'strava' && (
              <StravaRouteImport
                mode="inline"
                activityId={id}
                onImported={() => { setRoutePanel(null); refetchActivity(); }}
                onClose={() => setRoutePanel(null)}
              />
            )}

            {canManageRoute && routePanel === 'rwgps' && (
              <RidewithgpsRouteImport
                mode="inline"
                activityId={id}
                onImported={() => { setRoutePanel(null); refetchActivity(); }}
                onClose={() => setRoutePanel(null)}
              />
            )}

            {canManageRoute && routePanel === 'gpx' && (
              <RouteUpload
                mode="inline"
                activityId={id}
                hasRoute={!!routeData}
                onSuccess={() => { setRoutePanel(null); refetchActivity(); }}
                onClose={() => setRoutePanel(null)}
              />
            )}

            {displayRoute ? (
              <div className="space-y-4">
                {/* Stats row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="rounded-lg bg-gray-50 px-3 py-2">
                    <p className="text-xs text-gray-500 mb-0.5">Distance</p>
                    <p className="text-lg font-bold text-gray-900">
                      {displayRoute.totalDistanceKm} km
                    </p>
                  </div>
                  <div className="rounded-lg bg-gray-50 px-3 py-2">
                    <p className="text-xs text-gray-500 mb-0.5">Stigning</p>
                    <p className="text-lg font-bold text-green-700">
                      ↑ {displayRoute.elevationGainM} m
                    </p>
                  </div>
                  <div className="rounded-lg bg-gray-50 px-3 py-2">
                    <p className="text-xs text-gray-500 mb-0.5">Fald</p>
                    <p className="text-lg font-bold text-red-600">
                      ↓ {displayRoute.elevationLossM} m
                    </p>
                  </div>
                  <div className="rounded-lg bg-gray-50 px-3 py-2">
                    <p className="text-xs text-gray-500 mb-0.5">Maks. højde</p>
                    <p className="text-lg font-bold text-gray-900">
                      {displayRoute.maxElevationM} m
                    </p>
                  </div>
                </div>

                {/* Map */}
                <RouteMap
                  trackPoints={displayRoute.trackPoints}
                  boundingBox={displayRoute.boundingBox}
                  onHoverDistKm={setHoveredDistKm}
                  hoveredDistKm={hoveredDistKm}
                />

                {/* Elevation chart */}
                <ElevationProfile
                  trackPoints={displayRoute.trackPoints}
                  elevationGainM={displayRoute.elevationGainM}
                  elevationLossM={displayRoute.elevationLossM}
                  maxElevationM={displayRoute.maxElevationM}
                  minElevationM={displayRoute.minElevationM}
                  hoveredDistKm={hoveredDistKm}
                  onHoverDistKm={(km) => setHoveredDistKm(km)}
                />

                {/* GPX download (only available for GPX-uploaded routes) */}
                {routeData && (
                  <button
                    onClick={async () => {
                      try {
                        const token = localStorage.getItem('accessToken');
                        const res = await fetch(
                          `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}/activities/${id}/route/download-url`,
                          { headers: token ? { Authorization: `Bearer ${token}` } : {} },
                        );
                        if (!res.ok) return;
                        const json = await res.json() as { data?: { url: string }; url?: string };
                        const url = json.data?.url ?? json.url;
                        if (url) window.open(url, '_blank');
                      } catch {
                        // ignore
                      }
                    }}
                    className="inline-flex items-center gap-1.5 text-sm text-brand-600 hover:underline"
                  >
                    ⬇ Download GPX-fil
                  </button>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-400">
                {canManageRoute
                  ? 'Upload en GPX-fil eller tilknyt en gemt rute.'
                  : 'Ingen rute tilknyttet denne aktivitet.'}
              </p>
            )}
          </div>
        );
      })()}
    </div>
  );
}
