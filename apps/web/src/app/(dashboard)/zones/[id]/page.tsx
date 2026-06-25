'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, use } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuthStore, hasMinRole } from '@/store/auth.store';
import {
  ChevronLeft,
  Loader2,
  Users,
  Calendar,
  AlertTriangle,
  Play,
  Square,
  RefreshCw,
  FolderInput,
  Wifi,
  Trash2,
  CheckSquare,
  Square as SquareIcon,
  HelpCircle,
  Check,
} from 'lucide-react';

interface ZoneDetail {
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

interface CustomerRow {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  status: 'ACTIVO' | 'SUSPENDIDO' | 'MOROSO' | 'CANCELADO';
  currentBalance: string | number;
  billingCutoffDay: number;
  pppoeUsername: string | null;
  plan?: { name: string; speed: string } | null;
}

interface Plan {
  id: string;
  name: string;
}

interface ZoneOption {
  id: string;
  name: string;
}

export default function ZoneDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isSupervisor = hasMinRole(user?.role || 'VIEWER', 'SUPERVISOR');
  const isAdmin = hasMinRole(user?.role || 'VIEWER', 'ADMIN');

  // Local state for checkboxes
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [bulkMessage, setBulkMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Bulk dropdown choices
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showZoneModal, setShowZoneModal] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);

  // Selected values for bulk updates
  const [newStatus, setNewStatus] = useState<string>('ACTIVO');
  const [newZoneId, setNewZoneId] = useState<string>('');
  const [newPlanId, setNewPlanId] = useState<string>('');

  // Fetch Zone metadata
  const { data: zone, isLoading: loadingZone } = useQuery<ZoneDetail>({
    queryKey: ['zone', id],
    queryFn: () => api.get(`/zones/${id}`).then((r) => r.data),
  });

  // Fetch Zone customers
  const { data: customers, isLoading: loadingCustomers } = useQuery<CustomerRow[]>({
    queryKey: ['zone-customers', id],
    queryFn: () => api.get(`/zones/${id}/customers`).then((r) => r.data),
  });

  // Fetch all zones (for reassigning zone)
  const { data: allZones } = useQuery<ZoneOption[]>({
    queryKey: ['zones-list'],
    queryFn: () => api.get('/zones').then((r) => r.data),
    enabled: showZoneModal,
  });

  // Fetch all service plans (for reassigning plan)
  const { data: allPlans } = useQuery<Plan[]>({
    queryKey: ['plans-list'],
    queryFn: () => api.get('/service-plans').then((r) => r.data),
    enabled: showPlanModal,
  });

  // Toggle active status mutation
  const toggleActiveMutation = useMutation({
    mutationFn: (active: boolean) => api.patch(`/zones/${id}`, { active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['zone', id] });
      queryClient.invalidateQueries({ queryKey: ['zones'] });
    },
  });

  // Delete/Disable zone mutation (soft delete)
  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/zones/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['zones'] });
      router.replace('/zones');
    },
  });

  const toggleSelectAll = () => {
    if (!customers) return;
    if (selectedIds.length === customers.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(customers.map((c) => c.id));
    }
  };

  const toggleSelect = (customerId: string) => {
    setSelectedIds((prev) =>
      prev.includes(customerId) ? prev.filter((x) => x !== customerId) : [...prev, customerId]
    );
  };

  const handleBulkAction = async (action: string, payload?: any) => {
    if (selectedIds.length === 0) return;
    setBulkActionLoading(true);
    setBulkMessage(null);
    try {
      const response = await api.post('/customers/bulk-action', {
        customerIds: selectedIds,
        action,
        payload,
      });
      setBulkMessage({
        type: 'success',
        text: `Acción masiva completada con éxito. Registros afectados: ${
          response.data.updatedCount ?? response.data.queuedCount ?? 0
        }`,
      });
      setSelectedIds([]);
      setShowStatusModal(false);
      setShowZoneModal(false);
      setShowPlanModal(false);
      // Refresh list
      queryClient.invalidateQueries({ queryKey: ['zone-customers', id] });
      queryClient.invalidateQueries({ queryKey: ['zone', id] });
    } catch (e: any) {
      setBulkMessage({
        type: 'error',
        text: e.response?.data?.message || 'Ocurrió un error al aplicar la acción masiva',
      });
    } finally {
      setBulkActionLoading(false);
    }
  };

  if (loadingZone) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3 text-gray-500">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          <p className="text-sm">Cargando detalles de la zona...</p>
        </div>
      </div>
    );
  }

  if (!zone) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-bold text-slate-800">Zona no encontrada</h2>
        <Link href="/zones" className="text-indigo-600 font-semibold hover:underline mt-2 inline-block">
          Volver a la lista de zonas
        </Link>
      </div>
    );
  }

  // Count stats for customers in this zone
  const activeCount = customers?.filter((c) => c.status === 'ACTIVO').length ?? 0;
  const suspendedCount = customers?.filter((c) => c.status === 'SUSPENDIDO').length ?? 0;
  const delinquentCount = customers?.filter((c) => c.status === 'MOROSO').length ?? 0;

  return (
    <div className="space-y-6">
      {/* Back button & Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/zones"
            className="inline-flex items-center justify-center h-10 w-10 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{zone.name}</h1>
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
            <p className="text-slate-500 text-sm mt-1">{zone.description || 'Sin descripción.'}</p>
          </div>
        </div>

        {/* Admin Actions */}
        {isAdmin && (
          <div className="flex gap-2">
            <button
              onClick={() => toggleActiveMutation.mutate(!zone.active)}
              className={`px-4 py-2 text-sm font-semibold rounded-xl border transition ${
                zone.active
                  ? 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  : 'bg-emerald-600 text-white border-transparent hover:bg-emerald-700'
              }`}
            >
              {zone.active ? 'Desactivar Zona' : 'Activar Zona'}
            </button>
            <button
              onClick={() => {
                if (confirm('¿Estás seguro de que deseas eliminar (soft delete) esta zona?')) {
                  deleteMutation.mutate();
                }
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl bg-rose-50 text-rose-700 border border-rose-100 hover:bg-rose-100 transition"
            >
              <Trash2 className="w-4 h-4" />
              Eliminar
            </button>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        {[
          { label: 'Total Clientes', value: customers?.length ?? 0, icon: Users, bg: 'bg-indigo-50 text-indigo-600' },
          { label: 'Activos', value: activeCount, icon: Users, bg: 'bg-emerald-50 text-emerald-600' },
          { label: 'Suspendidos', value: suspendedCount, icon: AlertTriangle, bg: 'bg-amber-50 text-amber-600' },
          { label: 'Morosos', value: delinquentCount, icon: AlertTriangle, bg: 'bg-rose-50 text-rose-600' },
        ].map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div key={idx} className="glass-card bg-white border border-slate-200/50 p-4 shadow-sm rounded-xl">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{stat.label}</span>
                <span className={`rounded-xl p-1.5 ${stat.bg}`}>
                  <Icon className="h-4 w-4" />
                </span>
              </div>
              <p className="text-2xl font-bold text-slate-900 mt-2">{stat.value}</p>
            </div>
          );
        })}
      </div>

      {/* Bulk action message */}
      {bulkMessage && (
        <div
          className={`p-4 rounded-xl border text-sm flex justify-between items-center ${
            bulkMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-100'
              : 'bg-rose-50 text-rose-800 border-rose-100'
          }`}
        >
          <span>{bulkMessage.text}</span>
          <button onClick={() => setBulkMessage(null)} className="font-bold ml-2">
            &times;
          </button>
        </div>
      )}

      {/* Floating/Sticky Bulk Actions Bar */}
      {selectedIds.length > 0 && isSupervisor && (
        <div className="sticky top-4 z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-2xl border border-indigo-100 bg-indigo-50/95 backdrop-blur shadow-lg animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckSquare className="text-indigo-600 h-5 w-5" />
            <span className="text-sm font-bold text-indigo-900">
              {selectedIds.length} clientes seleccionados
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleBulkAction('SUSPEND')}
              disabled={bulkActionLoading}
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-amber-700 transition"
            >
              <Square className="h-3.5 w-3.5" />
              Cortar Internet
            </button>
            <button
              onClick={() => handleBulkAction('REACTIVATE')}
              disabled={bulkActionLoading}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition"
            >
              <Play className="h-3.5 w-3.5" />
              Reactivar
            </button>
            <button
              onClick={() => setShowStatusModal(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-700 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-slate-800 transition"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Cambiar Estado
            </button>
            <button
              onClick={() => setShowZoneModal(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 transition"
            >
              <FolderInput className="h-3.5 w-3.5" />
              Cambiar Zona
            </button>
            <button
              onClick={() => setShowPlanModal(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-purple-700 transition"
            >
              <Wifi className="h-3.5 w-3.5" />
              Asignar Plan
            </button>
          </div>
        </div>
      )}

      {/* Customers List inside Zone */}
      <div className="glass-card bg-white border border-slate-200/60 shadow-sm rounded-2xl p-0 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Clientes del Sector</h2>
          <span className="text-xs text-slate-400">Total: {customers?.length || 0}</span>
        </div>

        {loadingCustomers ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
          </div>
        ) : !customers || customers.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <Users className="w-10 h-10 mx-auto text-slate-300 mb-3" />
            <p className="text-sm">No hay clientes asignados a este sector.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <th className="w-12 px-6 py-4">
                    <button
                      onClick={toggleSelectAll}
                      className="text-slate-400 hover:text-indigo-600 transition"
                    >
                      {selectedIds.length === customers.length ? (
                        <CheckSquare className="w-4 h-4 text-indigo-600" />
                      ) : (
                        <SquareIcon className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="px-6 py-4">Cliente</th>
                  <th className="px-6 py-4">Plan Actual</th>
                  <th className="px-6 py-4">Contacto</th>
                  <th className="px-6 py-4">Saldo</th>
                  <th className="px-6 py-4">Estado</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {customers.map((c) => {
                  const isChecked = selectedIds.includes(c.id);
                  const balance = Number(c.currentBalance);
                  const initial = c.firstName[0].toUpperCase();
                  return (
                    <tr
                      key={c.id}
                      className={`transition ${
                        isChecked ? 'bg-indigo-50/20' : 'hover:bg-slate-50/50'
                      }`}
                    >
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelect(c.id)}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-indigo-50 font-bold text-indigo-600 text-xs">
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
                        {c.plan ? (
                          <div>
                            <span className="font-medium text-slate-800">{c.plan.name}</span>
                            <div className="text-xs text-slate-400">{c.plan.speed}</div>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">Ninguno</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-slate-900 font-medium">{c.phone || '—'}</div>
                        <div className="text-xs text-slate-400">{c.email || '—'}</div>
                      </td>
                      <td className="px-6 py-4 font-semibold">
                        <span className={balance > 0 ? 'text-rose-600' : 'text-slate-900'}>
                          ${balance.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                            c.status === 'ACTIVO'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                              : c.status === 'SUSPENDIDO'
                              ? 'bg-amber-50 text-amber-700 border-amber-100'
                              : c.status === 'MOROSO'
                              ? 'bg-rose-50 text-rose-700 border-rose-100'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          {c.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/customers/${c.id}`}
                          className="text-xs font-bold text-indigo-600 hover:underline"
                        >
                          Ver
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Bulk action modals */}
      {showStatusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Cambiar estado de clientes</h3>
            <p className="text-sm text-slate-500">
              Selecciona el nuevo estado para los {selectedIds.length} clientes seleccionados.
            </p>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="w-full rounded-xl border border-slate-200 p-2.5 text-sm"
            >
              <option value="ACTIVO">ACTIVO</option>
              <option value="SUSPENDIDO">SUSPENDIDO</option>
              <option value="MOROSO">MOROSO</option>
              <option value="CANCELADO">CANCELADO</option>
            </select>
            <div className="flex justify-end gap-3 pt-4">
              <button
                onClick={() => setShowStatusModal(false)}
                className="px-4 py-2 text-sm font-semibold text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleBulkAction('CHANGE_STATUS', { status: newStatus })}
                className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700"
              >
                Aplicar
              </button>
            </div>
          </div>
        </div>
      )}

      {showZoneModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Reasignar Zona</h3>
            <p className="text-sm text-slate-500">
              Selecciona la nueva zona para los {selectedIds.length} clientes seleccionados.
            </p>
            <select
              value={newZoneId}
              onChange={(e) => setNewZoneId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 p-2.5 text-sm"
            >
              <option value="">Selecciona una zona...</option>
              {allZones?.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name}
                </option>
              ))}
            </select>
            <div className="flex justify-end gap-3 pt-4">
              <button
                onClick={() => setShowZoneModal(false)}
                className="px-4 py-2 text-sm font-semibold text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleBulkAction('ASSIGN_ZONE', { zoneId: newZoneId || null })}
                className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700"
              >
                Asignar
              </button>
            </div>
          </div>
        </div>
      )}

      {showPlanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Asignar Plan de Internet</h3>
            <p className="text-sm text-slate-500">
              Selecciona el plan para los {selectedIds.length} clientes seleccionados.
            </p>
            <select
              value={newPlanId}
              onChange={(e) => setNewPlanId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 p-2.5 text-sm"
            >
              <option value="">Selecciona un plan...</option>
              {allPlans?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <div className="flex justify-end gap-3 pt-4">
              <button
                onClick={() => setShowPlanModal(false)}
                className="px-4 py-2 text-sm font-semibold text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleBulkAction('ASSIGN_PLAN', { planId: newPlanId || null })}
                className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700"
              >
                Asignar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
