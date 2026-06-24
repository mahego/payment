import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useAuthStore } from '../../src/store/auth.store';
import { toast } from '../../src/store/toast.store';

export default function LoginScreen() {
  const router = useRouter();
  const { login, isLoading } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      toast.warning('Ingresa tu correo y contraseña');
      return;
    }
    console.log(`[Login] Intentando iniciar sesión para: ${email.trim().toLowerCase()}`);
    try {
      await login(email.trim().toLowerCase(), password);
      toast.success('Sesión iniciada con éxito');
      router.replace('/route');
    } catch (err: unknown) {
      console.error('[Login] Error durante el inicio de sesión:', err);
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Credenciales inválidas o error de conexión';
      toast.error(message);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Prismatic Glowing Blobs */}
      <View className="liquid-blob" style={[styles.blob, { backgroundColor: '#6366f1', top: '15%', left: '5%', width: 300, height: 300, borderRadius: 150 }]} />
      <View className="liquid-blob" style={[styles.blob, { backgroundColor: '#f43f5e', bottom: '15%', right: '5%', width: 300, height: 300, borderRadius: 150 }]} />
      <View className="liquid-blob" style={[styles.blob, { backgroundColor: '#06b6d4', top: '40%', right: '20%', width: 200, height: 200, borderRadius: 100 }]} />

      <View className="glass-panel" style={styles.glassCard}>
        <Text style={styles.title}>Deluxnet</Text>
        <Text style={styles.subtitle}>Plataforma ISP Rural</Text>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Correo electrónico</Text>
          <TextInput
            className="liquid-input"
            style={styles.input}
            placeholder="usuario@deluxnet.mx"
            placeholderTextColor="#64748b"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            value={email}
            onChangeText={setEmail}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Contraseña</Text>
          <TextInput
            className="liquid-input"
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor="#64748b"
            secureTextEntry
            autoComplete="password"
            value={password}
            onChangeText={setPassword}
          />
        </View>

        <TouchableOpacity
          className="liquid-button"
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={isLoading}
          activeOpacity={0.8}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Iniciar sesión</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => toast.info('Contacta al administrador del sistema')}>
          <Text style={styles.link}>¿Olvidaste tu contraseña?</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090d16',
    justifyContent: 'center',
    padding: 20,
    overflow: 'hidden',
  },
  blob: {
    position: 'absolute',
    opacity: 0.18,
    ...Platform.select({
      web: {
        filter: 'blur(80px)',
      },
      default: {
        shadowOpacity: 0.8,
        shadowRadius: 100,
        shadowOffset: { width: 0, height: 0 },
      },
    }),
  },
  glassCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    borderRadius: 24,
    padding: 28,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    ...Platform.select({
      web: {
        backdropFilter: 'blur(16px)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 5,
      },
    }),
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 28,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#cbd5e1',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#fff',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  button: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 16,
    ...Platform.select({
      web: {
        boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
      },
    }),
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  link: {
    color: '#94a3b8',
    textAlign: 'center',
    fontSize: 13,
  },
});
