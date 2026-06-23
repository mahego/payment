import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'expo-router';
import {
  getLocalCustomers,
  syncCustomersFromServer,
  getLastSyncTime,
  LocalCustomer,
} from '../../src/services/customer-sync.service';
import { useNetworkStatus } from '../../src/services/network.service';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  ACTIVO:     { label: 'Activo',     color: '#059669', bg: '#d1fae5' },
  SUSPENDIDO: { label: 'Suspendido', color: '#dc2626', bg: '#fee2e2' },
  MOROSO:     { label: 'Moroso',     color: '#d97706', bg: '#fef3c7' },
  CANCELADO:  { label: 'Cancelado',  color: '#6b7280', bg: '#f3f4f6' },
};

function formatTimeAgo(date: Date | null): string {
  if (!date) return 'Nunca sincronizado';
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Justo ahora';
  if (mins < 60) return `Hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Hace ${hours}h`;
  return `Hace ${Math.floor(hours / 24)}d`;
}

export default function CustomersScreen() {
  const router = useRouter();
  const { isConnected } = useNetworkStatus();
  const [customers, setCustomers] = useState<LocalCustomer[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [syncMessage, setSyncMessage] = useState('');

  const loadLocal = useCallback(async (searchQuery?: string) => {
    try {
      const data = await getLocalCustomers(searchQuery);
      setCustomers(data);
      const syncTime = await getLastSyncTime();
      setLastSync(syncTime);
    } catch {
      // SQLite might not be ready
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLocal();
  }, [loadLocal]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      loadLocal(query);
    }, 300);
    return () => clearTimeout(timeout);
  }, [query, loadLocal]);

  const handleRefresh = useCallback(async () => {
    if (!isConnected) {
      setSyncMessage('Sin conexión a internet');
      setTimeout(() => setSyncMessage(''), 3000);
      return;
    }
    setRefreshing(true);
    setSyncMessage('');
    try {
      const result = await syncCustomersFromServer();
      setSyncMessage(`${result.downloaded} clientes descargados`);
      await loadLocal(query);
    } catch {
      setSyncMessage('Error al sincronizar');
    } finally {
      setRefreshing(false);
      setTimeout(() => setSyncMessage(''), 4000);
    }
  }, [isConnected, loadLocal, query]);

  const renderCustomer = useCallback(
    ({ item }: { item: LocalCustomer }) => {
      const statusInfo = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.CANCELADO;
      const balance = item.current_balance;

      return (
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.7}
          onPress={() =>
            router.push({ pathname: '/customer-detail', params: { id: item.id } })
          }
        >
          <View style={styles.cardTop}>
            <View style={styles.cardNameRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {item.first_name[0]}
                  {item.last_name[0]}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardName} numberOfLines={1}>
                  {item.first_name} {item.last_name}
                </Text>
                {item.phone ? (
                  <Text style={styles.cardPhone}>{item.phone}</Text>
                ) : null}
              </View>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
              <Text style={[styles.statusText, { color: statusInfo.color }]}>
                {statusInfo.label}
              </Text>
            </View>
          </View>

          <View style={styles.cardBottom}>
            <Text style={styles.balanceLabel}>Saldo:</Text>
            <Text
              style={[
                styles.balanceValue,
                { color: balance > 0 ? '#dc2626' : '#059669' },
              ]}
            >
              ${balance.toFixed(2)}
            </Text>
          </View>
        </TouchableOpacity>
      );
    },
    [router],
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Cargando clientes...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>Clientes</Text>
          <View style={styles.headerRight}>
            <View
              style={[
                styles.connectionDot,
                { backgroundColor: isConnected ? '#059669' : '#dc2626' },
              ]}
            />
            <Text style={styles.syncTime}>{formatTimeAgo(lastSync)}</Text>
          </View>
        </View>

        {/* Search */}
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por nombre o teléfono..."
          placeholderTextColor="#9ca3af"
          value={query}
          onChangeText={setQuery}
          clearButtonMode="while-editing"
        />

        {syncMessage ? (
          <Text style={styles.syncMessage}>{syncMessage}</Text>
        ) : null}
      </View>

      {/* List */}
      {customers.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyTitle}>Sin clientes</Text>
          <Text style={styles.emptySubtitle}>
            {query
              ? 'No hay resultados para tu búsqueda'
              : 'Desliza hacia abajo para sincronizar'}
          </Text>
          {!query && (
            <TouchableOpacity style={styles.syncButton} onPress={handleRefresh}>
              <Text style={styles.syncButtonText}>Sincronizar ahora</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={customers}
          keyExtractor={(item) => item.id}
          renderItem={renderCustomer}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#2563eb"
              colors={['#2563eb']}
            />
          }
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListFooterComponent={
            <Text style={styles.footerText}>
              {customers.length} cliente{customers.length !== 1 ? 's' : ''}
            </Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f3f4f6' },
  loadingText: { marginTop: 12, color: '#6b7280', fontSize: 14 },

  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: { fontSize: 22, fontWeight: '800', color: '#111827' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  connectionDot: { width: 8, height: 8, borderRadius: 4 },
  syncTime: { fontSize: 11, color: '#9ca3af', fontWeight: '500' },

  searchInput: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
  },
  syncMessage: {
    marginTop: 8,
    fontSize: 12,
    color: '#2563eb',
    fontWeight: '600',
    textAlign: 'center',
  },

  list: { padding: 16 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardNameRow: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { fontSize: 14, fontWeight: '700', color: '#2563eb' },
  cardName: { fontSize: 15, fontWeight: '700', color: '#111827' },
  cardPhone: { fontSize: 12, color: '#6b7280', marginTop: 2 },

  statusBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  statusText: { fontSize: 11, fontWeight: '700' },

  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  balanceLabel: { fontSize: 13, color: '#6b7280', fontWeight: '500' },
  balanceValue: { fontSize: 16, fontWeight: '800' },

  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#374151', marginBottom: 6 },
  emptySubtitle: { fontSize: 13, color: '#9ca3af', textAlign: 'center' },
  syncButton: {
    marginTop: 20,
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  syncButtonText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  footerText: {
    textAlign: 'center',
    color: '#9ca3af',
    fontSize: 12,
    paddingVertical: 16,
  },
});
