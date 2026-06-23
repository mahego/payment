'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore, hasRole } from '@/store/auth.store';

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const { user: me } = useAuthStore();
  const canEdit = hasRole(me?.role, 'SUPER_ADMIN', 'ADMIN');

  const { data, isLoading } = useQuery({
    queryKey: ['user', id],
    queryFn: () => api.get(`/users/${id}`).then((r) => r.data),
  });

  const statusMutation = useMutation({
    mutationFn: (status: string) =>
      api.patch(`/users/${id}/status`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['user', id] }),
  });

  if (isLoading) return <p>Cargando…</p>;
  if (!data) return <p>Usuario no encontrado.</p>;

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-6 text-2xl font-bold">{data.name}</h1>
      <div className="rounded-lg bg-white p-6 shadow space-y-3 text-sm">
        <Row label="Email" value={data.email} />
        <Row label="Teléfono" value={data.phone ?? '—'} />
        <Row label="Rol" value={data.role} />
        <Row label="Estado" value={data.status} />
        <Row
          label="Último acceso"
          value={
            data.lastLoginAt
              ? new Date(data.lastLoginAt).toLocaleString('es-MX')
              : '—'
          }
        />
      </div>
      {canEdit && (
        <div className="mt-4 flex gap-2">
          {data.status !== 'BLOCKED' && (
            <button
              onClick={() => statusMutation.mutate('BLOCKED')}
              className="rounded bg-red-600 px-3 py-1.5 text-xs text-white hover:bg-red-700"
            >
              Bloquear
            </button>
          )}
          {data.status === 'BLOCKED' && (
            <button
              onClick={() => statusMutation.mutate('ACTIVE')}
              className="rounded bg-green-600 px-3 py-1.5 text-xs text-white hover:bg-green-700"
            >
              Activar
            </button>
          )}
          {data.status === 'ACTIVE' && (
            <button
              onClick={() => statusMutation.mutate('INACTIVE')}
              className="rounded bg-yellow-500 px-3 py-1.5 text-xs text-white hover:bg-yellow-600"
            >
              Desactivar
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b pb-2">
      <span className="font-medium text-gray-500">{label}</span>
      <span>{value}</span>
    </div>
  );
}
