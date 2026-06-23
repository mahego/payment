'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { changePasswordSchema, type ChangePasswordInput } from '@/schemas/auth.schema';
import { useAuthStore } from '@/store/auth.store';
import api from '@/lib/api';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export default function SecuritySettingsPage() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [pwMsg, setPwMsg] = useState('');

  const { data: sessions } = useQuery({
    queryKey: ['sessions'],
    queryFn: () => api.get('/auth/sessions').then((r) => r.data),
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) => api.post(`/auth/sessions/${id}/revoke`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sessions'] }),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChangePasswordInput>({ resolver: zodResolver(changePasswordSchema) });

  const onChangePassword = async (data: ChangePasswordInput) => {
    setPwMsg('');
    try {
      await api.post('/auth/change-password', {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      setPwMsg('Contraseña actualizada. Todas las sesiones fueron revocadas.');
      reset();
    } catch {
      setPwMsg('Error al cambiar contraseña. Verifica la contraseña actual.');
    }
  };

  return (
    <div className="space-y-8 max-w-xl">
      <h1 className="text-2xl font-bold">Seguridad de cuenta</h1>

      {/* Change password */}
      <section className="rounded-lg bg-white p-6 shadow">
        <h2 className="mb-4 font-semibold">Cambiar contraseña</h2>
        <form onSubmit={handleSubmit(onChangePassword)} className="space-y-4 text-sm">
          {[
            { field: 'currentPassword', label: 'Contraseña actual' },
            { field: 'newPassword', label: 'Nueva contraseña' },
            { field: 'confirmPassword', label: 'Confirmar nueva' },
          ].map(({ field, label }) => (
            <div key={field}>
              <label className="mb-1 block font-medium">{label}</label>
              <input
                type="password"
                className="w-full rounded border px-3 py-2 focus:outline-none focus:ring-2"
                {...register(field as keyof ChangePasswordInput)}
              />
              {errors[field as keyof ChangePasswordInput] && (
                <p className="text-xs text-red-600 mt-1">
                  {errors[field as keyof ChangePasswordInput]?.message}
                </p>
              )}
            </div>
          ))}
          {pwMsg && <p className="text-sm text-blue-600">{pwMsg}</p>}
          <button
            type="submit"
            className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Actualizar contraseña
          </button>
        </form>
      </section>

      {/* Active sessions */}
      <section className="rounded-lg bg-white p-6 shadow">
        <h2 className="mb-4 font-semibold">Sesiones activas</h2>
        {!sessions?.length ? (
          <p className="text-sm text-gray-400">No hay sesiones activas.</p>
        ) : (
          <ul className="space-y-3 text-sm">
            {sessions.map((s: { id: string; deviceName: string | null; ipAddress: string | null; createdAt: string }) => (
              <li
                key={s.id}
                className="flex items-center justify-between rounded border px-3 py-2"
              >
                <div>
                  <p className="font-medium">{s.deviceName ?? 'Dispositivo desconocido'}</p>
                  <p className="text-gray-400 text-xs">
                    IP: {s.ipAddress ?? '—'} · Inicio:{' '}
                    {new Date(s.createdAt).toLocaleString('es-MX')}
                  </p>
                </div>
                <button
                  onClick={() => revokeMutation.mutate(s.id)}
                  className="rounded bg-red-100 px-2 py-1 text-xs text-red-700 hover:bg-red-200"
                >
                  Revocar
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
