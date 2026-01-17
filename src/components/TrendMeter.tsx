import { TrendAnalysis, formatPrice } from '@/lib/tradingData';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus, Target } from 'lucide-react';

interface TrendMeterProps {
  trend: TrendAnalysis;
}

export function TrendMeter({ trend }: TrendMeterProps) {
  const TrendIcon = 
    trend.direction === 'BULLISH' ? TrendingUp :
    trend.direction === 'BEARISH' ? TrendingDown :
    Minus;
  
  const trendColors = {
    BULLISH: {
      text: 'text-success',
      bg: 'bg-success/20',
      gradient: 'from-success/20 to-success/5'
    },
    BEARISH: {
      text: 'text-destructive',
      bg: 'bg-destructive/20',
      gradient: 'from-destructive/20 to-destructive/5'
    },
    NEUTRAL: {
      text: 'text-muted-foreground',
      bg: 'bg-muted',
      gradient: 'from-muted to-muted/50'
    }
  };
  
  const colors = trendColors[trend.direction];
  
  return (
    <div className="glass-card rounded-xl overflow-hidden">
      {/* Header with Trend */}
      <div className={cn("p-5 bg-gradient-to-r", colors.gradient)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn("p-2 rounded-lg", colors.bg)}>
              <TrendIcon className={cn("w-6 h-6", colors.text)} />
            </div>
            <div>
              <h3 className="text-sm text-muted-foreground">Market Trend</h3>
              <p className={cn("text-xl font-bold", colors.text)}>
                {trend.direction}
              </p>
            </div>
          </div>
          
          {/* Strength Meter */}
          <div className="text-right">
            <p className="text-xs text-muted-foreground mb-1">Strength</p>
            <p className={cn("text-2xl font-bold font-mono", colors.text)}>
              {trend.strength.toFixed(0)}%
            </p>
          </div>
        </div>
        
        {/* Strength Bar */}
        <div className="mt-4">
          <div className="h-3 bg-background/30 rounded-full overflow-hidden">
            <div 
              className={cn(
                "h-full rounded-full transition-all duration-700",
                trend.direction === 'BULLISH' ? 'bg-success' :
                trend.direction === 'BEARISH' ? 'bg-destructive' :
                'bg-muted-foreground'
              )}
              style={{ width: `${trend.strength}%` }}
            />
          </div>
        </div>
      </div>
      
      {/* Support & Resistance */}
      <div className="p-5 border-t border-border/50">
        <div className="flex items-center gap-2 mb-4">
          <Target className="w-4 h-4 text-primary" />
          <h4 className="font-semibold text-foreground">Key Levels</h4>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/20">
            <p className="text-xs text-muted-foreground mb-1">Resistance</p>
            <p className="text-lg font-mono font-semibold text-destructive">
              ${formatPrice(trend.resistance)}
            </p>
          </div>
          <div className="p-3 bg-success/10 rounded-lg border border-success/20">
            <p className="text-xs text-muted-foreground mb-1">Support</p>
            <p className="text-lg font-mono font-semibold text-success">
              ${formatPrice(trend.support)}
            </p>
          </div>
        </div>
      </div>
      
      {/* Pivot Points */}
      <div className="p-5 border-t border-border/50">
        <h4 className="font-semibold text-foreground mb-4">Pivot Points</h4>
        
        <div className="space-y-2">
          <div className="grid grid-cols-4 text-xs text-muted-foreground mb-2">
            <span></span>
            <span className="text-center">R3</span>
            <span className="text-center">R2</span>
            <span className="text-center">R1</span>
          </div>
          <div className="grid grid-cols-4 gap-2 text-sm font-mono">
            <span className="text-destructive text-xs">Resistance</span>
            <span className="text-center text-destructive">{formatPrice(trend.pivotPoints.r3)}</span>
            <span className="text-center text-destructive">{formatPrice(trend.pivotPoints.r2)}</span>
            <span className="text-center text-destructive">{formatPrice(trend.pivotPoints.r1)}</span>
          </div>
          
          <div className="grid grid-cols-4 gap-2 py-2 border-y border-border/50">
            <span className="text-primary text-xs">Pivot</span>
            <span className="col-span-3 text-center font-semibold text-primary">
              ${formatPrice(trend.pivotPoints.pp)}
            </span>
          </div>
          
          <div className="grid grid-cols-4 gap-2 text-sm font-mono">
            <span className="text-success text-xs">Support</span>
            <span className="text-center text-success">{formatPrice(trend.pivotPoints.s1)}</span>
            <span className="text-center text-success">{formatPrice(trend.pivotPoints.s2)}</span>
            <span className="text-center text-success">{formatPrice(trend.pivotPoints.s3)}</span>
          </div>
          <div className="grid grid-cols-4 text-xs text-muted-foreground">
            <span></span>
            <span className="text-center">S1</span>
            <span className="text-center">S2</span>
            <span className="text-center">S3</span>
          </div>
        </div>
      </div>
    </div>
  );
}
