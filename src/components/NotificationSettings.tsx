import { useState, useEffect } from 'react';
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences';
import { useServiceWorker } from '@/hooks/useServiceWorker';
import { usePushSubscription } from '@/hooks/usePushSubscription';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { 
  Mail, 
  Bell, 
  Moon,
  Clock,
  Loader2,
  Send
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

function PushNotificationSection({ 
  preferences, 
  isSaving, 
  togglePushEnabled 
}: { 
  preferences: any; 
  isSaving: boolean; 
  togglePushEnabled: () => void;
}) {
  const [isTesting, setIsTesting] = useState(false);
  const { permissionState, requestPermission, showNotification } = useServiceWorker();
  const { subscribe, isSubscribing, checkSubscription } = usePushSubscription();

  // Check subscription status on mount
  useEffect(() => {
    checkSubscription();
  }, [checkSubscription]);

  const handleTogglePush = async () => {
    if (!preferences.push_enabled) {
      // Enabling push - request permission and subscribe
      if (permissionState !== 'granted') {
        const granted = await requestPermission();
        if (!granted) {
          toast.error('Please allow notifications in your browser');
          return;
        }
      }
      
      const subscribed = await subscribe();
      if (!subscribed) {
        toast.error('Failed to subscribe to push notifications');
        return;
      }
      toast.success('Push notifications enabled!');
    }
    
    togglePushEnabled();
  };

  const handleTestNotification = async () => {
    setIsTesting(true);
    
    try {
      // First ensure we have permission
      if (permissionState !== 'granted') {
        const granted = await requestPermission();
        if (!granted) {
          toast.error('Please allow notifications to test');
          setIsTesting(false);
          return;
        }
      }
      
      // Send test notification
      const success = await showNotification(
        '🎉 Test Notification',
        'Push notifications are working! You\'ll receive alerts when prices hit your targets.',
        { tag: 'test-notification' }
      );
      
      if (success) {
        toast.success('Test notification sent!');
      } else {
        toast.error('Failed to send notification');
      }
    } catch (error) {
      console.error('Test notification error:', error);
      toast.error('Failed to send test notification');
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn(
            "p-2 rounded-lg",
            preferences.push_enabled ? "bg-primary/10" : "bg-muted"
          )}>
            <Bell className={cn(
              "w-4 h-4",
              preferences.push_enabled ? "text-primary" : "text-muted-foreground"
            )} />
          </div>
          <div>
            <Label htmlFor="push-enabled" className="text-sm font-medium">
              Push Notifications
            </Label>
            <p className="text-xs text-muted-foreground">
              Browser notifications even when the tab is in background
            </p>
          </div>
        </div>
        <Switch
          id="push-enabled"
          checked={preferences.push_enabled}
          onCheckedChange={handleTogglePush}
          disabled={isSaving || isSubscribing}
        />
      </div>
      
      {preferences.push_enabled && (
        <div className="ml-11">
          <Button
            variant="outline"
            size="sm"
            onClick={handleTestNotification}
            disabled={isTesting}
            className="gap-2"
          >
            {isTesting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Test Notification
          </Button>
          {permissionState === 'denied' && (
            <p className="text-xs text-destructive mt-2">
              Notifications are blocked. Please enable them in your browser settings.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function NotificationSettings() {
  const { 
    preferences, 
    isLoading, 
    isSaving,
    updatePreferences,
    toggleEmailEnabled,
    togglePushEnabled,
    toggleQuietHours
  } = useNotificationPreferences();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!preferences) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Bell className="w-5 h-5 text-primary" />
          Notification Settings
        </CardTitle>
        <CardDescription>
          Configure how you receive price alert notifications
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Email Notifications */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-2 rounded-lg",
                preferences.email_enabled ? "bg-primary/10" : "bg-muted"
              )}>
                <Mail className={cn(
                  "w-4 h-4",
                  preferences.email_enabled ? "text-primary" : "text-muted-foreground"
                )} />
              </div>
              <div>
                <Label htmlFor="email-enabled" className="text-sm font-medium">
                  Email Notifications
                </Label>
                <p className="text-xs text-muted-foreground">
                  Receive email alerts when prices hit your targets
                </p>
              </div>
            </div>
            <Switch
              id="email-enabled"
              checked={preferences.email_enabled}
              onCheckedChange={toggleEmailEnabled}
              disabled={isSaving}
            />
          </div>

          {preferences.email_enabled && (
            <div className="ml-11 space-y-3 p-3 bg-secondary/30 rounded-lg">
              <div className="flex items-center justify-between">
                <Label htmlFor="email-digest" className="text-sm">
                  Email Digest Mode
                </Label>
                <Switch
                  id="email-digest"
                  checked={preferences.email_digest}
                  onCheckedChange={(checked) => updatePreferences({ email_digest: checked })}
                  disabled={isSaving}
                />
              </div>
              
              {preferences.email_digest && (
                <div className="flex items-center justify-between">
                  <Label htmlFor="digest-frequency" className="text-sm">
                    Digest Frequency
                  </Label>
                  <Select
                    value={preferences.digest_frequency}
                    onValueChange={(value: 'instant' | 'daily' | 'weekly') => 
                      updatePreferences({ digest_frequency: value })
                    }
                    disabled={isSaving}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}
        </div>

        <Separator />

        {/* Push Notifications */}
        <PushNotificationSection 
          preferences={preferences} 
          isSaving={isSaving} 
          togglePushEnabled={togglePushEnabled} 
        />

        <Separator />

        {/* Quiet Hours */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-2 rounded-lg",
                preferences.quiet_hours_enabled ? "bg-primary/10" : "bg-muted"
              )}>
                <Moon className={cn(
                  "w-4 h-4",
                  preferences.quiet_hours_enabled ? "text-primary" : "text-muted-foreground"
                )} />
              </div>
              <div>
                <Label htmlFor="quiet-hours" className="text-sm font-medium">
                  Quiet Hours
                </Label>
                <p className="text-xs text-muted-foreground">
                  Pause notifications during specific hours
                </p>
              </div>
            </div>
            <Switch
              id="quiet-hours"
              checked={preferences.quiet_hours_enabled}
              onCheckedChange={toggleQuietHours}
              disabled={isSaving}
            />
          </div>

          {preferences.quiet_hours_enabled && (
            <div className="ml-11 p-3 bg-secondary/30 rounded-lg">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <Label htmlFor="quiet-start" className="text-sm">From</Label>
                  <Input
                    id="quiet-start"
                    type="time"
                    value={preferences.quiet_hours_start}
                    onChange={(e) => updatePreferences({ quiet_hours_start: e.target.value })}
                    className="w-28"
                    disabled={isSaving}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="quiet-end" className="text-sm">To</Label>
                  <Input
                    id="quiet-end"
                    type="time"
                    value={preferences.quiet_hours_end}
                    onChange={(e) => updatePreferences({ quiet_hours_end: e.target.value })}
                    className="w-28"
                    disabled={isSaving}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Notifications will be silenced during these hours (your local time)
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
