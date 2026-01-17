import { PriceAlert } from '@/hooks/usePriceAlerts';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { 
  Bell, 
  BellOff, 
  Trash2, 
  TrendingUp, 
  TrendingDown, 
  CheckCircle,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatPrice } from '@/lib/tradingData';

interface AlertsListProps {
  alerts: PriceAlert[];
  onDelete: (id: string) => Promise<any>;
  onToggle: (id: string, isActive: boolean) => Promise<any>;
  currentPrices: Record<string, number>;
}

export function AlertsList({ alerts, onDelete, onToggle, currentPrices }: AlertsListProps) {
  if (alerts.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>No price alerts</p>
        <p className="text-sm">Create alerts to get notified when prices reach your targets</p>
      </div>
    );
  }

  const activeAlerts = alerts.filter(a => a.is_active && !a.is_triggered);
  const triggeredAlerts = alerts.filter(a => a.is_triggered);
  const pausedAlerts = alerts.filter(a => !a.is_active && !a.is_triggered);

  return (
    <div className="space-y-6">
      {/* Active Alerts */}
      {activeAlerts.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Active Alerts ({activeAlerts.length})
          </h4>
          <div className="space-y-2">
            {activeAlerts.map((alert) => (
              <AlertRow 
                key={alert.id} 
                alert={alert} 
                onDelete={onDelete} 
                onToggle={onToggle}
                currentPrice={currentPrices[alert.asset_id]}
              />
            ))}
          </div>
        </div>
      )}

      {/* Triggered Alerts */}
      {triggeredAlerts.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-success" />
            Triggered ({triggeredAlerts.length})
          </h4>
          <div className="space-y-2">
            {triggeredAlerts.map((alert) => (
              <AlertRow 
                key={alert.id} 
                alert={alert} 
                onDelete={onDelete} 
                onToggle={onToggle}
                currentPrice={currentPrices[alert.asset_id]}
              />
            ))}
          </div>
        </div>
      )}

      {/* Paused Alerts */}
      {pausedAlerts.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
            <BellOff className="w-4 h-4" />
            Paused ({pausedAlerts.length})
          </h4>
          <div className="space-y-2">
            {pausedAlerts.map((alert) => (
              <AlertRow 
                key={alert.id} 
                alert={alert} 
                onDelete={onDelete} 
                onToggle={onToggle}
                currentPrice={currentPrices[alert.asset_id]}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AlertRow({ 
  alert, 
  onDelete, 
  onToggle,
  currentPrice 
}: { 
  alert: PriceAlert; 
  onDelete: (id: string) => Promise<any>;
  onToggle: (id: string, isActive: boolean) => Promise<any>;
  currentPrice?: number;
}) {
  const targetPrice = Number(alert.target_price);
  const isAbove = alert.condition === 'above';
  
  // Calculate progress towards target
  let progress = 0;
  if (currentPrice && !alert.is_triggered) {
    if (isAbove) {
      progress = Math.min(100, (currentPrice / targetPrice) * 100);
    } else {
      progress = Math.min(100, (targetPrice / currentPrice) * 100);
    }
  }

  return (
    <div className={cn(
      "p-4 rounded-lg border transition-colors group",
      alert.is_triggered 
        ? "bg-success/5 border-success/20" 
        : alert.is_active 
          ? "bg-secondary/30 border-border hover:bg-secondary/50"
          : "bg-muted/30 border-border/50 opacity-60"
    )}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1">
          <div className={cn(
            "p-2 rounded-lg mt-0.5",
            alert.is_triggered 
              ? "bg-success/10" 
              : isAbove 
                ? "bg-success/10" 
                : "bg-destructive/10"
          )}>
            {alert.is_triggered ? (
              <CheckCircle className="w-4 h-4 text-success" />
            ) : isAbove ? (
              <TrendingUp className="w-4 h-4 text-success" />
            ) : (
              <TrendingDown className="w-4 h-4 text-destructive" />
            )}
          </div>
          
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-foreground">{alert.asset_name}</span>
              <span className="text-xs text-muted-foreground">{alert.asset_symbol}</span>
            </div>
            
            <p className="text-sm text-muted-foreground">
              Alert when {isAbove ? 'above' : 'below'}{' '}
              <span className="font-mono font-medium text-foreground">
                ${formatPrice(targetPrice)}
              </span>
            </p>

            {alert.is_triggered ? (
              <p className="text-xs text-success mt-1">
                ✓ Triggered at ${formatPrice(Number(alert.triggered_price))} on{' '}
                {new Date(alert.triggered_at!).toLocaleDateString()}
              </p>
            ) : currentPrice && (
              <div className="mt-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                  <span>Current: ${formatPrice(currentPrice)}</span>
                  <span>{progress.toFixed(0)}%</span>
                </div>
                <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                  <div 
                    className={cn(
                      "h-full rounded-full transition-all",
                      isAbove ? "bg-success" : "bg-destructive"
                    )}
                    style={{ width: `${Math.min(100, progress)}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Switch
            checked={alert.is_active}
            onCheckedChange={(checked) => onToggle(alert.id, checked)}
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => onDelete(alert.id)}
          >
            <Trash2 className="w-4 h-4 text-destructive" />
          </Button>
        </div>
      </div>
    </div>
  );
}
