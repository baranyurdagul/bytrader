import { CommodityData, formatPrice } from '@/lib/tradingData';
import { TrendingUp, TrendingDown, Minus, Star, Wifi, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';

export type PriceUnit = 'oz' | 'gram';
export const OZ_TO_GRAM = 31.1035;

interface CompactAssetRowProps {
  commodity: CommodityData;
  onClick: () => void;
  priceUnit?: PriceUnit;
  isInWatchlist?: boolean;
  onToggleWatchlist?: () => void;
  showWatchlistButton?: boolean;
}

export function CompactAssetRow({ 
  commodity, 
  onClick, 
  priceUnit = 'oz',
  isInWatchlist = false,
  onToggleWatchlist,
  showWatchlistButton = false
}: CompactAssetRowProps) {
  const isPositive = commodity.change >= 0;
  const TrendIcon = commodity.change > 0 ? TrendingUp : commodity.change < 0 ? TrendingDown : Minus;
  
  const isMetal = commodity.category === 'metal';
  const conversionFactor = isMetal && priceUnit === 'gram' ? 1 / OZ_TO_GRAM : 1;
  
  const displayPrice = commodity.price * conversionFactor;
  const displayUnit = isMetal ? (priceUnit === 'gram' ? '/g' : '/oz') : commodity.priceUnit;
  
  const getGradientClass = () => {
    switch (commodity.id) {
      case 'gold': return 'gradient-gold';
      case 'silver': return 'gradient-silver';
      case 'bitcoin': return 'bg-gradient-to-br from-orange-500 to-amber-600';
      case 'ethereum': return 'bg-gradient-to-br from-indigo-500 to-purple-600';
      case 'nasdaq100': return 'bg-gradient-to-br from-cyan-500 to-blue-600';
      case 'sp500': return 'bg-gradient-to-br from-emerald-500 to-green-600';
      case 'vym': return 'bg-gradient-to-br from-red-500 to-rose-600';
      case 'vymi': return 'bg-gradient-to-br from-violet-500 to-purple-600';
      case 'gldm': return 'gradient-gold';
      case 'slv': return 'gradient-silver';
      default: return 'bg-gradient-to-br from-gray-500 to-gray-600';
    }
  };

  const formatDisplayPrice = () => {
    if (displayPrice >= 1000) return formatPrice(displayPrice, 2);
    if (displayPrice >= 10) return formatPrice(displayPrice, 2);
    if (displayPrice >= 1) return formatPrice(displayPrice, 3);
    return formatPrice(displayPrice, 4);
  };

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-card/80 transition-all duration-200 group"
    >
      {/* Icon */}
      <div className={cn(
        "w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs text-white shrink-0",
        getGradientClass()
      )}>
        {commodity.symbol.substring(0, 2)}
      </div>

      {/* Name & Symbol */}
      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-foreground text-sm truncate">{commodity.name}</h3>
          {commodity.dataSource === 'live' ? (
            <Wifi className="w-3 h-3 text-success shrink-0" />
          ) : (
            <WifiOff className="w-3 h-3 text-muted-foreground shrink-0" />
          )}
        </div>
        <p className="text-xs text-muted-foreground">{commodity.symbol}</p>
      </div>

      {/* Price */}
      <div className="text-right shrink-0">
        <p className="font-mono font-semibold text-foreground text-sm">
          ${formatDisplayPrice()}
          <span className="text-xs text-muted-foreground ml-0.5">{displayUnit}</span>
        </p>
        <p className={cn(
          "text-xs font-mono flex items-center justify-end gap-0.5",
          isPositive ? "text-success" : "text-destructive"
        )}>
          <TrendIcon className="w-3 h-3" />
          {isPositive ? '+' : ''}{commodity.changePercent.toFixed(2)}%
        </p>
      </div>

      {/* Watchlist Button */}
      {showWatchlistButton && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleWatchlist?.();
          }}
          className={cn(
            "p-1.5 rounded-md transition-colors shrink-0",
            isInWatchlist 
              ? "text-yellow-500 hover:text-yellow-400" 
              : "text-muted-foreground hover:text-yellow-500 opacity-0 group-hover:opacity-100"
          )}
          title={isInWatchlist ? "Remove from watchlist" : "Add to watchlist"}
        >
          <Star className={cn("w-4 h-4", isInWatchlist && "fill-current")} />
        </button>
      )}
    </button>
  );
}
