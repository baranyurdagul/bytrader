import { useGoldSpread } from '@/hooks/useGoldSpread';
import { RefreshCw, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export function GoldSpreadTile() {
  const { data, isLoading, error, refetch } = useGoldSpread(60000);

  if (isLoading && !data) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card/50 border border-border">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-16" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div 
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-destructive/10 border border-destructive/20 cursor-pointer"
              onClick={refetch}
            >
              <span className="text-xs text-destructive">Gold data unavailable</span>
              <RefreshCw className="w-3 h-3 text-destructive" />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Click to retry fetching gold spread data</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (!data) return null;

  const { comex, shanghai, spread, dataSource } = data;
  
  const hasShanghai = shanghai.priceUSD > 0;
  
  // Determine spread indicator
  const SpreadIcon = spread.direction === 'premium' 
    ? TrendingUp 
    : spread.direction === 'discount' 
      ? TrendingDown 
      : Minus;
  
  const spreadColor = spread.direction === 'premium' 
    ? 'text-success' 
    : spread.direction === 'discount' 
      ? 'text-destructive' 
      : 'text-muted-foreground';

  const formatPrice = (price: number) => `$${price.toFixed(2)}`;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div 
            className={cn(
              "flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-3 px-3 py-2 rounded-lg border cursor-pointer transition-colors hover:bg-secondary/50",
              dataSource === 'live' 
                ? "bg-card/50 border-border" 
                : "bg-warning/5 border-warning/20"
            )}
            onClick={refetch}
          >
            {/* Title */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Gold Spread</span>
              {dataSource === 'cached' && (
                <span className="text-[8px] px-1 py-0.5 rounded bg-warning/20 text-warning">cached</span>
              )}
            </div>
            
            {/* Prices Row */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* COMEX Price */}
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-muted-foreground">COMEX:</span>
                <span className="text-xs font-semibold text-foreground">
                  {formatPrice(comex.price)}
                </span>
                <span className={cn(
                  "text-[10px] font-medium",
                  comex.change >= 0 ? "text-success" : "text-destructive"
                )}>
                  {comex.change >= 0 ? '+' : ''}{comex.change.toFixed(2)}
                </span>
              </div>
              
              {/* Separator */}
              <span className="text-muted-foreground/50">|</span>
              
              {/* Shanghai Price */}
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-muted-foreground">SH:</span>
                {hasShanghai ? (
                  <span className="text-xs font-semibold text-foreground">
                    {formatPrice(shanghai.priceUSD)}
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">--</span>
                )}
              </div>
              
              {/* Separator */}
              <span className="text-muted-foreground/50">|</span>
              
              {/* Spread */}
              <div className="flex items-center gap-1">
                <SpreadIcon className={cn("w-3 h-3", spreadColor)} />
                {hasShanghai ? (
                  <>
                    <span className={cn("text-xs font-bold", spreadColor)}>
                      {spread.value >= 0 ? '+' : ''}{formatPrice(spread.value)}
                    </span>
                    <span className={cn("text-[10px]", spreadColor)}>
                      ({spread.percent >= 0 ? '+' : ''}{spread.percent.toFixed(2)}%)
                    </span>
                  </>
                ) : (
                  <span className="text-xs text-muted-foreground">--</span>
                )}
              </div>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-2 text-xs">
            <p className="font-medium">Shanghai vs COMEX Gold Spread</p>
            <div className="space-y-1 text-muted-foreground">
              <p><strong>COMEX:</strong> {formatPrice(comex.price)}/oz ({comex.source})</p>
              {hasShanghai ? (
                <>
                  <p><strong>Shanghai:</strong> {formatPrice(shanghai.priceUSD)}/oz (¥{shanghai.priceCNY.toFixed(2)}/g, {shanghai.session})</p>
                  <p><strong>Spread:</strong> {spread.direction === 'premium' ? 'Premium' : spread.direction === 'discount' ? 'Discount' : 'Neutral'} of {formatPrice(Math.abs(spread.value))} ({Math.abs(spread.percent).toFixed(2)}%)</p>
                </>
              ) : (
                <p><strong>Shanghai:</strong> Data unavailable (market may be closed)</p>
              )}
              <p className="text-[10px] mt-2">Click to refresh • Data from official exchanges</p>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
