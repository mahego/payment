import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Platform } from 'react-native';
import { useToastStore, ToastMessage } from '../store/toast.store';
import { Ionicons } from '@expo/vector-icons';

export default function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  console.log('[ToastContainer] rendering with toasts:', toasts);

  return (
    <View style={styles.container} pointerEvents="box-none" nativeID="dx-toast-container">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </View>
  );
}

function ToastItem({ toast }: { toast: ToastMessage }) {
  const hide = useToastStore((s) => s.hide);
  const opacity = React.useRef(new Animated.Value(0)).current;
  const translateY = React.useRef(new Animated.Value(-20)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, translateY]);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: -15,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => hide(toast.id));
  };

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return 'checkmark-circle';
      case 'error':
        return 'alert-circle';
      case 'warning':
        return 'warning';
      default:
        return 'information-circle';
    }
  };

  const getColor = () => {
    switch (toast.type) {
      case 'success':
        return '#34d399'; // Emerald-400
      case 'error':
        return '#f87171'; // Rose-400
      case 'warning':
        return '#fbbf24'; // Amber-400
      default:
        return '#60a5fa'; // Blue-400
    }
  };

  const iconName = getIcon() as any;
  const color = getColor();

  return (
    <Animated.View
      nativeID="dx-toast-item"
      style={[
        styles.toast,
        {
          opacity,
          transform: [{ translateY }],
          borderColor: color + '2b', // subtle opacity border tint
        },
      ]}
    >
      <Ionicons name={iconName} size={20} color={color} />
      <Text style={styles.message}>{toast.message}</Text>
      <TouchableOpacity onPress={handleDismiss} style={styles.closeButton} activeOpacity={0.7}>
        <Ionicons name="close" size={16} color="rgba(255,255,255,0.4)" />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 30,
    left: 16,
    right: 16,
    zIndex: 99999,
    alignItems: 'center',
    gap: 8,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    width: '100%',
    maxWidth: 480,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
    ...Platform.select({
      web: {
        backdropFilter: 'blur(12px)',
        cursor: 'default',
        userSelect: 'none',
      },
    }),
  },
  message: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 10,
    flex: 1,
    lineHeight: 18,
  },
  closeButton: {
    padding: 2,
    marginLeft: 8,
  },
});
