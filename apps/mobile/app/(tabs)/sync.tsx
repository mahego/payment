import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useState } from 'react';
import { syncOutboxEvents } from '../../src/services/sync.service';
import { useAuthStore } from '../../src/store/auth.store';

export default function SyncScreen() {
  const { isAuthenticated } = useAuthStore();
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<{ synced: number; failed: number } | null>(null);

  const handleSync = async () => {
    if (!isAuthenticated) {
      Alert.alert('Sesión inválida', 'Debes iniciar sesión para sincronizar.');
      return;
    }

    setSyncing(true);
    setResult(null);
    try {
      const r = await syncOutboxEvents();
      setResult(r);
    } catch {
      Alert.alert('Error', 'No se pudo sincronizar. Verifica tu conexión.');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sincronización</Text>
      <Text style={styles.subtitle}>
        Envía las operaciones pendientes al servidor.
      </Text>

      <TouchableOpacity
        style={[styles.button, syncing && styles.buttonDisabled]}
        onPress={handleSync}
        disabled={syncing}
      >
        {syncing ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Sincronizar ahora</Text>
        )}
      </TouchableOpacity>

      {result && (
        <View style={styles.result}>
          <Text style={styles.resultRow}>
            ✅ Sincronizados: <Text style={{ fontWeight: '700' }}>{result.synced}</Text>
          </Text>
          <Text style={styles.resultRow}>
            ❌ Fallidos: <Text style={{ fontWeight: '700' }}>{result.failed}</Text>
          </Text>
        </View>
      )}

      {!isAuthenticated && (
        <Text style={styles.warning}>
          ⚠️ Sin sesión activa. Inicia sesión para sincronizar.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#f3f4f6' },
  title: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 6 },
  subtitle: { fontSize: 14, color: '#6b7280', marginBottom: 28 },
  button: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  result: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  resultRow: { fontSize: 15, color: '#374151' },
  warning: {
    marginTop: 20,
    color: '#b45309',
    backgroundColor: '#fef3c7',
    borderRadius: 10,
    padding: 12,
    fontSize: 13,
  },
});
