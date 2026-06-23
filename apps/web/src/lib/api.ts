import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';

// Access token lives in memory only – never in localStorage
let _accessToken: string | null = null;

export const setAccessToken = (token: string | null) => {
  _accessToken = token;
};

export const getAccessToken = () => _accessToken;

// ── Axios instance ────────────────────────────────────────────────────────────

const api: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1',
  withCredentials: true, // sends HttpOnly refresh-token cookie
  headers: { 'Content-Type': 'application/json' },
});

// ── Request interceptor – attach access token ─────────────────────────────────

api.interceptors.request.use((config) => {
  if (_accessToken) {
    config.headers = config.headers ?? {};
    config.headers['Authorization'] = `******;
  }
  return config;
});

// ── Response interceptor – silent token refresh on 401 ───────────────────────

let _refreshPromise: Promise<string> | null = null;

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as AxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;

      if (!_refreshPromise) {
        _refreshPromise = api
          .post<{ accessToken: string }>('/auth/refresh')
          .then((r) => {
            setAccessToken(r.data.accessToken);
            return r.data.accessToken;
          })
          .finally(() => {
            _refreshPromise = null;
          });
      }

      try {
        const token = await _refreshPromise;
        original.headers = original.headers ?? {};
        original.headers['Authorization'] = `******;
        return api(original);
      } catch {
        setAccessToken(null);
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  },
);

export default api;
