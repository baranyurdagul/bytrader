import { useState, useEffect, useMemo } from 'react';
import { PricePoint, TechnicalIndicators as TechnicalIndicatorsType } from '@/lib/tradingData';
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip, ReferenceLine } from 'recharts';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useHistoricalPrices } from '@/hooks/useHistoricalPrices';
import { Loader2 } from 'lucide-react';

interface PriceChartProps {
  priceHistory: PricePoint[];
  indicators: TechnicalIndicatorsType;
  commodityId: string;
  category?: 'metal' | 'crypto' | 'index' | 'etf';
}

type TimeRange = '1D' | '1W' | '1M' | '3M' | '1Y';

const TIME_RANGES: { label: string; value: TimeRange; days: number }[] = [
  { label: '1D', value: '1D', days: 1 },
  { label: '1W', value: '1W', days: 7 },
  { label: '1M', value: '1M', days: 30 },
  { label: '3M', value: '3M', days: 90 },
  { label: '1Y', value: '1Y', days: 365 },
];

export function PriceChart({ priceHistory, indicators, commodityId, category = 'metal' }: PriceChartProps) {
  const [selectedRange, setSelectedRange] = useState<TimeRange>('1D');

  const selectedDays = TIME_RANGES.find(r => r.value === selectedRange)?.days || 1;
  const isHourly = selectedRange === '1D';
  
  // Fetch historical data for the selected range
  const { priceHistory: fetchedHistory, isLoading } = useHistoricalPrices({
    assetId: commodityId,
    category,
    days: selectedDays,
    interval: isHourly ? '1h' : '1d',
  });
  
  // Use fetched history for the chart, fallback to prop data
  const activeHistory = useMemo(() => {
    if (isHourly && fetchedHistory.length > 0) {
      return fetchedHistory;
    }
    if (!isHourly && fetchedHistory.length > 0) {
      return fetchedHistory;
    }
    // Fallback: filter the provided priceHistory
    return priceHistory.slice(-selectedDays);
  }, [fetchedHistory, priceHistory, selectedDays, isHourly]);

  const chartData = useMemo(() => {
    return activeHistory.map((point, index) => {
      // Format date based on time range
      const date = new Date(point.timestamp);
      let formattedDate: string;
      
      if (selectedRange === '1D') {
        formattedDate = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      } else if (selectedRange === '1W') {
        formattedDate = date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' });
      } else if (selectedRange === '1Y') {
        formattedDate = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      } else {
        formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }

      return {
        date: formattedDate,
        price: point.close,
        high: point.high,
        low: point.low,
        sma20: index >= 19 ? indicators.movingAverages.sma20 : null,
        upperBB: indicators.bollingerBands.upper,
        lowerBB: indicators.bollingerBands.lower,
      };
    });
  }, [activeHistory, selectedRange, indicators]);

  const currentPrice = activeHistory[activeHistory.length - 1]?.close || 0;
  const startPrice = activeHistory[0]?.close || 0;
  const isPositive = currentPrice >= startPrice;
  const changePercent = startPrice > 0 ? ((currentPrice - startPrice) / startPrice * 100) : 0;

  const gradientId = `gradient-${commodityId}`;
  const strokeColor = 
    commodityId === 'gold' ? 'hsl(43, 96%, 56%)' :
    commodityId === 'silver' ? 'hsl(220, 10%, 75%)' :
    'hsl(25, 80%, 55%)';

  return (
    <div className="glass-card rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground">Price Chart</h3>
        <div className="flex items-center gap-2">
          {/* Time Range Selector */}
          <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
            {TIME_RANGES.map((range) => (
              <Button
                key={range.value}
                variant={selectedRange === range.value ? "default" : "ghost"}
                size="sm"
                className={cn(
                  "h-7 px-3 text-xs font-medium transition-all",
                  selectedRange === range.value 
                    ? "bg-primary text-primary-foreground shadow-sm" 
                    : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => setSelectedRange(range.value)}
              >
                {range.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs mb-4">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 rounded bg-success" />
          <span className="text-muted-foreground">Support</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 rounded bg-destructive" />
          <span className="text-muted-foreground">Resistance</span>
        </div>
      </div>
      
      <div className="h-64 relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={strokeColor} stopOpacity={0.3} />
                <stop offset="95%" stopColor={strokeColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            
            <XAxis 
              dataKey="date" 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: 'hsl(220, 10%, 55%)' }}
              interval="preserveStartEnd"
            />
            <YAxis 
              domain={['dataMin - 5', 'dataMax + 5']}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: 'hsl(220, 10%, 55%)' }}
              tickFormatter={(value) => `$${value.toFixed(0)}`}
              width={60}
            />
            
            <Tooltip 
              contentStyle={{
                backgroundColor: 'hsl(220, 18%, 10%)',
                border: '1px solid hsl(220, 15%, 18%)',
                borderRadius: '8px',
                fontSize: '12px'
              }}
              labelStyle={{ color: 'hsl(45, 10%, 95%)' }}
              formatter={(value: number) => [`$${value.toFixed(2)}`, 'Price']}
            />
            
            {/* Bollinger Bands Reference Lines */}
            <ReferenceLine 
              y={indicators.bollingerBands.upper} 
              stroke="hsl(0, 72%, 51%)" 
              strokeDasharray="3 3" 
              strokeOpacity={0.5}
            />
            <ReferenceLine 
              y={indicators.bollingerBands.lower} 
              stroke="hsl(142, 76%, 42%)" 
              strokeDasharray="3 3" 
              strokeOpacity={0.5}
            />
            <ReferenceLine 
              y={indicators.movingAverages.sma20} 
              stroke="hsl(43, 96%, 56%)" 
              strokeDasharray="5 5" 
              strokeOpacity={0.3}
            />
            
            <Area
              type="monotone"
              dataKey="price"
              stroke={strokeColor}
              strokeWidth={2}
              fill={`url(#${gradientId})`}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      
      {/* Chart Footer */}
      <div className="mt-4 pt-4 border-t border-border/50 flex items-center justify-between text-xs">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div 
              className="w-8 h-0.5 rounded"
              style={{ backgroundColor: strokeColor }}
            />
            <span className="text-muted-foreground">Price</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-0.5 rounded bg-primary opacity-30" style={{ backgroundImage: 'repeating-linear-gradient(90deg, hsl(43, 96%, 56%), hsl(43, 96%, 56%) 3px, transparent 3px, transparent 6px)' }} />
            <span className="text-muted-foreground">SMA 20</span>
          </div>
        </div>
        <div className={cn(
          "font-mono font-semibold",
          isPositive ? "text-success" : "text-destructive"
        )}>
          {isPositive ? '+' : ''}{changePercent.toFixed(2)}% ({TIME_RANGES.find(r => r.value === selectedRange)?.label})
        </div>
      </div>
    </div>
  );
}
