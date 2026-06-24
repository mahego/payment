import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { useLocalSearchParams } from 'expo-router';
import {
  getLocalCustomers,
  updateLocalBalance,
  LocalCustomer,
} from '../../src/services/customer-sync.service';
import { enqueueOutboxEvent } from '../../src/services/sync.service';
import { isOnline } from '../../src/services/network.service';
import { useAuthStore } from '../../src/store/auth.store';
import api from '../../src/services/api.service';
import { toast } from '../../src/store/toast.store';

const PAYMENT_METHODS = [
  { key: 'EFECTIVO', label: 'Efectivo', icon: '💵' },
  { key: 'TRANSFERENCIA', label: 'Transferencia', icon: '🏦' },
  { key: 'DEPOSITO', label: 'Depósito', icon: '🧾' },
  { key: 'TARJETA', label: 'Tarjeta', icon: '💳' },
] as const;

export default function PaymentsScreen() {
  const params = useLocalSearchParams<{
    customerId?: string;
    customerName?: string;
  }>();

  const user = useAuthStore((s) => s.user);

  // Form state
  const [selectedCustomer, setSelectedCustomer] = useState<LocalCustomer | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [searchResults, setSearchResults] = useState<LocalCustomer[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<string>('EFECTIVO');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Pre-fill if navigated from customer detail
  useEffect(() => {
    if (params.customerId) {
      (async () => {
        const customers = await getLocalCustomers();
        const found = customers.find((c) => c.id === params.customerId);
        if (found) {
          setSelectedCustomer(found);
          setCustomerSearch(`${found.first_name} ${found.last_name}`);
        }
      })();
    }
  }, [params.customerId]);

  // Search customers locally
  useEffect(() => {
    if (!showSearch || customerSearch.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      const results = await getLocalCustomers(customerSearch);
      setSearchResults(results.slice(0, 8));
    }, 200);
    return () => clearTimeout(timeout);
  }, [customerSearch, showSearch]);

  const selectCustomer = useCallback((c: LocalCustomer) => {
    setSelectedCustomer(c);
    setCustomerSearch(`${c.first_name} ${c.last_name}`);
    setShowSearch(false);
    setSearchResults([]);
  }, []);

  const clearCustomer = useCallback(() => {
    setSelectedCustomer(null);
    setCustomerSearch('');
    setShowSearch(true);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!selectedCustomer) {
      toast.warning('Selecciona un cliente');
      return;
    }
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.warning('Ingresa un monto válido mayor a 0');
      return;
    }

    setSubmitting(true);

    try {
      const online = await isOnline();

      if (online) {
        // Direct API call
        await api.post('/payments', {
          customerId: selectedCustomer.id,
          amount: amountNum,
          method,
          notes: notes.trim() || undefined,
        });

        // Update local balance
        await updateLocalBalance(selectedCustomer.id, amountNum);

        toast.success(`Pago de $${amountNum} registrado correctamente`);
      } else {
        // Offline: enqueue to outbox
        if (!user?.id) {
          toast.error('No se pudo identificar al usuario');
          return;
        }

        await enqueueOutboxEvent({
          aggregateType: 'Payment',
          aggregateId: selectedCustomer.id,
          operation: 'create',
          payload: {
            customerId: selectedCustomer.id,
            amount: amountNum,
            method,
            notes: notes.trim() || `Cobro offline por ${user.name}`,
          },
          deviceId: 'mobile-app',
          userId: user.id,
        });

        // Update local balance optimistically
        await updateLocalBalance(selectedCustomer.id, amountNum);

        toast.warning(`Cobro registrado offline (pendiente de sincronización)`);
      }

      // Reset form
      setAmount('');
      setNotes('');
      setSelectedCustomer(null);
      setCustomerSearch('');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Error al registrar el pago';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }, [selectedCustomer, amount, method, notes, user]);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Prismatic Glowing Blobs */}
        <View className="liquid-blob" style={[styles.blob, { backgroundColor: '#6366f1', top: '10%', right: '5%', width: 250, height: 250, borderRadius: 125 }]} />
        <View className="liquid-blob" style={[styles.blob, { backgroundColor: '#f43f5e', bottom: '15%', left: '5%', width: 250, height: 250, borderRadius: 125 }]} />

        <Text style={styles.title}>Registrar Pago</Text>
        <Text style={styles.subtitle}>
          Registra un cobro al cliente. Funciona sin internet.
        </Text>

        {/* Form Box */}
        <View className="glass-panel" style={styles.glassCard}>
          {/* Customer selector */}
          <Text style={styles.label}>Cliente</Text>
          {selectedCustomer ? (
            <View style={styles.selectedCustomer}>
              <View style={styles.selectedCustomerInfo}>
                <View style={styles.miniAvatar}>
                  <Text style={styles.miniAvatarText}>
                    {selectedCustomer.first_name[0]}
                    {selectedCustomer.last_name[0]}
                  </Text>
                </View>
                <View>
                  <Text style={styles.selectedName}>
                    {selectedCustomer.first_name} {selectedCustomer.last_name}
                  </Text>
                  <Text style={styles.selectedBalance}>
                    Saldo: ${selectedCustomer.current_balance.toFixed(2)}
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={clearCustomer}>
                <Text style={styles.changeLink}>Cambiar</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ zIndex: 50 }}>
              <TextInput
                className="liquid-input"
                style={styles.input}
                placeholder="Buscar cliente por nombre..."
                placeholderTextColor="#64748b"
                value={customerSearch}
                onChangeText={(text) => {
                  setCustomerSearch(text);
                  setShowSearch(true);
                }}
                onFocus={() => setShowSearch(true)}
              />
              {showSearch && searchResults.length > 0 && (
                <View style={styles.searchDropdown}>
                  {searchResults.map((c) => (
                    <TouchableOpacity
                      key={c.id}
                      style={styles.searchItem}
                      onPress={() => selectCustomer(c)}
                    >
                      <Text style={styles.searchItemName}>
                        {c.first_name} {c.last_name}
                      </Text>
                      <Text style={styles.searchItemBalance}>
                        ${c.current_balance.toFixed(2)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Amount */}
          <Text style={styles.label}>Monto</Text>
          <View style={styles.amountContainer}>
            <Text style={styles.currencySign}>$</Text>
            <TextInput
              className="liquid-input"
              style={styles.amountInput}
              placeholder="0.00"
              placeholderTextColor="#64748b"
              keyboardType="decimal-pad"
              value={amount}
              onChangeText={setAmount}
            />
          </View>

          {/* Quick amounts */}
          <View style={styles.quickAmounts}>
            {[100, 250, 350, 500].map((val) => (
              <TouchableOpacity
                key={val}
                style={styles.quickAmountButton}
                onPress={() => setAmount(val.toString())}
              >
                <Text style={styles.quickAmountText}>${val}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Payment method */}
          <Text style={styles.label}>Método de pago</Text>
          <View style={styles.methodGrid}>
            {PAYMENT_METHODS.map((m) => (
              <TouchableOpacity
                key={m.key}
                style={[
                  styles.methodButton,
                  method === m.key && styles.methodButtonActive,
                ]}
                onPress={() => setMethod(m.key)}
              >
                <Text style={styles.methodIcon}>{m.icon}</Text>
                <Text
                  style={[
                    styles.methodLabel,
                    method === m.key && styles.methodLabelActive,
                  ]}
                >
                  {m.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Notes */}
          <Text style={styles.label}>Notas (opcional)</Text>
          <TextInput
            className="liquid-input"
            style={[styles.input, { height: 72, textAlignVertical: 'top' }]}
            placeholder="Ej: Pago del mes de junio"
            placeholderTextColor="#64748b"
            multiline
            value={notes}
            onChangeText={setNotes}
          />

          {/* Submit */}
          <TouchableOpacity
            className="liquid-button"
            style={[styles.submitButton, submitting && styles.submitDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.8}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitText}>Cobrar ${amount || '0.00'}</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#090d16', overflow: 'hidden' },
  content: { padding: 20, paddingBottom: 40 },

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

  title: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 4 },
  subtitle: { fontSize: 13, color: '#94a3b8', marginBottom: 20 },

  glassCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    ...Platform.select({
      web: {
        backdropFilter: 'blur(12px)',
      },
    }),
  },

  label: { fontSize: 13, fontWeight: '700', color: '#cbd5e1', marginBottom: 8, marginTop: 16 },

  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#fff',
  },

  selectedCustomer: {
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#6366f1',
  },
  selectedCustomerInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  miniAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniAvatarText: { fontSize: 12, fontWeight: '700', color: '#818cf8' },
  selectedName: { fontSize: 14, fontWeight: '700', color: '#fff' },
  selectedBalance: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  changeLink: { color: '#818cf8', fontWeight: '600', fontSize: 13 },

  searchDropdown: {
    backgroundColor: '#0f172a',
    borderRadius: 10,
    marginTop: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    zIndex: 999,
  },
  searchItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  searchItemName: { fontSize: 14, fontWeight: '600', color: '#fff' },
  searchItemBalance: { fontSize: 13, color: '#94a3b8' },

  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    paddingHorizontal: 14,
  },
  currencySign: { fontSize: 20, fontWeight: '700', color: '#94a3b8', marginRight: 4 },
  amountInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    paddingVertical: 12,
  },

  quickAmounts: { flexDirection: 'row', gap: 8, marginTop: 10 },
  quickAmountButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  quickAmountText: { fontSize: 13, fontWeight: '600', color: '#cbd5e1' },

  methodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  methodButton: {
    width: '48%',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  methodButtonActive: {
    borderColor: '#6366f1',
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
  },
  methodIcon: { fontSize: 20, marginBottom: 4 },
  methodLabel: { fontSize: 12, fontWeight: '600', color: '#94a3b8' },
  methodLabelActive: { color: '#818cf8' },

  submitButton: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 28,
  },
  submitDisabled: { opacity: 0.6 },
  submitText: { color: '#fff', fontWeight: '800', fontSize: 16 },

  successBanner: {
    backgroundColor: 'rgba(52, 211, 153, 0.12)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.3)',
  },
  successText: { color: '#34d399', fontWeight: '600', fontSize: 13, textAlign: 'center' },
});
