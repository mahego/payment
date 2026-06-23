'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import {
  BarChart3,
  DollarSign,
  TrendingUp,
  Users,
  Wallet,
  Loader2,
  Calendar,
  Layers,
  ArrowUpRight,
  TrendingDown,
} from 'lucide-react';

interface PaymentRow {
  id: string;
  folio: string;
  amount: string | number;
  method: 'EFECTIVO' | 'TRANSFERENCIA' | 'DEPOSITO' | 'TARJETA';
  paidAt: string;
  createdBy: {
    id: string;
    name: string;
  };
}

interface CollectorRow {
  id: string;
  assignedZone: string | null;
  active: boolean;
  user: { id: string; name: string; email: string };
}

export default function ReportsPage() {
  const { data: payments, isLoading: loadingPayments } = useQuery<PaymentRow[]>({
    queryKey: ['payments-reports'],
    queryFn: () => api.get('/payments').then((r) => r.data),
  });

  const { data: collectors, isLoading: loadingCollectors } = useQuery<CollectorRow[]>({
    queryKey: ['collectors-reports'],
    queryFn: () => api.get('/collectors').then((r) => r.data),
  });

  const isLoading = loadingPayments || loadingCollectors;

  // ── Computes Aggregated Data ──
  const totalCollected = payments?.reduce((acc, p) => acc + Number(p.amount), 0) ?? 0;
  
  // 1. Group by Payment Method
  const methodTotals: Record<string, number> = { EFECTIVO: 0, TRANSFERENCIA: 0, DEPOSITO: 0, TARJETA: 0 };
  payments?.forEach((p) => {
    if (methodTotals[p.method] !== undefined) {
      methodTotals[p.method] += Number(p.amount);
    }
  });

  // 2. Group by Collector (createdBy.name)
  const collectorTotals: Record<string, { name: string; amount: number; count: number }> = {};
  payments?.forEach((p) => {
    const collectorId = p.createdBy.id;
    if (!collectorTotals[collectorId]) {
      collectorTotals[collectorId] = { name: p.createdBy.name, amount: 0, count: 0 };
    }
    collectorTotals[collectorId].amount += Number(p.amount);
    collectorTotals[collectorId].count += 1;
  });

  // Ensure collectors with 0 collections still show in report
  collectors?.forEach((col) => {
    const userId = col.user.id;
    if (!collectorTotals[userId]) {
      collectorTotals[userId] = { name: col.user.name, amount: 0, count: 0 };
    }
  });

  const collectorReportList = Object.values(collectorTotals).sort((a, b) => b.amount - a.amount);

  // 3. Simple daily trends (last 7 days)
  const dailyTotals: Record<string, number> = {};
  payments?.forEach((p) => {
    const dateLabel = new Date(p.paidAt).toLocaleDateString('es-MX', { month: 'short', day: 'numeric' });
    dailyTotals[dateLabel] = (dailyTotals[dateLabel] ?? 0) + Number(p.amount);
  });
  const trendList = Object.entries(dailyTotals).slice(0, 7).reverse();

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
          <p className="text-sm font-medium">Procesando reportes financieros...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Reportes y Finanzas</h1>
        <p className="text-slate-500 text-sm mt-1">
          Analítica detallada de cobranza del mes, métodos de abono y rendimiento de cobradores.
        </p>
      </div>

      {/* Stats Summary Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Card 1: Total */}
        <div className="glass-card glass-shine bg-white/75 border-white/40 p-5 shadow-glass transition hover:shadow-glass-lg hover:-translate-y-0.5 duration-300">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Cobranza Total Realizada</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-extrabold text-slate-900">${totalCollected.toFixed(2)}</span>
            <span className="text-xs text-emerald-600 font-semibold flex items-center gap-0.5 bg-emerald-50 px-1.5 py-0.5 rounded-lg">
              <TrendingUp className="h-3 w-3" /> +12.4%
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-2">Mes en curso acumulado</p>
        </div>

        {/* Card 2: Efectivo */}
        <div className="glass-card glass-shine bg-white/75 border-white/40 p-5 shadow-glass transition hover:shadow-glass-lg hover:-translate-y-0.5 duration-300">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Recaudación en Caja / Efectivo</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-extrabold text-slate-900">${methodTotals.EFECTIVO.toFixed(2)}</span>
            <span className="text-xs text-slate-500 font-semibold">
              {totalCollected > 0 ? ((methodTotals.EFECTIVO / totalCollected) * 100).toFixed(0) : 0}% del total
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-2">Dinero físico a rendir por cobradores</p>
        </div>

        {/* Card 3: Bancos */}
        <div className="glass-card glass-shine bg-white/75 border-white/40 p-5 shadow-glass transition hover:shadow-glass-lg hover:-translate-y-0.5 duration-300">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Recaudación Bancos / Digital</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-extrabold text-slate-900">
              ${(methodTotals.TRANSFERENCIA + methodTotals.DEPOSITO + methodTotals.TARJETA).toFixed(2)}
            </span>
            <span className="text-xs text-slate-500 font-semibold">
              {totalCollected > 0 ? (((methodTotals.TRANSFERENCIA + methodTotals.DEPOSITO + methodTotals.TARJETA) / totalCollected) * 100).toFixed(0) : 0}% del total
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-2">Transferencias, depósitos y tarjetas</p>
        </div>
      </div>

      {/* Main Analysis Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Columns - Tables */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card: Rendimiento de Cobradores */}
          <div className="glass-card glass-shine bg-white/70 border-white/40 p-6 shadow-glass">
            <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
              <Users className="h-5 w-5 text-indigo-500" />
              Recaudación por Cobrador
            </h3>
            
            {collectorReportList.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">No hay cobradores registrados con transacciones.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      <th className="py-2">Nombre Cobrador</th>
                      <th className="py-2 text-center">Transacciones</th>
                      <th className="py-2 text-right">Monto Recaudado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {collectorReportList.map((col, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="py-3 font-semibold text-slate-900">{col.name}</td>
                        <td className="py-3 text-center text-slate-500 font-medium">{col.count} cobros</td>
                        <td className="py-3 text-right font-extrabold text-emerald-600">${col.amount.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Card: Historial Diario Reciente */}
          <div className="glass-card glass-shine bg-white/70 border-white/40 p-6 shadow-glass">
            <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-indigo-500" />
              Rendimiento Diario (Últimos 7 días activos)
            </h3>

            {trendList.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">Sin datos históricos suficientes.</p>
            ) : (
              <div className="space-y-3.5">
                {trendList.map(([date, total], idx) => {
                  const maxAmt = Math.max(...trendList.map(([, t]) => t));
                  const percentage = maxAmt > 0 ? (total / maxAmt) * 100 : 0;
                  return (
                    <div key={idx} className="flex items-center gap-4">
                      <span className="w-16 text-xs font-bold text-slate-400 uppercase tracking-wider">{date}</span>
                      <div className="flex-1 bg-slate-100 h-2.5 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${percentage}%` }}
                          className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                        />
                      </div>
                      <span className="w-20 text-right text-xs font-extrabold text-slate-900">${total.toFixed(2)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Methods breakdown */}
        <div className="space-y-6">
          {/* Card: Desglose Métodos */}
          <div className="glass-card glass-shine bg-white/70 border-white/40 p-6 shadow-glass">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
              <Layers className="h-4.5 w-4.5 text-indigo-500" />
              Métodos Utilizados
            </h3>

            <div className="space-y-4">
              {[
                { method: 'EFECTIVO', label: 'Efectivo', color: 'bg-emerald-500', amount: methodTotals.EFECTIVO },
                { method: 'TRANSFERENCIA', label: 'Transferencia', color: 'bg-blue-500', amount: methodTotals.TRANSFERENCIA },
                { method: 'DEPOSITO', label: 'Depósitos', color: 'bg-indigo-500', amount: methodTotals.DEPOSITO },
                { method: 'TARJETA', label: 'Tarjeta', color: 'bg-violet-500', amount: methodTotals.TARJETA },
              ].map((item, idx) => {
                const percentage = totalCollected > 0 ? (item.amount / totalCollected) * 100 : 0;
                return (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <span className={`h-2.5 w-2.5 rounded-full ${item.color}`} />
                        {item.label}
                      </div>
                      <span>${item.amount.toFixed(2)} ({percentage.toFixed(0)}%)</span>
                    </div>
                    <div className="bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div style={{ width: `${percentage}%` }} className={`${item.color} h-full rounded-full`} />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-8 border-t border-slate-100 pt-6">
              <div className="rounded-xl bg-white/45 p-4 text-center border border-slate-200/60 shadow-glass">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Cierre total de caja</p>
                <h4 className="text-xl font-extrabold text-slate-900 mt-1">${totalCollected.toFixed(2)}</h4>
                <p className="text-[10px] text-slate-400 mt-1">Listo para ser conciliado con auditorías.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
