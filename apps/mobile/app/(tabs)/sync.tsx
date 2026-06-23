import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
} from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { syncOutboxEvents } from '../../src/services/sync.service';
import {
  getPendingOutboxCount,
  getOutboxEvents,
  getLastSyncTime,
  OutboxEventRow,
  syncCustomersFromServer,
} from '../../src/services/customer-sync.service';
import { useAuthStore } from '../../src/store/auth.store';
import { useNetworkStatus } from '../../src/services/network.service';

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

export default function SyncScreen() {
  const { isAuthenticated } = useAuthStore();
  const { isConnected } = useNetworkStatus();
  
  const [syncing, setSyncing] = useState(false);
  const [events, setEvents] = useState<OutboxEventRow[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [count, list, syncTime] = await Promise.all([
        getPendingOutboxCount(),
        getOutboxEvents(),
        getLastSyncTime(),
      ]);
      setPendingCount(count);
      setEvents(list);
      setLastSync(syncTime);
    } catch {
      // Ignore SQLite errors
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [loadData]);

  const handleSync = async () => {
    if (!isAuthenticated) {
      Alert.alert('Sesión inválida', 'Debes iniciar sesión para sincronizar.');
      return;
    }
    if (!isConnected) {
      Alert.alert('Sin conexión', 'Conéctate a internet para sincronizar.');
      return;
    }

    setSyncing(true);
    try {
      // Sync outbox offline payments first
      const outboxRes = await syncOutboxEvents();
      // Also pull latest customers
      await syncCustomersFromServer();
      
      await loadData();
      
      if (outboxRes.failed > 0) {
        Alert.alert(
          'Sincronización parcial',
          `Se enviaron ${outboxRes.synced} pagos, pero fallaron ${outboxRes.failed}.`
        );
      } else if (outboxRes.synced > 0) {
        Alert.alert(
          'Sincronización exitosa',
          `Se sincronizaron correctamente ${outboxRes.synced} pagos.`
        );
      } else {
        Alert.alert('Sincronización', 'Datos de clientes actualizados correctamente.');
      }
    } catch {
      Alert.alert('Error', 'Ocurrió un error inesperado al sincronizar.');
    } finally {
      setSyncing(false);
    }
  };

  const renderEvent = ({ item }: { item: OutboxEventRow }) => {
    let details = 'Operación desconocida';
    try {
      const payload = JSON.parse(item.payload);
      if (item.aggregate_type === 'Payment') {
        details = `Pago de $${Number(payload.amount).toFixed(2)} (${payload.method})`;
      }
    } catch {
      // Ignore parsing errors
    }

    const statusColors: Record<string, { bg: string; color: string; label: string }> = {
      pending: { bg: '#fef3c7', color: '#d97706', label: 'Pendiente' },
      syncing: { bg: '#dbeafe', color: '#2563eb', label: 'Enviando' },
      synced: { bg: '#d1fae5', color: '#059669', label: 'Sincronizado' },
      failed: { bg: '#fee2e2', color: '#dc2626', label: 'Fallido' },
    };

    const statusConfig = statusColors[item.status] ?? { bg: '#f3f4f6', color: '#6b7280', label: item.status };

    return (
      <View style={styles.eventCard}>
        <View style={styles.eventCardTop}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={styles.eventTitle}>{item.aggregate_type}</Text>
            <Text style={styles.eventDetails}>{details}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
            <Text style={[styles.statusText, { color: statusConfig.color }]}>
              {statusConfig.label}
            </Text>
          </View>
        </View>
        
        {item.error_message ? (
          <Text style={styles.errorText}>Error: {item.error_message}</Text>
        ) : null}

        <View style={styles.eventCardBottom}>
          <Text style={styles.eventDate}>
            {new Date(item.occurred_at).toLocaleTimeString('es-MX', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })} - {new Date(item.occurred_at).toLocaleDateString('es-MX')}
          </Text>
          {item.attempts > 0 ? (
            <Text style={styles.attemptsText}>Intentos: {item.attempts}</Text>
          ) : null}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Sincronización</Text>
        <View style={styles.statusRow}>
          <View style={styles.networkIndicator}>
            <View style={[styles.dot, { backgroundColor: isConnected ? '#059669' : '#dc2626' }]} />
            <Text style={styles.statusLabel}>{isConnected ? 'Conectado (Online)' : 'Sin internet (Offline)'}</Text>
          </View>
          <Text style={styles.syncTime}>{formatTimeAgo(lastSync)}</Text>
        </View>
      </View>

      {/* Sync Control Card */}
      <View style={styles.controlCard}>
        <View style={styles.countContainer}>
          <Text style={styles.countValue}>{pendingCount}</Text>
          <Text style={styles.countLabel}>Operaciones pendientes</Text>
        </View>

        <TouchableOpacity
          style={[
            styles.syncButton,
            (syncing || !isConnected || !isAuthenticated) && styles.syncButtonDisabled,
          ]}
          onPress={handleSync}
          disabled={syncing || !isConnected || !isAuthenticated}
        >
          {syncing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.syncButtonText}>
              {isConnected ? 'Sincronizar ahora' : 'Requiere internet'}
            </Text>
          )}
        </TouchableOpacity>

        {!isAuthenticated && (
          <Text style={styles.warningText}>
            ⚠️ Inicia sesión para poder sincronizar tus cobros.
          </Text>
        )}
      </View>

      {/* History List */}
      <Text style={styles.sectionTitle}>Historial de Operaciones Offline</Text>
      <FlatList
        data={events}
        keyExtractor={(item) => item.id}
        renderItem={renderEvent}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={syncing}
            onRefresh={handleSync}
            tintColor="#2563eb"
            colors={['#2563eb']}
            enabled={isConnected && isAuthenticated}
          />
        }
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📦</Text>
            <Text style={styles.emptyText}>No hay operaciones offline registradas</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 6 },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  networkIndicator: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  statusLabel: { fontSize: 13, color: '#374151', fontWeight: '500' },
  syncTime: { fontSize: 11, color: '#9ca3af', fontWeight: '500' },

  controlCard: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  countContainer: { alignItems: 'center', marginBottom: 16 },
  countValue: { fontSize: 36, fontWeight: '900', color: '#111827' },
  countLabel: { fontSize: 13, color: '#6b7280', fontWeight: '500', marginTop: 2 },
  syncButton: {
    backgroundColor: '#2563eb',
    width: '100%',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  syncButtonDisabled: { backgroundColor: '#9ca3af' },
  syncButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  warningText: { color: '#b45309', fontSize: 12, marginTop: 10, textAlign: 'center' },

  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#374151', paddingHorizontal: 20, marginTop: 8, marginBottom: 10 },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  eventCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  eventCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  eventTitle: { fontSize: 12, fontWeight: '700', color: '#9ca3af' },
  eventDetails: { fontSize: 14, fontWeight: '600', color: '#111827', marginTop: 2 },
  statusBadge: { borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2 },
  statusText: { fontSize: 10, fontWeight: '700' },
  errorText: { color: '#dc2626', fontSize: 11, marginTop: 6, fontWeight: '500' },
  eventCardBottom: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  eventDate: { fontSize: 11, color: '#9ca3af' },
  attemptsText: { fontSize: 11, color: '#9ca3af', fontWeight: '500' },

  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  emptyIcon: { fontSize: 40, marginBottom: 8 },
  emptyText: { color: '#9ca3af', fontSize: 13, textAlign: 'center' },
});
