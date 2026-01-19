import { CommodityData, formatPrice } from '@/lib/tradingData';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

interface FloatingTickerProps {
  commodities: CommodityData[];
}

export function FloatingTicker({ commodities }: FloatingTickerProps) {
  const navigate = useNavigate();
  
  // Duplicate items for seamless scroll
  const tickerItems = [...commodities, ...commodities];
  
  return (
    <div className="fixed top-14 left-0 right-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border overflow-hidden">
      <div className="flex animate-scroll">
        {tickerItems.map((commodity, index) => {
          const isPositive = commodity.change >= 0;
          
          return (
            <button
              key={`${commodity.id}-${index}`}
              onClick={() => navigate(`/asset/${commodity.id}`)}
              className="flex items-center gap-2 px-4 py-2 border-r border-border/50 hover:bg-card/50 transition-colors whitespace-nowrap min-w-max"
            >
              <span className="font-medium text-foreground text-sm">{commodity.symbol}</span>
              <span className="font-mono text-foreground text-sm">
                ${formatPrice(commodity.price, commodity.price < 10 ? 4 : 2)}
              </span>
              <span className={cn(
                "flex items-center gap-0.5 text-xs font-mono",
                isPositive ? "text-success" : "text-destructive"
              )}>
                {isPositive ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                {isPositive ? '+' : ''}{commodity.changePercent.toFixed(2)}%
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
