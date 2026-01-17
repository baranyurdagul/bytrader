import { useState, useEffect, useCallback } from 'react';

export function useServiceWorker() {
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const [permissionState, setPermissionState] = useState<NotificationPermission>('default');

  useEffect(() => {
    const supported = 'serviceWorker' in navigator && 'Notification' in window;
    setIsSupported(supported);

    if (supported) {
      setPermissionState(Notification.permission);
      registerServiceWorker();
    }
  }, []);

  const registerServiceWorker = async () => {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });
      console.log('Service Worker registered:', reg);
      setRegistration(reg);

      // Wait for the service worker to be ready
      await navigator.serviceWorker.ready;
      console.log('Service Worker ready');
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  };

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      console.warn('Notifications not supported');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      setPermissionState(permission);
      return permission === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }, [isSupported]);

  const showNotification = useCallback(async (
    title: string,
    body: string,
    options?: {
      tag?: string;
      alertId?: string;
    }
  ) => {
    if (!isSupported) {
      console.warn('Notifications not supported');
      return false;
    }

    // Request permission if not granted
    if (permissionState !== 'granted') {
      const granted = await requestPermission();
      if (!granted) {
        console.warn('Notification permission not granted');
        return false;
      }
    }

    try {
      // Wait for service worker to be ready
      const reg = await navigator.serviceWorker.ready;
      
      // Use service worker's showNotification directly for reliability
      await reg.showNotification(title, {
        body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        vibrate: [300, 100, 300, 100, 300],
        tag: options?.tag || 'price-alert',
        renotify: true,
        requireInteraction: true,
        silent: false,
        data: {
          url: '/',
          alertId: options?.alertId
        }
      } as NotificationOptions);
      
      console.log('Notification shown successfully');
      return true;
    } catch (error) {
      console.error('Error showing notification:', error);
      
      // Fallback to regular Notification API
      try {
        new Notification(title, {
          body,
          icon: '/favicon.ico',
          tag: options?.tag
        });
        return true;
      } catch (fallbackError) {
        console.error('Fallback notification also failed:', fallbackError);
        return false;
      }
    }
  }, [isSupported, permissionState, requestPermission]);

  return {
    isSupported,
    permissionState,
    registration,
    requestPermission,
    showNotification
  };
}
