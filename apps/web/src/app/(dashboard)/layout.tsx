'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  Users,
  Wallet,
  UserCog,
  Shield,
  BarChart3,
  Settings,
  LogOut,
  Loader2,
  Menu,
  X,
  Server,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAuthStore, hasMinRole, type Role } from '@/store/auth.store';

const NAV: Array<{ label: string; href: string; minRole: Role; icon: LucideIcon }> = [
  { label: 'Dashboard', href: '/dashboard', minRole: 'VIEWER', icon: LayoutDashboard },
  { label: 'Clientes', href: '/customers', minRole: 'VIEWER', icon: Users },
  { label: 'Pagos', href: '/payments', minRole: 'VIEWER', icon: Wallet },
  { label: 'Cobradores', href: '/collectors', minRole: 'SUPERVISOR', icon: UserCog },
  { label: 'Usuarios', href: '/users', minRole: 'ADMIN', icon: Shield },
  { label: 'Reportes', href: '/reports', minRole: 'SUPERVISOR', icon: BarChart3 },
  { label: 'MikroTik', href: '/settings/mikrotik', minRole: 'ADMIN', icon: Server },
  { label: 'Configuración', href: '/settings/security', minRole: 'ADMIN', icon: Settings },
];

const roleLabel: Record<Role, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Administrador',
  SUPERVISOR: 'Supervisor',
  COLLECTOR: 'Cobrador',
  TECHNICIAN: 'Técnico',
  VIEWER: 'Consulta',
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isAuthenticated, isLoading, refreshSession, logout } =
    useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      refreshSession().then((ok) => {
        if (!ok) router.replace('/login');
      });
    }
  }, [isAuthenticated, isLoading, refreshSession, router]);

  if (isLoading || !isAuthenticated || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3 text-gray-500">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm">Cargando…</p>
        </div>
      </div>
    );
  }

  const visibleNav = NAV.filter((n) => hasMinRole(user.role, n.minRole));
  const initials = user.name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="flex h-screen flex-col md:flex-row overflow-hidden bg-gray-50">
      {/* Mobile Top Bar */}
      <header className="flex md:hidden items-center justify-between border-b border-gray-200 bg-white px-4 py-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-white">
            D
          </div>
          <span className="text-lg font-semibold tracking-tight text-gray-900">
            Deluxnet
          </span>
        </div>
        <button
          onClick={() => setSidebarOpen(true)}
          className="rounded-lg border border-gray-200 p-2 text-gray-600 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <Menu className="h-5 w-5" />
        </button>
      </header>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-60 flex-shrink-0 flex-col border-r border-gray-200 bg-white">
        <div className="flex items-center gap-2 px-5 py-5 border-b border-gray-100">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-white">
            D
          </div>
          <span className="text-lg font-semibold tracking-tight text-gray-900">
            Deluxnet
          </span>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
          {visibleNav.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  active
                    ? 'bg-primary/10 text-primary'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-gray-100 p-3">
          <div className="flex items-center gap-3 rounded-lg p-2">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
              {initials || '?'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-gray-900">
                {user.name}
              </p>
              <p className="truncate text-xs text-gray-500">
                {roleLabel[user.role] ?? user.role}
              </p>
            </div>
          </div>
          <button
            onClick={() => logout().then(() => router.replace('/login'))}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
          >
            <LogOut className="h-3.5 w-3.5" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-600/50 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile Sidebar Drawer */}
      <aside
        className={`fixed bottom-0 top-0 left-0 z-50 flex w-60 flex-col bg-white border-r border-gray-200 transition-transform duration-300 md:hidden ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-5 py-5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-white">
              D
            </div>
            <span className="text-lg font-semibold tracking-tight text-gray-900">
              Deluxnet
            </span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
          {visibleNav.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  active
                    ? 'bg-primary/10 text-primary'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-gray-100 p-3">
          <div className="flex items-center gap-3 rounded-lg p-2">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
              {initials || '?'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-gray-900">
                {user.name}
              </p>
              <p className="truncate text-xs text-gray-500">
                {roleLabel[user.role] ?? user.role}
              </p>
            </div>
          </div>
          <button
            onClick={() => logout().then(() => router.replace('/login'))}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
          >
            <LogOut className="h-3.5 w-3.5" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-auto relative bg-slate-50/50">
        {/* Background gradient blobs for Liquid Glass effect */}
        <div className="absolute top-10 left-10 w-72 h-72 bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse pointer-events-none" />
        <div className="absolute top-1/3 right-10 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-25 animate-pulse pointer-events-none" />
        <div className="absolute bottom-10 left-1/4 w-80 h-80 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse pointer-events-none" />
        
        <div className="mx-auto max-w-7xl p-4 md:p-8 relative z-10">{children}</div>
      </main>
    </div>
  );
}
