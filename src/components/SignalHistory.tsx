import { Signal } from '@/lib/tradingData';
import { cn } from '@/lib/utils';
import { ArrowUpCircle, ArrowDownCircle, MinusCircle, Clock } from 'lucide-react';

interface SignalHistoryProps {
  commodityName: string;
}

// Generate mock historical signals
function generateHistoricalSignals(commodityName: string): Array<Signal & { commodity: string }> {
  const types: Signal['type'][] = ['BUY', 'SELL', 'HOLD'];
  const strengths: Signal['strength'][] = ['STRONG', 'MODERATE', 'WEAK'];
  const indicators = [
    'RSI Oversold',
    'MACD Bullish Crossover',
    'Price Above MA20',
    'Golden Cross',
    'RSI Overbought',
    'MACD Bearish Crossover',
    'Price Below MA50',
    'Death Cross',
    'Stochastic Oversold',
    'Bollinger Band Touch'
  ];
  
  const signals: Array<Signal & { commodity: string }> = [];
  
  for (let i = 0; i < 5; i++) {
    const type = types[Math.floor(Math.random() * types.length)];
    const numIndicators = Math.floor(Math.random() * 3) + 2;
    const selectedIndicators = [];
    
    for (let j = 0; j < numIndicators; j++) {
      const ind = indicators[Math.floor(Math.random() * indicators.length)];
      if (!selectedIndicators.includes(ind)) {
        selectedIndicators.push(ind);
      }
    }
    
    const strength = strengths[Math.floor(Math.random() * strengths.length)];
    const urgency = strength === 'STRONG' ? 'HIGH' : strength === 'MODERATE' ? 'MEDIUM' : 'LOW';
    const actionMessage = type === 'BUY' 
      ? `Good opportunity to consider buying ${commodityName}.`
      : type === 'SELL' 
        ? `Consider taking profits on ${commodityName}.`
        : `Hold position on ${commodityName}.`;
    
    signals.push({
      type,
      strength,
      indicators: selectedIndicators,
      confidence: Math.floor(Math.random() * 40) + 55,
      timestamp: new Date(Date.now() - (i + 1) * 4 * 60 * 60 * 1000),
      actionMessage,
      urgency: urgency as Signal['urgency'],
      commodity: commodityName
    });
  }
  
  return signals;
}

export function SignalHistory({ commodityName }: SignalHistoryProps) {
  const historicalSignals = generateHistoricalSignals(commodityName);
  
  return (
    <div className="glass-card rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="w-4 h-4 text-primary" />
        <h3 className="font-semibold text-foreground">Recent Signals</h3>
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
                  {signal.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
