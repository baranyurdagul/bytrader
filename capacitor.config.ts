import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.8426f991c90c4998b0be37e305d23cfa',
  appName: 'bytrader',
  webDir: 'dist',
  server: {
    url: 'https://8426f991-c90c-4998-b0be-37e305d23cfa.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  ios: {
    contentInset: 'automatic'
  },
  android: {
    allowMixedContent: true
  }
};

export default config;
