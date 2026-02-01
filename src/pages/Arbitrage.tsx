import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, TrendingUp, TrendingDown, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useArbitrageHistory } from '@/hooks/useArbitrageHistory';
import { useGoldSpread } from '@/hooks/useGoldSpread';
import { useSilverSpread } from '@/hooks/useSilverSpread';
import { cn } from '@/lib/utils';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from 'recharts';

type Period = '1D' | '1W' | '1M';

export default function Arbitrage() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<Period>('1W');
  
  const { data: historyData, isLoading, error, dataSource, refetch } = useArbitrageHistory(period);
  const { data: goldData, refetch: refetchGold } = useGoldSpread(60000);
  const { data: silverData, refetch: refetchSilver } = useSilverSpread(60000);
  
  const handleRefresh = () => {
    refetch();
    refetchGold();
    refetchSilver();
  };
  
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    if (period === '1D') {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };
  
  const formatPrice = (price: number) => `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  
  // Calculate stats from history
  const goldSpreads = historyData.map(d => d.goldSpreadPercent);
  const silverSpreads = historyData.map(d => d.silverSpreadPercent);
  
  const avgGoldSpread = goldSpreads.length > 0 ? goldSpreads.reduce((a, b) => a + b, 0) / goldSpreads.length : 0;
  const avgSilverSpread = silverSpreads.length > 0 ? silverSpreads.reduce((a, b) => a + b, 0) / silverSpreads.length : 0;
  const maxGoldSpread = goldSpreads.length > 0 ? Math.max(...goldSpreads) : 0;
  const minGoldSpread = goldSpreads.length > 0 ? Math.min(...goldSpreads) : 0;
  
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="h-9 w-9"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-lg font-bold text-foreground">Shanghai Arbitrage</h1>
              <p className="text-xs text-muted-foreground">COMEX vs Shanghai Premium Trends</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            className="h-9 w-9"
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </Button>
        </div>
      </div>
      
      <div className="p-4 space-y-4 pb-24">
        {/* Current Spreads */}
        <div className="grid grid-cols-2 gap-3">
          {/* Gold Current */}
          <div className="glass-card rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 rounded-full bg-amber-500" />
              <span className="text-sm font-semibold">Gold</span>
            </div>
            {goldData ? (
              <>
                <div className={cn(
                  "text-2xl font-bold font-mono",
                  goldData.spread.direction === 'premium' ? 'text-success' : 
                  goldData.spread.direction === 'discount' ? 'text-destructive' : 'text-muted-foreground'
                )}>
                  {goldData.spread.percent >= 0 ? '+' : ''}{goldData.spread.percent.toFixed(2)}%
                </div>
                <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                  <p>COMEX: {formatPrice(goldData.comex.price)}</p>
                  <p>Shanghai: {goldData.shanghai.priceUSD > 0 ? formatPrice(goldData.shanghai.priceUSD) : '--'}</p>
                </div>
              </>
            ) : (
              <Skeleton className="h-10 w-24" />
            )}
          </div>
          
          {/* Silver Current */}
          <div className="glass-card rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 rounded-full bg-slate-400" />
              <span className="text-sm font-semibold">Silver</span>
            </div>
            {silverData ? (
              <>
                <div className={cn(
                  "text-2xl font-bold font-mono",
                  silverData.spread.direction === 'premium' ? 'text-success' : 
                  silverData.spread.direction === 'discount' ? 'text-destructive' : 'text-muted-foreground'
                )}>
                  {silverData.spread.percent >= 0 ? '+' : ''}{silverData.spread.percent.toFixed(2)}%
                </div>
                <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                  <p>COMEX: {formatPrice(silverData.comex.price)}</p>
                  <p>Shanghai: {silverData.shanghai.priceUSD > 0 ? formatPrice(silverData.shanghai.priceUSD) : '--'}</p>
                </div>
              </>
            ) : (
              <Skeleton className="h-10 w-24" />
            )}
          </div>
        </div>
        
        {/* Period Selector */}
        <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="1D">1D</TabsTrigger>
            <TabsTrigger value="1W">1W</TabsTrigger>
            <TabsTrigger value="1M">1M</TabsTrigger>
          </TabsList>
        </Tabs>
        
        {/* Chart */}
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold">Spread Trend</h2>
            {dataSource === 'cached' && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-warning/20 text-warning">cached</span>
            )}
          </div>
          
          {isLoading ? (
            <div className="h-64 flex items-center justify-center">
              <Skeleton className="h-full w-full" />
            </div>
          ) : error ? (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              <p>{error}</p>
            </div>
          ) : historyData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              <p>No data available</p>
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={historyData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                  <XAxis 
                    dataKey="timestamp" 
                    tickFormatter={formatDate}
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                    tickLine={false}
                  />
                  <YAxis 
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                    tickLine={false}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    labelFormatter={(timestamp) => new Date(timestamp).toLocaleDateString()}
                    formatter={(value: number, name: string) => [
                      `${value.toFixed(2)}%`,
                      name === 'goldSpreadPercent' ? 'Gold' : 'Silver'
                    ]}
                  />
                  <Legend 
                    formatter={(value) => value === 'goldSpreadPercent' ? 'Gold' : 'Silver'}
                    wrapperStyle={{ fontSize: '12px' }}
                  />
                  <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
                  <Line
                    type="monotone"
                    dataKey="goldSpreadPercent"
                    stroke="hsl(45, 100%, 50%)"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="silverSpreadPercent"
                    stroke="hsl(210, 20%, 60%)"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
        
        {/* Statistics */}
        <div className="glass-card rounded-xl p-4">
          <h2 className="text-sm font-semibold mb-3">Period Statistics</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Avg Gold Premium</p>
              <p className={cn(
                "text-lg font-bold font-mono",
                avgGoldSpread > 0 ? 'text-success' : 'text-destructive'
              )}>
                {avgGoldSpread >= 0 ? '+' : ''}{avgGoldSpread.toFixed(2)}%
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Avg Silver Premium</p>
              <p className={cn(
                "text-lg font-bold font-mono",
                avgSilverSpread > 0 ? 'text-success' : 'text-destructive'
              )}>
                {avgSilverSpread >= 0 ? '+' : ''}{avgSilverSpread.toFixed(2)}%
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Gold High</p>
              <p className="text-sm font-mono text-success">+{maxGoldSpread.toFixed(2)}%</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Gold Low</p>
              <p className="text-sm font-mono text-destructive">{minGoldSpread >= 0 ? '+' : ''}{minGoldSpread.toFixed(2)}%</p>
            </div>
          </div>
        </div>
        
        {/* Info Note */}
        <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 border border-border">
          <Info className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <p className="text-xs text-muted-foreground">
            Historical Shanghai premiums are estimated from typical market patterns. 
            Real-time data is available for current spreads only.
          </p>
        </div>
      </div>
    </div>
  );
}
