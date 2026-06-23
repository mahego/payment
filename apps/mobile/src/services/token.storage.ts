import * as SecureStore from 'expo-secure-store';

const KEYS = {
  ACCESS_TOKEN: 'dx_access_token',
  REFRESH_TOKEN: 'dx_refresh_token',
  SESSION_ID: 'dx_session_id',
};

export const TokenStorage = {
  async saveTokens(access: string, refresh: string, sessionId: string) {
    await Promise.all([
      SecureStore.setItemAsync(KEYS.ACCESS_TOKEN, access),
      SecureStore.setItemAsync(KEYS.REFRESH_TOKEN, refresh),
      SecureStore.setItemAsync(KEYS.SESSION_ID, sessionId),
    ]);
  },

  async getAccessToken(): Promise<string | null> {
    return SecureStore.getItemAsync(KEYS.ACCESS_TOKEN);
  },

  async getRefreshToken(): Promise<string | null> {
    return SecureStore.getItemAsync(KEYS.REFRESH_TOKEN);
  },

  async getSessionId(): Promise<string | null> {
    return SecureStore.getItemAsync(KEYS.SESSION_ID);
  },

  async clear() {
    await Promise.all([
      SecureStore.deleteItemAsync(KEYS.ACCESS_TOKEN),
      SecureStore.deleteItemAsync(KEYS.REFRESH_TOKEN),
      SecureStore.deleteItemAsync(KEYS.SESSION_ID),
    ]);
  },
};
