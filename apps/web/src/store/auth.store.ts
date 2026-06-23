import { create } from 'zustand';
import Cookies from 'js-cookie';
import api, { setAccessToken } from '@/lib/api';

const SESSION_COOKIE = 'deluxnet_session';

const markSession = () => {
  Cookies.set(SESSION_COOKIE, '1', {
    path: '/',
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
  });
};

const clearSession = () => {
  Cookies.remove(SESSION_COOKIE, { path: '/' });
};

export type Role =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'SUPERVISOR'
  | 'COLLECTOR'
  | 'TECHNICIAN'
  | 'VIEWER';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: Role;
  status: string;
}

interface AuthState {
  user: AuthUser | null;
  sessionId: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  login: (email: string, password: string, deviceName?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
  fetchMe: () => Promise<void>;
  setUser: (user: AuthUser | null) => void;
  reset: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  sessionId: null,
  isLoading: false,
  isAuthenticated: false,

  // ── Login ──────────────────────────────────────────────────────────────────
  login: async (email, password, deviceName) => {
    set({ isLoading: true });
    try {
      const res = await api.post<{ accessToken: string; sessionId: string }>(
        '/auth/login',
        { email, password, deviceName },
      );
      setAccessToken(res.data.accessToken);      markSession();      set({ sessionId: res.data.sessionId });
      await get().fetchMe();
      set({ isAuthenticated: true });
    } finally {
      set({ isLoading: false });
    }
  },

  // ── Logout ─────────────────────────────────────────────────────────────────
  logout: async () => {
    const { sessionId } = get();
    try {
      await api.post('/auth/logout', { sessionId });
    } catch {
      /* ignore */
    } finally {
      setAccessToken(null);
      clearSession();
      set({ user: null, sessionId: null, isAuthenticated: false });
    }
  },

  // ── Refresh ────────────────────────────────────────────────────────────────
  refreshSession: async () => {
    try {
      const res = await api.post<{ accessToken: string; sessionId: string }>(
        '/auth/refresh',
      );
      setAccessToken(res.data.accessToken);
      markSession();
      set({ sessionId: res.data.sessionId, isAuthenticated: true });
      await get().fetchMe();
      return true;
    } catch {
      clearSession();
      set({ user: null, sessionId: null, isAuthenticated: false });
      return false;
    }
  },

  // ── Fetch current user ─────────────────────────────────────────────────────
  fetchMe: async () => {
    const res = await api.get<AuthUser>('/auth/me');
    set({ user: res.data, isAuthenticated: true });
  },

  setUser: (user) => set({ user }),

  reset: () =>
    set({ user: null, sessionId: null, isAuthenticated: false, isLoading: false }),
}));

// ── Permission helpers ────────────────────────────────────────────────────────

const ROLE_HIERARCHY: Record<Role, number> = {
  SUPER_ADMIN: 100,
  ADMIN: 80,
  SUPERVISOR: 60,
  COLLECTOR: 40,
  TECHNICIAN: 40,
  VIEWER: 10,
};

export const hasMinRole = (userRole: Role | undefined, minRole: Role): boolean => {
  if (!userRole) return false;
  return (ROLE_HIERARCHY[userRole] ?? 0) >= ROLE_HIERARCHY[minRole];
};

export const hasRole = (userRole: Role | undefined, ...roles: Role[]): boolean => {
  if (!userRole) return false;
  return roles.includes(userRole);
};
