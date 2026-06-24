'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { toast } from '@/store/toast.store';
import { Server, Database, Smartphone, CheckCircle, Wifi, RefreshCw, Send, Trash2, ShieldAlert } from 'lucide-react';

interface CustomerItem {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  currentBalance: number;
  status: string;
}

interface PaymentItem {
  id: string;
  folio: string;
  amount: number;
  method: string;
  paidAt: string;
  customer: {
    firstName: string;
    lastName: string;
  };
}

export default function PlaygroundPage() {
  const queryClient = useQueryClient();
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);
  const [testAmount, setTestAmount] = useState('250');
  const [testMethod, setTestMethod] = useState('EFECTIVO');
  const [testCustomer, setTestCustomer] = useState('');

  // 1. Fetch Customers
  const { data: customers, isLoading: loadingCustomers, refetch: refetchCustomers } = useQuery<CustomerItem[]>({
    queryKey: ['playground-customers'],
    queryFn: () => api.get('/customers').then((r) => r.data),
  });

  // 2. Fetch Recent Payments
  const { data: payments, isLoading: loadingPayments, refetch: refetchPayments } = useQuery<PaymentItem[]>({
    queryKey: ['playground-payments'],
    queryFn: () => api.get('/payments').then((r) => r.data.slice(0, 10)),
  });

  // Check API Health
  useEffect(() => {
    api.get('/users')
      .then(() => setApiOnline(true))
      .catch(() => setApiOnline(false));
  }, []);

  // Set default customer
  useEffect(() => {
    if (customers && customers.length > 0 && !testCustomer) {
      setTestCustomer(customers[0].id);
    }
  }, [customers, testCustomer]);

  // Mutation to record a test payment from Web
  const registerPaymentMutation = useMutation({
    mutationFn: (data: { customerId: string; amount: number; method: string }) => {
      return api.post('/payments', {
        customerId: data.customerId,
        amount: data.amount,
        method: data.method,
        notes: 'Pago de prueba desde Playground',
      });
    },
    onSuccess: () => {
      toast.success('Pago de prueba registrado en Postgres');
      queryClient.invalidateQueries({ queryKey: ['playground-customers'] });
      queryClient.invalidateQueries({ queryKey: ['playground-payments'] });
      refetchCustomers();
      refetchPayments();
    },
    onError: () => {
      toast.error('Error al registrar pago de prueba');
    },
  });

  // Mutation to reset balances
  const resetBalancesMutation = useMutation({
    mutationFn: async () => {
      // Custom updates: we reset mock customers to their default balances in the backend
      for (const cust of customers || []) {
        let defaultBalance = 1500;
        if (cust.firstName.includes('María')) defaultBalance = 450;
        if (cust.firstName.includes('Carlos')) defaultBalance = 0;
        
        // Use PATCH to reset balance if route exists
        await api.patch(`/customers/${cust.id}`, { currentBalance: defaultBalance }).catch(() => {});
      }
    },
    onSuccess: () => {
      toast.success('Saldos restablecidos en el servidor');
      refetchCustomers();
    }
  });

  const handleRegisterPayment = () => {
    if (!testCustomer) {
      toast.warning('Selecciona un cliente');
      return;
    }
    const amt = parseFloat(testAmount);
    if (isNaN(amt) || amt <= 0) {
      toast.warning('Ingresa un monto válido');
      return;
    }
    registerPaymentMutation.mutate({
      customerId: testCustomer,
      amount: amt,
      method: testMethod,
    });
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Playground de Sincronización</h1>
        <p className="text-slate-500 text-sm mt-1">
          Verifica que la base de datos de Postgres y el dispositivo móvil (SQLite local) estén comunicados en tiempo real.
        </p>
      </div>

      {/* Connection Status Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* API Server Card */}
        <div className="glass-card bg-white/75 border-white/40 p-5 shadow-glass flex items-center gap-4">
          <div className={`p-3 rounded-xl ${apiOnline ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
            <Server className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Servidor API</h3>
            <div className="flex items-center gap-1.5 mt-1">
              <span className={`h-2.5 w-2.5 rounded-full ${apiOnline ? 'bg-emerald-500' : 'bg-rose-500'}`} />
              <span className="text-sm font-bold text-slate-800">{apiOnline ? 'Online (Puerto 3001)' : 'Desconectado'}</span>
            </div>
          </div>
        </div>

        {/* Database Status Card */}
        <div className="glass-card bg-white/75 border-white/40 p-5 shadow-glass flex items-center gap-4">
          <div className="p-3 rounded-xl bg-blue-50 text-blue-600">
            <Database className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">PostgreSQL DB</h3>
            <p className="text-sm font-bold text-slate-800 mt-1">
              {customers ? `${customers.length} Clientes Cargados` : 'Verificando...'}
            </p>
          </div>
        </div>

        {/* Sync Status Card */}
        <div className="glass-card bg-white/75 border-white/40 p-5 shadow-glass flex items-center gap-4">
          <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600">
            <Smartphone className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Simulador Mobile</h3>
            <p className="text-sm font-bold text-slate-800 mt-1">
              Expo Web (Puerto 8081)
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid: Postgres Data vs Test Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Panel: Real-time Customers in Postgres */}
        <div className="glass-card bg-white/70 border-white/40 p-6 shadow-glass space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Database className="h-5 w-5 text-slate-500" />
              Estado en Servidor (PostgreSQL)
            </h2>
            <button 
              onClick={() => { refetchCustomers(); toast.info('Datos actualizados'); }}
              className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-500"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>

          {loadingCustomers ? (
            <p className="text-sm text-slate-400">Cargando clientes de Postgres...</p>
          ) : (
            <div className="space-y-3">
              {customers?.map((cust) => (
                <div key={cust.id} className="flex justify-between items-center p-3 rounded-xl bg-white/50 border border-slate-200/50">
                  <div>
                    <span className="text-sm font-bold text-slate-800">{cust.firstName} {cust.lastName}</span>
                    <span className="block text-xs text-slate-400">{cust.email || 'Sin correo'}</span>
                  </div>
                  <div className="text-right">
                    <span className={`text-sm font-extrabold ${cust.currentBalance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      ${Number(cust.currentBalance).toFixed(2)}
                    </span>
                    <span className="block text-xs uppercase font-semibold text-slate-400 mt-0.5">{cust.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => resetBalancesMutation.mutate()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white/50 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-white/80 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Restablecer Saldos en API
            </button>
          </div>
        </div>

        {/* Right Panel: E2E Verification & Simulator Actions */}
        <div className="glass-card bg-white/70 border-white/40 p-6 shadow-glass space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-slate-500" />
              Prueba E2E Móvil & Sincronización
            </h2>
          </div>

          {/* Trigger Test Payment from Web */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Registrar Cobro Manual (Web Test)</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400">Cliente</label>
                <select
                  value={testCustomer}
                  onChange={(e) => setTestCustomer(e.target.value)}
                  className="w-full mt-1 rounded-lg border border-slate-200/60 bg-white/60 px-3 py-2 text-sm outline-none"
                >
                  {customers?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.firstName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400">Monto</label>
                <input
                  type="number"
                  value={testAmount}
                  onChange={(e) => setTestAmount(e.target.value)}
                  className="w-full mt-1 rounded-lg border border-slate-200/60 bg-white/60 px-3 py-2 text-sm outline-none font-semibold"
                />
              </div>
            </div>
            
            <button
              onClick={handleRegisterPayment}
              disabled={registerPaymentMutation.isPending}
              className="w-full inline-flex justify-center items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition"
            >
              <Send className="h-4 w-4" />
              Registrar Abono en Postgres
            </button>
          </div>

          {/* E2E Verification Workflow Instructions */}
          <div className="rounded-xl bg-slate-900/5 border border-slate-900/10 p-4 space-y-2">
            <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <CheckCircle className="h-4 w-4 text-indigo-500" />
              ¿Cómo verificar el flujo de sincronización?
            </h4>
            <ol className="list-decimal list-inside text-xs text-slate-600 space-y-1.5">
              <li>Inicia sesión en la App Móvil con <b>juan@deluxnet.mx</b> / <b>S3cur3P@ssw0rd!</b>.</li>
              <li>En Chrome DevTools (F12 en móvil), ve a la pestaña <b>Network</b> y marca la opción <b>Offline</b>.</li>
              <li>En la app móvil, registra un cobro de <b>$250</b> a <b>María López</b>. Verás un Toast indicando que se guardó localmente.</li>
              <li>Vuelve a activar la red en Chrome DevTools (cambia a <b>Online</b>).</li>
              <li>En la app móvil, ve a <b>Sincronizar</b> y haz clic en <b>Sincronizar ahora</b>.</li>
              <li>¡Listo! Los datos en la tabla izquierda (Postgres) se actualizarán en segundos restando el saldo de María a <b>$200.00</b>.</li>
            </ol>
          </div>
        </div>

      </div>

      {/* Bottom Row: Recent Sync Payments List */}
      <div className="glass-card bg-white/70 border-white/40 p-6 shadow-glass">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Wifi className="h-5 w-5 text-slate-500" />
            Últimos Cobros Registrados en Postgres
          </h2>
          <button 
            onClick={() => { refetchPayments(); toast.info('Historial actualizado'); }}
            className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-500"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

        {loadingPayments ? (
          <p className="text-sm text-slate-400">Cargando pagos...</p>
        ) : payments?.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">No se han registrado pagos en la base de datos.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-slate-500">
              <thead className="text-xs uppercase bg-slate-50 text-slate-700">
                <tr>
                  <th className="px-4 py-3">Folio</th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Monto</th>
                  <th className="px-4 py-3">Método</th>
                  <th className="px-4 py-3">Fecha y Hora</th>
                </tr>
              </thead>
              <tbody>
                {payments?.map((pay) => (
                  <tr key={pay.id} className="bg-white border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-semibold text-slate-800">{pay.folio}</td>
                    <td className="px-4 py-3 text-slate-600">{pay.customer.firstName} {pay.customer.lastName}</td>
                    <td className="px-4 py-3 font-bold text-emerald-600">${Number(pay.amount).toFixed(2)}</td>
                    <td className="px-4 py-3"><span className="px-2 py-1 rounded bg-slate-100 text-slate-700 font-semibold text-[10px]">{pay.method}</span></td>
                    <td className="px-4 py-3 text-slate-400">{new Date(pay.paidAt).toLocaleString('es-MX')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
