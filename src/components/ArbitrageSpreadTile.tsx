import { useGoldSpread } from '@/hooks/useGoldSpread';
import { useSilverSpread } from '@/hooks/useSilverSpread';
import { TrendingUp, TrendingDown, Minus, ChevronRight, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function ArbitrageSpreadTile() {
  const navigate = useNavigate();
  const { data: goldData, isLoading: goldLoading, refetch: refetchGold } = useGoldSpread(60000);
  const { data: silverData, isLoading: silverLoading, refetch: refetchSilver } = useSilverSpread(60000);
  const [wowChange, setWowChange] = useState<number | null>(null);

  const isLoading = (goldLoading && !goldData) || (silverLoading && !silverData);

  const handleRefresh = () => {
    refetchGold();
    refetchSilver();
  };

  // Fetch WoW ratio change from snapshots
  useEffect(() => {
    async function fetchWoW() {
      try {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const weekAgoStr = weekAgo.toISOString().split('T')[0];
        
        const { data } = await supabase
          .from('arbitrage_snapshots')
          .select('gold_comex_price, silver_comex_price, snapshot_date')
          .lte('snapshot_date', weekAgoStr)
          .order('snapshot_date', { ascending: false })
          .limit(1);
        
        if (data && data.length > 0 && goldData && silverData) {
          const oldRatio = data[0].gold_comex_price / data[0].silver_comex_price;
          const currentRatio = goldData.comex.price / silverData.comex.price;
          setWowChange(((currentRatio - oldRatio) / oldRatio) * 100);
        }
      } catch (err) {
        console.error('Error fetching WoW ratio:', err);
      }
    }
    if (goldData && silverData) fetchWoW();
  }, [goldData, silverData]);

  if (isLoading) {
    return (
      <div className="glass-card rounded-xl p-4">
        <Skeleton className="h-5 w-40 mb-4" />
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-4 w-20" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
      </div>
    );
  }

  const formatPrice = (price: number) => `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const getSpreadIcon = (direction: string) => {
    if (direction === 'premium') return TrendingUp;
    if (direction === 'discount') return TrendingDown;
    return Minus;
  };

  const getSpreadColor = (direction: string) => {
    if (direction === 'premium') return 'text-success';
    if (direction === 'discount') return 'text-destructive';
    return 'text-muted-foreground';
  };

  const getBgColor = (direction: string) => {
    if (direction === 'premium') return 'bg-success/10 border-success/30';
    if (direction === 'discount') return 'bg-destructive/10 border-destructive/30';
    return 'bg-muted/50 border-border';
  };

  const isCached = goldData?.dataSource === 'cached' || silverData?.dataSource === 'cached';

  return (
    <div 
      className={cn(
        "glass-card rounded-xl overflow-hidden cursor-pointer transition-all hover:shadow-lg active:scale-[0.98]",
        isCached && "border-warning/30"
      )}
      onClick={() => navigate('/arbitrage')}
    >
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-primary/10 to-amber-500/10 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/20">
              <TrendingUp className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Shanghai Arbitrage</h3>
              <p className="text-[10px] text-muted-foreground">COMEX vs Shanghai Premium</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {isCached && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-warning/20 text-warning">cached</span>
            )}
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>
      </div>
      
      {/* Content Grid - Gold & Silver Side by Side */}
      <div className="p-4">
        <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] gap-3">
          {/* Silver Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-slate-400" />
              <span className="text-xs font-semibold text-foreground">Silver</span>
            </div>
            
            {silverData ? (
              <>
                <div className={cn("p-2 rounded-lg border", getBgColor(silverData.spread.direction))}>
                  <div className="flex items-center gap-1 mb-1">
                    {(() => {
                      const Icon = getSpreadIcon(silverData.spread.direction);
                      return <Icon className={cn("w-3 h-3", getSpreadColor(silverData.spread.direction))} />;
                    })()}
                    <span className={cn("text-lg font-bold font-mono", getSpreadColor(silverData.spread.direction))}>
                      {silverData.spread.percent >= 0 ? '+' : ''}{silverData.spread.percent.toFixed(2)}%
                    </span>
                  </div>
                  <p className={cn("text-[10px] font-mono", getSpreadColor(silverData.spread.direction))}>
                    {silverData.spread.value >= 0 ? '+' : ''}{formatPrice(silverData.spread.value)}
                  </p>
                </div>
                
                <div className="space-y-1.5 text-[10px]">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">COMEX:</span>
                    <span className="font-mono font-medium text-success">{formatPrice(silverData.comex.price)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Shanghai:</span>
                    <span className="font-mono font-medium text-success">
                      {silverData.shanghai.priceUSD > 0 ? formatPrice(silverData.shanghai.priceUSD) : '--'}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">Data unavailable</p>
            )}
          </div>
          
          {/* Separator */}
          <div className="w-px bg-border/50 self-stretch" />
          
          {/* Gold Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-500" />
              <span className="text-xs font-semibold text-foreground">Gold</span>
            </div>
            
            {goldData ? (
              <>
                <div className={cn("p-2 rounded-lg border", getBgColor(goldData.spread.direction))}>
                  <div className="flex items-center gap-1 mb-1">
                    {(() => {
                      const Icon = getSpreadIcon(goldData.spread.direction);
                      return <Icon className={cn("w-3 h-3", getSpreadColor(goldData.spread.direction))} />;
                    })()}
                    <span className={cn("text-lg font-bold font-mono", getSpreadColor(goldData.spread.direction))}>
                      {goldData.spread.percent >= 0 ? '+' : ''}{goldData.spread.percent.toFixed(2)}%
                    </span>
                  </div>
                  <p className={cn("text-[10px] font-mono", getSpreadColor(goldData.spread.direction))}>
                    {goldData.spread.value >= 0 ? '+' : ''}{formatPrice(goldData.spread.value)}
                  </p>
                </div>
                
                <div className="space-y-1.5 text-[10px]">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">COMEX:</span>
                    <span className="font-mono font-medium text-success">{formatPrice(goldData.comex.price)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Shanghai:</span>
                    <span className="font-mono font-medium text-success">
                      {goldData.shanghai.priceUSD > 0 ? formatPrice(goldData.shanghai.priceUSD) : '--'}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">Data unavailable</p>
            )}
          </div>
          
          {/* Separator */}
          <div className="w-px bg-border/50 self-stretch" />
          
          {/* Gold:Silver Ratio */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-gradient-to-r from-amber-500 to-slate-400" />
              <span className="text-xs font-semibold text-foreground">Au:Ag</span>
            </div>
            
            {goldData && silverData && goldData.comex.price > 0 && silverData.comex.price > 0 ? (
              <>
                <div className="p-2 rounded-lg border bg-primary/5 border-primary/20">
                  <span className="text-lg font-bold font-mono text-foreground">
                    {(goldData.comex.price / silverData.comex.price).toFixed(1)}
                  </span>
                  <p className="text-[10px] text-muted-foreground mt-0.5">ratio</p>
                </div>
                
                <div className="space-y-1.5 text-[10px]">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">WoW:</span>
                    {wowChange !== null ? (
                      <span className={cn(
                        "font-mono font-medium",
                        wowChange >= 0 ? "text-success" : "text-destructive"
                      )}>
                        {wowChange >= 0 ? '+' : ''}{wowChange.toFixed(2)}%
                      </span>
                    ) : (
                      <span className="font-mono font-medium text-muted-foreground">N/A</span>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">Data unavailable</p>
            )}
          </div>
        </div>
        
        <div className="flex items-center justify-center gap-1.5 mt-3 text-[10px] text-muted-foreground">
          <Clock className="w-3 h-3" />
          <span>
            {goldData?.lastUpdated 
              ? new Date(goldData.lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : '--:--'}
          </span>
          <span>•</span>
          <span>{goldData?.shanghai?.session || silverData?.shanghai?.session || 'PM'} session</span>
          <span>•</span>
          <span>Tap for trends</span>
        </div>
      </div>
    </div>
  );
}
