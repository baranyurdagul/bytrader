import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function arrayBufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function usePushSubscription() {
  const { user } = useAuth();
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!user) {
      console.warn('User not authenticated');
      return false;
    }

    if (!VAPID_PUBLIC_KEY) {
      console.error('VAPID public key not configured');
      return false;
    }

    setIsSubscribing(true);

    try {
      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;
      
      // Check for existing subscription
      let pushSubscription = await registration.pushManager.getSubscription();
      
      if (!pushSubscription) {
        // Create new subscription
        pushSubscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: VAPID_PUBLIC_KEY,
        });
      }

      setSubscription(pushSubscription);

      // Extract subscription details
      const endpoint = pushSubscription.endpoint;
      const p256dhKey = pushSubscription.getKey('p256dh');
      const authKey = pushSubscription.getKey('auth');
      
      if (!p256dhKey || !authKey) {
        console.error('Failed to get push subscription keys');
        return false;
      }
      
      const p256dh = arrayBufferToBase64Url(p256dhKey);
      const auth = arrayBufferToBase64Url(authKey);

      // Save to database (upsert)
      const { error } = await supabase
        .from('push_subscriptions')
        .upsert(
          {
            user_id: user.id,
            endpoint,
            p256dh,
            auth,
          } as any,
          { 
            onConflict: 'user_id,endpoint',
          }
        );

      if (error) {
        console.error('Error saving push subscription:', error);
        return false;
      }

      console.log('Push subscription saved successfully');
      return true;
    } catch (error) {
      console.error('Error subscribing to push:', error);
      return false;
    } finally {
      setIsSubscribing(false);
    }
  }, [user]);

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!user) return false;

    try {
      const registration = await navigator.serviceWorker.ready;
      const pushSubscription = await registration.pushManager.getSubscription();

      if (pushSubscription) {
        // Remove from database
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('user_id', user.id)
          .eq('endpoint', pushSubscription.endpoint);

        // Unsubscribe from push
        await pushSubscription.unsubscribe();
        setSubscription(null);
      }

      return true;
    } catch (error) {
      console.error('Error unsubscribing from push:', error);
      return false;
    }
  }, [user]);

  const checkSubscription = useCallback(async (): Promise<boolean> => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const pushSubscription = await registration.pushManager.getSubscription();
      setSubscription(pushSubscription);
      return !!pushSubscription;
    } catch {
      return false;
    }
  }, []);

  return {
    subscription,
    isSubscribing,
    subscribe,
    unsubscribe,
    checkSubscription,
  };
}
