import { Tabs, Redirect } from 'expo-router';
import { useAuthStore } from '../../src/store/auth.store';
import { ActivityIndicator, View } from 'react-native';

export default function TabsLayout() {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: '#9ca3af',
      }}
    >
      <Tabs.Screen name="route" options={{ title: 'Mi ruta' }} />
      <Tabs.Screen name="customers" options={{ title: 'Clientes' }} />
      <Tabs.Screen name="payments" options={{ title: 'Pagos' }} />
      <Tabs.Screen name="sync" options={{ title: 'Sincronizar' }} />
      <Tabs.Screen name="profile" options={{ title: 'Perfil' }} />
    </Tabs>
  );
}
