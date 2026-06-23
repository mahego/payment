'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import api from '@/lib/api';
import { useState } from 'react';

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  password: z
    .string()
    .min(8)
    .regex(/(?=.*[A-Z])/)
    .regex(/(?=.*[0-9])/)
    .regex(/(?=.*[^a-zA-Z0-9])/),
  role: z.enum(['SUPER_ADMIN', 'ADMIN', 'SUPERVISOR', 'COLLECTOR', 'TECHNICIAN', 'VIEWER']),
});
type Input = z.infer<typeof schema>;

export default function NewUserPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const { register, handleSubmit, formState: { errors } } = useForm<Input>({
    resolver: zodResolver(schema),
    defaultValues: { role: 'VIEWER' },
  });

  const onSubmit = async (data: Input) => {
    setError('');
    try {
      await api.post('/users', data);
      router.replace('/users');
    } catch (e: unknown) {
      setError((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Error al crear usuario');
    }
  };

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-6 text-2xl font-bold">Nuevo usuario</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 rounded-lg bg-white p-6 shadow">
        {(['name', 'email', 'phone', 'password'] as const).map((field) => (
          <div key={field}>
            <label className="mb-1 block text-sm font-medium capitalize">{field}</label>
            <input
              type={field === 'password' ? 'password' : 'text'}
              className="w-full rounded-lg border px-4 py-2.5 text-sm focus:outline-none focus:ring-2"
              {...register(field)}
            />
            {errors[field] && (
              <p className="mt-1 text-xs text-red-600">{errors[field]?.message}</p>
            )}
          </div>
        ))}
        <div>
          <label className="mb-1 block text-sm font-medium">Rol</label>
          <select
            className="w-full rounded-lg border px-4 py-2.5 text-sm"
            {...register('role')}
          >
            {['VIEWER', 'TECHNICIAN', 'COLLECTOR', 'SUPERVISOR', 'ADMIN', 'SUPER_ADMIN'].map(
              (r) => <option key={r} value={r}>{r}</option>,
            )}
          </select>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Crear usuario
        </button>
      </form>
    </div>
  );
}
