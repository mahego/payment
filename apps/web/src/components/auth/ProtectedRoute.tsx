'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import type { Role } from '@/store/auth.store';

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** Roles allowed to access this route. Empty = any authenticated user. */
  allowedRoles?: Role[];
  /** Where to redirect if not allowed */
  redirectTo?: string;
}

export function ProtectedRoute({
  children,
  allowedRoles = [],
  redirectTo = '/login',
}: ProtectedRouteProps) {
  const { isAuthenticated, user, isLoading, refreshSession } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      refreshSession().then((ok) => {
        if (!ok) router.replace(redirectTo);
      });
    }
  }, [isAuthenticated, isLoading, redirectTo, refreshSession, router]);

  useEffect(() => {
    if (
      isAuthenticated &&
      user &&
      allowedRoles.length > 0 &&
      !allowedRoles.includes(user.role)
    ) {
      router.replace('/unauthorized');
    }
  }, [isAuthenticated, user, allowedRoles, router]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return <>{children}</>;
}
