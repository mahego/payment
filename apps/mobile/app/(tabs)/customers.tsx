import { View, Text, StyleSheet } from 'react-native';

export default function CustomersScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Clientes</Text>
      <Text style={styles.sub}>Clientes sincronizados disponibles aquí.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f3f4f6' },
  title: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 8 },
  sub: { color: '#6b7280', fontSize: 14 },
});
