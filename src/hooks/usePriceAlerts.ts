import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export interface PriceAlert {
  id: string;
  user_id: string;
  asset_id: string;
  asset_name: string;
  asset_symbol: string;
  target_price: number;
  condition: 'above' | 'below';
  is_triggered: boolean;
  is_active: boolean;
  triggered_at: string | null;
  triggered_price: number | null;
  created_at: string;
}

export interface NewPriceAlert {
  asset_id: string;
  asset_name: string;
  asset_symbol: string;
  target_price: number;
  condition: 'above' | 'below';
}

export function usePriceAlerts() {
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();
  const notifiedAlertsRef = useRef<Set<string>>(new Set());

  const fetchAlerts = useCallback(async () => {
    if (!user) {
      setAlerts([]);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('price_alerts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setAlerts(data as PriceAlert[]);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const addAlert = useCallback(async (alert: NewPriceAlert) => {
    if (!user) return { error: new Error('Not authenticated') };

    try {
      const { error } = await supabase
        .from('price_alerts')
        .insert({
          user_id: user.id,
          asset_id: alert.asset_id,
          asset_name: alert.asset_name,
          asset_symbol: alert.asset_symbol,
          target_price: alert.target_price,
          condition: alert.condition,
        });

      if (error) throw error;

      await fetchAlerts();
      
      toast({
        title: "Alert Created",
        description: `You'll be notified when ${alert.asset_name} goes ${alert.condition} $${alert.target_price.toLocaleString()}`,
      });

      return { error: null };
    } catch (error) {
      console.error('Error adding alert:', error);
      toast({
        title: "Error",
        description: "Failed to create alert",
        variant: "destructive",
      });
      return { error };
    }
  }, [user, fetchAlerts, toast]);

  const deleteAlert = useCallback(async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('price_alerts')
        .delete()
        .eq('id', alertId);

      if (error) throw error;

      await fetchAlerts();
      notifiedAlertsRef.current.delete(alertId);
      
      toast({
        title: "Alert Deleted",
        description: "Price alert has been removed",
      });

      return { error: null };
    } catch (error) {
      console.error('Error deleting alert:', error);
      return { error };
    }
  }, [fetchAlerts, toast]);

  const toggleAlert = useCallback(async (alertId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('price_alerts')
        .update({ is_active: isActive })
        .eq('id', alertId);

      if (error) throw error;

      await fetchAlerts();
      
      if (!isActive) {
        notifiedAlertsRef.current.delete(alertId);
      }

      return { error: null };
    } catch (error) {
      console.error('Error toggling alert:', error);
      return { error };
    }
  }, [fetchAlerts]);

  // Send email notification
  const sendEmailNotification = useCallback(async (
    alert: PriceAlert,
    currentPrice: number
  ) => {
    try {
      console.log('Sending email notification for alert:', alert.id);
      
      const { data, error } = await supabase.functions.invoke('send-alert-email', {
        body: {
          alertId: alert.id,
          assetName: alert.asset_name,
          assetSymbol: alert.asset_symbol,
          condition: alert.condition,
          targetPrice: Number(alert.target_price),
          currentPrice,
        },
      });

      if (error) {
        console.error('Error sending email notification:', error);
      } else {
        console.log('Email notification sent successfully:', data);
      }
    } catch (error) {
      console.error('Error invoking send-alert-email function:', error);
    }
  }, []);

  // Check alerts against current prices
  const checkAlerts = useCallback(async (currentPrices: Record<string, number>) => {
    const activeAlerts = alerts.filter(a => a.is_active && !a.is_triggered);
    const triggeredAlerts: PriceAlert[] = [];

    for (const alert of activeAlerts) {
      const currentPrice = currentPrices[alert.asset_id];
      if (currentPrice === undefined) continue;

      const targetPrice = Number(alert.target_price);
      let isTriggered = false;

      if (alert.condition === 'above' && currentPrice >= targetPrice) {
        isTriggered = true;
      } else if (alert.condition === 'below' && currentPrice <= targetPrice) {
        isTriggered = true;
      }

      if (isTriggered && !notifiedAlertsRef.current.has(alert.id)) {
        notifiedAlertsRef.current.add(alert.id);
        triggeredAlerts.push(alert);

        // Update alert in database
        await supabase
          .from('price_alerts')
          .update({
            is_triggered: true,
            triggered_at: new Date().toISOString(),
            triggered_price: currentPrice,
          })
          .eq('id', alert.id);

        // Show toast notification
        toast({
          title: `🔔 Price Alert: ${alert.asset_name}`,
          description: `${alert.asset_symbol} is now ${alert.condition} $${targetPrice.toLocaleString()} (Current: $${currentPrice.toLocaleString()})`,
          duration: 10000,
        });

        // Show browser notification if permitted
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(`Price Alert: ${alert.asset_name}`, {
            body: `${alert.asset_symbol} is now ${alert.condition} $${targetPrice.toLocaleString()}`,
            icon: '/favicon.ico',
          });
        }

        // Send email notification
        sendEmailNotification(alert, currentPrice);
      }
    }

    if (triggeredAlerts.length > 0) {
      await fetchAlerts();
    }

    return triggeredAlerts;
  }, [alerts, toast, fetchAlerts, sendEmailNotification]);

  // Request notification permission
  const requestNotificationPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      toast({
        title: "Not Supported",
        description: "Browser notifications are not supported",
        variant: "destructive",
      });
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      toast({
        title: "Notifications Enabled",
        description: "You'll receive browser notifications for price alerts",
      });
      return true;
    } else {
      toast({
        title: "Notifications Blocked",
        description: "Enable notifications in your browser settings to receive alerts",
        variant: "destructive",
      });
      return false;
    }
  }, [toast]);

  return {
    alerts,
    isLoading,
    addAlert,
    deleteAlert,
    toggleAlert,
    checkAlerts,
    refetch: fetchAlerts,
    requestNotificationPermission,
    activeAlertsCount: alerts.filter(a => a.is_active && !a.is_triggered).length,
  };
}
