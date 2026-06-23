'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '@/lib/api';
import Link from 'next/link';
import { ArrowLeft, Loader2, Save, Banknote, CreditCard, RefreshCw, Layers } from 'lucide-react';
import { useState, Suspense } from 'react';

const paymentSchema = z.object({
  customerId: z.string().min(1, 'Debes seleccionar un cliente'),
  method: z.enum(['EFECTIVO', 'TRANSFERENCIA', 'DEPOSITO', 'TARJETA']),
  amount: z.coerce.number().min(0.01, 'El monto debe ser mayor a 0'),
  notes: z.string().optional(),
});

type PaymentFormValues = z.infer<typeof paymentSchema>;

interface CustomerListItem {
  id: string;
  firstName: string;
  lastName: string;
  currentBalance: string | number;
}

function NewPaymentForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const initialCustomerId = searchParams.get('customerId') ?? '';

  // Get list of customers to populate dropdown
  const { data: customers, isLoading: loadingCustomers } = useQuery<CustomerListItem[]>({
    queryKey: ['customers-list-minimal'],
    queryFn: () => api.get('/customers').then((r) => r.data),
  });

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      customerId: initialCustomerId,
      method: 'EFECTIVO',
      amount: 0,
      notes: '',
    },
  });

  const selectedCustomerId = watch('customerId');
  const selectedMethod = watch('method');

  // Find selected customer balance for display helper
  const selectedCustomer = customers?.find((c) => c.id === selectedCustomerId);
  const selectedCustomerBalance = selectedCustomer ? Number(selectedCustomer.currentBalance) : null;

  const mutation = useMutation({
    mutationFn: (values: PaymentFormValues) => {
      return api.post('/payments', {
        ...values,
        notes: values.notes || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['customer', selectedCustomerId] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      router.push('/payments');
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message ?? 'Ocurrió un error al registrar el pago';
      setErrorMsg(Array.isArray(msg) ? msg.join(', ') : msg);
    },
  });

  const onSubmit = (data: PaymentFormValues) => {
    setErrorMsg(null);
    mutation.mutate(data);
  };

  const methodsList = [
    { value: 'EFECTIVO', label: 'Efectivo', icon: Banknote, bg: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
    { value: 'TRANSFERENCIA', label: 'Transferencia', icon: RefreshCw, bg: 'bg-blue-50 text-blue-600 border-blue-200' },
    { value: 'DEPOSITO', label: 'Depósito', icon: Layers, bg: 'bg-indigo-50 text-indigo-600 border-indigo-200' },
    { value: 'TARJETA', label: 'Tarjeta', icon: CreditCard, bg: 'bg-violet-50 text-violet-600 border-violet-200' },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back Button */}
      <div>
        <Link
          href="/payments"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 transition-premium"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a Pagos
        </Link>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="border-b border-slate-100 pb-4 mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Registrar Nuevo Pago</h1>
          <p className="text-slate-500 text-sm mt-1">
            Ingresa el abono del cliente. El saldo de su cuenta se actualizará de inmediato.
          </p>
        </div>

        {errorMsg && (
          <div className="mb-6 rounded-xl bg-rose-50 border border-rose-100 p-4 text-sm text-rose-600">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Customer Selection */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              Cliente *
            </label>
            {loadingCustomers ? (
              <div className="flex items-center gap-2 text-sm text-slate-400 py-2.5">
                <Loader2 className="h-4 w-4 animate-spin" />
                Cargando lista de clientes...
              </div>
            ) : (
              <select
                {...register('customerId')}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition-premium focus:border-indigo-500"
              >
                <option value="">Selecciona un cliente de la lista...</option>
                {customers?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.firstName} {c.lastName} (Adeudo: ${Number(c.currentBalance).toFixed(2)})
                  </option>
                ))}
              </select>
            )}
            {errors.customerId && (
              <p className="text-rose-500 text-xs mt-1">{errors.customerId.message}</p>
            )}
          </div>

          {/* Balance Helper Box */}
          {selectedCustomerBalance !== null && (
            <div className="rounded-xl bg-slate-50 p-4 border border-slate-100 flex items-center justify-between text-sm">
              <span className="text-slate-500">Saldo actual del cliente:</span>
              <span className={`font-bold ${selectedCustomerBalance > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                ${selectedCustomerBalance.toFixed(2)}
              </span>
            </div>
          )}

          {/* Payment Method Selector */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
              Método de Pago *
            </label>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {methodsList.map((m) => {
                const Icon = m.icon;
                const active = selectedMethod === m.value;
                return (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setValue('method', m.value as any)}
                    className={`flex flex-col items-center justify-center gap-2 rounded-xl border p-3 text-center transition-all ${
                      active
                        ? `${m.bg} border-indigo-500 ring-2 ring-indigo-500/10`
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-xs font-bold">{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Amount */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                Monto del Pago *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-medium">$</span>
                <input
                  type="number"
                  step="0.01"
                  {...register('amount')}
                  className="w-full rounded-xl border border-slate-200 bg-white pl-8 pr-4 py-2.5 text-sm outline-none transition-premium focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 font-semibold"
                  placeholder="0.00"
                />
              </div>
              {errors.amount && (
                <p className="text-rose-500 text-xs mt-1">{errors.amount.message}</p>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                Notas / Concepto
              </label>
              <input
                type="text"
                {...register('notes')}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition-premium focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                placeholder="Ej. Abono mensualidad Junio"
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 border-t border-slate-100 pt-6">
            <Link
              href="/payments"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
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
                  Registrando pago...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Registrar Pago
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function NewPaymentPage() {
  return (
    <Suspense fallback={
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    }>
      <NewPaymentForm />
    </Suspense>
  );
}
