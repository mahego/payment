'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import api from '@/lib/api';
import { useState } from 'react';
import {
  Settings,
  Plus,
  Trash2,
  Edit2,
  Server,
  Loader2,
  CheckCircle,
  AlertCircle,
  Wifi,
  Users,
  ShieldAlert,
} from 'lucide-react';

interface MikrotikProfile {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  suspensionType: 'PPPOE' | 'QUEUE' | 'ADDRESS_LIST';
  pppoeService: string | null;
  addressListName: string | null;
  active: boolean;
}

export default function MikrotikSettingsPage() {
  const qc = useQueryClient();
  const [editingProfile, setEditingProfile] = useState<MikrotikProfile | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const { data: profiles, isLoading } = useQuery<MikrotikProfile[]>({
    queryKey: ['mikrotik-profiles'],
    queryFn: () => api.get('/mikrotik/profiles').then((r) => r.data),
  });

  const { register, handleSubmit, reset, setValue } = useForm();

  const saveMutation = useMutation({
    mutationFn: (data: any) => {
      if (editingProfile) {
        return api.patch(`/mikrotik/profiles/${editingProfile.id}`, data);
      }
      return api.post('/mikrotik/profiles', data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mikrotik-profiles'] });
      setSuccessMsg(
        editingProfile
          ? 'Perfil MikroTik actualizado con éxito.'
          : 'Nuevo perfil MikroTik registrado con éxito.'
      );
      resetForm();
      setTimeout(() => setSuccessMsg(''), 4000);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.message ?? 'Ocurrió un error al guardar el perfil.');
      setTimeout(() => setErrorMsg(''), 5000);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/mikrotik/profiles/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mikrotik-profiles'] });
      setSuccessMsg('Perfil eliminado con éxito.');
      setTimeout(() => setSuccessMsg(''), 4000);
    },
  });

  const resetForm = () => {
    reset();
    setEditingProfile(null);
    setShowForm(false);
  };

  const handleEdit = (profile: MikrotikProfile) => {
    setEditingProfile(profile);
    setValue('name', profile.name);
    setValue('host', profile.host);
    setValue('port', profile.port);
    setValue('username', profile.username);
    setValue('password', ''); // Require new typing or ignore if blank in backend
    setValue('suspensionType', profile.suspensionType);
    setValue('pppoeService', profile.pppoeService ?? '');
    setValue('addressListName', profile.addressListName ?? 'suspended');
    setValue('active', profile.active);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('¿Estás seguro de que deseas eliminar este perfil? Se perderá la configuración de corte para los clientes asociados.')) {
      deleteMutation.mutate(id);
    }
  };

  const onSubmit = (data: any) => {
    // If updating and password is blank, remove it so backend doesn't change it
    if (editingProfile && !data.password) {
      delete data.password;
    }
    data.port = parseInt(data.port) || 8728;
    saveMutation.mutate(data);
  };

  return (
    <div className="space-y-8 max-w-5xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Integración con MikroTik</h1>
          <p className="text-sm text-slate-500 mt-1">
            Configura las conexiones a tus routers RouterOS para automatizar cortes y reactivaciones de clientes.
          </p>
        </div>

        {!showForm && (
          <button
            onClick={() => {
              reset();
              setShowForm(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-premium hover:bg-indigo-700 transition"
          >
            <Plus className="h-4 w-4" />
            Nuevo Router
          </button>
        )}
      </div>

      {successMsg && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-100 p-4 text-emerald-800 text-sm shadow-sm">
          <CheckCircle className="h-4 w-4 text-emerald-500 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-100 p-4 text-rose-800 text-sm shadow-sm">
          <AlertCircle className="h-4 w-4 text-rose-500 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {showForm && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-4 border-b border-slate-100 pb-2">
            {editingProfile ? `Editar Perfil: ${editingProfile.name}` : 'Registrar Nuevo MikroTik'}
          </h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Nombre Identificador</label>
                <input
                  type="text"
                  placeholder="ej. Core-Router"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none"
                  required
                  {...register('name')}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Host (IP / Dominio)</label>
                <input
                  type="text"
                  placeholder="ej. 192.168.88.1"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none"
                  required
                  {...register('host')}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Puerto API</label>
                <input
                  type="number"
                  defaultValue={8728}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none"
                  required
                  {...register('port')}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Usuario RouterOS</label>
                <input
                  type="text"
                  placeholder="admin"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none"
                  required
                  {...register('username')}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Contraseña</label>
                <input
                  type="password"
                  placeholder={editingProfile ? 'Dejar en blanco para no cambiar' : '••••••••'}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none"
                  required={!editingProfile}
                  {...register('password')}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Método de Corte</label>
                <select
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none"
                  {...register('suspensionType')}
                >
                  <option value="PPPOE">PPPoE Secrets (Deshabilitar secreto)</option>
                  <option value="QUEUE">Simple Queues (Velocidad mínima)</option>
                  <option value="ADDRESS_LIST">Address List (Redirección Firewall)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Servicio PPPoE (Opcional)</label>
                <input
                  type="text"
                  placeholder="ej. pppoe-out1"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none"
                  {...register('pppoeService')}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Nombre Lista Firewall</label>
                <input
                  type="text"
                  defaultValue="suspended"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none"
                  {...register('addressListName')}
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="active"
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                {...register('active')}
              />
              <label htmlFor="active" className="text-sm font-medium text-slate-700">Router activo y habilitado para envíos de comandos</label>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={resetForm}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saveMutation.isPending}
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition"
              >
                {saveMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Guardar Router
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Profile List */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 p-6">
          <h3 className="text-lg font-bold text-slate-900">Routers MikroTik Conectados</h3>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          </div>
        ) : !profiles || profiles.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <Server className="h-10 w-10 mx-auto text-slate-300 mb-2" />
            <p className="text-sm">No has agregado ningún perfil de MikroTik RouterOS todavía.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wider text-slate-400 bg-slate-50/50">
                  <th className="px-6 py-3">Nombre</th>
                  <th className="px-6 py-3">Host / API Port</th>
                  <th className="px-6 py-3">Usuario</th>
                  <th className="px-6 py-3">Método Corte</th>
                  <th className="px-6 py-3">Estado</th>
                  <th className="px-6 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {profiles.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/30">
                    <td className="px-6 py-4 font-semibold text-slate-900 flex items-center gap-2">
                      <Server className="h-4 w-4 text-indigo-500" />
                      {p.name}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs">{p.host}:{p.port}</td>
                    <td className="px-6 py-4">{p.username}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded-lg px-2 py-0.5 text-xs font-medium ${
                        p.suspensionType === 'PPPOE' ? 'bg-blue-50 text-blue-700' :
                        p.suspensionType === 'QUEUE' ? 'bg-amber-50 text-amber-700' :
                        'bg-purple-50 text-purple-700'
                      }`}>
                        {p.suspensionType}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                        p.active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${p.active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                        {p.active ? 'Activo' : 'Desactivado'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => handleEdit(p)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-800 transition"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-rose-600 transition"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
