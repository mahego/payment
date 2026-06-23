'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import {
  Users,
  Wallet,
  AlertTriangle,
  TrendingUp,
  Loader2,
  Calendar,
  ArrowRight,
  TrendingDown,
  Activity,
  CheckCircle,
} from 'lucide-react';
import Link from 'next/link';

interface CustomerRow {
  id: string;
  firstName: string;
  lastName: string;
  status: 'ACTIVO' | 'SUSPENDIDO' | 'MOROSO' | 'CANCELADO';
  currentBalance: string | number;
}

interface PaymentRow {
  id: string;
  folio: string;
  amount: string | number;
  method: string;
  paidAt: string;
  customer: {
    firstName: string;
    lastName: string;
  };
  createdBy: {
    name: string;
  };
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const firstName = user?.name.split(' ')[0] ?? '';

  // 1. Fetch Customers
  const { data: customers, isLoading: loadingCustomers } = useQuery<CustomerRow[]>({
    queryKey: ['dashboard-customers'],
    queryFn: () => api.get('/customers').then((r) => r.data),
  });

  // 2. Fetch Payments
  const { data: payments, isLoading: loadingPayments } = useQuery<PaymentRow[]>({
    queryKey: ['dashboard-payments'],
    queryFn: () => api.get('/payments').then((r) => r.data),
  });

  const isLoading = loadingCustomers || loadingPayments;

  // ── Stats Calculations ──
  const activeCustomersCount = customers?.filter((c) => c.status === 'ACTIVO').length ?? 0;
  const delinquentCustomersCount = customers?.filter((c) => c.status === 'MOROSO' || Number(c.currentBalance) > 0).length ?? 0;

  // Payments today
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayPayments = payments?.filter((p) => {
    return new Date(p.paidAt).toISOString().slice(0, 10) === todayStr;
  });
  const todayAmount = todayPayments?.reduce((acc, p) => acc + Number(p.amount), 0) ?? 0;
  const todayTransCount = todayPayments?.length ?? 0;

  // Payments this month
  const currentMonthStr = new Date().toISOString().slice(0, 7); // "YYYY-MM"
  const monthlyAmount = payments
    ?.filter((p) => new Date(p.paidAt).toISOString().slice(0, 7) === currentMonthStr)
    .reduce((acc, p) => acc + Number(p.amount), 0) ?? 0;

  const stats = [
    {
      label: 'Clientes activos',
      value: activeCustomersCount.toString(),
      hint: `${customers?.length ?? 0} clientes totales`,
      icon: Users,
      accent: 'bg-emerald-50 text-emerald-600',
    },
    {
      label: 'Pagos del día',
      value: `$${todayAmount.toFixed(2)}`,
      hint: `${todayTransCount} transacciones hoy`,
      icon: Wallet,
      accent: 'bg-blue-50 text-blue-600',
    },
    {
      label: 'Clientes con adeudo',
      value: delinquentCustomersCount.toString(),
      hint: `${((delinquentCustomersCount / (customers?.length || 1)) * 100).toFixed(0)}% de la base`,
      icon: AlertTriangle,
      accent: 'bg-rose-50 text-rose-600',
    },
    {
      label: 'Cobranza mensual',
      value: `$${monthlyAmount.toFixed(2)}`,
      hint: 'Mes en curso acumulado',
      icon: TrendingUp,
      accent: 'bg-indigo-50 text-indigo-600',
    },
  ];

  const recentPayments = payments?.slice(0, 5) ?? [];

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Hola{firstName ? `, ${firstName}` : ''} 👋
        </h1>
        <p className="text-sm text-slate-500 font-medium">
          Aquí tienes un resumen general de la operación de Deluxnet.
        </p>
      </header>

      {/* Stats Cards */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.label}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{s.label}</p>
                <div className={`rounded-xl p-2 ${s.accent}`}>
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-3 text-2xl font-black text-slate-900">
                {isLoading ? <Loader2 className="h-5 w-5 animate-spin text-slate-300" /> : s.value}
              </p>
              <p className="mt-1 text-xs text-slate-400 font-semibold">{s.hint}</p>
            </div>
          );
        })}
      </section>

      {/* Recent Activity & Quick Actions */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent Activity (Left Columns) */}
        <section className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Activity className="h-4.5 w-4.5 text-indigo-500" />
              Actividad Reciente
            </h2>
            <Link href="/payments" className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-0.5">
              Ver todos <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
            </div>
          ) : recentPayments.length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">
              Aún no hay cobros o transacciones registradas. Cuando se sincronicen abonos desde el móvil aparecerán aquí.
            </p>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentPayments.map((p) => {
                const amt = Number(p.amount);
                return (
                  <div key={p.id} className="flex items-center justify-between py-3.5 first:pt-0 last:pb-0 hover:bg-slate-50/20 px-2 rounded-lg transition">
                    <div className="flex items-center gap-3">
                      <div className="rounded-full bg-emerald-50 p-2 text-emerald-600">
                        <CheckCircle className="h-4.5 w-4.5" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          Cobro a {p.customer.firstName} {p.customer.lastName}
                        </p>
                        <p className="text-xs text-slate-400">
                          Registrado por {p.createdBy.name} • Folio: {p.folio}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-extrabold text-emerald-600">${amt.toFixed(2)}</p>
                      <p className="text-[10px] text-slate-400 font-semibold uppercase">
                        {new Date(p.paidAt).toLocaleDateString('es-MX', { month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Quick Actions (Right Column) */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3 mb-4">
              Accesos Rápidos
            </h2>
            <p className="text-xs text-slate-400 mb-6">
              Comandos de acceso rápido para la administración diaria.
            </p>

            <div className="space-y-3">
              <Link
                href="/customers/new"
                className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-3 hover:bg-indigo-50 hover:text-indigo-600 transition"
              >
                <div className="flex items-center gap-2.5">
                  <span className="rounded-lg bg-white p-1.5 shadow-sm text-slate-600">
                    <Users className="h-4 w-4" />
                  </span>
                  <span className="text-xs font-bold">Registrar nuevo cliente</span>
                </div>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>

              <Link
                href="/payments/new"
                className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-3 hover:bg-indigo-50 hover:text-indigo-600 transition"
              >
                <div className="flex items-center gap-2.5">
                  <span className="rounded-lg bg-white p-1.5 shadow-sm text-slate-600">
                    <Wallet className="h-4 w-4" />
                  </span>
                  <span className="text-xs font-bold">Registrar pago manual</span>
                </div>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          <div className="mt-8 rounded-xl bg-slate-50 p-4 border border-slate-100 text-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Estado del Servidor</span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 mt-1 border border-emerald-100">
              <span className="h-1 w-1 rounded-full bg-emerald-500" />
              Conectado
            </span>
          </div>
        </section>
      </div>
    </div>
  );
}
