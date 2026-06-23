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
      <p className="text-center text-sm text-slate-300">
        Si ese correo existe, recibirás un enlace para restablecer tu contraseña.
      </p>
    );
  }

  return (
    <>
      <h2 className="mb-6 text-xl font-bold text-white tracking-tight">
        Recuperar contraseña
      </h2>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
            Correo electrónico
          </label>
          <input
            type="email"
            className="w-full rounded-xl border border-white/10 bg-slate-950/40 backdrop-blur-md px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-indigo-500 focus:bg-slate-950/60 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all duration-300"
            {...register('email')}
          />
          {errors.email && (
            <p className="mt-1 text-xs text-rose-400">{errors.email.message}</p>
          )}
        </div>
        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 active:scale-[0.98] px-4 py-2.5 text-sm font-bold text-white shadow-glass hover:shadow-glass-lg transition-all duration-300"
        >
          Enviar enlace
        </button>
        <p className="text-center text-sm text-slate-400 mt-2">
          <a href="/login" className="text-indigo-400 hover:text-indigo-300 hover:underline transition-colors">
            Volver al login
          </a>
        </p>
      </form>
    </>
  );
}
