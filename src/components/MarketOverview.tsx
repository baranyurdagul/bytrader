import { CommodityData } from '@/lib/tradingData';
import { TrendingUp, TrendingDown, Activity, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMemo } from 'react';

interface MarketOverviewProps {
  commodities: CommodityData[];
}

export function MarketOverview({ commodities }: MarketOverviewProps) {
  const stats = useMemo(() => {
    if (commodities.length === 0) return null;
    
    const gainers = commodities.filter(c => c.change > 0).length;
    const losers = commodities.filter(c => c.change < 0).length;
    const unchanged = commodities.length - gainers - losers;
    
    const avgChange = commodities.reduce((acc, c) => acc + c.changePercent, 0) / commodities.length;
    
    const bestPerformer = [...commodities].sort((a, b) => b.changePercent - a.changePercent)[0];
    const worstPerformer = [...commodities].sort((a, b) => a.changePercent - b.changePercent)[0];
    
    return {
      gainers,
      losers,
      unchanged,
      avgChange,
      bestPerformer,
      worstPerformer,
    };
  }, [commodities]);

  if (!stats) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      {/* Market Sentiment */}
      <div className="p-4 rounded-xl bg-card border border-border">
        <div className="flex items-center gap-2 mb-2">
          <Activity className="w-4 h-4 text-primary" />
          <span className="text-xs text-muted-foreground">Market Mood</span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className={cn(
            "text-2xl font-bold",
            stats.avgChange >= 0 ? "text-success" : "text-destructive"
          )}>
            {stats.avgChange >= 0 ? 'Bullish' : 'Bearish'}
          </span>
        </div>
        <p className={cn(
          "text-sm font-mono mt-1",
          stats.avgChange >= 0 ? "text-success" : "text-destructive"
        )}>
          {stats.avgChange >= 0 ? '+' : ''}{stats.avgChange.toFixed(2)}% avg
        </p>
      </div>

      {/* Gainers/Losers */}
      <div className="p-4 rounded-xl bg-card border border-border">
        <div className="flex items-center gap-2 mb-2">
          <BarChart3 className="w-4 h-4 text-primary" />
          <span className="text-xs text-muted-foreground">Gainers/Losers</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <TrendingUp className="w-4 h-4 text-success" />
            <span className="text-xl font-bold text-success">{stats.gainers}</span>
          </div>
          <span className="text-muted-foreground">/</span>
          <div className="flex items-center gap-1">
            <TrendingDown className="w-4 h-4 text-destructive" />
            <span className="text-xl font-bold text-destructive">{stats.losers}</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {stats.unchanged} unchanged
        </p>
      </div>

      {/* Best Performer */}
      <div className="p-4 rounded-xl bg-card border border-border">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="w-4 h-4 text-success" />
          <span className="text-xs text-muted-foreground">Top Gainer</span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-bold text-foreground">{stats.bestPerformer.symbol}</span>
          <span className="text-sm font-mono text-success">
            +{stats.bestPerformer.changePercent.toFixed(2)}%
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-1 truncate">
          {stats.bestPerformer.name}
        </p>
      </div>

      {/* Worst Performer */}
      <div className="p-4 rounded-xl bg-card border border-border">
        <div className="flex items-center gap-2 mb-2">
          <TrendingDown className="w-4 h-4 text-destructive" />
          <span className="text-xs text-muted-foreground">Top Loser</span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-bold text-foreground">{stats.worstPerformer.symbol}</span>
          <span className="text-sm font-mono text-destructive">
            {stats.worstPerformer.changePercent.toFixed(2)}%
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-1 truncate">
          {stats.worstPerformer.name}
        </p>
      </div>
    </div>
  );
}
