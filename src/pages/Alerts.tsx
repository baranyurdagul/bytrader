import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { AlertsList } from '@/components/AlertsList';
import { AddAlertDialog } from '@/components/AddAlertDialog';
import { NotificationSettings } from '@/components/NotificationSettings';
import { usePriceAlerts } from '@/hooks/usePriceAlerts';
import { useLivePrices } from '@/hooks/useLivePrices';
import { useAuth } from '@/hooks/useAuth';
import { useServiceWorker } from '@/hooks/useServiceWorker';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Bell, 
  BellRing, 
  Plus, 
  TrendingUp, 
  TrendingDown,
  Clock,
  CheckCircle,
  BellOff,
  LogIn,
  Settings,
  Volume2,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function Alerts() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { commodities } = useLivePrices();
  const { 
    isSupported,
    permissionState,
    requestPermission,
    showNotification
  } = useServiceWorker();
  const [isTesting, setIsTesting] = useState(false);
  const { 
    alerts, 
    isLoading: alertsLoading, 
    addAlert, 
    deleteAlert, 
    toggleAlert,
    checkAlerts,
    requestNotificationPermission 
  } = usePriceAlerts();

  // Build current prices map for AlertsList
  const currentPrices: Record<string, number> = {};
  commodities.forEach(c => {
    currentPrices[c.id] = c.price;
  });

  // Check alerts when prices update
  useEffect(() => {
    if (commodities.length > 0 && alerts.length > 0) {
      checkAlerts(currentPrices);
    }
  }, [commodities, alerts.length]);

  // Test notification handler
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
      
      // Send test notification with sound
      const success = await showNotification(
        '🔔 Test Alert with Sound!',
        'Push notifications are working! This should play a sound.',
        { tag: 'test-notification-sound' }
      );
      
      if (success) {
        toast.success('Test notification sent with sound!');
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

  // Stats
  const activeAlerts = alerts.filter(a => a.is_active && !a.is_triggered);
  const triggeredAlerts = alerts.filter(a => a.is_triggered);
  const pausedAlerts = alerts.filter(a => !a.is_active && !a.is_triggered);
  const aboveAlerts = alerts.filter(a => a.condition === 'above' && !a.is_triggered);
  const belowAlerts = alerts.filter(a => a.condition === 'below' && !a.is_triggered);

  if (authLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!isAuthenticated) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <Card className="max-w-md mx-auto">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Bell className="w-8 h-8 text-primary" />
              </div>
              <CardTitle>Sign in to manage alerts</CardTitle>
              <CardDescription>
                Create price alerts to get notified when assets reach your target prices
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Button asChild className="gap-2">
                <Link to="/auth">
                  <LogIn className="w-4 h-4" />
                  Sign In
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <BellRing className="w-6 h-6 text-primary" />
              Price Alerts
            </h1>
            <p className="text-muted-foreground mt-1">
              Get notified when prices reach your targets
            </p>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleTestNotification}
              disabled={isTesting || !isSupported}
              className="gap-2"
            >
              {isTesting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
              Test Sound
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={requestNotificationPermission}
              className="gap-2"
            >
              <Bell className="w-4 h-4" />
              Enable Notifications
            </Button>
            <AddAlertDialog 
              commodities={commodities} 
              onAddAlert={addAlert}
            />
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-card/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Clock className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{activeAlerts.length}</p>
                  <p className="text-xs text-muted-foreground">Active</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-card/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-success/10">
                  <CheckCircle className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{triggeredAlerts.length}</p>
                  <p className="text-xs text-muted-foreground">Triggered</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-card/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-success/10">
                  <TrendingUp className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{aboveAlerts.length}</p>
                  <p className="text-xs text-muted-foreground">Above Target</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-card/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-destructive/10">
                  <TrendingDown className="w-5 h-5 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{belowAlerts.length}</p>
                  <p className="text-xs text-muted-foreground">Below Target</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Alerts List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Your Alerts</CardTitle>
            <CardDescription>
              Manage your price alerts across all assets
            </CardDescription>
          </CardHeader>
          <CardContent>
            {alertsLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : (
              <Tabs defaultValue="all" className="w-full">
                <TabsList className="grid w-full grid-cols-4 mb-4">
                  <TabsTrigger value="all" className="gap-1">
                    All
                    <span className="text-xs text-muted-foreground">({alerts.length})</span>
                  </TabsTrigger>
                  <TabsTrigger value="active" className="gap-1">
                    Active
                    <span className="text-xs text-muted-foreground">({activeAlerts.length})</span>
                  </TabsTrigger>
                  <TabsTrigger value="triggered" className="gap-1">
                    Triggered
                    <span className="text-xs text-muted-foreground">({triggeredAlerts.length})</span>
                  </TabsTrigger>
                  <TabsTrigger value="paused" className="gap-1">
                    Paused
                    <span className="text-xs text-muted-foreground">({pausedAlerts.length})</span>
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="all">
                  <AlertsList 
                    alerts={alerts}
                    onDelete={deleteAlert}
                    onToggle={toggleAlert}
                    currentPrices={currentPrices}
                  />
                </TabsContent>
                
                <TabsContent value="active">
                  <AlertsList 
                    alerts={activeAlerts}
                    onDelete={deleteAlert}
                    onToggle={toggleAlert}
                    currentPrices={currentPrices}
                  />
                </TabsContent>
                
                <TabsContent value="triggered">
                  <AlertsList 
                    alerts={triggeredAlerts}
                    onDelete={deleteAlert}
                    onToggle={toggleAlert}
                    currentPrices={currentPrices}
                  />
                </TabsContent>
                
                <TabsContent value="paused">
                  <AlertsList 
                    alerts={pausedAlerts}
                    onDelete={deleteAlert}
                    onToggle={toggleAlert}
                    currentPrices={currentPrices}
                  />
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>

        <NotificationSettings />
      </main>
    </Layout>
  );
}
