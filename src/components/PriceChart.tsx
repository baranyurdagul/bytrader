import { PricePoint, TechnicalIndicators as TechnicalIndicatorsType } from '@/lib/tradingData';
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip, ReferenceLine } from 'recharts';
import { cn } from '@/lib/utils';

interface PriceChartProps {
  priceHistory: PricePoint[];
  indicators: TechnicalIndicatorsType;
  commodityId: string;
}

export function PriceChart({ priceHistory, indicators, commodityId }: PriceChartProps) {
  const chartData = priceHistory.map((point, index) => ({
    date: new Date(point.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    price: point.close,
    high: point.high,
    low: point.low,
    sma20: index >= 19 ? indicators.movingAverages.sma20 : null,
    upperBB: indicators.bollingerBands.upper,
    lowerBB: indicators.bollingerBands.lower,
  }));

  const currentPrice = priceHistory[priceHistory.length - 1].close;
  const startPrice = priceHistory[0].close;
  const isPositive = currentPrice >= startPrice;

  const gradientId = `gradient-${commodityId}`;
  const strokeColor = 
    commodityId === 'gold' ? 'hsl(43, 96%, 56%)' :
    commodityId === 'silver' ? 'hsl(220, 10%, 75%)' :
    'hsl(25, 80%, 55%)';

  return (
    <div className="glass-card rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground">Price Chart (30 Days)</h3>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 rounded bg-success" />
            <span className="text-muted-foreground">Support</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 rounded bg-destructive" />
            <span className="text-muted-foreground">Resistance</span>
          </div>
        </div>
      </div>
      
      <div className="h-64">
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
      
      {/* Chart Legend */}
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
          {isPositive ? '+' : ''}{((currentPrice - startPrice) / startPrice * 100).toFixed(2)}% (30d)
        </div>
      </div>
    </div>
  );
}
