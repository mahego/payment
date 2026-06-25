'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import api from '@/lib/api';
import { useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, Save, Loader2 } from 'lucide-react';

const schema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  description: z.string().optional(),
  billingCutoffDay: z
    .preprocess(
      (val) => (val === '' || val === undefined ? undefined : Number(val)),
      z.number().min(1).max(28).optional()
    ),
  active: z.boolean().default(true),
});

type Input = z.infer<typeof schema>;

export default function NewZonePage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Input>({
    resolver: zodResolver(schema),
    defaultValues: { active: true },
  });

  const onSubmit = async (data: Input) => {
    setError('');
    setLoading(true);
    try {
      await api.post('/zones', data);
      router.replace('/zones');
    } catch (e: any) {
      setError(
        e.response?.data?.message ||
          'Error al crear la zona. Asegúrate de que el nombre no esté duplicado.'
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
          href="/zones"
          className="inline-flex items-center justify-center h-10 w-10 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Nueva Zona / Sector</h1>
          <p className="text-sm text-slate-500">
            Define una área geográfica para organizar tus clientes y configurar cortes masivos.
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
              Nombre de la Zona
            </label>
            <input
              type="text"
              placeholder="Ej. Sector Norte, Colonia Centro, etc."
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
              placeholder="Detalles sobre cobertura, referencias geográficas o notas."
              className="w-full rounded-xl border border-slate-200/60 px-4 py-2.5 text-sm outline-none transition-premium focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
              {...register('description')}
            />
          </div>

          {/* Cutoff Day */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Día de corte por Zona (Opcional)
            </label>
            <input
              type="number"
              placeholder="Ej. 5 (deja vacío para usar corte individual)"
              className={`w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-premium focus:ring-4 ${
                errors.billingCutoffDay
                  ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/10'
                  : 'border-slate-200/60 focus:border-indigo-500 focus:ring-indigo-500/10'
              }`}
              {...register('billingCutoffDay')}
            />
            <p className="mt-1 text-[11px] text-slate-400">
              Si se especifica, este día sustituye el día de corte individual para todos los clientes de la zona.
            </p>
            {errors.billingCutoffDay && (
              <p className="mt-1.5 text-xs text-rose-600 font-medium">
                {errors.billingCutoffDay.message}
              </p>
            )}
          </div>

          {/* Active status */}
          <div className="flex items-center mt-6">
            <label className="relative flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked {...register('active')} />
              <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-focus:ring-4 peer-focus:ring-indigo-500/10 dark:peer-focus:ring-indigo-500/10 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              <span className="ml-3 text-sm font-semibold text-slate-700">Zona Activa</span>
            </label>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-3 border-t border-slate-100 pt-6">
          <Link
            href="/zones"
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
            Guardar Zona
          </button>
        </div>
      </form>
    </div>
  );
}
