import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import {
  getLocalCustomer,
  LocalCustomer,
} from '../src/services/customer-sync.service';
import api from '../src/services/api.service';
import { useNetworkStatus } from '../src/services/network.service';
import { toast } from '../src/store/toast.store';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  ACTIVO:     { label: 'Activo',     color: '#34d399', bg: 'rgba(52, 211, 153, 0.15)' },
  SUSPENDIDO: { label: 'Suspendido', color: '#f87171', bg: 'rgba(248, 113, 113, 0.15)' },
  MOROSO:     { label: 'Moroso',     color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.15)' },
  CANCELADO:  { label: 'Cancelado',  color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.15)' },
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
      toast.error('No se pudo cargar el cliente');
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
        <ActivityIndicator size="large" color="#6366f1" />
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
    <View style={styles.container}>
      {/* Prismatic Glowing Blobs */}
      <View className="liquid-blob" style={[styles.blob, { backgroundColor: '#6366f1', top: '10%', left: '5%', width: 250, height: 250, borderRadius: 125 }]} />
      <View className="liquid-blob" style={[styles.blob, { backgroundColor: '#f43f5e', bottom: '20%', right: '5%', width: 250, height: 250, borderRadius: 125 }]} />

      <ScrollView contentContainerStyle={styles.content}>
        {/* Back button */}
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.7}>
          <Text style={styles.backButtonText}>← Clientes</Text>
        </TouchableOpacity>

        {/* Network Suspended Alert Banner */}
        {customer.is_network_suspended === 1 && (
          <View className="glass-panel" style={styles.suspendedBanner}>
            <Text style={styles.suspendedBannerTitle}>⚠️ SERVICIO DE RED SUSPENDIDO</Text>
            <Text style={styles.suspendedBannerText}>
              Este cliente tiene el servicio de internet cortado en el router por adeudos o suspensión manual.
            </Text>
          </View>
        )}

        {/* Customer card */}
        <View className="glass-panel" style={styles.card}>
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
                { color: customer.current_balance > 0 ? '#f87171' : '#34d399' },
              ]}
            >
              ${customer.current_balance.toFixed(2)}
            </Text>
          </View>
        </View>

        {/* Info rows */}
        <View className="glass-panel" style={styles.infoCard}>
          <Text style={styles.infoTitle}>Información</Text>
          <InfoRow label="Teléfono" value={customer.phone ?? 'No registrado'} />
          <InfoRow label="Email" value={customer.email ?? 'No registrado'} />
          <InfoRow label="Dirección" value={customer.address_line ?? 'No registrada'} />
        </View>

        {/* Action button */}
        <TouchableOpacity
          className="liquid-button"
          style={styles.payButton}
          activeOpacity={0.8}
          onPress={() =>
            router.push({
              pathname: '/payments',
              params: { customerId: customer.id, customerName: `${customer.first_name} ${customer.last_name}` },
            })
          }
        >
          <Text style={styles.payButtonText}>💵 Registrar Pago</Text>
        </TouchableOpacity>

        {/* Recent payments */}
        <View className="glass-panel" style={styles.infoCard}>
          <Text style={styles.infoTitle}>Últimos pagos</Text>
          {loadingPayments ? (
            <ActivityIndicator size="small" color="#6366f1" style={{ marginVertical: 16 }} />
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
    </View>
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
  container: { flex: 1, backgroundColor: '#090d16', overflow: 'hidden' },
  content: { padding: 20, paddingBottom: 40, paddingTop: 30 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#090d16' },
  errorText: { fontSize: 16, color: '#94a3b8', marginBottom: 12 },
  backLink: { color: '#818cf8', fontWeight: '600', fontSize: 15 },
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

  backButton: { marginBottom: 16 },
  backButtonText: { color: '#818cf8', fontWeight: '600', fontSize: 15 },

  card: {
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    marginBottom: 16,
    ...Platform.select({
      web: {
        backdropFilter: 'blur(10px)',
      },
    }),
  },
  avatarLarge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.25)',
  },
  avatarLargeText: { fontSize: 22, fontWeight: '700', color: '#818cf8' },
  customerName: { fontSize: 20, fontWeight: '800', color: '#fff', marginBottom: 8 },

  statusBadge: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 4, marginBottom: 16 },
  statusText: { fontSize: 12, fontWeight: '700' },

  balanceContainer: { alignItems: 'center' },
  balanceLabel: { fontSize: 12, color: '#94a3b8', fontWeight: '500', marginBottom: 2 },
  balanceValue: { fontSize: 28, fontWeight: '900' },

  infoCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    marginBottom: 16,
    ...Platform.select({
      web: {
        backdropFilter: 'blur(10px)',
      },
    }),
  },
  infoTitle: { fontWeight: '700', fontSize: 15, color: '#cbd5e1', marginBottom: 12 },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  infoLabel: { color: '#94a3b8', fontSize: 14 },
  infoValue: { color: '#fff', fontSize: 14, fontWeight: '500', maxWidth: '60%', textAlign: 'right' },

  payButton: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  payButtonText: { color: '#fff', fontWeight: '800', fontSize: 16 },

  emptyPayments: { color: '#64748b', fontSize: 13, textAlign: 'center', paddingVertical: 16 },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  paymentFolio: { fontSize: 13, fontWeight: '600', color: '#fff' },
  paymentDate: { fontSize: 11, color: '#64748b', marginTop: 2 },
  paymentAmount: { fontSize: 15, fontWeight: '800', color: '#34d399' },
  paymentMethod: { fontSize: 10, color: '#64748b', fontWeight: '600', marginTop: 2 },
  suspendedBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    marginBottom: 16,
    ...Platform.select({
      web: {
        backdropFilter: 'blur(10px)',
      },
    }),
  },
  suspendedBannerTitle: {
    fontWeight: '800',
    fontSize: 14,
    color: '#f87171',
    marginBottom: 4,
  },
  suspendedBannerText: {
    color: '#fca5a5',
    fontSize: 12,
    lineHeight: 16,
  },
});
