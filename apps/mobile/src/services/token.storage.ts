import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const KEYS = {
  ACCESS_TOKEN: 'dx_access_token',
  REFRESH_TOKEN: 'dx_refresh_token',
  SESSION_ID: 'dx_session_id',
};

const isWeb = Platform.OS === 'web';

const webMock = {
  async setItem(key: string, value: string) {
    try {
      localStorage.setItem(key, value);
    } catch {
      // ignore
    }
  },
  async getItem(key: string): Promise<string | null> {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  async removeItem(key: string) {
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
  }
};

export const TokenStorage = {
  async saveTokens(access: string, refresh: string, sessionId: string) {
    if (isWeb) {
      await Promise.all([
        webMock.setItem(KEYS.ACCESS_TOKEN, access),
        webMock.setItem(KEYS.REFRESH_TOKEN, refresh),
        webMock.setItem(KEYS.SESSION_ID, sessionId),
      ]);
    } else {
      await Promise.all([
        SecureStore.setItemAsync(KEYS.ACCESS_TOKEN, access),
        SecureStore.setItemAsync(KEYS.REFRESH_TOKEN, refresh),
        SecureStore.setItemAsync(KEYS.SESSION_ID, sessionId),
      ]);
    }
  },

  async getAccessToken(): Promise<string | null> {
    if (isWeb) return webMock.getItem(KEYS.ACCESS_TOKEN);
    return SecureStore.getItemAsync(KEYS.ACCESS_TOKEN);
  },

  async getRefreshToken(): Promise<string | null> {
    if (isWeb) return webMock.getItem(KEYS.REFRESH_TOKEN);
    return SecureStore.getItemAsync(KEYS.REFRESH_TOKEN);
  },

  async getSessionId(): Promise<string | null> {
    if (isWeb) return webMock.getItem(KEYS.SESSION_ID);
    return SecureStore.getItemAsync(KEYS.SESSION_ID);
  },

  async clear() {
    if (isWeb) {
      await Promise.all([
        webMock.removeItem(KEYS.ACCESS_TOKEN),
        webMock.removeItem(KEYS.REFRESH_TOKEN),
        webMock.removeItem(KEYS.SESSION_ID),
      ]);
    } else {
      try {
        await Promise.all([
          SecureStore.deleteItemAsync(KEYS.ACCESS_TOKEN),
          SecureStore.deleteItemAsync(KEYS.REFRESH_TOKEN),
          SecureStore.deleteItemAsync(KEYS.SESSION_ID),
        ]);
      } catch {
        // ignore errors on clear
      }
    }
  },
};
