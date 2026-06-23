import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import {
  getLocalCustomer,
  LocalCustomer,
} from '../src/services/customer-sync.service';
import api from '../src/services/api.service';
import { useNetworkStatus } from '../src/services/network.service';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  ACTIVO:     { label: 'Activo',     color: '#059669', bg: '#d1fae5' },
  SUSPENDIDO: { label: 'Suspendido', color: '#dc2626', bg: '#fee2e2' },
  MOROSO:     { label: 'Moroso',     color: '#d97706', bg: '#fef3c7' },
  CANCELADO:  { label: 'Cancelado',  color: '#6b7280', bg: '#f3f4f6' },
};

interface ApiPayment {
  id: string;
  folio: string;
  amount: number;
  method: string;
  paidAt: string;
  notes?: string;
}

export default function CustomerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { isConnected } = useNetworkStatus();
  const [customer, setCustomer] = useState<LocalCustomer | null>(null);
  const [payments, setPayments] = useState<ApiPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPayments, setLoadingPayments] = useState(false);

  const loadCustomer = useCallback(async () => {
    if (!id) return;
    try {
      const c = await getLocalCustomer(id);
      setCustomer(c);
    } catch {
      Alert.alert('Error', 'No se pudo cargar el cliente');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadPayments = useCallback(async () => {
    if (!id || !isConnected) return;
    setLoadingPayments(true);
    try {
      const res = await api.get<ApiPayment[]>(`/payments?customerId=${id}`);
      setPayments(res.data.slice(0, 10));
    } catch {
      // Payments are optional — might be offline
    } finally {
      setLoadingPayments(false);
    }
  }, [id, isConnected]);

  useEffect(() => {
    loadCustomer();
    loadPayments();
  }, [loadCustomer, loadPayments]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (!customer) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Cliente no encontrado</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backLink}>← Regresar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const statusInfo = STATUS_CONFIG[customer.status] ?? STATUS_CONFIG.CANCELADO;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Back button */}
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Text style={styles.backButtonText}>← Clientes</Text>
      </TouchableOpacity>

      {/* Customer card */}
      <View style={styles.card}>
        <View style={styles.avatarLarge}>
          <Text style={styles.avatarLargeText}>
            {customer.first_name[0]}
            {customer.last_name[0]}
          </Text>
        </View>

        <Text style={styles.customerName}>
          {customer.first_name} {customer.last_name}
        </Text>

        <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
          <Text style={[styles.statusText, { color: statusInfo.color }]}>
            {statusInfo.label}
          </Text>
        </View>

        <View style={styles.balanceContainer}>
          <Text style={styles.balanceLabel}>Saldo pendiente</Text>
          <Text
            style={[
              styles.balanceValue,
              { color: customer.current_balance > 0 ? '#dc2626' : '#059669' },
            ]}
          >
            ${customer.current_balance.toFixed(2)}
          </Text>
        </View>
      </View>

      {/* Info rows */}
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Información</Text>
        <InfoRow label="Teléfono" value={customer.phone ?? 'No registrado'} />
        <InfoRow label="Email" value={customer.email ?? 'No registrado'} />
        <InfoRow label="Dirección" value={customer.address_line ?? 'No registrada'} />
      </View>

      {/* Action button */}
      <TouchableOpacity
        style={styles.payButton}
        activeOpacity={0.8}
        onPress={() =>
          router.push({
            pathname: '/(tabs)/payments',
            params: { customerId: customer.id, customerName: `${customer.first_name} ${customer.last_name}` },
          })
        }
      >
        <Text style={styles.payButtonText}>💵 Registrar Pago</Text>
      </TouchableOpacity>

      {/* Recent payments */}
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Últimos pagos</Text>
        {loadingPayments ? (
          <ActivityIndicator size="small" color="#2563eb" style={{ marginVertical: 16 }} />
        ) : payments.length === 0 ? (
          <Text style={styles.emptyPayments}>
            {isConnected ? 'Sin pagos registrados' : 'Conéctate para ver historial'}
          </Text>
        ) : (
          payments.map((p) => (
            <View key={p.id} style={styles.paymentRow}>
              <View>
                <Text style={styles.paymentFolio}>{p.folio}</Text>
                <Text style={styles.paymentDate}>
                  {new Date(p.paidAt).toLocaleDateString('es-MX', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.paymentAmount}>${Number(p.amount).toFixed(2)}</Text>
                <Text style={styles.paymentMethod}>{p.method}</Text>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  content: { padding: 20, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f3f4f6' },
  errorText: { fontSize: 16, color: '#6b7280', marginBottom: 12 },
  backLink: { color: '#2563eb', fontWeight: '600', fontSize: 15 },

  backButton: { marginBottom: 16 },
  backButtonText: { color: '#2563eb', fontWeight: '600', fontSize: 15 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 16,
  },
  avatarLarge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarLargeText: { fontSize: 22, fontWeight: '700', color: '#2563eb' },
  customerName: { fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 8 },

  statusBadge: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 4, marginBottom: 16 },
  statusText: { fontSize: 12, fontWeight: '700' },

  balanceContainer: { alignItems: 'center' },
  balanceLabel: { fontSize: 12, color: '#9ca3af', fontWeight: '500', marginBottom: 2 },
  balanceValue: { fontSize: 28, fontWeight: '900' },

  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 16,
  },
  infoTitle: { fontWeight: '700', fontSize: 15, color: '#374151', marginBottom: 12 },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  infoLabel: { color: '#6b7280', fontSize: 14 },
  infoValue: { color: '#111827', fontSize: 14, fontWeight: '500', maxWidth: '60%', textAlign: 'right' },

  payButton: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  payButtonText: { color: '#fff', fontWeight: '800', fontSize: 16 },

  emptyPayments: { color: '#9ca3af', fontSize: 13, textAlign: 'center', paddingVertical: 16 },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  paymentFolio: { fontSize: 13, fontWeight: '600', color: '#374151' },
  paymentDate: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  paymentAmount: { fontSize: 15, fontWeight: '800', color: '#059669' },
  paymentMethod: { fontSize: 10, color: '#9ca3af', fontWeight: '600', marginTop: 2 },
});
