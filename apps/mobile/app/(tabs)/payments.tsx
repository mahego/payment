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
  const [successMessage, setSuccessMessage] = useState('');

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
      Alert.alert('Error', 'Selecciona un cliente');
      return;
    }
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      Alert.alert('Error', 'Ingresa un monto válido mayor a 0');
      return;
    }

    setSubmitting(true);
    setSuccessMessage('');

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

        setSuccessMessage('✅ Pago registrado y enviado al servidor');
      } else {
        // Offline: enqueue to outbox
        if (!user?.id) {
          Alert.alert('Error', 'No se pudo identificar al usuario');
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

        setSuccessMessage('⏳ Pago guardado localmente — se enviará al sincronizar');
      }

      // Reset form
      setAmount('');
      setNotes('');
      setSelectedCustomer(null);
      setCustomerSearch('');

      // Clear success message after 5s
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Error al registrar el pago';
      Alert.alert('Error', msg);
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
        <Text style={styles.title}>Registrar Pago</Text>
        <Text style={styles.subtitle}>
          Registra un cobro al cliente. Funciona sin internet.
        </Text>

        {/* Success message */}
        {successMessage ? (
          <View style={styles.successBanner}>
            <Text style={styles.successText}>{successMessage}</Text>
          </View>
        ) : null}

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
          <View>
            <TextInput
              style={styles.input}
              placeholder="Buscar cliente por nombre..."
              placeholderTextColor="#9ca3af"
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
            style={styles.amountInput}
            placeholder="0.00"
            placeholderTextColor="#9ca3af"
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
          style={[styles.input, { height: 72, textAlignVertical: 'top' }]}
          placeholder="Ej: Pago del mes de junio"
          placeholderTextColor="#9ca3af"
          multiline
          value={notes}
          onChangeText={setNotes}
        />

        {/* Submit */}
        <TouchableOpacity
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
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  content: { padding: 20, paddingBottom: 40 },

  title: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 4 },
  subtitle: { fontSize: 13, color: '#6b7280', marginBottom: 20 },

  label: { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 8, marginTop: 16 },

  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#111827',
  },

  selectedCustomer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#2563eb',
  },
  selectedCustomerInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  miniAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniAvatarText: { fontSize: 12, fontWeight: '700', color: '#2563eb' },
  selectedName: { fontSize: 14, fontWeight: '700', color: '#111827' },
  selectedBalance: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  changeLink: { color: '#2563eb', fontWeight: '600', fontSize: 13 },

  searchDropdown: {
    backgroundColor: '#fff',
    borderRadius: 10,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
  },
  searchItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  searchItemName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  searchItemBalance: { fontSize: 13, color: '#6b7280' },

  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 14,
  },
  currencySign: { fontSize: 20, fontWeight: '700', color: '#6b7280', marginRight: 4 },
  amountInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    paddingVertical: 12,
  },

  quickAmounts: { flexDirection: 'row', gap: 8, marginTop: 10 },
  quickAmountButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  quickAmountText: { fontSize: 13, fontWeight: '600', color: '#374151' },

  methodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  methodButton: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  methodButtonActive: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  methodIcon: { fontSize: 20, marginBottom: 4 },
  methodLabel: { fontSize: 12, fontWeight: '600', color: '#6b7280' },
  methodLabelActive: { color: '#2563eb' },

  submitButton: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 28,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitDisabled: { opacity: 0.6 },
  submitText: { color: '#fff', fontWeight: '800', fontSize: 16 },

  successBanner: {
    backgroundColor: '#d1fae5',
    borderRadius: 10,
    padding: 14,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  successText: { color: '#065f46', fontWeight: '600', fontSize: 13, textAlign: 'center' },
});
