'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import api from '@/lib/api';

export default function CollectorDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: profile } = useQuery({
    queryKey: ['collector', id],
    queryFn: () => api.get(`/collectors/${id}`).then((r) => r.data),
  });

  const { data: payments } = useQuery({
    queryKey: ['collector-payments', id],
    queryFn: () => api.get(`/collectors/${id}/payments`).then((r) => r.data),
  });

  if (!profile) return <p>Cargando…</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{profile.user?.name}</h1>

      <section className="rounded-lg bg-white p-5 shadow text-sm space-y-2">
        <h2 className="font-semibold text-gray-700">Perfil</h2>
        <Row label="Zona asignada" value={profile.assignedZone ?? '—'} />
        <Row label="Límite de efectivo" value={profile.cashLimit ? `$${profile.cashLimit}` : '—'} />
        <Row label="Pagos offline" value={profile.canRegisterOfflinePayments ? 'Habilitado' : 'Deshabilitado'} />
      </section>

      <section>
        <h2 className="mb-3 font-semibold text-gray-700">Últimos pagos</h2>
        {payments?.length === 0 ? (
          <p className="text-sm text-gray-400">Sin pagos registrados</p>
        ) : (
          <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
            <table className="min-w-full text-sm divide-y divide-gray-200">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  {['Folio', 'Cliente', 'Monto', 'Método', 'Fecha'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payments?.map((p: { id: string; folio: string; customer: { firstName: string; lastName: string }; amount: number; method: string; paidAt: string }) => (
                  <tr key={p.id}>
                    <td className="px-4 py-3">{p.folio}</td>
                    <td className="px-4 py-3">{p.customer.firstName} {p.customer.lastName}</td>
                    <td className="px-4 py-3">${p.amount}</td>
                    <td className="px-4 py-3">{p.method}</td>
                    <td className="px-4 py-3">{new Date(p.paidAt).toLocaleDateString('es-MX')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
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
