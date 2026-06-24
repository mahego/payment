import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Platform,
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
import { toast } from '../../src/store/toast.store';

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
      toast.error('Debes iniciar sesión para sincronizar.');
      return;
    }
    if (!isConnected) {
      toast.warning('Conéctate a internet para sincronizar.');
      return;
    }

    setSyncing(true);
    toast.info('Iniciando sincronización...');
    try {
      // Sync outbox offline payments first
      const outboxRes = await syncOutboxEvents();
      // Also pull latest customers
      await syncCustomersFromServer();
      
      await loadData();
      
      if (outboxRes.failed > 0) {
        toast.error(`Sincronización parcial: ${outboxRes.synced} pagos enviados, ${outboxRes.failed} fallidos`);
      } else if (outboxRes.synced > 0) {
        toast.success(`Sincronización exitosa: ${outboxRes.synced} cobros enviados`);
      } else {
        toast.success('Datos de clientes actualizados correctamente.');
      }
    } catch {
      toast.error('Error al sincronizar.');
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
      pending: { bg: 'rgba(251, 191, 36, 0.15)', color: '#fbbf24', label: 'Pendiente' },
      syncing: { bg: 'rgba(96, 165, 250, 0.15)', color: '#60a5fa', label: 'Enviando' },
      synced: { bg: 'rgba(52, 211, 153, 0.15)', color: '#34d399', label: 'Sincronizado' },
      failed: { bg: 'rgba(248, 113, 113, 0.15)', color: '#f87171', label: 'Fallido' },
    };

    const statusConfig = statusColors[item.status] ?? { bg: 'rgba(255,255,255,0.05)', color: '#94a3b8', label: item.status };

    return (
      <View className="glass-panel" style={styles.eventCard}>
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
      {/* Prismatic Glowing Blobs */}
      <View className="liquid-blob" style={[styles.blob, { backgroundColor: '#6366f1', top: '10%', left: '5%', width: 250, height: 250, borderRadius: 125 }]} />
      <View className="liquid-blob" style={[styles.blob, { backgroundColor: '#06b6d4', bottom: '25%', right: '5%', width: 250, height: 250, borderRadius: 125 }]} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Sincronización</Text>
        <View style={styles.statusRow}>
          <View style={styles.networkIndicator}>
            <View style={[styles.dot, { backgroundColor: isConnected ? '#34d399' : '#f87171' }]} />
            <Text style={styles.statusLabel}>{isConnected ? 'Conectado (Online)' : 'Sin internet (Offline)'}</Text>
          </View>
          <Text style={styles.syncTime}>{formatTimeAgo(lastSync)}</Text>
        </View>
      </View>

      {/* Sync Control Card */}
      <View className="glass-panel" style={styles.controlCard}>
        <View style={styles.countContainer}>
          <Text style={styles.countValue}>{pendingCount}</Text>
          <Text style={styles.countLabel}>Operaciones pendientes</Text>
        </View>

        <TouchableOpacity
          className="liquid-button"
          style={[
            styles.syncButton,
            (syncing || !isConnected || !isAuthenticated) && styles.syncButtonDisabled,
          ]}
          onPress={handleSync}
          disabled={syncing || !isConnected || !isAuthenticated}
          activeOpacity={0.8}
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
            tintColor="#6366f1"
            colors={['#6366f1']}
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
  container: { flex: 1, backgroundColor: '#090d16', overflow: 'hidden' },
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
  title: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 6 },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  networkIndicator: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  statusLabel: { fontSize: 13, color: '#94a3b8', fontWeight: '500' },
  syncTime: { fontSize: 11, color: '#64748b', fontWeight: '500' },

  controlCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    margin: 16,
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    ...Platform.select({
      web: {
        backdropFilter: 'blur(10px)',
      },
    }),
  },
  countContainer: { alignItems: 'center', marginBottom: 16 },
  countValue: { fontSize: 36, fontWeight: '900', color: '#fff' },
  countLabel: { fontSize: 13, color: '#94a3b8', fontWeight: '500', marginTop: 2 },
  syncButton: {
    backgroundColor: '#6366f1',
    width: '100%',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  syncButtonDisabled: { opacity: 0.5 },
  syncButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  warningText: { color: '#fbbf24', fontSize: 12, marginTop: 10, textAlign: 'center', fontWeight: '500' },

  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#cbd5e1', paddingHorizontal: 20, marginTop: 8, marginBottom: 10 },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  eventCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    ...Platform.select({
      web: {
        backdropFilter: 'blur(10px)',
      },
    }),
  },
  eventCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  eventTitle: { fontSize: 11, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 },
  eventDetails: { fontSize: 14, fontWeight: '600', color: '#fff', marginTop: 2 },
  statusBadge: { borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2 },
  statusText: { fontSize: 10, fontWeight: '700' },
  errorText: { color: '#f87171', fontSize: 11, marginTop: 6, fontWeight: '500' },
  eventCardBottom: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(255, 255, 255, 0.05)' },
  eventDate: { fontSize: 11, color: '#64748b' },
  attemptsText: { fontSize: 11, color: '#64748b', fontWeight: '500' },

  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  emptyIcon: { fontSize: 40, marginBottom: 8 },
  emptyText: { color: '#64748b', fontSize: 13, textAlign: 'center' },
});
