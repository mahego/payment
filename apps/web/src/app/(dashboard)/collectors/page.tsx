'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import api from '@/lib/api';

interface CollectorRow {
  id: string;
  assignedZone: string | null;
  active: boolean;
  user: { id: string; name: string; email: string; status: string };
}

export default function CollectorsPage() {
  const { data, isLoading } = useQuery<CollectorRow[]>({
    queryKey: ['collectors'],
    queryFn: () => api.get('/collectors').then((r) => r.data),
  });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Cobradores</h1>
      </div>
      {isLoading ? (
        <p>Cargando…</p>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                {['Nombre', 'Email', 'Zona', 'Activo', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {data?.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{c.user.name}</td>
                  <td className="px-4 py-3 text-gray-500">{c.user.email}</td>
                  <td className="px-4 py-3">{c.assignedZone ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        c.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {c.active ? 'Sí' : 'No'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/collectors/${c.user.id}`}
                      className="text-blue-600 hover:underline"
                    >
                      Ver
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
