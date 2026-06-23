import { Stack, Redirect } from 'expo-router';
import { useAuthStore } from '../../src/store/auth.store';

export default function AuthLayout() {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (!isLoading && isAuthenticated) {
    return <Redirect href="/(tabs)/route" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
