'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { customerSchema, type CustomerFormValues } from '@/schemas/customer.schema';
import api from '@/lib/api';
import Link from 'next/link';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import { useState } from 'react';

interface ZoneOption {
  id: string;
  name: string;
}

interface PlanOption {
  id: string;
  name: string;
  speed: string;
}

export default function NewCustomerPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Query Zones
  const { data: zones } = useQuery<ZoneOption[]>({
    queryKey: ['zones-options'],
    queryFn: () => api.get('/zones').then((r) => r.data),
  });

  // Query Plans
  const { data: plans } = useQuery<PlanOption[]>({
    queryKey: ['plans-options'],
    queryFn: () => api.get('/service-plans').then((r) => r.data),
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      phone: '',
      email: '',
      addressLine: '',
      locality: '',
      municipality: '',
      pppoeUsername: '',
      currentBalance: 0,
      signupDate: new Date().toISOString().slice(0, 10),
      billingCutoffDay: 5,
      zoneId: '',
      planId: '',
    },
  });

  const mutation = useMutation({
    mutationFn: (values: CustomerFormValues) => {
      // Convert empty strings to undefined so backend treats them as null
      const payload = {
        ...values,
        phone: values.phone || undefined,
        email: values.email || undefined,
        locality: values.locality || undefined,
        municipality: values.municipality || undefined,
        pppoeUsername: values.pppoeUsername || undefined,
        signupDate: new Date(values.signupDate).toISOString(),
        zoneId: values.zoneId || undefined,
        planId: values.planId || undefined,
      };
      return api.post('/customers', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      router.push('/customers');
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message ?? 'Ocurrió un error al crear el cliente';
      setErrorMsg(Array.isArray(msg) ? msg.join(', ') : msg);
    },
  });

  const onSubmit = (data: CustomerFormValues) => {
    setErrorMsg(null);
    mutation.mutate(data);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back button */}
      <div>
        <Link
          href="/customers"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 transition-premium"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a Clientes
        </Link>
      </div>

      <div className="glass-card glass-shine bg-white/70 border-white/40 p-6 shadow-glass">
        <div className="border-b border-slate-100 pb-4 mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Registrar Nuevo Cliente</h1>
          <p className="text-slate-500 text-sm mt-1">
            Ingresa los datos personales, de facturación y técnicos del nuevo cliente.
          </p>
        </div>

        {errorMsg && (
          <div className="mb-6 rounded-xl bg-rose-50 border border-rose-100 p-4 text-sm text-rose-600">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* First Name */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                Nombre(s) *
              </label>
              <input
                type="text"
                {...register('firstName')}
                className="w-full rounded-xl border border-slate-200/60 bg-white/60 backdrop-blur-md px-4 py-2.5 text-sm outline-none transition-premium focus:border-indigo-500 focus:bg-white/90 focus:ring-4 focus:ring-indigo-500/10"
                placeholder="Ej. Juan"
              />
              {errors.firstName && (
                <p className="text-rose-500 text-xs mt-1">{errors.firstName.message}</p>
              )}
            </div>

            {/* Last Name */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                Apellido(s) *
              </label>
              <input
                type="text"
                {...register('lastName')}
                className="w-full rounded-xl border border-slate-200/60 bg-white/60 backdrop-blur-md px-4 py-2.5 text-sm outline-none transition-premium focus:border-indigo-500 focus:bg-white/90 focus:ring-4 focus:ring-indigo-500/10"
                placeholder="Ej. Pérez"
              />
              {errors.lastName && (
                <p className="text-rose-500 text-xs mt-1">{errors.lastName.message}</p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                Teléfono
              </label>
              <input
                type="text"
                {...register('phone')}
                className="w-full rounded-xl border border-slate-200/60 bg-white/60 backdrop-blur-md px-4 py-2.5 text-sm outline-none transition-premium focus:border-indigo-500 focus:bg-white/90 focus:ring-4 focus:ring-indigo-500/10"
                placeholder="Ej. +525512345678"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                Correo electrónico
              </label>
              <input
                type="text"
                {...register('email')}
                className="w-full rounded-xl border border-slate-200/60 bg-white/60 backdrop-blur-md px-4 py-2.5 text-sm outline-none transition-premium focus:border-indigo-500 focus:bg-white/90 focus:ring-4 focus:ring-indigo-500/10"
                placeholder="Ej. juan.perez@example.com"
              />
              {errors.email && (
                <p className="text-rose-500 text-xs mt-1">{errors.email.message}</p>
              )}
            </div>
          </div>

          <div className="border-t border-slate-100 pt-6">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Dirección y Localidad</h3>
            <div className="space-y-4">
              {/* Address Line */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  Calle y Número *
                </label>
                <input
                  type="text"
                  {...register('addressLine')}
                  className="w-full rounded-xl border border-slate-200/60 bg-white/60 backdrop-blur-md px-4 py-2.5 text-sm outline-none transition-premium focus:border-indigo-500 focus:bg-white/90 focus:ring-4 focus:ring-indigo-500/10"
                  placeholder="Ej. Av. Hidalgo #45"
                />
                {errors.addressLine && (
                  <p className="text-rose-500 text-xs mt-1">{errors.addressLine.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Locality */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                    Localidad / Barrio
                  </label>
                  <input
                    type="text"
                    {...register('locality')}
                    className="w-full rounded-xl border border-slate-200/60 bg-white/60 backdrop-blur-md px-4 py-2.5 text-sm outline-none transition-premium focus:border-indigo-500 focus:bg-white/90 focus:ring-4 focus:ring-indigo-500/10"
                    placeholder="Ej. San Ángel"
                  />
                </div>

                {/* Municipality */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                    Municipio / Ciudad
                  </label>
                  <input
                    type="text"
                    {...register('municipality')}
                    className="w-full rounded-xl border border-slate-200/60 bg-white/60 backdrop-blur-md px-4 py-2.5 text-sm outline-none transition-premium focus:border-indigo-500 focus:bg-white/90 focus:ring-4 focus:ring-indigo-500/10"
                    placeholder="Ej. Zapopan"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-6">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Parámetros de Servicio</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* PPPoE Username */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  Usuario PPPoE / Antena
                </label>
                <input
                  type="text"
                  {...register('pppoeUsername')}
                  className="w-full rounded-xl border border-slate-200/60 bg-white/60 backdrop-blur-md px-4 py-2.5 text-sm outline-none transition-premium focus:border-indigo-500 focus:bg-white/90 focus:ring-4 focus:ring-indigo-500/10"
                  placeholder="Ej. user_cutoff_10"
                />
              </div>

              {/* Cutoff Day */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  Día de corte facturación *
                </label>
                <input
                  type="number"
                  {...register('billingCutoffDay')}
                  className="w-full rounded-xl border border-slate-200/60 bg-white/60 backdrop-blur-md px-4 py-2.5 text-sm outline-none transition-premium focus:border-indigo-500 focus:bg-white/90 focus:ring-4 focus:ring-indigo-500/10"
                  placeholder="Ej. 5"
                />
                {errors.billingCutoffDay && (
                  <p className="text-rose-500 text-xs mt-1">{errors.billingCutoffDay.message}</p>
                )}
              </div>

              {/* Initial Balance */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  Saldo de apertura (Adeudo inicial)
                </label>
                <input
                  type="number"
                  step="0.01"
                  {...register('currentBalance')}
                  className="w-full rounded-xl border border-slate-200/60 bg-white/60 backdrop-blur-md px-4 py-2.5 text-sm outline-none transition-premium focus:border-indigo-500 focus:bg-white/90 focus:ring-4 focus:ring-indigo-500/10"
                  placeholder="Ej. 0.00"
                />
                {errors.currentBalance && (
                  <p className="text-rose-500 text-xs mt-1">{errors.currentBalance.message}</p>
                )}
              </div>

              {/* Signup Date */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  Fecha de registro / alta *
                </label>
                <input
                  type="date"
                  {...register('signupDate')}
                  className="w-full rounded-xl border border-slate-200/60 bg-white/60 backdrop-blur-md px-4 py-2.5 text-sm outline-none transition-premium focus:border-indigo-500 focus:bg-white/90 focus:ring-4 focus:ring-indigo-500/10"
                />
                {errors.signupDate && (
                  <p className="text-rose-500 text-xs mt-1">{errors.signupDate.message}</p>
                )}
              </div>

              {/* Zone ID */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  Sector / Zona de Cobertura
                </label>
                <select
                  {...register('zoneId')}
                  className="w-full rounded-xl border border-slate-200/60 bg-white/60 backdrop-blur-md px-4 py-2.5 text-sm outline-none transition-premium focus:border-indigo-500 focus:bg-white/90 focus:ring-4 focus:ring-indigo-500/10"
                >
                  <option value="">Sin Asignar</option>
                  {zones?.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Plan ID */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  Plan de Internet
                </label>
                <select
                  {...register('planId')}
                  className="w-full rounded-xl border border-slate-200/60 bg-white/60 backdrop-blur-md px-4 py-2.5 text-sm outline-none transition-premium focus:border-indigo-500 focus:bg-white/90 focus:ring-4 focus:ring-indigo-500/10"
                >
                  <option value="">Sin Plan Asignado</option>
                  {plans?.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.speed})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-6">
            <Link
              href="/customers"
              className="rounded-xl border border-slate-200/60 bg-white/40 px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-glass hover:bg-white/60 hover:-translate-y-0.5 transition duration-300"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-50 active:scale-95"
            >
              {mutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Registrando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Guardar Cliente
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
