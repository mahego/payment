import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store/auth.store';
import { toast } from '../../src/store/toast.store';

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();
  const router = useRouter();

  const handleLogout = () => {
    Alert.alert('Cerrar sesión', '¿Deseas cerrar sesión?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Cerrar sesión',
        style: 'destructive',
        onPress: async () => {
          await logout();
          toast.success('Sesión cerrada con éxito');
          router.replace('/login');
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      {/* Prismatic Glowing Blobs */}
      <View className="liquid-blob" style={[styles.blob, { backgroundColor: '#6366f1', top: '5%', left: '5%', width: 250, height: 250, borderRadius: 125 }]} />
      <View className="liquid-blob" style={[styles.blob, { backgroundColor: '#f43f5e', bottom: '15%', right: '5%', width: 250, height: 250, borderRadius: 125 }]} />

      <ScrollView contentContainerStyle={styles.content}>
        <View className="glass-panel" style={styles.card}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.name ? user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'U'}
            </Text>
          </View>
          <Text style={styles.name}>{user?.name ?? '—'}</Text>
          <Text style={styles.email}>{user?.email ?? '—'}</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{user?.role ?? '—'}</Text>
          </View>
        </View>

        {user?.collectorProfile && (
          <View className="glass-panel" style={styles.section}>
            <Text style={styles.sectionTitle}>Perfil cobrador</Text>
            <Row label="Zona" value={user.collectorProfile.assignedZone ?? '—'} />
            <Row
              label="Límite efectivo"
              value={
                user.collectorProfile.cashLimit
                  ? `$${user.collectorProfile.cashLimit}`
                  : '—'
              }
            />
            <Row
              label="Pagos offline"
              value={user.collectorProfile.canRegisterOfflinePayments ? 'Habilitado' : 'No'}
            />
          </View>
        )}

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.8}>
          <Text style={styles.logoutText}>Cerrar sesión</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
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
  content: { padding: 20, gap: 16, paddingTop: 30 },
  card: {
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    ...Platform.select({
      web: {
        backdropFilter: 'blur(10px)',
      },
    }),
  },
  avatar: {
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
  avatarText: { fontSize: 20, fontWeight: '700', color: '#818cf8' },
  name: { fontSize: 20, fontWeight: '700', color: '#fff' },
  email: { fontSize: 13, color: '#94a3b8', marginTop: 4 },
  badge: {
    marginTop: 8,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  badgeText: { color: '#818cf8', fontWeight: '600', fontSize: 12, textTransform: 'uppercase' },
  section: {
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    ...Platform.select({
      web: {
        backdropFilter: 'blur(10px)',
      },
    }),
  },
  sectionTitle: {
    fontWeight: '700',
    fontSize: 15,
    marginBottom: 12,
    color: '#cbd5e1',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  rowLabel: { color: '#94a3b8', fontSize: 14 },
  rowValue: { color: '#fff', fontSize: 14, fontWeight: '500' },
  logoutButton: {
    backgroundColor: 'rgba(248, 113, 113, 0.12)',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.25)',
  },
  logoutText: { color: '#f87171', fontWeight: '700', fontSize: 15 },
});
