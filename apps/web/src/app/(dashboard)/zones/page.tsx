'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuthStore, hasMinRole } from '@/store/auth.store';
import { MapPin, Plus, Loader2, Users, Calendar, ChevronRight } from 'lucide-react';

interface Zone {
  id: string;
  name: string;
  description: string | null;
  billingCutoffDay: number | null;
  active: boolean;
  _count: {
    customers: number;
    plans: number;
  };
}

export default function ZonesPage() {
  const { user } = useAuthStore();
  const isAdmin = hasMinRole(user?.role || 'VIEWER', 'ADMIN');

  const { data: zones, isLoading } = useQuery<Zone[]>({
    queryKey: ['zones'],
    queryFn: () => api.get('/zones', { params: { activeOnly: false } }).then((r) => r.data),
  });

  const totalZones = zones?.length ?? 0;
  const activeZones = zones?.filter((z) => z.active).length ?? 0;
  const totalCustomers = zones?.reduce((acc, z) => acc + z._count.customers, 0) ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Zonas y Sectores</h1>
          <p className="text-slate-500 text-sm mt-1">
            Administra los sectores geográficos para agrupar clientes y automatizar cortes por zona.
          </p>
        </div>
        {isAdmin && (
          <Link
            href="/zones/new"
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-premium hover:bg-indigo-700 active:scale-95"
          >
            <Plus className="h-4 w-4" />
            Nueva Zona
          </Link>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: 'Total Zonas', value: totalZones, icon: MapPin, bg: 'bg-indigo-50 text-indigo-600' },
          { label: 'Zonas Activas', value: activeZones, icon: MapPin, bg: 'bg-emerald-50 text-emerald-600' },
          { label: 'Clientes en Zonas', value: totalCustomers, icon: Users, bg: 'bg-purple-50 text-purple-600' },
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

      {/* Zones Grid */}
      {isLoading ? (
        <div className="flex h-60 items-center justify-center rounded-2xl border border-slate-200 bg-white">
          <div className="flex flex-col items-center gap-3 text-slate-400">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            <p className="text-sm">Cargando sectores...</p>
          </div>
        </div>
      ) : !zones || zones.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 border-dashed bg-white p-12 text-center">
          <div className="rounded-full bg-slate-100 p-4 text-slate-400">
            <MapPin className="h-8 w-8" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-slate-900">No hay zonas configuradas</h3>
          <p className="mt-1 text-sm text-slate-500 max-w-sm">
            Crea tu primera zona o sector para poder agrupar tus clientes y administrar sus cortes mensuales de forma masiva.
          </p>
          {isAdmin && (
            <Link
              href="/zones/new"
              className="mt-6 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition"
            >
              Crear primera zona
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {zones.map((zone) => (
            <div
              key={zone.id}
              className={`glass-card bg-white/80 border border-slate-200/60 shadow-sm rounded-2xl p-6 transition-all duration-300 hover:shadow-md flex flex-col justify-between ${
                !zone.active ? 'opacity-60' : ''
              }`}
            >
              <div>
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-lg font-bold text-slate-900">{zone.name}</h3>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                      zone.active
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}
                  >
                    {zone.active ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
                <p className="text-slate-500 text-sm mb-4 line-clamp-2">
                  {zone.description || 'Sin descripción.'}
                </p>
              </div>

              <div className="border-t border-slate-100 pt-4 mt-4 space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    Clientes asignados
                  </span>
                  <span className="font-bold text-slate-900">{zone._count.customers}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    Día de corte
                  </span>
                  <span className="font-bold text-slate-900">
                    {zone.billingCutoffDay ? `Día ${zone.billingCutoffDay}` : 'Por cliente'}
                  </span>
                </div>
                <div className="pt-2 flex justify-end">
                  <Link
                    href={`/zones/${zone.id}`}
                    className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-indigo-600 transition hover:bg-indigo-50"
                  >
                    Ver detalles
                    <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
