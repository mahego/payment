'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';

export default function ProfilePage() {
  const { user: me } = useAuthStore();

  const { data } = useQuery({
    queryKey: ['me'],
    queryFn: () => api.get('/auth/me').then((r) => r.data),
    initialData: me,
  });

  return (
    <div className="max-w-md space-y-6">
      <h1 className="text-2xl font-bold">Mi perfil</h1>
      <div className="rounded-lg bg-white p-6 shadow text-sm space-y-3">
        <Row label="Nombre" value={data?.name ?? '—'} />
        <Row label="Email" value={data?.email ?? '—'} />
        <Row label="Teléfono" value={data?.phone ?? '—'} />
        <Row label="Rol" value={data?.role ?? '—'} />
        <Row label="Estado" value={data?.status ?? '—'} />
        {data?.lastLoginAt && (
          <Row
            label="Último acceso"
            value={new Date(data.lastLoginAt).toLocaleString('es-MX')}
          />
        )}
        {data?.collectorProfile && (
          <div className="border-t pt-3">
            <p className="mb-2 font-semibold text-gray-700">Perfil cobrador</p>
            <Row label="Zona" value={data.collectorProfile.assignedZone ?? '—'} />
            <Row
              label="Pagos offline"
              value={data.collectorProfile.canRegisterOfflinePayments ? 'Habilitado' : 'No'}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b pb-2">
      <span className="text-gray-500">{label}</span>
      <span>{value}</span>
    </div>
  );
}
