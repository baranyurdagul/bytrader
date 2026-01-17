import { CommodityData, formatPrice, formatChange } from '@/lib/tradingData';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CommodityCardProps {
  commodity: CommodityData;
  isSelected: boolean;
  onClick: () => void;
}

export function CommodityCard({ commodity, isSelected, onClick }: CommodityCardProps) {
  const isPositive = commodity.change >= 0;
  const TrendIcon = commodity.change > 0 ? TrendingUp : commodity.change < 0 ? TrendingDown : Minus;
  
  const gradientClass = 
    commodity.id === 'gold' ? 'gradient-gold' :
    commodity.id === 'silver' ? 'gradient-silver' :
    'gradient-copper';
  
  const glowClass =
    commodity.id === 'gold' ? 'hover:shadow-[0_0_40px_-10px_hsl(43_96%_56%/0.4)]' :
    commodity.id === 'silver' ? 'hover:shadow-[0_0_40px_-10px_hsl(220_10%_75%/0.4)]' :
    'hover:shadow-[0_0_40px_-10px_hsl(25_80%_55%/0.4)]';

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full p-5 rounded-xl border transition-all duration-300 text-left group",
        "bg-card hover:bg-card/80",
        glowClass,
        isSelected 
          ? "border-primary ring-1 ring-primary/30" 
          : "border-border hover:border-muted-foreground/30"
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm",
            gradientClass,
            commodity.id === 'silver' ? 'text-background' : 'text-primary-foreground'
          )}>
            {commodity.symbol.substring(0, 2)}
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{commodity.name}</h3>
            <p className="text-xs text-muted-foreground">{commodity.symbol}</p>
          </div>
        </div>
        <TrendIcon className={cn(
          "w-5 h-5 transition-transform group-hover:scale-110",
          isPositive ? "text-success" : "text-destructive"
        )} />
      </div>
      
      <div className="space-y-2">
        <p className="text-2xl font-bold font-mono text-foreground">
          ${formatPrice(commodity.price)}
        </p>
        <p className={cn(
          "text-sm font-medium font-mono",
          isPositive ? "text-success" : "text-destructive"
        )}>
          {formatChange(commodity.change, commodity.changePercent)}
        </p>
      </div>
      
      <div className="mt-4 pt-4 border-t border-border/50 grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-muted-foreground">24h High</p>
          <p className="text-sm font-mono text-foreground">${formatPrice(commodity.high24h)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">24h Low</p>
          <p className="text-sm font-mono text-foreground">${formatPrice(commodity.low24h)}</p>
        </div>
      </div>
    </button>
  );
}
