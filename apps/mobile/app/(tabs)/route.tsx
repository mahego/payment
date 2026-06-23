import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store/auth.store';
import { useNetworkStatus } from '../../src/services/network.service';
import {
  getLocalCustomersWithDebt,
  syncCustomersFromServer,
  getLastSyncTime,
  getPendingOutboxCount,
  LocalCustomer,
} from '../../src/services/customer-sync.service';
import { syncOutboxEvents } from '../../src/services/sync.service';

export default function RouteScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { isConnected } = useNetworkStatus();
  const firstName = user?.name?.split(' ')[0] ?? '';

  const [customers, setCustomers] = useState<LocalCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [pendingCount, setPendingCount] = useState(0);

  const loadData = useCallback(async () => {
    try {
      const [data, syncTime, pending] = await Promise.all([
        getLocalCustomersWithDebt(),
        getLastSyncTime(),
        getPendingOutboxCount(),
      ]);
      setCustomers(data);
      setLastSync(syncTime);
      setPendingCount(pending);
    } catch {
      // SQLite might not be ready
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    // Refresh data every 30 seconds
    const interval = setInterval(loadData, 30_000);
    return () => clearInterval(interval);
  }, [loadData]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      if (isConnected) {
        await syncCustomersFromServer();
        if (pendingCount > 0) {
          await syncOutboxEvents();
        }
      }
      await loadData();
    } catch {
      // ignore
    } finally {
      setRefreshing(false);
    }
  }, [isConnected, loadData, pendingCount]);

  const totalDebt = customers.reduce((acc, c) => acc + c.current_balance, 0);

  const formatTimeAgo = (date: Date | null): string => {
    if (!date) return 'Nunca';
    const diff = Date.now() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Justo ahora';
    if (mins < 60) return `Hace ${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `Hace ${hours}h`;
    return `Hace ${Math.floor(hours / 24)}d`;
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>
              Hola{firstName ? `, ${firstName}` : ''} 👋
            </Text>
            <Text style={styles.dateText}>
              {new Date().toLocaleDateString('es-MX', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </Text>
          </View>
          <View
            style={[
              styles.connectionBadge,
              { backgroundColor: isConnected ? '#d1fae5' : '#fee2e2' },
            ]}
          >
            <View
              style={[
                styles.connectionDot,
                { backgroundColor: isConnected ? '#059669' : '#dc2626' },
              ]}
            />
            <Text
              style={[
                styles.connectionText,
                { color: isConnected ? '#059669' : '#dc2626' },
              ]}
            >
              {isConnected ? 'Online' : 'Offline'}
            </Text>
          </View>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{customers.length}</Text>
            <Text style={styles.statLabel}>Con adeudo</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: '#dc2626' }]}>
              ${totalDebt.toFixed(0)}
            </Text>
            <Text style={styles.statLabel}>Deuda total</Text>
          </View>
          <View style={styles.statCard}>
            <Text
              style={[
                styles.statValue,
                { color: pendingCount > 0 ? '#d97706' : '#059669' },
              ]}
            >
              {pendingCount}
            </Text>
            <Text style={styles.statLabel}>Pendientes sync</Text>
          </View>
        </View>
      </View>

      {/* Sync pending banner */}
      {pendingCount > 0 && isConnected && (
        <TouchableOpacity
          style={styles.syncBanner}
          onPress={async () => {
            await syncOutboxEvents();
            await loadData();
          }}
        >
          <Text style={styles.syncBannerText}>
            ⏳ {pendingCount} pago{pendingCount > 1 ? 's' : ''} pendiente{pendingCount > 1 ? 's' : ''} de sincronizar
          </Text>
          <Text style={styles.syncBannerAction}>Sincronizar →</Text>
        </TouchableOpacity>
      )}

      {/* Last sync */}
      <View style={styles.syncInfo}>
        <Text style={styles.syncInfoText}>
          Clientes actualizados: {formatTimeAgo(lastSync)}
        </Text>
      </View>

      {/* Customer list with debt */}
      {customers.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🎉</Text>
          <Text style={styles.emptyTitle}>Sin adeudos pendientes</Text>
          <Text style={styles.emptySubtitle}>
            Todos los clientes están al corriente
          </Text>
        </View>
      ) : (
        <FlatList
          data={customers}
          keyExtractor={(item) => item.id}
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
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.customerCard}
              activeOpacity={0.7}
              onPress={() =>
                router.push({
                  pathname: '/customer-detail',
                  params: { id: item.id },
                })
              }
            >
              <View style={styles.customerLeft}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {item.first_name[0]}
                    {item.last_name[0]}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.customerName} numberOfLines={1}>
                    {item.first_name} {item.last_name}
                  </Text>
                  {item.phone ? (
                    <Text style={styles.customerPhone}>{item.phone}</Text>
                  ) : null}
                </View>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.debtAmount}>
                  ${item.current_balance.toFixed(2)}
                </Text>
                <TouchableOpacity
                  style={styles.payQuickButton}
                  onPress={() =>
                    router.push({
                      pathname: '/(tabs)/payments',
                      params: {
                        customerId: item.id,
                        customerName: `${item.first_name} ${item.last_name}`,
                      },
                    })
                  }
                >
                  <Text style={styles.payQuickText}>Cobrar</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          )}
          ListFooterComponent={
            <Text style={styles.footerText}>
              {customers.length} cliente{customers.length !== 1 ? 's' : ''} con adeudo
            </Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
  },

  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  greeting: { fontSize: 20, fontWeight: '800', color: '#111827' },
  dateText: { fontSize: 12, color: '#6b7280', marginTop: 2, textTransform: 'capitalize' },

  connectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  connectionDot: { width: 7, height: 7, borderRadius: 4 },
  connectionText: { fontSize: 11, fontWeight: '700' },

  statsRow: { flexDirection: 'row', gap: 8 },
  statCard: {
    flex: 1,
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  statValue: { fontSize: 18, fontWeight: '900', color: '#111827' },
  statLabel: { fontSize: 10, color: '#6b7280', fontWeight: '600', marginTop: 2 },

  syncBanner: {
    backgroundColor: '#fef3c7',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  syncBannerText: { fontSize: 12, color: '#92400e', fontWeight: '600', flex: 1 },
  syncBannerAction: { fontSize: 12, color: '#d97706', fontWeight: '800' },

  syncInfo: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  syncInfoText: { fontSize: 11, color: '#9ca3af', fontWeight: '500' },

  list: { padding: 16 },
  customerCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  customerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#fee2e2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { fontSize: 13, fontWeight: '700', color: '#dc2626' },
  customerName: { fontSize: 14, fontWeight: '700', color: '#111827' },
  customerPhone: { fontSize: 11, color: '#9ca3af', marginTop: 1 },

  debtAmount: { fontSize: 16, fontWeight: '900', color: '#dc2626', marginBottom: 4 },
  payQuickButton: {
    backgroundColor: '#2563eb',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  payQuickText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#374151', marginBottom: 6 },
  emptySubtitle: { fontSize: 13, color: '#9ca3af', textAlign: 'center' },

  footerText: {
    textAlign: 'center',
    color: '#9ca3af',
    fontSize: 12,
    paddingVertical: 16,
  },
});
