import { View, Text, StyleSheet } from 'react-native';

export default function RouteScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mi ruta</Text>
      <Text style={styles.sub}>Los clientes de tu ruta aparecerán aquí.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f3f4f6' },
  title: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 8 },
  sub: { color: '#6b7280', fontSize: 14 },
});
