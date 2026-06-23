'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '@/lib/api';
import { useState } from 'react';

const schema = z.object({ email: z.string().email('Email inválido') });
type Input = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<Input>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: Input) => {
    await api.post('/auth/forgot-password', data);
    setSent(true);
  };

  if (sent) {
    return (
      <p className="text-center text-sm text-gray-600">
        Si ese correo existe, recibirás un enlace para restablecer tu contraseña.
      </p>
    );
  }

  return (
    <>
      <h2 className="mb-6 text-xl font-semibold text-gray-800">
        Recuperar contraseña
      </h2>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">
            Correo electrónico
          </label>
          <input
            type="email"
            className="w-full rounded-lg border px-4 py-2.5 text-sm focus:outline-none focus:ring-2"
            {...register('email')}
          />
          {errors.email && (
            <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
          )}
        </div>
        <button
          type="submit"
          className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white"
        >
          Enviar enlace
        </button>
        <p className="text-center text-sm">
          <a href="/login" className="text-primary hover:underline">
            Volver al login
          </a>
        </p>
      </form>
    </>
  );
}
