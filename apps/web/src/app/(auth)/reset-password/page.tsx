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
        <label className="mb-1 block text-sm font-medium">Nueva contraseña</label>
        <input
          type="password"
          className="w-full rounded-lg border px-4 py-2.5 text-sm"
          {...register('newPassword')}
        />
        {errors.newPassword && (
          <p className="mt-1 text-xs text-red-600">{errors.newPassword.message}</p>
        )}
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Confirmar contraseña</label>
        <input
          type="password"
          className="w-full rounded-lg border px-4 py-2.5 text-sm"
          {...register('confirmPassword')}
        />
        {errors.confirmPassword && (
          <p className="mt-1 text-xs text-red-600">{errors.confirmPassword.message}</p>
        )}
      </div>
      {serverError && (
        <p className="text-sm text-red-600">{serverError}</p>
      )}
      <button type="submit" className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white">
        Restablecer contraseña
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <>
      <h2 className="mb-6 text-xl font-semibold text-gray-800">Nueva contraseña</h2>
      <Suspense>
        <ResetPasswordForm />
      </Suspense>
    </>
  );
}
