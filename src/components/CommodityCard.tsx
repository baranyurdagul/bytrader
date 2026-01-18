import { CommodityData, formatPrice, formatChange, getCategoryIcon, getCategoryLabel } from '@/lib/tradingData';
import { TrendingUp, TrendingDown, Minus, Star, Wifi, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export type PriceUnit = 'oz' | 'gram';

// Troy ounce to grams conversion
export const OZ_TO_GRAM = 31.1035;

interface CommodityCardProps {
  commodity: CommodityData;
  isSelected: boolean;
  onClick: () => void;
  priceUnit?: PriceUnit;
  isInWatchlist?: boolean;
  onToggleWatchlist?: () => void;
  showWatchlistButton?: boolean;
}

export function CommodityCard({ 
  commodity, 
  isSelected, 
  onClick, 
  priceUnit = 'oz',
  isInWatchlist = false,
  onToggleWatchlist,
  showWatchlistButton = false
}: CommodityCardProps) {
  const isPositive = commodity.change >= 0;
  const TrendIcon = commodity.change > 0 ? TrendingUp : commodity.change < 0 ? TrendingDown : Minus;
  
  // Only convert metals
  const isMetal = commodity.category === 'metal';
  const conversionFactor = isMetal && priceUnit === 'gram' ? 1 / OZ_TO_GRAM : 1;
  
  const displayPrice = commodity.price * conversionFactor;
  const displayChange = commodity.change * conversionFactor;
  const displayHigh = commodity.high24h * conversionFactor;
  const displayLow = commodity.low24h * conversionFactor;
  const displayUnit = isMetal ? (priceUnit === 'gram' ? '/g' : '/oz') : commodity.priceUnit;
  
  const isETF = commodity.category === 'etf';
  
  const getGradientClass = () => {
    switch (commodity.id) {
      case 'gold': return 'gradient-gold';
      case 'silver': return 'gradient-silver';
      case 'bitcoin': return 'bg-gradient-to-br from-orange-500 to-amber-600';
      case 'ethereum': return 'bg-gradient-to-br from-indigo-500 to-purple-600';
      case 'nasdaq100': return 'bg-gradient-to-br from-cyan-500 to-blue-600';
      case 'sp500': return 'bg-gradient-to-br from-emerald-500 to-green-600';
      // ETFs
      case 'vym': return 'bg-gradient-to-br from-red-500 to-rose-600';
      case 'vymi': return 'bg-gradient-to-br from-violet-500 to-purple-600';
      case 'gldm': return 'gradient-gold';
      case 'slv': return 'gradient-silver';
      default: return 'bg-gradient-to-br from-gray-500 to-gray-600';
    }
  };
  
  const getGlowClass = () => {
    switch (commodity.id) {
      case 'gold': return 'hover:shadow-[0_0_40px_-10px_hsl(43_96%_56%/0.4)]';
      case 'silver': return 'hover:shadow-[0_0_40px_-10px_hsl(220_10%_75%/0.4)]';
      case 'bitcoin': return 'hover:shadow-[0_0_40px_-10px_hsl(30_90%_50%/0.4)]';
      case 'ethereum': return 'hover:shadow-[0_0_40px_-10px_hsl(250_80%_60%/0.4)]';
      case 'nasdaq100': return 'hover:shadow-[0_0_40px_-10px_hsl(195_80%_50%/0.4)]';
      case 'sp500': return 'hover:shadow-[0_0_40px_-10px_hsl(145_70%_45%/0.4)]';
      // ETFs
      case 'vym': return 'hover:shadow-[0_0_40px_-10px_hsl(350_80%_55%/0.4)]';
      case 'vymi': return 'hover:shadow-[0_0_40px_-10px_hsl(270_80%_60%/0.4)]';
      case 'gldm': return 'hover:shadow-[0_0_40px_-10px_hsl(43_96%_56%/0.4)]';
      case 'slv': return 'hover:shadow-[0_0_40px_-10px_hsl(220_10%_75%/0.4)]';
      default: return '';
    }
  };

  const formatDisplayPrice = () => {
    if (displayPrice >= 1000) {
      return formatPrice(displayPrice, 2);
    } else if (displayPrice >= 10) {
      return formatPrice(displayPrice, 2);
    } else if (displayPrice >= 1) {
      return formatPrice(displayPrice, 3);
    } else {
      return formatPrice(displayPrice, 4);
    }
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full p-5 rounded-xl border transition-all duration-300 text-left group",
        "bg-card hover:bg-card/80",
        getGlowClass(),
        isSelected 
          ? "border-primary ring-1 ring-primary/30" 
          : "border-border hover:border-muted-foreground/30"
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm text-white",
            getGradientClass()
          )}>
            {commodity.symbol.substring(0, 2)}
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{commodity.name}</h3>
            <div className="flex items-center gap-2">
              <p className="text-xs text-muted-foreground">{commodity.symbol}</p>
              <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                {getCategoryLabel(commodity.category)}
              </span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1",
                    commodity.dataSource === 'live' 
                      ? "bg-success/20 text-success" 
                      : "bg-muted text-muted-foreground"
                  )}>
                    {commodity.dataSource === 'live' ? (
                      <><Wifi className="w-2.5 h-2.5" /> Live</>
                    ) : (
                      <><WifiOff className="w-2.5 h-2.5" /> Sim</>
                    )}
                  </span>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p className="text-xs">
                    {commodity.dataSource === 'live' 
                      ? "Real-time data from market API" 
                      : "Simulated data (API unavailable)"}
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {showWatchlistButton && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleWatchlist?.();
              }}
              className={cn(
                "p-1 rounded-md transition-colors",
                isInWatchlist 
                  ? "text-yellow-500 hover:text-yellow-400" 
                  : "text-muted-foreground hover:text-yellow-500"
              )}
              title={isInWatchlist ? "Remove from watchlist" : "Add to watchlist"}
            >
              <Star className={cn("w-5 h-5", isInWatchlist && "fill-current")} />
            </button>
          )}
          <TrendIcon className={cn(
            "w-5 h-5 transition-transform group-hover:scale-110",
            isPositive ? "text-success" : "text-destructive"
          )} />
        </div>
      </div>
      
      <div className="space-y-2">
        <p className="text-2xl font-bold font-mono text-foreground">
          ${formatDisplayPrice()}
          {displayUnit && (
            <span className="text-sm font-normal text-muted-foreground ml-1">
              {displayUnit}
            </span>
          )}
        </p>
        <p className={cn(
          "text-sm font-medium font-mono",
          isPositive ? "text-success" : "text-destructive"
        )}>
          {formatChange(displayChange, commodity.changePercent)}
        </p>
      </div>
      
      <div className="mt-4 pt-4 border-t border-border/50 grid grid-cols-2 gap-4">
        {isETF ? (
          <>
            <div>
              <p className="text-xs text-muted-foreground">Dividend Yield</p>
              <p className={cn(
                "text-sm font-mono font-medium",
                commodity.dividendYield && commodity.dividendYield > 0 ? "text-success" : "text-muted-foreground"
              )}>
                {commodity.dividendYield !== undefined && commodity.dividendYield > 0 
                  ? `${commodity.dividendYield.toFixed(2)}%` 
                  : 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Expense Ratio</p>
              <p className={cn(
                "text-sm font-mono font-medium",
                commodity.expenseRatio !== undefined && commodity.expenseRatio <= 0.10 
                  ? "text-success" 
                  : commodity.expenseRatio !== undefined && commodity.expenseRatio <= 0.25 
                    ? "text-foreground" 
                    : "text-warning"
              )}>
                {commodity.expenseRatio !== undefined 
                  ? `${commodity.expenseRatio.toFixed(2)}%` 
                  : 'N/A'}
              </p>
            </div>
          </>
        ) : (
          <>
            <div>
              <p className="text-xs text-muted-foreground">24h High</p>
              <p className="text-sm font-mono text-foreground">${formatPrice(displayHigh, displayPrice < 10 ? 4 : 2)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">24h Low</p>
              <p className="text-sm font-mono text-foreground">${formatPrice(displayLow, displayPrice < 10 ? 4 : 2)}</p>
            </div>
          </>
        )}
      </div>
    </button>
  );
}
