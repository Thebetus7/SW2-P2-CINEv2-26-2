import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.cine.movil',
  appName: 'CineMovil',
  webDir: 'dist',
  server: {
    androidScheme: 'http',
    cleartext: true
  },
  plugins: {
    Geolocation: {
      enableHighAccuracy: true
    }
  }
};

export default config;
