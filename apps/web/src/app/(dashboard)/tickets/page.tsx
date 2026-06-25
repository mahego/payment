'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import api from '@/lib/api';
import { useAuthStore, hasMinRole } from '@/store/auth.store';
import {
  LifeBuoy,
  Plus,
  Loader2,
  AlertCircle,
  Clock,
  CheckCircle,
  User,
  ArrowRight,
  Filter,
} from 'lucide-react';

interface Ticket {
  id: string;
  title: string;
  description: string;
  status: 'OPEN' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  createdAt: string;
  customer: {
    id: string;
    firstName: string;
    lastName: string;
  };
  assignedTo: {
    id: string;
    name: string;
  } | null;
  createdBy: {
    id: string;
    name: string;
  };
}

interface UserOption {
  id: string;
  name: string;
  role: string;
}

export default function TicketsPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  
  const isSupervisor = hasMinRole(user?.role || 'VIEWER', 'SUPERVISOR');

  const [statusFilter, setStatusFilter] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('');

  // Fetch tickets. Supervisor gets all tickets, technician/collector gets 'my' tickets.
  const { data: tickets, isLoading } = useQuery<Ticket[]>({
    queryKey: ['tickets', isSupervisor, statusFilter, priorityFilter, assigneeFilter],
    queryFn: () => {
      const endpoint = isSupervisor ? '/tickets' : '/tickets/my';
      const params = isSupervisor
        ? {
            status: statusFilter || undefined,
            priority: priorityFilter || undefined,
            assignedToId: assigneeFilter || undefined,
          }
        : {};
      return api.get(endpoint, { params }).then((r) => r.data);
    },
  });

  // Fetch list of users (to assign) - only for supervisor
  const { data: staffUsers } = useQuery<UserOption[]>({
    queryKey: ['staff-users'],
    queryFn: () => api.get('/users').then((r) => r.data),
    enabled: isSupervisor,
  });

  // Quick stats
  const totalCount = tickets?.length ?? 0;
  const openCount = tickets?.filter((t) => t.status === 'OPEN' || t.status === 'ASSIGNED').length ?? 0;
  const inProgressCount = tickets?.filter((t) => t.status === 'IN_PROGRESS').length ?? 0;
  const resolvedCount = tickets?.filter((t) => t.status === 'RESOLVED' || t.status === 'CLOSED').length ?? 0;

  const getStatusBadge = (status: Ticket['status']) => {
    const styles = {
      OPEN: 'bg-rose-50 text-rose-700 border-rose-100',
      ASSIGNED: 'bg-blue-50 text-blue-700 border-blue-100',
      IN_PROGRESS: 'bg-amber-50 text-amber-700 border-amber-100',
      RESOLVED: 'bg-emerald-50 text-emerald-700 border-emerald-100',
      CLOSED: 'bg-slate-100 text-slate-600 border-slate-200',
    };
    return (
      <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${styles[status]}`}>
        {status}
      </span>
    );
  };

  const getPriorityBadge = (priority: Ticket['priority']) => {
    const styles = {
      LOW: 'bg-slate-100 text-slate-700',
      MEDIUM: 'bg-blue-50 text-blue-700',
      HIGH: 'bg-amber-50 text-amber-700',
      CRITICAL: 'bg-rose-50 text-rose-700 animate-pulse font-bold',
    };
    return (
      <span className={`inline-flex rounded-lg px-2 py-0.5 text-[10px] font-medium uppercase ${styles[priority]}`}>
        {priority}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Soporte y Tickets</h1>
          <p className="text-slate-500 text-sm mt-1">
            {isSupervisor
              ? 'Administra, asigna y da seguimiento a los tickets de soporte técnico de todos los clientes.'
              : 'Visualiza y gestiona los tickets de soporte que tienes asignados.'}
          </p>
        </div>
        <Link
          href="/tickets/new"
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-premium hover:bg-indigo-700 active:scale-95 self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          Crear Ticket
        </Link>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Total Tickets', value: totalCount, icon: LifeBuoy, bg: 'bg-indigo-50 text-indigo-600' },
          { label: 'Pendientes', value: openCount, icon: AlertCircle, bg: 'bg-rose-50 text-rose-600' },
          { label: 'En Progreso', value: inProgressCount, icon: Clock, bg: 'bg-amber-50 text-amber-600' },
          { label: 'Resueltos', value: resolvedCount, icon: CheckCircle, bg: 'bg-emerald-50 text-emerald-600' },
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
              <p className="text-2xl font-bold text-slate-900 mt-2">
                {isLoading ? <Loader2 className="h-5 w-5 animate-spin text-slate-300" /> : stat.value}
              </p>
            </div>
          );
        })}
      </div>

      {/* Filters (Supervisor only) */}
      {isSupervisor && (
        <div className="flex flex-wrap gap-3 bg-white/60 p-4 rounded-xl border border-slate-200/60 backdrop-blur-md items-center">
          <div className="flex items-center gap-1.5 text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <Filter className="w-3.5 h-3.5" />
            Filtros:
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs outline-none focus:border-indigo-500"
          >
            <option value="">Todos los estados</option>
            <option value="OPEN">Abierto</option>
            <option value="ASSIGNED">Asignado</option>
            <option value="IN_PROGRESS">En Progreso</option>
            <option value="RESOLVED">Resuelto</option>
            <option value="CLOSED">Cerrado</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs outline-none focus:border-indigo-500"
          >
            <option value="">Todas las prioridades</option>
            <option value="LOW">Baja</option>
            <option value="MEDIUM">Media</option>
            <option value="HIGH">Alta</option>
            <option value="CRITICAL">Crítica</option>
          </select>

          <select
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs outline-none focus:border-indigo-500"
          >
            <option value="">Todos los asignados</option>
            {staffUsers
              ?.filter((u) => u.role === 'TECHNICIAN' || u.role === 'SUPERVISOR' || u.role === 'ADMIN')
              .map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role})
                </option>
              ))}
          </select>
        </div>
      )}

      {/* Tickets List Table */}
      {isLoading ? (
        <div className="flex h-60 items-center justify-center rounded-2xl border border-slate-200 bg-white">
          <div className="flex flex-col items-center gap-3 text-slate-400">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            <p className="text-sm">Buscando tickets de soporte...</p>
          </div>
        </div>
      ) : !tickets || tickets.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 border-dashed bg-white p-12 text-center">
          <div className="rounded-full bg-slate-100 p-4 text-slate-400">
            <LifeBuoy className="h-8 w-8" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-slate-900">No se encontraron tickets</h3>
          <p className="mt-1 text-sm text-slate-500 max-w-sm">
            No hay tickets que coincidan con la búsqueda o filtros aplicados.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden glass-card bg-white/70 border-white/40 shadow-glass rounded-2xl p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-100/50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-6 py-4">Ticket</th>
                  <th className="px-6 py-4">Cliente</th>
                  <th className="px-6 py-4">Prioridad</th>
                  <th className="px-6 py-4">Asignado A</th>
                  <th className="px-6 py-4">Fecha de Creación</th>
                  <th className="px-6 py-4">Estado</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {tickets.map((t) => {
                  return (
                    <tr key={t.id} className="transition hover:bg-slate-50/50">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900">{t.title}</div>
                        <div className="text-xs text-slate-400 line-clamp-1 max-w-xs">{t.description}</div>
                      </td>
                      <td className="px-6 py-4">
                        <Link
                          href={`/customers/${t.customer.id}`}
                          className="font-medium text-indigo-600 hover:underline"
                        >
                          {t.customer.firstName} {t.customer.lastName}
                        </Link>
                      </td>
                      <td className="px-6 py-4">{getPriorityBadge(t.priority)}</td>
                      <td className="px-6 py-4">
                        {t.assignedTo ? (
                          <div className="flex items-center gap-1 text-slate-700">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            <span className="font-medium">{t.assignedTo.name}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">Sin Asignar</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500">
                        {new Date(t.createdAt).toLocaleDateString()} a las{' '}
                        {new Date(t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-6 py-4">{getStatusBadge(t.status)}</td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/tickets/${t.id}`}
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
