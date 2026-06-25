'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import api from '@/lib/api';
import { useAuthStore, hasMinRole } from '@/store/auth.store';
import { Wifi, Plus, Loader2, DollarSign, Activity, MapPin, Trash2 } from 'lucide-react';

interface ServicePlan {
  id: string;
  name: string;
  description: string | null;
  speed: string;
  price: string | number;
  planType: 'PPPOE' | 'SIMPLE_QUEUE' | 'HOTSPOT';
  active: boolean;
  zone: { id: string; name: string } | null;
  _count: {
    customers: number;
  };
}

interface ZoneOption {
  id: string;
  name: string;
}

export default function ServicePlansPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const isAdmin = hasMinRole(user?.role || 'VIEWER', 'ADMIN');

  const [activeOnly, setActiveOnly] = useState(true);
  const [zoneId, setZoneId] = useState('');

  // Fetch plans
  const { data: plans, isLoading } = useQuery<ServicePlan[]>({
    queryKey: ['service-plans', activeOnly, zoneId],
    queryFn: () =>
      api
        .get('/service-plans', {
          params: {
            activeOnly,
            zoneId: zoneId || undefined,
          },
        })
        .then((r) => r.data),
  });

  // Fetch zones for filter
  const { data: zones } = useQuery<ZoneOption[]>({
    queryKey: ['zones-for-plans-filter'],
    queryFn: () => api.get('/zones').then((r) => r.data),
  });

  // Delete plan mutation (soft delete: set active = false)
  const deleteMutation = useMutation({
    mutationFn: (planId: string) => api.delete(`/service-plans/${planId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-plans'] });
    },
  });

  const getPlanTypeBadge = (type: ServicePlan['planType']) => {
    const styles = {
      PPPOE: 'bg-blue-50 text-blue-700 border-blue-100',
      SIMPLE_QUEUE: 'bg-indigo-50 text-indigo-700 border-indigo-100',
      HOTSPOT: 'bg-amber-50 text-amber-700 border-amber-100',
    };
    return (
      <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase ${styles[type]}`}>
        {type}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Catálogo de Planes</h1>
          <p className="text-slate-500 text-sm mt-1">
            Define velocidades, precios y tipos de conexión para tus servicios de internet.
          </p>
        </div>
        {isAdmin && (
          <Link
            href="/service-plans/new"
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-premium hover:bg-indigo-700 active:scale-95"
          >
            <Plus className="h-4 w-4" />
            Nuevo Plan
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <select
          value={zoneId}
          onChange={(e) => setZoneId(e.target.value)}
          className="rounded-xl border border-slate-200/60 bg-white/60 backdrop-blur-md px-4 py-2.5 text-sm outline-none focus:border-indigo-500"
        >
          <option value="">Todas las zonas</option>
          {zones?.map((z) => (
            <option key={z.id} value={z.id}>
              {z.name}
            </option>
          ))}
        </select>

        <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer bg-white/60 px-4 py-2.5 rounded-xl border border-slate-200/60">
          <input
            type="checkbox"
            checked={activeOnly}
            onChange={(e) => setActiveOnly(e.target.checked)}
            className="rounded text-indigo-600 border-slate-300 focus:ring-indigo-500"
          />
          Mostrar solo planes activos
        </label>
      </div>

      {/* Plans List */}
      {isLoading ? (
        <div className="flex h-60 items-center justify-center rounded-2xl border border-slate-200 bg-white">
          <div className="flex flex-col items-center gap-3 text-slate-400">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            <p className="text-sm">Cargando catálogo de planes...</p>
          </div>
        </div>
      ) : !plans || plans.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 border-dashed bg-white p-12 text-center">
          <div className="rounded-full bg-slate-100 p-4 text-slate-400">
            <Wifi className="h-8 w-8" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-slate-900">No hay planes registrados</h3>
          <p className="mt-1 text-sm text-slate-500 max-w-sm">
            Crea tu primer plan de internet para comenzar a asignarlo a tus clientes.
          </p>
          {isAdmin && (
            <Link
              href="/service-plans/new"
              className="mt-6 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition"
            >
              Registrar primer plan
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`glass-card bg-white/80 border border-slate-200/60 shadow-sm rounded-2xl p-6 transition-all duration-300 hover:shadow-md flex flex-col justify-between ${
                !plan.active ? 'opacity-60' : ''
              }`}
            >
              <div>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{plan.name}</h3>
                    <div className="mt-1 flex items-center gap-1.5">
                      {getPlanTypeBadge(plan.planType)}
                      {plan.zone && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 text-purple-700 border border-purple-100 px-2 py-0.5 text-[10px] font-bold uppercase">
                          <MapPin className="w-2.5 h-2.5" />
                          {plan.zone.name}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black text-indigo-600">${Number(plan.price).toFixed(2)}</span>
                    <span className="text-xs text-slate-400 block">/mes</span>
                  </div>
                </div>

                <p className="text-slate-500 text-sm mb-4">
                  {plan.description || 'Sin descripción.'}
                </p>
              </div>

              <div className="border-t border-slate-100 pt-4 mt-4 space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Activity className="w-4 h-4 text-slate-400" />
                    Velocidad contratada
                  </span>
                  <span className="font-bold text-slate-900">{plan.speed}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Wifi className="w-4 h-4 text-slate-400" />
                    Clientes suscritos
                  </span>
                  <span className="font-bold text-slate-900">{plan._count.customers}</span>
                </div>

                {isAdmin && plan.active && (
                  <div className="pt-3 flex justify-end">
                    <button
                      onClick={() => {
                        if (confirm(`¿Estás seguro de desactivar el plan "${plan.name}"?`)) {
                          deleteMutation.mutate(plan.id);
                        }
                      }}
                      className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Desactivar
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
