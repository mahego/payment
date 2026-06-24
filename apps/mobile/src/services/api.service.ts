import Constants from 'expo-constants';
import axios, { AxiosInstance } from 'axios';
import { getAccessToken } from '../store/auth.store';

import { Platform } from 'react-native';

let BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ??
  'http://127.0.0.1:3001/api/v1';

// Safeguard against localhost DNS hangs in Web environment
if (Platform.OS === 'web') {
  BASE_URL = BASE_URL.replace('//localhost:', '//127.0.0.1:');
}

const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  // Mock payments post requests for mock customers
  if (config.url === '/payments' && config.method === 'post') {
    const data = typeof config.data === 'string' ? JSON.parse(config.data) : config.data;
    if (data && String(data.customerId).startsWith('cust-')) {
      return Promise.reject({
        isMockSuccess: true,
        data: {
          id: `pay-mock-${Date.now()}`,
          folio: `FOL-MOCK-${Date.now()}`,
          amount: data.amount,
          method: data.method,
          paidAt: new Date().toISOString()
        }
      });
    }
  }

  // Mock payments list get requests for mock customers
  if (config.url && config.url.includes('/payments') && config.method === 'get') {
    const parts = config.url.split('customerId=');
    if (parts.length > 1) {
      const custId = parts[1].split('&')[0];
      if (custId.startsWith('cust-')) {
        return Promise.reject({
          isMockSuccess: true,
          data: [
            {
              id: 'pay-1',
              folio: 'FOL-0001',
              amount: 350.00,
              method: 'EFECTIVO',
              paidAt: new Date(Date.now() - 86400000 * 2).toISOString(),
              notes: 'Cobro de prueba anterior',
            }
          ]
        });
      }
    }
  }

  // Mock sync outbox batch requests containing mock customers
  if (config.url === '/sync/outbox/batch' && config.method === 'post') {
    const events = typeof config.data === 'string' ? JSON.parse(config.data) : config.data;
    if (Array.isArray(events) && events.some(e => e.payload && String(e.payload.customerId).startsWith('cust-'))) {
      return Promise.reject({
        isMockSuccess: true,
        data: {
          processed: events.length,
          successes: events.length,
          failures: 0,
          results: events.map(e => ({ id: e.id, status: 'SYNCED' }))
        }
      });
    }
  }

  const token = getAccessToken();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error && error.isMockSuccess) {
      return Promise.resolve({
        data: error.data,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any
      });
    }
    return Promise.reject(error);
  }
);

export default api;
