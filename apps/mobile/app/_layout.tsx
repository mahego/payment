import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ToastContainer from '../src/components/ToastContainer';
import { Platform } from 'react-native';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 60_000 } },
});

import { useEffect } from 'react';
import { useAuthStore } from '../src/store/auth.store';

export default function RootLayout() {
  const initialize = useAuthStore((state) => state.initialize);

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <QueryClientProvider client={queryClient}>
      {Platform.OS === 'web' && (
        <style dangerouslySetInnerHTML={{
          __html: `
            body {
              background-color: #090d16 !important;
              margin: 0;
              padding: 0;
            }
            @keyframes liquidPulse {
              0% { transform: scale(1) translate(0px, 0px); opacity: 0.12; }
              50% { transform: scale(1.1) translate(10px, -15px); opacity: 0.20; }
              100% { transform: scale(0.95) translate(-10px, 15px); opacity: 0.14; }
            }
            .liquid-blob {
              filter: blur(80px) !important;
              mix-blend-mode: screen !important;
              animation: liquidPulse 10s infinite ease-in-out alternate;
              pointer-events: none !important;
            }
            .glass-panel {
              background: rgba(15, 23, 42, 0.65) !important;
              backdrop-filter: blur(16px) !important;
              -webkit-backdrop-filter: blur(16px) !important;
              border: 1px solid rgba(255, 255, 255, 0.08) !important;
              box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.5) !important;
            }
            .liquid-input input::placeholder,
            .liquid-input::placeholder {
              color: #64748b !important;
              opacity: 1 !important;
            }
            .liquid-input input:focus,
            .liquid-input:focus {
              border-color: #6366f1 !important;
              background-color: rgba(255, 255, 255, 0.05) !important;
              box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.15) !important;
              outline: none !important;
            }
            .liquid-button {
              background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%) !important;
              box-shadow: 0 4px 15px rgba(99, 102, 241, 0.3) !important;
              transition: all 0.2s ease-in-out !important;
            }
            .liquid-button:hover {
              opacity: 0.95 !important;
              box-shadow: 0 6px 20px rgba(99, 102, 241, 0.4) !important;
            }
            .liquid-button:active {
              transform: scale(0.98) !important;
              opacity: 0.85 !important;
            }
          `
        }} />
      )}
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="customer-detail" options={{ headerShown: false }} />
      </Stack>
      <ToastContainer />
    </QueryClientProvider>
  );
}
