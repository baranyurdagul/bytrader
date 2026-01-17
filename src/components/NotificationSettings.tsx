import { useNotificationPreferences } from '@/hooks/useNotificationPreferences';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { 
  Mail, 
  Bell, 
  Moon,
  Clock,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

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
            onCheckedChange={togglePushEnabled}
            disabled={isSaving}
          />
        </div>

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
