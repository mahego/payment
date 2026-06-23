'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuthStore, hasMinRole } from '@/store/auth.store';
import {
  Wallet,
  Search,
  Plus,
  ArrowRight,
  Loader2,
  DollarSign,
  TrendingUp,
  CreditCard,
  Banknote,
  Calendar,
} from 'lucide-react';

interface PaymentRow {
  id: string;
  folio: string;
  amount: string | number;
  method: 'EFECTIVO' | 'TRANSFERENCIA' | 'DEPOSITO' | 'TARJETA';
  paidAt: string;
  notes: string | null;
  customer: {
    firstName: string;
    lastName: string;
    email: string | null;
  };
  createdBy: {
    name: string;
    email: string;
  };
}

export default function PaymentsPage() {
  const { user } = useAuthStore();
  const canCreate = hasMinRole(user?.role || 'VIEWER', 'COLLECTOR');

  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState('');

  const { data: payments, isLoading } = useQuery<PaymentRow[]>({
    queryKey: ['payments', search, methodFilter],
    queryFn: () =>
      api
        .get('/payments', {
          params: {
            query: search || undefined,
            method: methodFilter || undefined,
          },
        })
        .then((r) => r.data),
  });

  // Calculate quick stats from full dataset
  const totalAmount = payments?.reduce((acc, p) => acc + Number(p.amount), 0) ?? 0;
  const count = payments?.length ?? 0;
  const avgAmount = count > 0 ? totalAmount / count : 0;
  const cashAmount = payments
    ?.filter((p) => p.method === 'EFECTIVO')
    .reduce((acc, p) => acc + Number(p.amount), 0) ?? 0;

  const getMethodBadge = (method: PaymentRow['method']) => {
    const styles = {
      EFECTIVO: 'bg-emerald-50 text-emerald-700 border-emerald-100',
      TRANSFERENCIA: 'bg-blue-50 text-blue-700 border-blue-100',
      DEPOSITO: 'bg-indigo-50 text-indigo-700 border-indigo-100',
      TARJETA: 'bg-violet-50 text-violet-700 border-violet-100',
    };
    return (
      <span className={`inline-flex items-center rounded-lg border px-2 py-0.5 text-xs font-semibold ${styles[method]}`}>
        {method}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Pagos</h1>
          <p className="text-slate-500 text-sm mt-1">
            Consulta y audita el historial de cobros realizados en la plataforma.
          </p>
        </div>
        {canCreate && (
          <Link
            href="/payments/new"
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-premium hover:bg-indigo-700 active:scale-95"
          >
            <Plus className="h-4 w-4" />
            Registrar Pago
          </Link>
        )}
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Recaudado Total', value: `$${totalAmount.toFixed(2)}`, icon: DollarSign, bg: 'bg-emerald-50 text-emerald-600' },
          { label: 'Transacciones', value: `${count} cobros`, icon: Wallet, bg: 'bg-indigo-50 text-indigo-600' },
          { label: 'Efectivo Recibido', value: `$${cashAmount.toFixed(2)}`, icon: Banknote, bg: 'bg-amber-50 text-amber-600' },
          { label: 'Ticket Promedio', value: `$${avgAmount.toFixed(2)}`, icon: TrendingUp, bg: 'bg-violet-50 text-violet-600' },
        ].map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div key={idx} className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition hover:shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{stat.label}</span>
                <span className={`rounded-xl p-1.5 ${stat.bg}`}>
                  <Icon className="h-4 w-4" />
                </span>
              </div>
              <p className="text-xl font-extrabold text-slate-900 mt-2">
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
            placeholder="Buscar por folio, notas, o nombre del cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-sm outline-none transition-premium focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
          />
        </div>
        <select
          value={methodFilter}
          onChange={(e) => setMethodFilter(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition-premium focus:border-indigo-500"
        >
          <option value="">Todos los métodos</option>
          <option value="EFECTIVO">EFECTIVO</option>
          <option value="TRANSFERENCIA">TRANSFERENCIA</option>
          <option value="DEPOSITO">DEPOSITO</option>
          <option value="TARJETA">TARJETA</option>
        </select>
      </div>

      {/* Main Payments List */}
      {isLoading ? (
        <div className="flex h-60 items-center justify-center rounded-2xl border border-slate-200 bg-white">
          <div className="flex flex-col items-center gap-3 text-slate-400">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            <p className="text-sm">Obteniendo historial de transacciones...</p>
          </div>
        </div>
      ) : !payments || payments.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 border-dashed bg-white p-12 text-center">
          <div className="rounded-full bg-slate-100 p-4 text-slate-400">
            <Wallet className="h-8 w-8" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-slate-900">No se encontraron pagos</h3>
          <p className="mt-1 text-sm text-slate-500 max-w-sm">
            {search || methodFilter
              ? 'Intenta con otros términos o cambia el filtro de método de pago.'
              : 'No hay pagos registrados en la plataforma. Los cobros que realicen los cobradores aparecerán aquí.'}
          </p>
          {canCreate && !search && !methodFilter && (
            <Link
              href="/payments/new"
              className="mt-6 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition"
            >
              Registrar primer pago
            </Link>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-6 py-4">Folio</th>
                  <th className="px-6 py-4">Cliente</th>
                  <th className="px-6 py-4">Registrado por</th>
                  <th className="px-6 py-4">Fecha Pago</th>
                  <th className="px-6 py-4">Método</th>
                  <th className="px-6 py-4 text-right">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {payments.map((p) => {
                  const amt = Number(p.amount);
                  return (
                    <tr key={p.id} className="transition hover:bg-slate-50/50">
                      <td className="px-6 py-4 font-mono font-bold text-slate-800">
                        {p.folio}
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-900">
                        {p.customer.firstName} {p.customer.lastName}
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {p.createdBy.name}
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-slate-400" />
                          {new Date(p.paidAt).toLocaleDateString('es-MX')}
                        </div>
                      </td>
                      <td className="px-6 py-4">{getMethodBadge(p.method)}</td>
                      <td className="px-6 py-4 text-right font-extrabold text-emerald-600">
                        ${amt.toFixed(2)}
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
