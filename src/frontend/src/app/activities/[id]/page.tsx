'use client';

import dynamic from 'next/dynamic';
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

const RouteMap = dynamic(() => import('@/components/activities/RouteMap'), { ssr: false });
import {
  useActivitiesControllerFindOne,
  useActivitiesControllerDelete,
} from '@/api/generated/activities/activities';
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
              <span className="text-green-700 font-medium">
                ✅ {activity.registeredCount} tilmeldt
                {activity.maxParticipants ? ` / ${activity.maxParticipants}` : ''}
              </span>
              {activity.waitlistCount > 0 && (
                <span className="text-yellow-700">
                  ⏳ {activity.waitlistCount} på venteliste
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
                        <p className="font-medium text-gray-800 truncate">
                          {r.status === 'waitlisted' ? '⏳' : '✅'}{' '}
                          {r.userName ?? r.userId.slice(0, 8) + '…'}
                        </p>
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
        const canManageRoute =
          user && (activity.createdBy === user.userId || isAdmin);

        return (
          <div className="card space-y-4 mt-8">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-semibold text-gray-900">GPX Rute</h2>
              {canManageRoute && (
                <div className="flex items-center gap-2">
                  <StravaRouteImport activityId={id} onImported={() => refetchActivity()} />
                  <RouteUpload
                    activityId={id}
                    hasRoute={!!routeData}
                    onSuccess={() => refetchActivity()}
                  />
                </div>
              )}
            </div>

            {routeData ? (
              <div className="space-y-4">
                {/* Stats row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="rounded-lg bg-gray-50 px-3 py-2">
                    <p className="text-xs text-gray-500 mb-0.5">Distance</p>
                    <p className="text-lg font-bold text-gray-900">
                      {routeData.totalDistanceKm} km
                    </p>
                  </div>
                  <div className="rounded-lg bg-gray-50 px-3 py-2">
                    <p className="text-xs text-gray-500 mb-0.5">Stigning</p>
                    <p className="text-lg font-bold text-green-700">
                      ↑ {routeData.elevationGainM} m
                    </p>
                  </div>
                  <div className="rounded-lg bg-gray-50 px-3 py-2">
                    <p className="text-xs text-gray-500 mb-0.5">Fald</p>
                    <p className="text-lg font-bold text-red-600">
                      ↓ {routeData.elevationLossM} m
                    </p>
                  </div>
                  <div className="rounded-lg bg-gray-50 px-3 py-2">
                    <p className="text-xs text-gray-500 mb-0.5">Maks. højde</p>
                    <p className="text-lg font-bold text-gray-900">
                      {routeData.maxElevationM} m
                    </p>
                  </div>
                </div>

                {/* Map */}
                <RouteMap
                  trackPoints={routeData.trackPoints}
                  boundingBox={routeData.boundingBox}
                />

                {/* Elevation chart */}
                <ElevationProfile
                  trackPoints={routeData.trackPoints}
                  elevationGainM={routeData.elevationGainM}
                  elevationLossM={routeData.elevationLossM}
                  maxElevationM={routeData.maxElevationM}
                  minElevationM={routeData.minElevationM}
                />

                {/* GPX download */}
                <a
                  href={`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}/activities/${id}/route/download`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-brand-600 hover:underline"
                >
                  ⬇ Download GPX-fil
                </a>
              </div>
            ) : (
              <p className="text-sm text-gray-400">
                {canManageRoute
                  ? 'Upload en GPX-fil for at vise ruten på kortet.'
                  : 'Ingen GPX-rute tilknyttet denne aktivitet.'}
              </p>
            )}
          </div>
        );
      })()}
    </div>
  );
}
