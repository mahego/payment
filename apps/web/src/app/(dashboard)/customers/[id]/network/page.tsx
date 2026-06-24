'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import api from '@/lib/api';
import Link from 'next/link';
import { ArrowLeft, Loader2, Save, Wifi } from 'lucide-react';
import { useState, useEffect } from 'react';

interface RouterProfile {
  id: string;
  name: string;
  suspensionType: string;
}

interface CustomerNetworkConfig {
  mikrotikProfileId: string | null;
  serviceMode: 'PPPOE' | 'SIMPLE_QUEUE' | 'HOTSPOT' | 'ADDRESS_LIST';
  pppoeUsername: string | null;
  pppoePassword?: string | null;
  ipAddress: string | null;
  simpleQueueName: string | null;
  hotspotUsername: string | null;
  macAddress: string | null;
  suspensionAddressList: string | null;
  isNetworkSuspended: boolean;
}

export default function CustomerNetworkConfigPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const qc = useQueryClient();
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const { data: routers, isLoading: loadingRouters } = useQuery<RouterProfile[]>({
    queryKey: ['mikrotik-profiles'],
    queryFn: () => api.get('/mikrotik-profiles').then((r) => r.data),
  });

  const { data: config, isLoading: loadingConfig } = useQuery<CustomerNetworkConfig>({
    queryKey: ['customer-network', id],
    queryFn: () => api.get(`/customers/${id}/network`).then((r) => r.data),
  });

  const { register, handleSubmit, reset, watch } = useForm();
  const selectedMode = watch('serviceMode');

  useEffect(() => {
    if (config) {
      reset({
        mikrotikProfileId: config.mikrotikProfileId ?? '',
        serviceMode: config.serviceMode,
        pppoeUsername: config.pppoeUsername ?? '',
        pppoePassword: config.pppoePassword ?? '',
        ipAddress: config.ipAddress ?? '',
        simpleQueueName: config.simpleQueueName ?? '',
        hotspotUsername: config.hotspotUsername ?? '',
        macAddress: config.macAddress ?? '',
        suspensionAddressList: config.suspensionAddressList ?? 'suspended',
      });
    }
  }, [config, reset]);

  const updateMutation = useMutation({
    mutationFn: (data: any) => {
      // Clean empty values to null
      const payload = {
        ...data,
        mikrotikProfileId: data.mikrotikProfileId || null,
        pppoeUsername: data.pppoeUsername || null,
        pppoePassword: data.pppoePassword || null,
        ipAddress: data.ipAddress || null,
        simpleQueueName: data.simpleQueueName || null,
        hotspotUsername: data.hotspotUsername || null,
        macAddress: data.macAddress || null,
        suspensionAddressList: data.suspensionAddressList || 'suspended',
      };
      return api.patch(`/customers/${id}/network`, payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customer', id] });
      qc.invalidateQueries({ queryKey: ['customer-network', id] });
      setSuccessMsg('Configuración de red guardada correctamente.');
      setTimeout(() => {
        setSuccessMsg('');
        router.push(`/customers/${id}`);
      }, 2000);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.message ?? 'Ocurrió un error al guardar los parámetros.');
      setTimeout(() => setErrorMsg(''), 5000);
    },
  });

  const onSubmit = (data: any) => {
    setErrorMsg('');
    updateMutation.mutate(data);
  };

  if (loadingConfig || loadingRouters) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
          <p className="text-sm font-medium">Cargando parámetros de red...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <Link
          href={`/customers/${id}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 transition"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al Cliente
        </Link>
      </div>

      <div className="glass-card glass-shine bg-white/70 border-white/40 p-6 shadow-glass">
        <div className="border-b border-slate-100 pb-4 mb-6 flex items-center gap-3">
          <div className="rounded-xl bg-indigo-50 p-2 text-indigo-600">
            <Wifi className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Configuración de Red</h1>
            <p className="text-slate-500 text-sm mt-0.5">Asigna el router y define las credenciales técnicas del servicio.</p>
          </div>
        </div>

        {successMsg && (
          <div className="mb-6 rounded-xl bg-emerald-50 border border-emerald-100 p-4 text-sm text-emerald-800 flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-emerald-500" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="mb-6 rounded-xl bg-rose-50 border border-rose-100 p-4 text-sm text-rose-600">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Router MikroTik</label>
              <select
                className="w-full rounded-xl border border-slate-200/60 bg-white/60 backdrop-blur-md px-4 py-2.5 text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:bg-white/90"
                {...register('mikrotikProfileId')}
              >
                <option value="">Sin router asignado</option>
                {routers?.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.suspensionType})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Modo de Operación</label>
              <select
                className="w-full rounded-xl border border-slate-200/60 bg-white/60 backdrop-blur-md px-4 py-2.5 text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:bg-white/90"
                {...register('serviceMode')}
              >
                <option value="PPPOE">PPPoE (Clientes Dial-In)</option>
                <option value="SIMPLE_QUEUE">Simple Queue (IP Estática + Cola)</option>
                <option value="HOTSPOT">Hotspot (Portal cautivo)</option>
                <option value="ADDRESS_LIST">Address List (Control Firewall)</option>
              </select>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-6 space-y-4">
            <h3 className="text-sm font-semibold text-slate-900">Parámetros Técnicos</h3>

            {/* PPPoE specific inputs */}
            {selectedMode === 'PPPOE' && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Usuario PPPoE</label>
                  <input
                    type="text"
                    placeholder="ej. juan_secreto"
                    className="w-full rounded-xl border border-slate-200/60 bg-white/60 backdrop-blur-md px-4 py-2.5 text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:bg-white/90"
                    {...register('pppoeUsername')}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Contraseña PPPoE</label>
                  <input
                    type="text"
                    placeholder="ej. ppp_pass123"
                    className="w-full rounded-xl border border-slate-200/60 bg-white/60 backdrop-blur-md px-4 py-2.5 text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:bg-white/90"
                    {...register('pppoePassword')}
                  />
                </div>
              </div>
            )}

            {/* Simple Queue specific inputs */}
            {selectedMode === 'SIMPLE_QUEUE' && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Nombre Cola Simple</label>
                  <input
                    type="text"
                    placeholder="ej. queue_juan_perez"
                    className="w-full rounded-xl border border-slate-200/60 bg-white/60 backdrop-blur-md px-4 py-2.5 text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:bg-white/90"
                    {...register('simpleQueueName')}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Dirección IP</label>
                  <input
                    type="text"
                    placeholder="ej. 192.168.100.45"
                    className="w-full rounded-xl border border-slate-200/60 bg-white/60 backdrop-blur-md px-4 py-2.5 text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:bg-white/90"
                    {...register('ipAddress')}
                  />
                </div>
              </div>
            )}

            {/* Hotspot specific inputs */}
            {selectedMode === 'HOTSPOT' && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Usuario Hotspot</label>
                  <input
                    type="text"
                    placeholder="ej. hotspot_user_juan"
                    className="w-full rounded-xl border border-slate-200/60 bg-white/60 backdrop-blur-md px-4 py-2.5 text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:bg-white/90"
                    {...register('hotspotUsername')}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Dirección MAC</label>
                  <input
                    type="text"
                    placeholder="ej. 00:1A:2B:3C:4D:5E"
                    className="w-full rounded-xl border border-slate-200/60 bg-white/60 backdrop-blur-md px-4 py-2.5 text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:bg-white/90"
                    {...register('macAddress')}
                  />
                </div>
              </div>
            )}

            {/* Address List specific inputs */}
            {selectedMode === 'ADDRESS_LIST' && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Dirección IP</label>
                  <input
                    type="text"
                    placeholder="ej. 10.0.50.88"
                    className="w-full rounded-xl border border-slate-200/60 bg-white/60 backdrop-blur-md px-4 py-2.5 text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:bg-white/90"
                    {...register('ipAddress')}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Nombre Lista Redirección</label>
                  <input
                    type="text"
                    defaultValue="suspended"
                    className="w-full rounded-xl border border-slate-200/60 bg-white/60 backdrop-blur-md px-4 py-2.5 text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:bg-white/90"
                    {...register('suspensionAddressList')}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-6 border-t border-slate-100">
            <Link
              href={`/customers/${id}`}
              className="rounded-xl border border-slate-200/60 bg-white/40 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-white/60 transition"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition"
            >
              {updateMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Guardar Cambios
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CheckCircle({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={className}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}
