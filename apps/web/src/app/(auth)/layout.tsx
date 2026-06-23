import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Acceso | Deluxnet',
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-primary">Deluxnet</h1>
          <p className="mt-1 text-sm text-gray-500">Plataforma ISP Rural</p>
        </div>
        {children}
      </div>
    </div>
  );
}
