'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { changePasswordSchema } from '@/schemas/auth.schema';
import type { ChangePasswordInput } from '@/schemas/auth.schema';
import api from '@/lib/api';
import { useState, Suspense } from 'react';

function ResetPasswordForm() {
  const params = useSearchParams();
  const router = useRouter();
  const [serverError, setServerError] = useState('');
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ChangePasswordInput>({ resolver: zodResolver(changePasswordSchema) });

  const onSubmit = async (data: ChangePasswordInput) => {
    setServerError('');
    try {
      await api.post('/auth/reset-password', {
        token: params.get('token') ?? '',
        newPassword: data.newPassword,
      });
      router.replace('/login?reset=1');
    } catch {
      setServerError('Token inválido o expirado');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">Nueva contraseña</label>
        <input
          type="password"
          className="w-full rounded-xl border border-white/10 bg-slate-950/40 backdrop-blur-md px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-indigo-500 focus:bg-slate-950/60 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all duration-300"
          {...register('newPassword')}
        />
        {errors.newPassword && (
          <p className="mt-1 text-xs text-rose-400">{errors.newPassword.message}</p>
        )}
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">Confirmar contraseña</label>
        <input
          type="password"
          className="w-full rounded-xl border border-white/10 bg-slate-950/40 backdrop-blur-md px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-indigo-500 focus:bg-slate-950/60 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all duration-300"
          {...register('confirmPassword')}
        />
        {errors.confirmPassword && (
          <p className="mt-1 text-xs text-rose-400">{errors.confirmPassword.message}</p>
        )}
      </div>
      {serverError && (
        <div className="flex items-start gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2.5 text-sm text-rose-300 shadow-glass">
          <span>{serverError}</span>
        </div>
      )}
      <button
        type="submit"
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 active:scale-[0.98] px-4 py-2.5 text-sm font-bold text-white shadow-glass hover:shadow-glass-lg transition-all duration-300"
      >
        Restablecer contraseña
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <>
      <h2 className="mb-6 text-xl font-bold text-white tracking-tight">Nueva contraseña</h2>
      <Suspense>
        <ResetPasswordForm />
      </Suspense>
    </>
  );
}
