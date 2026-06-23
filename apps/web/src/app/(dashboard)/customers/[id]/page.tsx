'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuthStore, hasMinRole } from '@/store/auth.store';
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Calendar,
  DollarSign,
  Plus,
  Trash2,
  Loader2,
  Clock,
  Tag,
  Wifi,
  FileSpreadsheet,
  ShieldAlert,
} from 'lucide-react';
import { useState } from 'react';

interface Payment {
  id: string;
  folio: string;
  amount: string | number;
  method: string;
  paidAt: string;
  notes: string | null;
}

interface CustomerDetail {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  addressLine: string;
  locality: string | null;
  municipality: string | null;
  status: 'ACTIVO' | 'SUSPENDIDO' | 'MOROSO' | 'CANCELADO';
  pppoeUsername: string | null;
  pppoePassword?: string | null;
  ipAddress?: string | null;
  currentBalance: string | number;
  signupDate: string;
  billingCutoffDay: number;
  createdAt: string;
  payments: Payment[];
  mikrotikProfile?: {
    id: string;
    name: string;
    suspensionType: string;
  } | null;
}

export default function CustomerDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [acting, setActing] = useState<'suspend' | 'reactivate' | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const handleAction = async (action: 'suspend' | 'reactivate') => {
    setActing(action);
    setActionMsg(null);
    try {
      await api.post(`/mikrotik/customers/${id}/${action}`);
      setActionMsg(
        action === 'suspend'
          ? 'Servicio suspendido exitosamente en el router.'
          : 'Servicio reactivado exitosamente en el router.'
      );
      queryClient.invalidateQueries({ queryKey: ['customer', id] });
      setTimeout(() => setActionMsg(null), 5000);
    } catch (err: any) {
      setActionMsg(
        err.response?.data?.message ?? 'Ocurrió un error al contactar al MikroTik.'
      );
    } finally {
      setActing(null);
    }
  };

  const canEdit = hasMinRole(user?.role || 'VIEWER', 'SUPERVISOR');
  const canDelete = hasMinRole(user?.role || 'VIEWER', 'ADMIN');

  const { data: customer, isLoading, error } = useQuery<CustomerDetail>({
    queryKey: ['customer', id],
    queryFn: () => api.get(`/customers/${id}`).then((r) => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/customers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      router.push('/customers');
    },
    onError: (err: any) => {
      setDeleting(false);
      setDeleteError(err.response?.data?.message ?? 'No se pudo eliminar el cliente');
    },
  });

  const handleDelete = () => {
    if (confirm('¿Estás seguro de que deseas eliminar este cliente permanentemente de la plataforma? Esta acción no se puede deshacer.')) {
      setDeleting(true);
      setDeleteError(null);
      deleteMutation.mutate();
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
          <p className="text-sm font-medium">Cargando expediente del cliente...</p>
        </div>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="rounded-2xl border border-rose-100 bg-rose-50 p-6 text-center text-rose-600">
        <h3 className="font-bold text-lg">Error al cargar cliente</h3>
        <p className="text-sm mt-1">El cliente solicitado no existe o no tienes permisos de acceso.</p>
        <Link href="/customers" className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:underline">
          <ArrowLeft className="h-4 w-4" /> Volver al listado
        </Link>
      </div>
    );
  }

  const balance = Number(customer.currentBalance);
  const initial = customer.firstName[0].toUpperCase();

  const getStatusBadge = (status: CustomerDetail['status']) => {
    const styles = {
      ACTIVO: 'bg-emerald-50 text-emerald-700 border-emerald-100',
      SUSPENDIDO: 'bg-amber-50 text-amber-700 border-amber-100',
      MOROSO: 'bg-rose-50 text-rose-700 border-rose-100',
      CANCELADO: 'bg-slate-100 text-slate-600 border-slate-200',
    };
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-0.5 text-xs font-semibold ${styles[status]}`}>
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
      {/* Header / Navigation */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href="/customers"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 transition-premium mb-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a Clientes
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
              {customer.firstName} {customer.lastName}
            </h1>
            {getStatusBadge(customer.status)}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canDelete && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-rose-600 shadow-sm transition hover:bg-rose-50 disabled:opacity-50"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Eliminar
            </button>
          )}

          {canEdit && (
            <Link
              href={`/payments/new?customerId=${customer.id}`}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 active:scale-95"
            >
              <Plus className="h-4 w-4" />
              Registrar Cobro
            </Link>
          )}
        </div>
      </div>

      {deleteError && (
        <div className="rounded-xl bg-rose-50 border border-rose-100 p-4 text-sm text-rose-600">
          {deleteError}
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Columns - Info cards */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card: Ficha de Contacto */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3 mb-4">
              Información de la Cuenta
            </h3>
            
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-sm text-slate-600">
                  <span className="rounded-lg bg-slate-100 p-2 text-slate-500">
                    <Phone className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Teléfono</p>
                    <p className="font-semibold text-slate-900">{customer.phone || '—'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-sm text-slate-600">
                  <span className="rounded-lg bg-slate-100 p-2 text-slate-500">
                    <Mail className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Email</p>
                    <p className="font-semibold text-slate-900">{customer.email || '—'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-sm text-slate-600">
                  <span className="rounded-lg bg-slate-100 p-2 text-slate-500">
                    <MapPin className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Dirección</p>
                    <p className="font-semibold text-slate-900">
                      {customer.addressLine}
                      {customer.locality ? `, Col. ${customer.locality}` : ''}
                      {customer.municipality ? `, Mpio. ${customer.municipality}` : ''}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3 text-sm text-slate-600">
                  <span className="rounded-lg bg-slate-100 p-2 text-slate-500">
                    <Calendar className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Fecha de Alta</p>
                    <p className="font-semibold text-slate-900">
                      {new Date(customer.signupDate).toLocaleDateString('es-MX', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-sm text-slate-600">
                  <span className="rounded-lg bg-slate-100 p-2 text-slate-500">
                    <Clock className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Corte de Facturación</p>
                    <p className="font-semibold text-slate-900">Día {customer.billingCutoffDay} de cada mes</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-sm text-slate-600">
                  <span className="rounded-lg bg-slate-100 p-2 text-slate-500">
                    <Wifi className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Credenciales de Internet</p>
                    <p className="font-semibold text-slate-900 font-mono">Usuario: {customer.pppoeUsername || '—'}</p>
                    {customer.pppoePassword && (
                      <p className="text-xs text-slate-500 font-mono">Contraseña: {customer.pppoePassword}</p>
                    )}
                    {customer.ipAddress && (
                      <p className="text-xs text-slate-500 font-mono">IP: {customer.ipAddress}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card: Historial de Pagos */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-lg font-bold text-slate-900">Historial de Pagos</h3>
              <span className="text-xs text-slate-400 uppercase font-semibold">Últimos 10 transacciones</span>
            </div>

            {!customer.payments || customer.payments.length === 0 ? (
              <div className="text-center py-10 text-slate-400">
                <FileSpreadsheet className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                <p className="text-sm">No se han registrado pagos aún en esta cuenta.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wider text-slate-400 bg-slate-50/50">
                      <th className="px-4 py-2">Folio</th>
                      <th className="px-4 py-2">Método</th>
                      <th className="px-4 py-2">Fecha Pago</th>
                      <th className="px-4 py-2">Monto</th>
                      <th className="px-4 py-2">Notas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {customer.payments.map((p) => {
                      const payAmt = Number(p.amount);
                      return (
                        <tr key={p.id} className="hover:bg-slate-50/30">
                          <td className="px-4 py-3 font-mono font-semibold text-slate-800">{p.folio}</td>
                          <td className="px-4 py-3">
                            <span className="inline-flex rounded-lg bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
                              {p.method}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-500">
                            {new Date(p.paidAt).toLocaleDateString('es-MX')}
                          </td>
                          <td className="px-4 py-3 font-semibold text-emerald-600">${payAmt.toFixed(2)}</td>
                          <td className="px-4 py-3 text-xs text-slate-400 truncate max-w-xs">{p.notes || '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Balance Summary */}
        <div className="space-y-6">
          {/* Card: Balance General */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4">Resumen Financiero</h3>
            
            <div className="rounded-2xl bg-slate-50 p-5 text-center border border-slate-100">
              <DollarSign className={`h-10 w-10 mx-auto rounded-full p-2 mb-2 ${
                balance > 0 ? 'bg-rose-50 text-rose-500' : 'bg-emerald-50 text-emerald-500'
              }`} />
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Saldo Adeudado</p>
              <h2 className={`text-3xl font-extrabold mt-1 tracking-tight ${
                balance > 0 ? 'text-rose-600' : 'text-slate-900'
              }`}>
                ${balance.toFixed(2)}
              </h2>
              <p className="text-[11px] text-slate-400 mt-2">
                {balance > 0
                  ? 'El cliente presenta un saldo pendiente de pago en su mensualidad.'
                  : 'La cuenta se encuentra al corriente y libre de adeudos.'}
              </p>
            </div>

            <div className="mt-6 space-y-3.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-400 uppercase tracking-wider">ID Cliente</span>
                <span className="font-mono font-bold text-slate-800">{customer.id}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-400 uppercase tracking-wider">Registrado en</span>
                <span className="font-bold text-slate-800">{new Date(customer.createdAt).toLocaleDateString('es-MX')}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-400 uppercase tracking-wider">Mensualidad</span>
                <span className="font-bold text-slate-800">Corte mensual regular</span>
              </div>
            </div>
          </div>

          {/* Card: Control de MikroTik */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4">Control de MikroTik</h3>
            
            {!customer.mikrotikProfile ? (
              <div className="text-center py-4 text-slate-400 text-xs">
                <ShieldAlert className="h-6 w-6 mx-auto text-slate-300 mb-2" />
                <p>Este cliente no tiene asignado un perfil de MikroTik Router.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-400 uppercase tracking-wider">Router RouterOS</span>
                  <span className="font-bold text-slate-800">{customer.mikrotikProfile.name}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-400 uppercase tracking-wider">Tipo de Corte</span>
                  <span className="font-bold text-slate-800">{customer.mikrotikProfile.suspensionType}</span>
                </div>

                {canEdit && (
                  <div className="pt-3 border-t border-slate-100 flex gap-2">
                    <button
                      onClick={() => handleAction('suspend')}
                      disabled={!!acting}
                      className="flex-1 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 active:scale-95 transition disabled:opacity-50"
                    >
                      {acting === 'suspend' ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin mx-auto text-rose-700" />
                      ) : (
                        'Cortar Internet'
                      )}
                    </button>
                    <button
                      onClick={() => handleAction('reactivate')}
                      disabled={!!acting}
                      className="flex-1 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 active:scale-95 transition disabled:opacity-50"
                    >
                      {acting === 'reactivate' ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin mx-auto text-emerald-700" />
                      ) : (
                        'Reactivar'
                      )}
                    </button>
                  </div>
                )}

                {actionMsg && (
                  <p className="text-[11px] text-center text-indigo-600 mt-2 font-medium bg-indigo-50/50 p-2 rounded-lg leading-relaxed">
                    {actionMsg}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
