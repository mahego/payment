'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import api from '@/lib/api';
import { useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, Save, Loader2, Wifi } from 'lucide-react';

const schema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  description: z.string().optional(),
  speed: z.string().min(1, 'Especifica la velocidad (ej. 10M/5M)'),
  price: z.preprocess(
    (val) => (val === '' || val === undefined ? undefined : Number(val)),
    z.number().positive('El precio debe ser un número positivo')
  ),
  planType: z.enum(['PPPOE', 'SIMPLE_QUEUE', 'HOTSPOT']),
  zoneId: z.string().optional(),
  active: z.boolean().default(true),
});

type Input = z.infer<typeof schema>;

interface ZoneOption {
  id: string;
  name: string;
}

export default function NewServicePlanPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { data: zones } = useQuery<ZoneOption[]>({
    queryKey: ['zones-for-new-plan'],
    queryFn: () => api.get('/zones').then((r) => r.data),
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Input>({
    resolver: zodResolver(schema),
    defaultValues: { planType: 'PPPOE', active: true },
  });

  const onSubmit = async (data: Input) => {
    setError('');
    setLoading(true);
    // Convert empty string zoneId to undefined
    const submitData = {
      ...data,
      zoneId: data.zoneId === '' ? undefined : data.zoneId,
    };
    try {
      await api.post('/service-plans', submitData);
      router.replace('/service-plans');
    } catch (e: any) {
      setError(
        e.response?.data?.message ||
          'Error al crear el plan de internet. Asegúrate de que el nombre no esté duplicado.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Back button & Title */}
      <div className="flex items-center gap-3">
        <Link
          href="/service-plans"
          className="inline-flex items-center justify-center h-10 w-10 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Nuevo Plan de Internet</h1>
          <p className="text-sm text-slate-500">
            Agrega planes de conexión con velocidad y precios fijos al catálogo de ventas.
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-rose-50 border border-rose-100 p-4 text-sm text-rose-700">
          {error}
        </div>
      )}

      {/* Form Card */}
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="glass-card bg-white border border-slate-200/60 shadow-glass rounded-2xl p-6 space-y-6"
      >
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {/* Name */}
          <div className="sm:col-span-2">
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Nombre del Plan
            </label>
            <input
              type="text"
              placeholder="Ej. Plan Residencial 20 Megas, Plan Pyme Pro"
              className={`w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-premium focus:ring-4 ${
                errors.name
                  ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/10'
                  : 'border-slate-200/60 focus:border-indigo-500 focus:ring-indigo-500/10'
              }`}
              {...register('name')}
            />
            {errors.name && (
              <p className="mt-1.5 text-xs text-rose-600 font-medium">{errors.name.message}</p>
            )}
          </div>

          {/* Description */}
          <div className="sm:col-span-2">
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Descripción (Opcional)
            </label>
            <textarea
              rows={3}
              placeholder="Detalles del plan, política de uso justo, etc."
              className="w-full rounded-xl border border-slate-200/60 px-4 py-2.5 text-sm outline-none transition-premium focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
              {...register('description')}
            />
          </div>

          {/* Speed */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Velocidad de Carga/Descarga
            </label>
            <input
              type="text"
              placeholder="Ej. 10M/5M, 50M/50M"
              className={`w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-premium focus:ring-4 ${
                errors.speed
                  ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/10'
                  : 'border-slate-200/60 focus:border-indigo-500 focus:ring-indigo-500/10'
              }`}
              {...register('speed')}
            />
            {errors.speed && (
              <p className="mt-1.5 text-xs text-rose-600 font-medium">{errors.speed.message}</p>
            )}
          </div>

          {/* Price */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Precio Mensual ($)
            </label>
            <input
              type="number"
              step="0.01"
              placeholder="Ej. 350.00"
              className={`w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-premium focus:ring-4 ${
                errors.price
                  ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/10'
                  : 'border-slate-200/60 focus:border-indigo-500 focus:ring-indigo-500/10'
              }`}
              {...register('price')}
            />
            {errors.price && (
              <p className="mt-1.5 text-xs text-rose-600 font-medium">{errors.price.message}</p>
            )}
          </div>

          {/* Plan Type */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Tipo de Servicio en Router
            </label>
            <select
              className="w-full rounded-xl border border-slate-200/60 px-4 py-2.5 text-sm outline-none transition-premium focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
              {...register('planType')}
            >
              <option value="PPPOE">PPPoE (Recomendado)</option>
              <option value="SIMPLE_QUEUE">Simple Queue (Control de Ancho de Banda)</option>
              <option value="HOTSPOT">Hotspot (Fichas / Portal)</option>
            </select>
          </div>

          {/* Zone ID */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Zona de Cobertura (Opcional)
            </label>
            <select
              className="w-full rounded-xl border border-slate-200/60 px-4 py-2.5 text-sm outline-none transition-premium focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
              {...register('zoneId')}
            >
              <option value="">Disponible en todas las zonas</option>
              {zones?.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-3 border-t border-slate-100 pt-6">
          <Link
            href="/service-plans"
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 active:scale-95 transition-premium disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Guardar Plan
          </button>
        </div>
      </form>
    </div>
  );
}
