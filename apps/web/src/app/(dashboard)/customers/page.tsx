'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuthStore, hasMinRole } from '@/store/auth.store';
import {
  Users,
  Search,
  UserPlus,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  AlertTriangle,
  Loader2,
} from 'lucide-react';

interface CustomerRow {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  status: 'ACTIVO' | 'SUSPENDIDO' | 'MOROSO' | 'CANCELADO';
  currentBalance: string | number;
  billingCutoffDay: number;
  signupDate: string;
  pppoeUsername: string | null;
}

export default function CustomersPage() {
  const { user } = useAuthStore();
  const canCreate = hasMinRole(user?.role || 'VIEWER', 'SUPERVISOR');
  
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  const { data: customers, isLoading } = useQuery<CustomerRow[]>({
    queryKey: ['customers', search, statusFilter],
    queryFn: () =>
      api
        .get('/customers', {
          params: {
            query: search || undefined,
            status: statusFilter || undefined,
          },
        })
        .then((r) => r.data),
  });

  // Calculate quick stats from full dataset
  const totalCount = customers?.length ?? 0;
  const activeCount = customers?.filter((c) => c.status === 'ACTIVO').length ?? 0;
  const suspendedCount = customers?.filter((c) => c.status === 'SUSPENDIDO').length ?? 0;
  const delinquentCount = customers?.filter((c) => c.status === 'MOROSO').length ?? 0;

  const getStatusBadge = (status: CustomerRow['status']) => {
    const styles = {
      ACTIVO: 'bg-emerald-50 text-emerald-700 border-emerald-100',
      SUSPENDIDO: 'bg-amber-50 text-amber-700 border-amber-100',
      MOROSO: 'bg-rose-50 text-rose-700 border-rose-100',
      CANCELADO: 'bg-slate-100 text-slate-600 border-slate-200',
    };
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${styles[status]}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${
          status === 'ACTIVO' ? 'bg-emerald-500' :
          status === 'SUSPENDIDO' ? 'bg-amber-500' :
          status === 'MOROSO' ? 'bg-rose-500' : 'bg-slate-400'
        }`} />
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Clientes</h1>
          <p className="text-slate-500 text-sm mt-1">
            Visualiza, filtra y administra las cuentas y estados de conexión.
          </p>
        </div>
        {canCreate && (
          <Link
            href="/customers/new"
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-premium hover:bg-indigo-700 active:scale-95"
          >
            <UserPlus className="h-4 w-4" />
            Registrar Cliente
          </Link>
        )}
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Total Clientes', value: totalCount, icon: Users, bg: 'bg-indigo-50 text-indigo-600' },
          { label: 'Activos', value: activeCount, icon: ShieldCheck, bg: 'bg-emerald-50 text-emerald-600' },
          { label: 'Suspendidos', value: suspendedCount, icon: AlertTriangle, bg: 'bg-amber-50 text-amber-600' },
          { label: 'Morosos', value: delinquentCount, icon: TrendingUp, bg: 'bg-rose-50 text-rose-600' },
        ].map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div key={idx} className="glass-card glass-shine bg-white/75 border-white/40 p-4 shadow-glass transition-all hover:shadow-glass-lg hover:-translate-y-0.5 duration-300">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{stat.label}</span>
                <span className={`rounded-xl p-1.5 ${stat.bg}`}>
                  <Icon className="h-4 w-4" />
                </span>
              </div>
              <p className="text-2xl font-bold text-slate-900 mt-2">
                {isLoading ? <Loader2 className="h-5 w-5 animate-spin text-slate-300" /> : stat.value}
              </p>
            </div>
          );
        })}
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nombre, teléfono, email o PPPoE..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200/60 bg-white/60 backdrop-blur-md pl-10 pr-4 py-2.5 text-sm outline-none transition-premium focus:border-indigo-500 focus:bg-white/90 focus:ring-4 focus:ring-indigo-500/10"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-slate-200/60 bg-white/60 backdrop-blur-md px-4 py-2.5 text-sm outline-none transition-premium focus:border-indigo-500 focus:bg-white/90"
        >
          <option value="">Todos los estados</option>
          <option value="ACTIVO">ACTIVO</option>
          <option value="SUSPENDIDO">SUSPENDIDO</option>
          <option value="MOROSO">MOROSO</option>
          <option value="CANCELADO">CANCELADO</option>
        </select>
      </div>

      {/* Main Customers List */}
      {isLoading ? (
        <div className="flex h-60 items-center justify-center rounded-2xl border border-slate-200 bg-white">
          <div className="flex flex-col items-center gap-3 text-slate-400">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            <p className="text-sm">Buscando clientes en la base de datos...</p>
          </div>
        </div>
      ) : !customers || customers.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 border-dashed bg-white p-12 text-center">
          <div className="rounded-full bg-slate-100 p-4 text-slate-400">
            <Users className="h-8 w-8" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-slate-900">No se encontraron clientes</h3>
          <p className="mt-1 text-sm text-slate-500 max-w-sm">
            {search || statusFilter
              ? 'Intenta modificar tus filtros o términos de búsqueda para encontrar lo que necesitas.'
              : 'Empieza registrando tu primer cliente en el sistema para comenzar a operar.'}
          </p>
          {canCreate && !search && !statusFilter && (
            <Link
              href="/customers/new"
              className="mt-6 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition"
            >
              Registrar primer cliente
            </Link>
          )}
        </div>
      ) : (
        <div className="overflow-hidden glass-card glass-shine bg-white/70 border-white/40 shadow-glass p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-100/50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-6 py-4">Cliente</th>
                  <th className="px-6 py-4">Contacto</th>
                  <th className="px-6 py-4">Corte mensual</th>
                  <th className="px-6 py-4">Saldo Adeudado</th>
                  <th className="px-6 py-4">Estado</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {customers.map((c) => {
                  const initial = c.firstName[0].toUpperCase();
                  const balance = Number(c.currentBalance);
                  return (
                    <tr key={c.id} className="transition hover:bg-slate-50/50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-50 font-bold text-indigo-600">
                            {initial}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900">
                              {c.firstName} {c.lastName}
                            </div>
                            <div className="text-xs text-slate-400">
                              {c.pppoeUsername ? `PPPoE: ${c.pppoeUsername}` : 'Sin PPPoE'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-slate-950 font-medium">{c.phone || '—'}</div>
                        <div className="text-xs text-slate-400">{c.email || '—'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex rounded-lg bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                          Día {c.billingCutoffDay}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-semibold">
                        <span className={balance > 0 ? 'text-rose-600' : 'text-slate-900'}>
                          ${balance.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-6 py-4">{getStatusBadge(c.status)}</td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/customers/${c.id}`}
                          className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-indigo-600 transition hover:bg-indigo-50"
                        >
                          Ver Detalles
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
