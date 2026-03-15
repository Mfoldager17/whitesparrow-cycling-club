'use client';

import { useState } from 'react';
import { PageSpinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { useUsersControllerFindAll, useUsersControllerAdminUpdate } from '@/api/generated/users/users';

export default function AdminUsersClient() {
  const { data, isLoading, refetch } = useUsersControllerFindAll();
  const { mutateAsync: updateUser, isPending } = useUsersControllerAdminUpdate();
  const [selected, setSelected] = useState<string | null>(null);

  const users = data ?? [];
  if (isLoading) return <PageSpinner />;

  const selectedUser = users.find((u) => u.id === selected);

  async function toggleActive(id: string, isActive: boolean) {
    await updateUser({ id, data: { isActive: !isActive } });
    await refetch();
  }

  async function toggleRole(id: string, role: string) {
    await updateUser({ id, data: { role: role === 'admin' ? 'member' : 'admin' } });
    await refetch();
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Medlemmer</h1>
      <p className="text-sm text-gray-500 mb-8">{users.length} registrerede brugere</p>

      {users.length === 0 ? (
        <EmptyState title="Ingen brugere fundet" />
      ) : (
        <div className="card overflow-y-hidden overflow-x-auto p-0">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                {['Navn', 'E-mail', 'Rolle', 'Status', 'Oprettet', ''].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{u.fullName}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{u.email}</td>
                  <td className="px-4 py-3">
                    <Badge
                      label={u.role === 'admin' ? 'Admin' : 'Medlem'}
                      variant={u.role === 'admin' ? 'blue' : 'gray'}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      label={u.isActive ? 'Aktiv' : 'Deaktiveret'}
                      variant={u.isActive ? 'green' : 'red'}
                    />
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {new Date(u.createdAt).toLocaleDateString('da-DK')}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setSelected(u.id)}
                      className="text-xs text-brand-600 hover:underline"
                    >
                      Rediger
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit modal */}
      {selectedUser && (
        <Modal
          open={!!selected}
          onClose={() => setSelected(null)}
          title={`Rediger ${selectedUser.fullName}`}
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-600">{selectedUser.email}</p>
            <div className="flex flex-col gap-3">
              <button
                disabled={isPending}
                onClick={() => toggleRole(selectedUser.id, selectedUser.role)}
                className="btn-secondary"
              >
                {isPending
                  ? 'Gemmer…'
                  : selectedUser.role === 'admin'
                  ? 'Nedgradér til Medlem'
                  : 'Opgradér til Admin'}
              </button>
              <button
                disabled={isPending}
                onClick={() => toggleActive(selectedUser.id, selectedUser.isActive)}
                className={selectedUser.isActive ? 'btn-danger' : 'btn-secondary'}
              >
                {isPending
                  ? 'Gemmer…'
                  : selectedUser.isActive
                  ? 'Deaktivér konto'
                  : 'Aktivér konto'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
