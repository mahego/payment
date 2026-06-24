'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore, hasMinRole } from '@/store/auth.store';
import {
  Activity,
  RotateCw,
  Server,
  User,
  ShieldAlert,
  CheckCircle2,
  Clock,
  Filter,
  Loader2,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';

interface NetworkAction {
  id: string;
  actionType: string;
  status: 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'RETRYING';
  attempts: number;
  errorMessage: string | null;
  payload: any;
  createdAt: string;
  updatedAt: string;
  profile: {
    name: string;
  } | null;
  customer: {
    firstName: string;
    lastName: string;
  } | null;
  customerId: string | null;
}

export default function NetworkActionsPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const canEdit = hasMinRole(user?.role || 'VIEWER', 'SUPERVISOR');

  const { data: actions = [], isLoading, error, refetch, isRefetching } = useQuery<NetworkAction[]>({
    queryKey: ['network-actions', statusFilter, typeFilter],
    queryFn: () =>
      api
        .get('/network-actions', {
          params: {
            status: statusFilter || undefined,
            actionType: typeFilter || undefined,
          },
        })
        .then((r) => r.data),
  });

  const handleRetry = async (actionId: string) => {
    setRetryingId(actionId);
    try {
      await api.post(`/network-actions/${actionId}/retry`);
      queryClient.invalidateQueries({ queryKey: ['network-actions'] });
    } catch (err: any) {
      alert(err.response?.data?.message ?? 'Ocurrió un error al intentar reencolar la acción.');
    } finally {
      setRetryingId(null);
    }
  };

  const getStatusBadge = (status: NetworkAction['status']) => {
    const styles = {
      PENDING: 'bg-amber-50 text-amber-700 border-amber-100',
      RUNNING: 'bg-indigo-50 text-indigo-700 border-indigo-100 animate-pulse',
      SUCCESS: 'bg-emerald-50 text-emerald-700 border-emerald-100',
      FAILED: 'bg-rose-50 text-rose-700 border-rose-100',
      RETRYING: 'bg-blue-50 text-blue-700 border-blue-100',
    };

    const icons = {
      PENDING: Clock,
      RUNNING: Loader2,
      SUCCESS: CheckCircle2,
      FAILED: ShieldAlert,
      RETRYING: RefreshCw,
    };

    const Icon = icons[status] || Clock;

    return (
      <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${styles[status]}`}>
        <Icon className={`h-3.5 w-3.5 ${status === 'RUNNING' || status === 'RETRYING' ? 'animate-spin' : ''}`} />
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Activity className="h-8 w-8 text-indigo-500" />
            Bitácora de Acciones de Red
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Administración y auditoría en tiempo real de operaciones MikroTik en segundo plano.
          </p>
        </div>

        <button
          onClick={() => refetch()}
          disabled={isLoading || isRefetching}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
        >
          {isLoading || isRefetching ? (
            <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Actualizar
        </button>
      </div>

      {/* Filters Bar */}
      <div className="glass-card glass-shine bg-white/70 border-white/40 p-4 shadow-glass flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
          <Filter className="h-4 w-4 text-slate-400" />
          <span>Filtros:</span>
        </div>

        {/* Status Filter */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Estado</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 focus:border-indigo-500 focus:outline-none"
          >
            <option value="">Todos los Estados</option>
            <option value="PENDING">PENDING</option>
            <option value="RUNNING">RUNNING</option>
            <option value="SUCCESS">SUCCESS</option>
            <option value="FAILED">FAILED</option>
            <option value="RETRYING">RETRYING</option>
          </select>
        </div>

        {/* Type Filter */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tipo de Acción</label>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 focus:border-indigo-500 focus:outline-none"
          >
            <option value="">Todas las Acciones</option>
            <option value="SUSPEND_CUSTOMER">SUSPEND_CUSTOMER</option>
            <option value="REACTIVATE_CUSTOMER">REACTIVATE_CUSTOMER</option>
            <option value="TEST_CONNECTION">TEST_CONNECTION</option>
          </select>
        </div>
      </div>

      {/* Main Content Table */}
      <div className="glass-card glass-shine bg-white/70 border-white/40 p-6 shadow-glass overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
            <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
            <p className="text-sm font-semibold">Obteniendo bitácora de red...</p>
          </div>
        ) : error ? (
          <div className="rounded-xl bg-rose-50 border border-rose-100 p-6 text-center text-rose-600">
            <AlertTriangle className="h-10 w-10 mx-auto text-rose-500 mb-2" />
            <h3 className="font-bold text-base">Error al cargar bitácora</h3>
            <p className="text-xs mt-1">Verifica tu sesión de administrador o reintenta en unos momentos.</p>
          </div>
        ) : actions.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <Activity className="h-10 w-10 mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-semibold">No se encontraron registros de red</p>
            <p className="text-xs mt-1 text-slate-400/80">Intenta remover los filtros de búsqueda.</p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-6 -my-6">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-400 bg-slate-50/50">
                  <th className="px-6 py-4">Tipo Acción</th>
                  <th className="px-6 py-4">Cliente</th>
                  <th className="px-6 py-4">Router</th>
                  <th className="px-6 py-4">Estado</th>
                  <th className="px-6 py-4">Intentos</th>
                  <th className="px-6 py-4">Registro</th>
                  <th className="px-6 py-4">Última Act.</th>
                  <th className="px-6 py-4">Detalles / Error</th>
                  <th className="px-6 py-4 text-right">Controles</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {actions.map((act) => (
                  <tr key={act.id} className="hover:bg-slate-50/30 text-xs">
                    {/* Action Type */}
                    <td className="px-6 py-4 font-bold text-slate-900">{act.actionType}</td>
                    
                    {/* Customer */}
                    <td className="px-6 py-4">
                      {act.customerId ? (
                        <Link
                          href={`/customers/${act.customerId}`}
                          className="flex items-center gap-1.5 font-semibold text-indigo-600 hover:underline"
                        >
                          <User className="h-3.5 w-3.5 text-indigo-400" />
                          {act.customer ? `${act.customer.firstName} ${act.customer.lastName}` : 'Ir a Cliente'}
                        </Link>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    {/* Router */}
                    <td className="px-6 py-4">
                      <span className="flex items-center gap-1.5 text-slate-600">
                        <Server className="h-3.5 w-3.5 text-slate-400" />
                        {act.profile?.name || 'Desconocido'}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4">{getStatusBadge(act.status)}</td>

                    {/* Attempts */}
                    <td className="px-6 py-4 font-mono font-semibold text-slate-600">{act.attempts}</td>

                    {/* CreatedAt */}
                    <td className="px-6 py-4 text-slate-500">
                      {new Date(act.createdAt).toLocaleString('es-MX', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>

                    {/* UpdatedAt */}
                    <td className="px-6 py-4 text-slate-500">
                      {new Date(act.updatedAt).toLocaleString('es-MX', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>

                    {/* Error message */}
                    <td className="px-6 py-4 max-w-xs truncate text-slate-500" title={act.errorMessage || ''}>
                      {act.errorMessage ? (
                        <span className="text-rose-600 font-medium">{act.errorMessage}</span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>

                    {/* Control Action Button */}
                    <td className="px-6 py-4 text-right">
                      {act.status === 'FAILED' && canEdit && (
                        <button
                          onClick={() => handleRetry(act.id)}
                          disabled={retryingId === act.id}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-95 disabled:opacity-50"
                        >
                          {retryingId === act.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-500" />
                          ) : (
                            <RotateCw className="h-3.5 w-3.5" />
                          )}
                          Reintentar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
