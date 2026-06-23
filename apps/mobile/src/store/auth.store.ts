import { create } from 'zustand';
import api from '../services/api.service';
import { TokenStorage } from '../services/token.storage';

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
  collectorProfile?: {
    assignedZone?: string | null;
    cashLimit?: number | null;
    canRegisterOfflinePayments: boolean;
  } | null;
}

let _inMemoryAccessToken: string | null = null;

export const getAccessToken = () => _inMemoryAccessToken;

interface AuthState {
  user: AuthUser | null;
  sessionId: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
  reset: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  sessionId: null,
  isLoading: true,
  isAuthenticated: false,

  // ── Boot: try to restore session from SecureStore ─────────────────────────
  initialize: async () => {
    set({ isLoading: true });
    try {
      const refresh = await TokenStorage.getRefreshToken();
      if (!refresh) {
        set({ isLoading: false });
        return;
      }

      const res = await api.post<{
        accessToken: string;
        refreshToken: string;
        sessionId: string;
      }>('/auth/refresh', {}, {
        headers: { 'x-refresh-token': refresh },
      });

      _inMemoryAccessToken = res.data.accessToken;
      await TokenStorage.saveTokens(
        res.data.accessToken,
        res.data.refreshToken,
        res.data.sessionId,
      );
      set({ sessionId: res.data.sessionId });

      const me = await api.get<AuthUser>('/auth/me');
      set({ user: me.data, isAuthenticated: true });
    } catch {
      await TokenStorage.clear();
      _inMemoryAccessToken = null;
      set({ user: null, isAuthenticated: false });
    } finally {
      set({ isLoading: false });
    }
  },

  // ── Login ──────────────────────────────────────────────────────────────────
  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const res = await api.post<{
        accessToken: string;
        refreshToken: string;
        sessionId: string;
      }>('/auth/login', { email, password });

      _inMemoryAccessToken = res.data.accessToken;
      await TokenStorage.saveTokens(
        res.data.accessToken,
        res.data.refreshToken,
        res.data.sessionId,
      );
      set({ sessionId: res.data.sessionId });

      const me = await api.get<AuthUser>('/auth/me');
      set({ user: me.data, isAuthenticated: true });
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
      /* ignore network errors on logout */
    } finally {
      _inMemoryAccessToken = null;
      await TokenStorage.clear();
      set({ user: null, sessionId: null, isAuthenticated: false });
    }
  },

  // ── Refresh ────────────────────────────────────────────────────────────────
  refreshSession: async () => {
    try {
      const refresh = await TokenStorage.getRefreshToken();
      if (!refresh) return false;

      const res = await api.post<{
        accessToken: string;
        refreshToken: string;
        sessionId: string;
      }>('/auth/refresh', {}, {
        headers: { 'x-refresh-token': refresh },
      });

      _inMemoryAccessToken = res.data.accessToken;
      await TokenStorage.saveTokens(
        res.data.accessToken,
        res.data.refreshToken,
        res.data.sessionId,
      );
      set({ sessionId: res.data.sessionId, isAuthenticated: true });
      return true;
    } catch {
      _inMemoryAccessToken = null;
      await TokenStorage.clear();
      set({ user: null, sessionId: null, isAuthenticated: false });
      return false;
    }
  },

  reset: () => {
    _inMemoryAccessToken = null;
    set({ user: null, sessionId: null, isAuthenticated: false, isLoading: false });
  },
}));
