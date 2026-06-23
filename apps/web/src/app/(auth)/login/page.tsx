import { Suspense } from 'react';
import { LoginForm } from '@/components/auth/LoginForm';

export default function LoginPage() {
  return (
    <>
      <h2 className="mb-6 text-xl font-bold text-white tracking-tight">
        Iniciar sesión
      </h2>
      <Suspense>
        <LoginForm />
      </Suspense>
    </>
  );
}
