'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { PageSpinner } from '@/components/ui/Spinner';
import { useUsersControllerGetMe, useUsersControllerUpdateMe } from '@/api/generated/users/users';
import StravaConnect from '@/components/strava/StravaConnect';
import RidewithgpsConnect from '@/components/ridewithgps/RidewithgpsConnect';
import { apiClient } from '@/api/axios-instance';

function SendToGarminTest() {
  const [routes, setRoutes] = useState<{ id: string; name: string; distance: number }[]>([]);
  const [loadingRoutes, setLoadingRoutes] = useState(false);
  const [routeId, setRouteId] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function loadRoutes() {
    setLoadingRoutes(true);
    try {
      const res = await apiClient.get<unknown>('/ridewithgps/routes');
      const list = ((res.data as any)?.data ?? res.data) as { id: string; name: string; distance: number }[];
      setRoutes(Array.isArray(list) ? list : []);
    } catch {
      setRoutes([]);
    } finally {
      setLoadingRoutes(false);
    }
  }

  async function handleSend() {
    if (!routeId) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await apiClient.post<unknown>(`/ridewithgps/routes/${routeId}/request-sync`);
      setResult(JSON.stringify((res.data as any)?.data ?? res.data, null, 2));
    } catch (err: any) {
      const data = err?.response?.data;
      setResult('Fejl: ' + JSON.stringify(data ?? err?.message ?? err, null, 2));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        {routes.length === 0 ? (
          <button
            onClick={loadRoutes}
            disabled={loadingRoutes}
            className="btn-secondary text-sm disabled:opacity-50"
          >
            {loadingRoutes ? 'Henter ruter…' : 'Hent RWGPS-ruter'}
          </button>
        ) : (
          <>
            <select
              value={routeId}
              onChange={(e) => setRouteId(e.target.value)}
              className="input flex-1 text-sm"
            >
              <option value="">Vælg en rute…</option>
              {routes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({(r.distance / 1000).toFixed(1)} km)
                </option>
              ))}
            </select>
            <button
              onClick={handleSend}
              disabled={loading || !routeId}
              className="btn-primary text-sm disabled:opacity-50"
            >
              {loading ? 'Sender…' : 'Request Sync'}
            </button>
          </>
        )}
      </div>
      {result && (
        <pre className="text-xs bg-gray-50 border border-gray-200 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-all">
          {result}
        </pre>
      )}
    </div>
  );
}

const schema = z.object({
  fullName: z.string().min(2),
  phone: z.string().optional(),
  bio: z.string().max(500).optional(),
  avatarUrl: z.string().url('Ugyldig URL').optional().or(z.literal('')),
});

type FormValues = z.infer<typeof schema>;

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const { data, isLoading } = useUsersControllerGetMe();
  const { mutateAsync, isPending, isSuccess } = useUsersControllerUpdateMe();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: data
      ? {
          fullName: data.fullName,
          phone: (data.phone as unknown as string) ?? '',
          bio: (data.bio as unknown as string) ?? '',
          avatarUrl: (data.avatarUrl as unknown as string) ?? '',
        }
      : undefined,
  });

  if (!user || isLoading) return <PageSpinner />;

  async function onSubmit(formData: FormValues) {
    await mutateAsync({
      data: {
        ...formData,
        phone: formData.phone || undefined,
        bio: formData.bio || undefined,
        avatarUrl: formData.avatarUrl || undefined,
      },
    });
  }

  const profile = data;

  return (
    <div className="max-w-xl mx-auto px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Min profil</h1>
      <p className="text-sm text-gray-500 mb-8">
        Rolle: <span className="font-medium capitalize">{profile?.role}</span>
      </p>

      {isSuccess && (
        <div className="mb-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
          Profil gemt!
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="card space-y-5">
        <div>
          <label className="label">Fulde navn</label>
          <input {...register('fullName')} className="input" />
          {errors.fullName && <p className="mt-1 text-xs text-red-600">{errors.fullName.message}</p>}
        </div>
        <div>
          <label className="label">E-mail</label>
          <input value={profile?.email ?? ''} disabled className="input opacity-60 cursor-not-allowed" />
        </div>
        <div>
          <label className="label">Telefon</label>
          <input type="tel" {...register('phone')} className="input" />
        </div>
        <div>
          <label className="label">Bio (maks. 500 tegn)</label>
          <textarea {...register('bio')} rows={3} className="input resize-none" />
          {errors.bio && <p className="mt-1 text-xs text-red-600">{errors.bio.message}</p>}
        </div>
        <div>
          <label className="label">Avatar URL</label>
          <input {...register('avatarUrl')} className="input" placeholder="https://…" />
          {errors.avatarUrl && <p className="mt-1 text-xs text-red-600">{errors.avatarUrl.message}</p>}
        </div>
        <button type="submit" disabled={isPending} className="btn-primary w-full">
          {isPending ? 'Gemmer…' : 'Gem ændringer'}
        </button>
      </form>

      <div className="mt-6">
        <StravaConnect />
      </div>

      <div className="mt-6">
        <RidewithgpsConnect />
      </div>

      <div className="mt-6 card space-y-3">
        <h2 className="font-semibold text-gray-900 text-sm">🧪 Test: Send RWGPS-rute til Garmin</h2>
        <SendToGarminTest />
      </div>

      <div className="mt-6 sm:hidden">
        <button onClick={logout} className="btn-secondary w-full">
          Log ud
        </button>
      </div>
    </div>
  );
}
