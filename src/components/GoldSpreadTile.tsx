import { useGoldSpread } from '@/hooks/useGoldSpread';
import { RefreshCw, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

export function GoldSpreadTile() {
  const { data, isLoading, error, refetch } = useGoldSpread(60000);

  if (isLoading && !data) {
    return (
      <div className="glass-card rounded-xl p-4">
        <Skeleton className="h-4 w-24 mb-3" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div 
        className="glass-card rounded-xl p-4 border-destructive/30 cursor-pointer hover:bg-destructive/5 transition-colors"
        onClick={refetch}
      >
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-destructive">Gold Spread Unavailable</span>
          <RefreshCw className="w-4 h-4 text-destructive" />
        </div>
        <p className="text-xs text-muted-foreground mt-1">Click to retry</p>
      </div>
    );
  }

  if (!data) return null;

  const { comex, shanghai, spread, dataSource } = data;
  const hasShanghai = shanghai.priceUSD > 0;
  
  const spreadColors = {
    premium: {
      text: 'text-success',
      bg: 'bg-success/20',
      gradient: 'from-success/20 to-success/5',
      border: 'border-success/30'
    },
    discount: {
      text: 'text-destructive',
      bg: 'bg-destructive/20',
      gradient: 'from-destructive/20 to-destructive/5',
      border: 'border-destructive/30'
    },
    neutral: {
      text: 'text-muted-foreground',
      bg: 'bg-muted',
      gradient: 'from-muted to-muted/50',
      border: 'border-border'
    }
  };
  
  const colors = spreadColors[spread.direction];
  
  const SpreadIcon = spread.direction === 'premium' 
    ? TrendingUp 
    : spread.direction === 'discount' 
      ? TrendingDown 
      : Minus;

  const formatPrice = (price: number) => `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div 
      className={cn(
        "glass-card rounded-xl overflow-hidden cursor-pointer transition-all hover:shadow-lg",
        dataSource === 'cached' && "border-warning/30"
      )}
      onClick={refetch}
    >
      {/* Header */}
      <div className={cn("p-4 bg-gradient-to-r", colors.gradient)}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={cn("p-1.5 rounded-lg", colors.bg)}>
              <SpreadIcon className={cn("w-4 h-4", colors.text)} />
            </div>
            <div>
              <h3 className="text-xs text-muted-foreground">Gold Arbitrage</h3>
              <p className={cn("text-sm font-bold", colors.text)}>
                Shanghai {spread.direction === 'premium' ? 'Premium' : spread.direction === 'discount' ? 'Discount' : 'Neutral'}
              </p>
            </div>
          </div>
          
          {dataSource === 'cached' && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-warning/20 text-warning">cached</span>
          )}
        </div>
        
        {/* Spread Value */}
        <div className="flex items-baseline gap-2">
          {hasShanghai ? (
            <>
              <span className={cn("text-2xl font-bold font-mono", colors.text)}>
                {spread.percent >= 0 ? '+' : ''}{spread.percent.toFixed(2)}%
              </span>
              <span className={cn("text-sm font-mono", colors.text)}>
                ({spread.value >= 0 ? '+' : ''}{formatPrice(spread.value)})
              </span>
            </>
          ) : (
            <span className="text-lg text-muted-foreground">Data unavailable</span>
          )}
        </div>
      </div>
      
      {/* Price Comparison */}
      <div className="p-4 border-t border-border/50">
        <div className="grid grid-cols-2 gap-3">
          <div className="p-2 bg-primary/10 rounded-lg border border-primary/20">
            <p className="text-[10px] text-muted-foreground mb-0.5">COMEX</p>
            <p className="text-sm font-mono font-semibold text-foreground">
              {formatPrice(comex.price)}
            </p>
            <p className={cn(
              "text-[10px] font-mono",
              comex.change >= 0 ? "text-success" : "text-destructive"
            )}>
              {comex.change >= 0 ? '+' : ''}{comex.change.toFixed(2)}
            </p>
          </div>
          <div className={cn("p-2 rounded-lg border", colors.border, colors.bg.replace('/20', '/10'))}>
            <p className="text-[10px] text-muted-foreground mb-0.5">Shanghai</p>
            {hasShanghai ? (
              <>
                <p className="text-sm font-mono font-semibold text-foreground">
                  {formatPrice(shanghai.priceUSD)}
                </p>
                <p className="text-[10px] text-muted-foreground font-mono">
                  ¥{shanghai.priceCNY.toFixed(2)}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">--</p>
            )}
          </div>
        </div>
        
        <p className="text-[10px] text-muted-foreground mt-2 text-center">
          Tap to refresh • {shanghai.session} session
        </p>
      </div>
    </div>
  );
}
