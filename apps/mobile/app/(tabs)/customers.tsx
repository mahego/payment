import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Platform,
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
import { toast } from '../../src/store/toast.store';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  ACTIVO:     { label: 'Activo',     color: '#34d399', bg: 'rgba(52, 211, 153, 0.15)' },
  SUSPENDIDO: { label: 'Suspendido', color: '#f87171', bg: 'rgba(248, 113, 113, 0.15)' },
  MOROSO:     { label: 'Moroso',     color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.15)' },
  CANCELADO:  { label: 'Cancelado',  color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.15)' },
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
      toast.warning('Sin conexión a internet');
      return;
    }
    setRefreshing(true);
    toast.info('Sincronizando clientes...');
    try {
      const result = await syncCustomersFromServer();
      toast.success(`${result.downloaded} clientes actualizados`);
      await loadLocal(query);
    } catch {
      toast.error('Error al sincronizar');
    } finally {
      setRefreshing(false);
    }
  }, [isConnected, loadLocal, query]);

  const renderCustomer = useCallback(
    ({ item }: { item: LocalCustomer }) => {
      const statusInfo = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.CANCELADO;
      const balance = item.current_balance;

      return (
        <TouchableOpacity
          className="glass-panel"
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
                { color: balance > 0 ? '#f87171' : '#34d399' },
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
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Cargando clientes...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Prismatic Glowing Blobs */}
      <View className="liquid-blob" style={[styles.blob, { backgroundColor: '#6366f1', top: '10%', left: '5%', width: 250, height: 250, borderRadius: 125 }]} />
      <View className="liquid-blob" style={[styles.blob, { backgroundColor: '#06b6d4', bottom: '20%', right: '5%', width: 250, height: 250, borderRadius: 125 }]} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>Clientes</Text>
          <View style={styles.headerRight}>
            <View
              style={[
                styles.connectionDot,
                { backgroundColor: isConnected ? '#34d399' : '#f87171' },
              ]}
            />
            <Text style={styles.syncTime}>{formatTimeAgo(lastSync)}</Text>
          </View>
        </View>

        {/* Search */}
        <TextInput
          className="liquid-input"
          style={styles.searchInput}
          placeholder="Buscar por nombre o teléfono..."
          placeholderTextColor="#64748b"
          value={query}
          onChangeText={setQuery}
          clearButtonMode="while-editing"
        />
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
              tintColor="#6366f1"
              colors={['#6366f1']}
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
  container: { flex: 1, backgroundColor: '#090d16', overflow: 'hidden' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#090d16' },
  loadingText: { marginTop: 12, color: '#94a3b8', fontSize: 14 },

  blob: {
    position: 'absolute',
    opacity: 0.15,
    ...Platform.select({
      web: {
        filter: 'blur(70px)',
      },
      default: {
        shadowOpacity: 0.6,
        shadowRadius: 80,
        shadowOffset: { width: 0, height: 0 },
      },
    }),
  },

  header: {
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    ...Platform.select({
      web: {
        backdropFilter: 'blur(10px)',
      },
    }),
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: { fontSize: 22, fontWeight: '800', color: '#fff' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  connectionDot: { width: 8, height: 8, borderRadius: 4 },
  syncTime: { fontSize: 11, color: '#94a3b8', fontWeight: '500' },

  searchInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#fff',
  },
  syncMessage: {
    marginTop: 8,
    fontSize: 12,
    color: '#818cf8',
    fontWeight: '600',
    textAlign: 'center',
  },

  list: { padding: 16 },
  card: {
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    ...Platform.select({
      web: {
        backdropFilter: 'blur(10px)',
      },
    }),
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
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { fontSize: 14, fontWeight: '700', color: '#818cf8' },
  cardName: { fontSize: 15, fontWeight: '700', color: '#fff' },
  cardPhone: { fontSize: 12, color: '#94a3b8', marginTop: 2 },

  statusBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  statusText: { fontSize: 11, fontWeight: '700' },

  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  balanceLabel: { fontSize: 13, color: '#94a3b8', fontWeight: '500' },
  balanceValue: { fontSize: 16, fontWeight: '800' },

  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 6 },
  emptySubtitle: { fontSize: 13, color: '#94a3b8', textAlign: 'center' },
  syncButton: {
    marginTop: 20,
    backgroundColor: '#6366f1',
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  syncButtonText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  footerText: {
    textAlign: 'center',
    color: '#64748b',
    fontSize: 12,
    paddingVertical: 16,
  },
});
