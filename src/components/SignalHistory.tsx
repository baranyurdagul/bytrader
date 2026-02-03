import { useState, useMemo } from 'react';
import { Signal, PricePoint } from '@/lib/tradingData';
import { cn } from '@/lib/utils';
import { ArrowUpCircle, ArrowDownCircle, MinusCircle, Clock, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type TimeRange = '1D' | '1W' | '1M' | '3M' | '1Y';

const TIME_RANGES: { label: string; value: TimeRange; days: number }[] = [
  { label: '1D', value: '1D', days: 1 },
  { label: '1W', value: '1W', days: 7 },
  { label: '1M', value: '1M', days: 30 },
  { label: '3M', value: '3M', days: 90 },
  { label: '1Y', value: '1Y', days: 365 },
];

interface SignalHistoryProps {
  commodityName: string;
  priceHistory?: PricePoint[];
}

// Calculate RSI from prices
function calculateRSI(prices: number[], period: number = 14): number {
  if (prices.length < period + 1) return 50;
  
  let gains = 0;
  let losses = 0;
  
  for (let i = 1; i <= period; i++) {
    const change = prices[prices.length - i] - prices[prices.length - i - 1];
    if (change > 0) gains += change;
    else losses -= change;
  }
  
  const avgGain = gains / period;
  const avgLoss = losses / period;
  
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

// Calculate SMA
function calculateSMA(prices: number[], period: number): number {
  if (prices.length < period) return prices[prices.length - 1] || 0;
  const slice = prices.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

// Calculate EMA
function calculateEMA(prices: number[], period: number): number {
  if (prices.length < period) return prices[prices.length - 1] || 0;
  const multiplier = 2 / (period + 1);
  let ema = calculateSMA(prices.slice(0, period), period);
  
  for (let i = period; i < prices.length; i++) {
    ema = (prices[i] - ema) * multiplier + ema;
  }
  
  return ema;
}

// Generate signals based on actual price history at different time points
function generateHistoricalSignalsFromData(
  commodityName: string, 
  priceHistory: PricePoint[]
): Array<Signal & { commodity: string }> {
  const signals: Array<Signal & { commodity: string }> = [];
  
  if (!priceHistory || priceHistory.length < 20) {
    // Return a placeholder message if not enough data
    return [{
      type: 'HOLD',
      strength: 'WEAK',
      indicators: ['Insufficient historical data'],
      confidence: 50,
      timestamp: new Date(),
      actionMessage: `Not enough historical data to generate signals for ${commodityName}.`,
      urgency: 'LOW',
      commodity: commodityName
    }];
  }
  
  // Use last 5 data points with meaningful intervals
  const totalPoints = priceHistory.length;
  const signalCount = Math.min(5, Math.floor(totalPoints / 4));
  const step = Math.max(1, Math.floor(totalPoints / signalCount));
  
  for (let i = 0; i < signalCount; i++) {
    const endIdx = totalPoints - (i * step);
    if (endIdx < 20) break;
    
    const historicalSlice = priceHistory.slice(0, endIdx);
    const closes = historicalSlice.map(p => p.close);
    const currentPrice = closes[closes.length - 1];
    
    // Calculate indicators at this point in time
    const rsi = calculateRSI(closes, 14);
    const sma20 = calculateSMA(closes, 20);
    const sma50 = calculateSMA(closes, Math.min(50, closes.length));
    const ema12 = calculateEMA(closes, 12);
    const ema26 = calculateEMA(closes, 26);
    const macdValue = ema12 - ema26;
    
    // Determine signal based on indicators
    const indicatorsList: string[] = [];
    let buyScore = 0;
    let sellScore = 0;
    
    // RSI Analysis
    if (rsi < 30) {
      indicatorsList.push('RSI Oversold');
      buyScore += 2;
    } else if (rsi > 70) {
      indicatorsList.push('RSI Overbought');
      sellScore += 2;
    }
    
    // MACD Analysis
    if (macdValue > 0) {
      indicatorsList.push('MACD Bullish');
      buyScore += 1.5;
    } else if (macdValue < 0) {
      indicatorsList.push('MACD Bearish');
      sellScore += 1.5;
    }
    
    // Price vs SMA
    if (currentPrice > sma20) {
      indicatorsList.push('Price Above SMA20');
      buyScore += 1;
    } else {
      indicatorsList.push('Price Below SMA20');
      sellScore += 1;
    }
    
    // Golden/Death Cross
    if (sma20 > sma50) {
      indicatorsList.push('Golden Cross');
      buyScore += 1;
    } else if (sma20 < sma50) {
      indicatorsList.push('Death Cross');
      sellScore += 1;
    }
    
    // Determine signal type
    let type: Signal['type'];
    let strength: Signal['strength'];
    let urgency: Signal['urgency'];
    
    const scoreDiff = buyScore - sellScore;
    const totalScore = buyScore + sellScore;
    const confidence = totalScore > 0 
      ? Math.min(95, (Math.abs(scoreDiff) / totalScore) * 100 + 50) 
      : 50;
    
    if (scoreDiff > 1.5) {
      type = 'BUY';
      strength = buyScore > 4 ? 'STRONG' : buyScore > 2.5 ? 'MODERATE' : 'WEAK';
      urgency = buyScore > 4 ? 'HIGH' : buyScore > 2.5 ? 'MEDIUM' : 'LOW';
    } else if (scoreDiff < -1.5) {
      type = 'SELL';
      strength = sellScore > 4 ? 'STRONG' : sellScore > 2.5 ? 'MODERATE' : 'WEAK';
      urgency = sellScore > 4 ? 'HIGH' : sellScore > 2.5 ? 'MEDIUM' : 'LOW';
    } else {
      type = 'HOLD';
      strength = 'MODERATE';
      urgency = 'LOW';
    }
    
    // Create action message
    let actionMessage: string;
    if (type === 'BUY') {
      actionMessage = strength === 'STRONG' 
        ? `Strong buying opportunity for ${commodityName}.`
        : `Consider buying ${commodityName}.`;
    } else if (type === 'SELL') {
      actionMessage = strength === 'STRONG'
        ? `Strong sell signal for ${commodityName}.`
        : `Consider selling ${commodityName}.`;
    } else {
      actionMessage = `Hold position on ${commodityName}.`;
    }
    
    // Use the timestamp from the historical data point
    const timestamp = new Date(historicalSlice[historicalSlice.length - 1].timestamp);
    
    signals.push({
      type,
      strength,
      indicators: indicatorsList.slice(0, 3),
      confidence: Math.round(confidence),
      timestamp,
      actionMessage,
      urgency,
      commodity: commodityName
    });
  }
  
  return signals;
}

export function SignalHistory({ commodityName, priceHistory }: SignalHistoryProps) {
  const [selectedRange, setSelectedRange] = useState<TimeRange>('1W');
  
  // Filter price history based on selected time range
  const filteredPriceHistory = useMemo(() => {
    if (!priceHistory || priceHistory.length === 0) return [];
    
    const selectedDays = TIME_RANGES.find(r => r.value === selectedRange)?.days || 7;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - selectedDays);
    
    return priceHistory.filter(point => new Date(point.timestamp) >= cutoffDate);
  }, [priceHistory, selectedRange]);
  
  const historicalSignals = useMemo(() => 
    generateHistoricalSignalsFromData(commodityName, filteredPriceHistory),
    [commodityName, filteredPriceHistory]
  );
  
  return (
    <div className="glass-card rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-foreground">Recent Signals</h3>
        </div>
        <div className="flex items-center gap-2">
          {/* Time Range Selector */}
          <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
            {TIME_RANGES.map((range) => (
              <Button
                key={range.value}
                variant={selectedRange === range.value ? "default" : "ghost"}
                size="sm"
                className={cn(
                  "h-6 px-2 text-xs font-medium transition-all",
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
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="text-muted-foreground hover:text-primary transition-colors">
                <Info className="w-4 h-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-[250px]">
              <p className="text-xs">
                Signals are calculated from real historical price data using RSI, MACD, and moving average analysis.
              </p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
      
      <div className="space-y-3">
        {historicalSignals.map((signal, index) => {
          const SignalIcon = 
            signal.type === 'BUY' ? ArrowUpCircle :
            signal.type === 'SELL' ? ArrowDownCircle :
            MinusCircle;
          
          const colorClass = 
            signal.type === 'BUY' ? 'text-success' :
            signal.type === 'SELL' ? 'text-destructive' :
            'text-muted-foreground';
          
          const bgClass = 
            signal.type === 'BUY' ? 'bg-success/10' :
            signal.type === 'SELL' ? 'bg-destructive/10' :
            'bg-muted';
          
          return (
            <div 
              key={index}
              className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className={cn("p-1.5 rounded-md", bgClass)}>
                  <SignalIcon className={cn("w-4 h-4", colorClass)} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className={cn("font-semibold text-sm", colorClass)}>
                      {signal.type}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ({signal.strength})
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {signal.indicators.slice(0, 2).join(', ')}
                  </p>
                </div>
              </div>
              
              <div className="text-right">
                <p className={cn("text-sm font-mono", colorClass)}>
                  {signal.confidence}%
                </p>
                <p className="text-xs text-muted-foreground">
                  {signal.timestamp.toLocaleDateString([], { month: 'short', day: 'numeric' })}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
