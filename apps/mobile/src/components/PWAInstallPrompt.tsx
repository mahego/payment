import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showAndroidPrompt, setShowAndroidPrompt] = useState(false);
  const [showIosPrompt, setShowIosPrompt] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    // Check if already running in standalone mode (installed PWA)
    const isStandalone = 
      window.matchMedia('(display-mode: standalone)').matches || 
      (window.navigator as any).standalone === true;

    if (isStandalone) return;

    // Handler for Chrome / Android beforeinstallprompt
    const handleInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowAndroidPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleInstallPrompt);

    // Detect if iOS (iPhone/iPad) in Safari (not standalone)
    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    if (isIos && !isStandalone) {
      // Show iOS setup guide after a slight delay
      const timer = setTimeout(() => {
        setShowIosPrompt(true);
      }, 3000);
      return () => clearTimeout(timer);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
    };
  }, []);

  const handleAndroidInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`[PWA] Install choice outcome: ${outcome}`);
    setDeferredPrompt(null);
    setShowAndroidPrompt(false);
  };

  const handleDismiss = () => {
    setIsVisible(false);
  };

  if (!isVisible) return null;

  // Render Chrome / Android PWA Install Banner
  if (showAndroidPrompt && deferredPrompt) {
    return (
      <View className="glass-panel" style={styles.bannerContainer}>
        <View style={styles.bannerContent}>
          <Ionicons name="download-outline" size={24} color="#6366f1" style={styles.icon} />
          <View style={styles.textContainer}>
            <Text style={styles.title}>Instalar Deluxnet</Text>
            <Text style={styles.description}>Instala la app en tu pantalla de inicio para una mejor experiencia offline.</Text>
          </View>
        </View>
        <View style={styles.actions}>
          <TouchableOpacity onPress={handleDismiss} style={styles.dismissButton}>
            <Text style={styles.dismissText}>Ahora no</Text>
          </TouchableOpacity>
          <TouchableOpacity className="liquid-button" onPress={handleAndroidInstall} style={styles.actionButton}>
            <Text style={styles.actionText}>Instalar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Render iOS / Safari PWA Install Instructions
  if (showIosPrompt) {
    return (
      <View className="glass-panel" style={styles.bannerContainer}>
        <View style={styles.bannerContent}>
          <Ionicons name="logo-apple" size={24} color="#a855f7" style={styles.icon} />
          <View style={styles.textContainer}>
            <Text style={styles.title}>Añadir a Pantalla de Inicio</Text>
            <Text style={styles.description}>
              Para instalar en tu iPhone: pulsa el botón <Text style={styles.bold}>Compartir</Text> <Ionicons name="share-outline" size={14} color="#fff" /> en Safari y luego selecciona <Text style={styles.bold}>Añadir a pantalla de inicio</Text>.
            </Text>
          </View>
        </View>
        <TouchableOpacity onPress={handleDismiss} style={styles.closeIcon}>
          <Ionicons name="close" size={20} color="rgba(255,255,255,0.4)" />
        </TouchableOpacity>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  bannerContainer: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    borderRadius: 20,
    padding: 16,
    zIndex: 9999,
    flexDirection: 'column',
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  icon: {
    marginTop: 2,
  },
  textContainer: {
    flex: 1,
    paddingRight: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  description: {
    fontSize: 12,
    color: '#94a3b8',
    lineHeight: 16,
  },
  bold: {
    fontWeight: '700',
    color: '#fff',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  dismissButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  dismissText: {
    fontSize: 13,
    color: '#94a3b8',
    fontWeight: '600',
  },
  actionButton: {
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#6366f1',
  },
  actionText: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '700',
  },
  closeIcon: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 4,
  },
});
