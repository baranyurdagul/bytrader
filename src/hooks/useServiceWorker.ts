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
    if (!isSupported || permissionState !== 'granted') {
      console.warn('Notifications not available or not permitted');
      return false;
    }

    try {
      // Try to use service worker for notification (works in background)
      if (registration?.active) {
        registration.active.postMessage({
          type: 'SHOW_NOTIFICATION',
          title,
          body,
          tag: options?.tag,
          alertId: options?.alertId
        });
        return true;
      }

      // Fallback to regular notification
      new Notification(title, {
        body,
        icon: '/favicon.ico',
        tag: options?.tag
      });
      return true;
    } catch (error) {
      console.error('Error showing notification:', error);
      return false;
    }
  }, [isSupported, permissionState, registration]);

  return {
    isSupported,
    permissionState,
    registration,
    requestPermission,
    showNotification
  };
}
