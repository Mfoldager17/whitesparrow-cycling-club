'use client';

import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { PageSpinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { RouteCard } from '@/components/routes/RouteCard';
import {
  useRoutesControllerFindAll,
  useRoutesControllerDelete,
  getRoutesControllerFindAllQueryKey,
} from '@/api/generated/routes/routes';
import type { SavedRouteSummaryDto } from '@/api/generated/models/savedRouteSummaryDto';
import { useAuth } from '@/contexts/AuthContext';

function DeletableRouteCard({ route }: { route: SavedRouteSummaryDto }) {
  const queryClient = useQueryClient();
  const { mutateAsync: deleteRoute, isPending: deleting } = useRoutesControllerDelete();
  const { user } = useAuth();

  const isOwner = user?.userId === route.createdBy;

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    if (!confirm(`Slet ruten "${route.name}"? Aktiviteter der bruger den vil miste rutedata.`)) return;
    await deleteRoute({ id: route.id });
    await queryClient.invalidateQueries({ queryKey: getRoutesControllerFindAllQueryKey() });
  }

  return (
    <RouteCard
      mode="link"
      route={route}
      onDelete={isOwner ? handleDelete : undefined}
      deleting={deleting}
    />
  );
}

export default function RoutesPage() {
  const { data: routes, isLoading } = useRoutesControllerFindAll();
  const { user } = useAuth();

  if (isLoading) return <PageSpinner />;

  const list = Array.isArray(routes) ? routes : ((routes as any)?.data ?? []) as SavedRouteSummaryDto[];

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 sm:px-6">
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Ruter</h1>
          <p className="text-sm text-gray-500 mt-1">Planlagte cykelruter til brug på aktiviteter</p>
        </div>
        {user && (
          <Link href="/routes/new" className="btn-primary shrink-0">
            + Planlæg rute
          </Link>
        )}
      </div>

      {list.length === 0 ? (
        <EmptyState
          title="Ingen ruter endnu"
          description="Planlæg en rute og gem den, så den kan bruges til kommende aktiviteter."
          action={user ? <Link href="/routes/new" className="btn-primary inline-block">Planlæg rute</Link> : undefined}
        />
      ) : (
        <div className="space-y-3">
          {list.map((r) => (
            <DeletableRouteCard key={r.id} route={r} />
          ))}
        </div>
      )}
    </div>
  );
}

