import { useGoldSpread } from '@/hooks/useGoldSpread';
import { useSilverSpread } from '@/hooks/useSilverSpread';
import { TrendingUp, TrendingDown, Minus, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getComexMarketStatus, getSgeMarketStatus, getTimeUntilOpen } from '@/lib/marketStatus';

export function ArbitrageSpreadTile() {
  const navigate = useNavigate();
  const { data: goldData, isLoading: goldLoading, refetch: refetchGold } = useGoldSpread(60000);
  const { data: silverData, isLoading: silverLoading, refetch: refetchSilver } = useSilverSpread(60000);
  const [wowChange, setWowChange] = useState<number | null>(null);

  const isLoading = (goldLoading && !goldData) || (silverLoading && !silverData);

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
      <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] gap-3">
        <Skeleton className="h-32 rounded-xl" />
        <div className="w-px" />
        <Skeleton className="h-32 rounded-xl" />
        <div className="w-px" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
    );
  }

  const formatPrice = (price: number) => {
    if (price >= 1000) return `$${Math.round(price).toLocaleString()}`;
    return `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

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

  const comexStatus = getComexMarketStatus();
  const sgeStatus = getSgeMarketStatus();
  const comexCountdown = comexStatus.isOpen ? 'Open' : getTimeUntilOpen('us');
  const sgeCountdown = sgeStatus.isOpen ? 'Open' : getTimeUntilOpen('china');

  const StatusDot = ({ isOpen }: { isOpen: boolean }) => (
    <span className={cn(
      "inline-block w-1.5 h-1.5 rounded-full flex-shrink-0",
      isOpen ? "bg-success animate-pulse" : "bg-muted-foreground/40"
    )} />
  );

  const MarketCountdown = () => (
    <div className="flex justify-between text-[9px] text-muted-foreground mt-1 pt-1 border-t border-border/30">
      <span className="flex items-center gap-0.5">
        <StatusDot isOpen={comexStatus.isOpen} />
        US: <span className={cn("font-mono", comexStatus.isOpen && "text-success")}>{comexCountdown}</span>
      </span>
      <span className="flex items-center gap-0.5">
        <StatusDot isOpen={sgeStatus.isOpen} />
        SGE: <span className={cn("font-mono", sgeStatus.isOpen && "text-success")}>{sgeCountdown}</span>
      </span>
    </div>
  );

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] gap-1.5">
        {/* Silver Section */}
        <div 
          className="glass-card rounded-xl p-2.5 space-y-2 cursor-pointer transition-all hover:shadow-md active:scale-[0.98] min-w-0"
          onClick={() => navigate('/arbitrage')}
        >
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-slate-400" />
            <span className="text-xs font-semibold text-foreground">Silver</span>
          </div>
          
          {silverData ? (
            <>
              <div className={cn("p-2 rounded-lg border", getBgColor(silverData.spread.direction))}>
                <div className="flex items-center gap-1 mb-0.5">
                  {(() => {
                    const Icon = getSpreadIcon(silverData.spread.direction);
                    return <Icon className={cn("w-3 h-3", getSpreadColor(silverData.spread.direction))} />;
                  })()}
                  <span className={cn("text-base font-bold font-mono", getSpreadColor(silverData.spread.direction))}>
                    {silverData.spread.percent >= 0 ? '+' : ''}{silverData.spread.percent.toFixed(2)}%
                  </span>
                </div>
                <p className={cn("text-[10px] font-mono", getSpreadColor(silverData.spread.direction))}>
                  {silverData.spread.value >= 0 ? '+' : ''}{formatPrice(silverData.spread.value)}
                </p>
              </div>
              
              <div className="space-y-1 text-[10px]">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground flex items-center gap-1"><StatusDot isOpen={comexStatus.isOpen} />COMEX:</span>
                  <span className="font-mono font-medium text-success">{formatPrice(silverData.comex.price)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground flex items-center gap-1"><StatusDot isOpen={sgeStatus.isOpen} />SGE:</span>
                  <span className="font-mono font-medium text-success">
                    {silverData.shanghai.priceUSD > 0 ? formatPrice(silverData.shanghai.priceUSD) : '--'}
                  </span>
                </div>
              </div>
              <MarketCountdown />
            </>
          ) : (
            <p className="text-xs text-muted-foreground">N/A</p>
          )}
        </div>
        
        {/* Separator */}
        <div className="w-px bg-border/50 self-stretch" />
        
        {/* Gold Section */}
        <div 
          className="glass-card rounded-xl p-2.5 space-y-2 cursor-pointer transition-all hover:shadow-md active:scale-[0.98] min-w-0"
          onClick={() => navigate('/arbitrage')}
        >
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span className="text-xs font-semibold text-foreground">Gold</span>
          </div>
          
          {goldData ? (
            <>
              <div className={cn("p-2 rounded-lg border", getBgColor(goldData.spread.direction))}>
                <div className="flex items-center gap-1 mb-0.5">
                  {(() => {
                    const Icon = getSpreadIcon(goldData.spread.direction);
                    return <Icon className={cn("w-3 h-3", getSpreadColor(goldData.spread.direction))} />;
                  })()}
                  <span className={cn("text-base font-bold font-mono", getSpreadColor(goldData.spread.direction))}>
                    {goldData.spread.percent >= 0 ? '+' : ''}{goldData.spread.percent.toFixed(2)}%
                  </span>
                </div>
                <p className={cn("text-[10px] font-mono", getSpreadColor(goldData.spread.direction))}>
                  {goldData.spread.value >= 0 ? '+' : ''}{formatPrice(goldData.spread.value)}
                </p>
              </div>
              
              <div className="space-y-1 text-[10px]">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground flex items-center gap-1"><StatusDot isOpen={comexStatus.isOpen} />COMEX:</span>
                  <span className="font-mono font-medium text-success">{formatPrice(goldData.comex.price)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground flex items-center gap-1"><StatusDot isOpen={sgeStatus.isOpen} />SGE:</span>
                  <span className="font-mono font-medium text-success">
                    {goldData.shanghai.priceUSD > 0 ? formatPrice(goldData.shanghai.priceUSD) : '--'}
                  </span>
                </div>
              </div>
              <MarketCountdown />
            </>
          ) : (
            <p className="text-xs text-muted-foreground">N/A</p>
          )}
        </div>
        
        {/* Separator */}
        <div className="w-px bg-border/50 self-stretch" />
        
        {/* Gold:Silver Ratio */}
        <div 
          className="glass-card rounded-xl p-2.5 space-y-2 cursor-pointer transition-all hover:shadow-md active:scale-[0.98] min-w-0"
          onClick={() => navigate('/arbitrage')}
        >
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-amber-500 to-slate-400" />
            <span className="text-xs font-semibold text-foreground">Au:Ag</span>
          </div>
          
          {goldData && silverData && goldData.comex.price > 0 && silverData.comex.price > 0 ? (
            <>
              <div className="p-2 rounded-lg border bg-primary/5 border-primary/20">
                <span className="text-base font-bold font-mono text-foreground">
                  {(goldData.comex.price / silverData.comex.price).toFixed(1)}
                </span>
                <p className="text-[10px] text-muted-foreground mt-0.5">ratio</p>
              </div>
              
              <div className="space-y-1 text-[10px]">
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
              <MarketCountdown />
            </>
          ) : (
            <p className="text-xs text-muted-foreground">N/A</p>
          )}
        </div>
      </div>
      
      <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground">
        <Clock className="w-3 h-3" />
        <span>
          {goldData?.lastUpdated 
            ? new Date(goldData.lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : '--:--'}
        </span>
        <span>•</span>
        <span>{goldData?.shanghai?.session || silverData?.shanghai?.session || 'PM'} session</span>
        {isCached && (
          <>
            <span>•</span>
            <span className="text-warning">cached</span>
          </>
        )}
      </div>
    </div>
  );
}
