import { Signal } from '@/lib/tradingData';
import { cn } from '@/lib/utils';
import { ArrowUpCircle, ArrowDownCircle, MinusCircle, Zap, AlertTriangle, CheckCircle, Bell, BellRing } from 'lucide-react';

interface SignalCardProps {
  signal: Signal;
  commodityName: string;
}

export function SignalCard({ signal, commodityName }: SignalCardProps) {
  const SignalIcon = 
    signal.type === 'BUY' ? ArrowUpCircle : 
    signal.type === 'SELL' ? ArrowDownCircle : 
    MinusCircle;
  
  const StrengthIcon = 
    signal.strength === 'STRONG' ? Zap :
    signal.strength === 'MODERATE' ? CheckCircle :
    AlertTriangle;
  
  const UrgencyIcon = signal.urgency === 'HIGH' ? BellRing : Bell;
  
  const signalColors = {
    BUY: {
      bg: 'bg-success/10',
      border: 'border-success/30',
      text: 'text-success',
      glow: 'glow-success'
    },
    SELL: {
      bg: 'bg-destructive/10',
      border: 'border-destructive/30',
      text: 'text-destructive',
      glow: 'glow-danger'
    },
    HOLD: {
      bg: 'bg-muted',
      border: 'border-muted-foreground/30',
      text: 'text-muted-foreground',
      glow: ''
    }
  };
  
  const colors = signalColors[signal.type];
  
  const urgencyColors = {
    HIGH: 'bg-destructive/20 text-destructive border-destructive/40',
    MEDIUM: 'bg-warning/20 text-warning border-warning/40',
    LOW: 'bg-muted text-muted-foreground border-muted-foreground/40'
  };
  
  return (
    <div className={cn(
      "rounded-xl border p-6 transition-all",
      colors.bg,
      colors.border,
      signal.type !== 'HOLD' && colors.glow
    )}>
      {/* Urgency Alert Banner */}
      {signal.urgency === 'HIGH' && signal.type !== 'HOLD' && (
        <div className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-lg mb-4 border animate-pulse",
          urgencyColors[signal.urgency]
        )}>
          <UrgencyIcon className="w-4 h-4" />
          <span className="text-sm font-semibold">
            {signal.type === 'BUY' ? '🔔 BUY ALERT!' : '🔔 SELL ALERT!'}
          </span>
        </div>
      )}
      
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <SignalIcon className={cn("w-10 h-10", colors.text)} />
          <div>
            <h3 className={cn("text-3xl font-bold", colors.text)}>
              {signal.type}
            </h3>
            <p className="text-sm text-muted-foreground">{commodityName}</p>
          </div>
        </div>
        
        <div className="text-right">
          <div className="flex items-center gap-1.5 justify-end">
            <StrengthIcon className={cn("w-4 h-4", colors.text)} />
            <span className={cn("text-sm font-medium", colors.text)}>
              {signal.strength}
            </span>
          </div>
          <div className="mt-1">
            <span className="text-xs text-muted-foreground">Confidence</span>
            <span className={cn("ml-2 text-sm font-mono font-semibold", colors.text)}>
              {signal.confidence.toFixed(0)}%
            </span>
          </div>
        </div>
      </div>
      
      {/* Confidence Bar */}
      <div className="mb-4">
        <div className="h-2 bg-secondary/50 rounded-full overflow-hidden">
          <div 
            className={cn(
              "h-full rounded-full transition-all duration-500",
              signal.type === 'BUY' ? 'bg-success' :
              signal.type === 'SELL' ? 'bg-destructive' :
              'bg-muted-foreground'
            )}
            style={{ width: `${signal.confidence}%` }}
          />
        </div>
      </div>
      
      {/* Action Message - Clear guidance for non-professionals */}
      <div className={cn(
        "p-4 rounded-lg mb-4 border",
        colors.bg,
        colors.border
      )}>
        <p className="text-sm font-medium leading-relaxed">
          {signal.actionMessage}
        </p>
      </div>
      
      {/* Indicators */}
      <div>
        <p className="text-xs text-muted-foreground mb-2">Analysis based on:</p>
        <div className="flex flex-wrap gap-2">
          {signal.indicators.map((indicator, index) => (
            <span 
              key={index}
              className={cn(
                "px-2 py-1 rounded-md text-xs font-medium",
                colors.bg,
                colors.text,
                "border",
                colors.border
              )}
            >
              {indicator}
            </span>
          ))}
        </div>
      </div>
      
      <div className="mt-4 pt-4 border-t border-border/30 flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Signal at {signal.timestamp.toLocaleTimeString()}
        </p>
        <div className={cn(
          "px-2 py-1 rounded text-xs font-medium border",
          urgencyColors[signal.urgency]
        )}>
          {signal.urgency} Priority
        </div>
      </div>
    </div>
  );
}
