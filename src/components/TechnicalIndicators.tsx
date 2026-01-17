import { TechnicalIndicators as TechnicalIndicatorsType, formatPrice } from '@/lib/tradingData';
import { cn } from '@/lib/utils';
import { Activity, TrendingUp, BarChart3, Gauge } from 'lucide-react';

interface TechnicalIndicatorsProps {
  indicators: TechnicalIndicatorsType;
  currentPrice: number;
}

function IndicatorGauge({ value, min, max, label, zones }: {
  value: number;
  min: number;
  max: number;
  label: string;
  zones: { low: number; high: number };
}) {
  const percentage = ((value - min) / (max - min)) * 100;
  const isOversold = value < zones.low;
  const isOverbought = value > zones.high;
  
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className={cn(
          "text-sm font-mono font-semibold",
          isOversold ? "text-success" : isOverbought ? "text-destructive" : "text-foreground"
        )}>
          {value.toFixed(1)}
        </span>
      </div>
      <div className="relative h-2 bg-secondary rounded-full overflow-hidden">
        {/* Zone indicators */}
        <div 
          className="absolute h-full bg-success/20" 
          style={{ left: 0, width: `${(zones.low / max) * 100}%` }} 
        />
        <div 
          className="absolute h-full bg-destructive/20" 
          style={{ left: `${(zones.high / max) * 100}%`, right: 0 }} 
        />
        {/* Value indicator */}
        <div 
          className={cn(
            "absolute h-full w-1 rounded-full transition-all",
            isOversold ? "bg-success" : isOverbought ? "bg-destructive" : "bg-primary"
          )}
          style={{ left: `calc(${percentage}% - 2px)` }}
        />
      </div>
    </div>
  );
}

export function TechnicalIndicatorsPanel({ indicators, currentPrice }: TechnicalIndicatorsProps) {
  const macdTrend = indicators.macd.histogram > 0;
  const priceVsSma20 = currentPrice > indicators.movingAverages.sma20;
  
  return (
    <div className="space-y-6">
      {/* Momentum Indicators */}
      <div className="glass-card rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-foreground">Momentum</h3>
        </div>
        
        <div className="space-y-4">
          <IndicatorGauge 
            value={indicators.rsi} 
            min={0} 
            max={100} 
            label="RSI (14)"
            zones={{ low: 30, high: 70 }}
          />
          
          <IndicatorGauge 
            value={indicators.stochastic.k} 
            min={0} 
            max={100} 
            label="Stochastic %K"
            zones={{ low: 20, high: 80 }}
          />
          
          <IndicatorGauge 
            value={indicators.stochastic.d} 
            min={0} 
            max={100} 
            label="Stochastic %D"
            zones={{ low: 20, high: 80 }}
          />
        </div>
      </div>
      
      {/* MACD */}
      <div className="glass-card rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-foreground">MACD</h3>
        </div>
        
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">MACD Line</span>
            <span className={cn(
              "text-sm font-mono",
              macdTrend ? "text-success" : "text-destructive"
            )}>
              {indicators.macd.value.toFixed(3)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Signal Line</span>
            <span className="text-sm font-mono text-foreground">
              {indicators.macd.signal.toFixed(3)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Histogram</span>
            <span className={cn(
              "text-sm font-mono font-semibold",
              macdTrend ? "text-success" : "text-destructive"
            )}>
              {macdTrend ? '+' : ''}{indicators.macd.histogram.toFixed(3)}
            </span>
          </div>
          
          <div className="pt-2 flex justify-center">
            <div className={cn(
              "px-3 py-1 rounded-full text-xs font-medium",
              macdTrend 
                ? "bg-success/20 text-success" 
                : "bg-destructive/20 text-destructive"
            )}>
              {macdTrend ? 'Bullish' : 'Bearish'} Momentum
            </div>
          </div>
        </div>
      </div>
      
      {/* Moving Averages */}
      <div className="glass-card rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-foreground">Moving Averages</h3>
        </div>
        
        <div className="space-y-3">
          {[
            { label: 'SMA 20', value: indicators.movingAverages.sma20 },
            { label: 'SMA 50', value: indicators.movingAverages.sma50 },
            { label: 'EMA 12', value: indicators.movingAverages.ema12 },
            { label: 'EMA 26', value: indicators.movingAverages.ema26 },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">{label}</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono text-foreground">
                  ${formatPrice(value)}
                </span>
                <span className={cn(
                  "text-xs px-1.5 py-0.5 rounded",
                  currentPrice > value 
                    ? "bg-success/20 text-success" 
                    : "bg-destructive/20 text-destructive"
                )}>
                  {currentPrice > value ? 'Above' : 'Below'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Bollinger Bands */}
      <div className="glass-card rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Gauge className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-foreground">Bollinger Bands</h3>
        </div>
        
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Upper Band</span>
            <span className="text-sm font-mono text-destructive">
              ${formatPrice(indicators.bollingerBands.upper)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Middle (SMA 20)</span>
            <span className="text-sm font-mono text-foreground">
              ${formatPrice(indicators.bollingerBands.middle)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Lower Band</span>
            <span className="text-sm font-mono text-success">
              ${formatPrice(indicators.bollingerBands.lower)}
            </span>
          </div>
          
          <div className="pt-2">
            <div className="text-xs text-muted-foreground text-center">
              Band Width: ${formatPrice(indicators.bollingerBands.upper - indicators.bollingerBands.lower)}
            </div>
          </div>
        </div>
      </div>
      
      {/* Volatility */}
      <div className="glass-card rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-foreground">Volatility & Trend</h3>
        </div>
        
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">ATR (14)</span>
            <span className="text-sm font-mono text-foreground">
              ${formatPrice(indicators.atr, 4)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">ADX (14)</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-mono text-foreground">
                {indicators.adx.toFixed(1)}
              </span>
              <span className={cn(
                "text-xs px-1.5 py-0.5 rounded",
                indicators.adx > 25 
                  ? "bg-primary/20 text-primary" 
                  : "bg-muted text-muted-foreground"
              )}>
                {indicators.adx > 50 ? 'Very Strong' : indicators.adx > 25 ? 'Strong' : 'Weak'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
