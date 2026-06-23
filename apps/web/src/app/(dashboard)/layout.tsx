'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore, hasMinRole, type Role } from '@/store/auth.store';

const NAV: Array<{ label: string; href: string; minRole: Role }> = [
  { label: 'Dashboard', href: '/dashboard', minRole: 'VIEWER' },
  { label: 'Clientes', href: '/customers', minRole: 'VIEWER' },
  { label: 'Pagos', href: '/payments', minRole: 'VIEWER' },
  { label: 'Cobradores', href: '/collectors', minRole: 'SUPERVISOR' },
  { label: 'Usuarios', href: '/users', minRole: 'ADMIN' },
  { label: 'Reportes', href: '/reports', minRole: 'SUPERVISOR' },
  { label: 'Configuración', href: '/settings/security', minRole: 'ADMIN' },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isAuthenticated, isLoading, refreshSession, logout } =
    useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      refreshSession().then((ok) => {
        if (!ok) router.replace('/login');
      });
    }
  }, [isAuthenticated, isLoading, refreshSession, router]);

  if (isLoading || !isAuthenticated || !user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  const visibleNav = NAV.filter((n) => hasMinRole(user.role, n.minRole));

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      {/* Sidebar */}
      <aside className="flex w-56 flex-col bg-gray-900 text-white">
        <div className="px-5 py-4 text-lg font-bold tracking-wide">
          Deluxnet
        </div>
        <nav className="flex-1 px-3 py-2 space-y-1">
          {visibleNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-md px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-gray-700 p-4">
          <p className="truncate text-sm font-medium">{user.name}</p>
          <p className="truncate text-xs text-gray-400">{user.email}</p>
          <p className="mt-1 text-xs text-blue-400">{user.role}</p>
          <button
            onClick={() => logout().then(() => router.replace('/login'))}
            className="mt-3 w-full rounded-md bg-gray-700 px-3 py-1.5 text-xs text-gray-200 hover:bg-gray-600"
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  );
}
