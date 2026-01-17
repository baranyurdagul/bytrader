import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export interface NotificationPreferences {
  id: string;
  user_id: string;
  email_enabled: boolean;
  push_enabled: boolean;
  email_digest: boolean;
  digest_frequency: 'instant' | 'daily' | 'weekly';
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  created_at: string;
  updated_at: string;
}

const DEFAULT_PREFERENCES: Omit<NotificationPreferences, 'id' | 'user_id' | 'created_at' | 'updated_at'> = {
  email_enabled: true,
  push_enabled: true,
  email_digest: false,
  digest_frequency: 'instant',
  quiet_hours_enabled: false,
  quiet_hours_start: '22:00',
  quiet_hours_end: '08:00',
};

export function useNotificationPreferences() {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchPreferences = useCallback(async () => {
    if (!user) {
      setPreferences(null);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setPreferences(data as NotificationPreferences);
      } else {
        // Create default preferences
        const { data: newData, error: insertError } = await supabase
          .from('notification_preferences')
          .insert({
            user_id: user.id,
            ...DEFAULT_PREFERENCES,
          })
          .select()
          .single();

        if (insertError) throw insertError;
        setPreferences(newData as NotificationPreferences);
      }
    } catch (error) {
      console.error('Error fetching notification preferences:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  const updatePreferences = useCallback(async (
    updates: Partial<Omit<NotificationPreferences, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
  ) => {
    if (!user || !preferences) return { error: new Error('Not authenticated') };

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('notification_preferences')
        .update(updates)
        .eq('user_id', user.id);

      if (error) throw error;

      setPreferences(prev => prev ? { ...prev, ...updates } : null);
      
      toast({
        title: "Settings Saved",
        description: "Your notification preferences have been updated",
      });

      return { error: null };
    } catch (error) {
      console.error('Error updating preferences:', error);
      toast({
        title: "Error",
        description: "Failed to save preferences",
        variant: "destructive",
      });
      return { error };
    } finally {
      setIsSaving(false);
    }
  }, [user, preferences, toast]);

  const toggleEmailEnabled = useCallback(() => {
    if (preferences) {
      updatePreferences({ email_enabled: !preferences.email_enabled });
    }
  }, [preferences, updatePreferences]);

  const togglePushEnabled = useCallback(() => {
    if (preferences) {
      updatePreferences({ push_enabled: !preferences.push_enabled });
    }
  }, [preferences, updatePreferences]);

  const toggleQuietHours = useCallback(() => {
    if (preferences) {
      updatePreferences({ quiet_hours_enabled: !preferences.quiet_hours_enabled });
    }
  }, [preferences, updatePreferences]);

  return {
    preferences,
    isLoading,
    isSaving,
    updatePreferences,
    toggleEmailEnabled,
    togglePushEnabled,
    toggleQuietHours,
    refetch: fetchPreferences,
  };
}
