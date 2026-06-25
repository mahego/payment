'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import api from '@/lib/api';
import { useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, Save, Loader2, Search, User, Check } from 'lucide-react';

const schema = z.object({
  customerId: z.string().min(1, 'Debes seleccionar un cliente'),
  title: z.string().min(3, 'El título del reporte debe tener al menos 3 caracteres'),
  description: z.string().min(5, 'Describe la falla con mayor detalle'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  assignedToId: z.string().optional(),
});

type Input = z.infer<typeof schema>;

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  pppoeUsername: string | null;
}

interface StaffUser {
  id: string;
  name: string;
  role: string;
}

export default function NewTicketPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Customer search state
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<Input>({
    resolver: zodResolver(schema),
    defaultValues: { priority: 'MEDIUM' },
  });

  // Query customers
  const { data: customers, isLoading: loadingCustomers } = useQuery<Customer[]>({
    queryKey: ['customers-search-ticket', customerSearch],
    queryFn: () =>
      api.get('/customers', { params: { query: customerSearch || undefined } }).then((r) => r.data),
    enabled: customerSearch.length >= 2, // Search only when typing 2+ characters
  });

  // Query staff to assign (Technician, Supervisor, Admin)
  const { data: staff } = useQuery<StaffUser[]>({
    queryKey: ['staff-assign-ticket'],
    queryFn: () => api.get('/users').then((r) => r.data),
  });

  const onSubmit = async (data: Input) => {
    setError('');
    setLoading(true);
    const submitData = {
      ...data,
      assignedToId: data.assignedToId === '' ? undefined : data.assignedToId,
    };
    try {
      await api.post('/tickets', submitData);
      router.replace('/tickets');
    } catch (e: any) {
      setError(e.response?.data?.message || 'Error al crear el ticket de soporte.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCustomer = (cust: Customer) => {
    setSelectedCustomer(cust);
    setValue('customerId', cust.id, { shouldValidate: true });
    setCustomerSearch(''); // Clear search
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Back button & Title */}
      <div className="flex items-center gap-3">
        <Link
          href="/tickets"
          className="inline-flex items-center justify-center h-10 w-10 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Crear Ticket de Soporte</h1>
          <p className="text-sm text-slate-500">
            Registra una orden de servicio o reporte técnico para un cliente.
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
        {/* Customer Selection */}
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-slate-700">
            Seleccionar Cliente
          </label>

          {selectedCustomer ? (
            <div className="flex items-center justify-between rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 font-bold">
                  {selectedCustomer.firstName[0]}
                </div>
                <div>
                  <div className="font-bold text-indigo-950">
                    {selectedCustomer.firstName} {selectedCustomer.lastName}
                  </div>
                  <div className="text-xs text-indigo-600">
                    {selectedCustomer.pppoeUsername ? `PPPoE: ${selectedCustomer.pppoeUsername}` : 'Sin PPPoE'}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedCustomer(null);
                  setValue('customerId', '');
                }}
                className="text-xs font-semibold text-rose-600 hover:underline"
              >
                Cambiar Cliente
              </button>
            </div>
          ) : (
            <div className="space-y-2 relative">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Busca cliente por nombre o PPPoE (mínimo 2 letras)..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  className={`w-full rounded-xl border px-4 py-2.5 pl-10 text-sm outline-none transition-premium focus:ring-4 ${
                    errors.customerId
                      ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/10'
                      : 'border-slate-200/60 focus:border-indigo-500 focus:ring-indigo-500/10'
                  }`}
                />
              </div>

              {/* Suggestions dropdown */}
              {customerSearch.length >= 2 && (
                <div className="absolute z-10 w-full rounded-xl border border-slate-200/60 bg-white shadow-lg overflow-hidden max-h-60 overflow-y-auto">
                  {loadingCustomers ? (
                    <div className="p-4 text-center text-xs text-slate-400 flex justify-center gap-2 items-center">
                      <Loader2 className="w-4 h-4 animate-spin" /> Buscando clientes...
                    </div>
                  ) : !customers || customers.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400">
                      No se encontraron resultados para "{customerSearch}"
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {customers.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => handleSelectCustomer(c)}
                          className="w-full px-4 py-3 text-left hover:bg-indigo-50/50 flex justify-between items-center transition"
                        >
                          <div>
                            <span className="font-semibold text-slate-900">
                              {c.firstName} {c.lastName}
                            </span>
                            <span className="text-xs text-slate-400 block">
                              {c.pppoeUsername ? `PPPoE: ${c.pppoeUsername}` : 'Sin PPPoE'}
                            </span>
                          </div>
                          <span className="text-xs font-semibold text-indigo-600">Seleccionar</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {errors.customerId && (
            <p className="text-xs text-rose-600 font-medium">{errors.customerId.message}</p>
          )}
        </div>

        {/* Title */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">
            Asunto o Título del Reporte
          </label>
          <input
            type="text"
            placeholder="Ej. Corte intermitente, Baja velocidad, Falla router"
            className={`w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-premium focus:ring-4 ${
              errors.title
                ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/10'
                : 'border-slate-200/60 focus:border-indigo-500 focus:ring-indigo-500/10'
            }`}
            {...register('title')}
          />
          {errors.title && (
            <p className="mt-1.5 text-xs text-rose-600 font-medium">{errors.title.message}</p>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">
            Detalle del Reporte
          </label>
          <textarea
            rows={4}
            placeholder="Describe la falla reportada por el cliente..."
            className={`w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-premium focus:ring-4 ${
              errors.description
                ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/10'
                : 'border-slate-200/60 focus:border-indigo-500 focus:ring-indigo-500/10'
            }`}
            {...register('description')}
          />
          {errors.description && (
            <p className="mt-1.5 text-xs text-rose-600 font-medium">{errors.description.message}</p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {/* Priority */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Prioridad
            </label>
            <select
              className="w-full rounded-xl border border-slate-200/60 px-4 py-2.5 text-sm outline-none transition-premium focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
              {...register('priority')}
            >
              <option value="LOW">Baja</option>
              <option value="MEDIUM">Media</option>
              <option value="HIGH">Alta</option>
              <option value="CRITICAL">Crítica</option>
            </select>
          </div>

          {/* Assigned To ID */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Asignar a Técnico (Opcional)
            </label>
            <select
              className="w-full rounded-xl border border-slate-200/60 px-4 py-2.5 text-sm outline-none transition-premium focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
              {...register('assignedToId')}
            >
              <option value="">Sin Asignar (Abierto)</option>
              {staff
                ?.filter((s) => s.role === 'TECHNICIAN' || s.role === 'SUPERVISOR' || s.role === 'ADMIN')
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.role})
                  </option>
                ))}
            </select>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-3 border-t border-slate-100 pt-6">
          <Link
            href="/tickets"
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
            Crear Ticket
          </button>
        </div>
      </form>
    </div>
  );
}
