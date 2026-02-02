import { useState } from 'react';
import { Info, TrendingUp, TrendingDown, Minus, RefreshCw, Clock, Globe, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useGoldSpread, GoldSpreadData } from '@/hooks/useGoldSpread';
import { useSilverSpread, SilverSpreadData } from '@/hooks/useSilverSpread';
import { useLivePrices } from '@/hooks/useLivePrices';
import { cn } from '@/lib/utils';

// Market session times (UTC)
const MARKET_SESSIONS = {
  asia: { open: 1, close: 8, label: 'Asian Session (Shanghai/Tokyo)' },
  europe: { open: 7, close: 16, label: 'European Session (London)' },
  us: { open: 13, close: 21, label: 'US Session (NY)' },
};

function getCurrentSession(): { session: string; label: string; isOpen: boolean } {
  const now = new Date();
  const utcHour = now.getUTCHours();
  
  if (utcHour >= MARKET_SESSIONS.us.open && utcHour < MARKET_SESSIONS.us.close) {
    return { session: 'us', label: 'US Market', isOpen: true };
  }
  if (utcHour >= MARKET_SESSIONS.europe.open && utcHour < MARKET_SESSIONS.europe.close) {
    return { session: 'europe', label: 'European Market', isOpen: true };
  }
  if (utcHour >= MARKET_SESSIONS.asia.open && utcHour < MARKET_SESSIONS.asia.close) {
    return { session: 'asia', label: 'Asian Market', isOpen: true };
  }
  
  // Determine next session
  if (utcHour < MARKET_SESSIONS.asia.open) {
    return { session: 'pre-asia', label: 'Pre-Asian Session', isOpen: false };
  }
  if (utcHour >= MARKET_SESSIONS.asia.close && utcHour < MARKET_SESSIONS.europe.open) {
    return { session: 'asia-europe', label: 'Asia → Europe Transition', isOpen: true };
  }
  if (utcHour >= MARKET_SESSIONS.us.close) {
    return { session: 'post-us', label: 'Post-US Session', isOpen: false };
  }
  
  return { session: 'unknown', label: 'Market Transition', isOpen: true };
}

function formatPrice(price: number, decimals: number = 2): string {
  return price.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function formatPercent(percent: number): string {
  const sign = percent >= 0 ? '+' : '';
  return `${sign}${percent.toFixed(2)}%`;
}

function TrendIndicator({ value }: { value: number }) {
  if (value > 0.1) {
    return <TrendingUp className="w-4 h-4 text-success" />;
  }
  if (value < -0.1) {
    return <TrendingDown className="w-4 h-4 text-destructive" />;
  }
  return <Minus className="w-4 h-4 text-muted-foreground" />;
}

function PremiumCard({ 
  title, 
  data, 
  isLoading,
  metalType 
}: { 
  title: string; 
  data: GoldSpreadData | SilverSpreadData | null; 
  isLoading: boolean;
  metalType: 'gold' | 'silver';
}) {
  if (isLoading) {
    return (
      <Card className="bg-card/50">
        <CardContent className="p-4">
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-muted rounded w-1/2" />
            <div className="h-6 bg-muted rounded w-3/4" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className="bg-card/50">
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">Data unavailable</p>
        </CardContent>
      </Card>
    );
  }

  const isPremium = data.spread.direction === 'premium';
  const isDiscount = data.spread.direction === 'discount';

  return (
    <Card className={cn(
      "bg-card/50 border-l-4",
      isPremium && "border-l-success",
      isDiscount && "border-l-destructive",
      !isPremium && !isDiscount && "border-l-muted"
    )}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-sm">{title}</h4>
          <Badge 
            variant={isPremium ? "default" : isDiscount ? "destructive" : "secondary"}
            className="text-xs"
          >
            {isPremium ? 'PREMIUM' : isDiscount ? 'DISCOUNT' : 'NEUTRAL'}
          </Badge>
        </div>
        
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-muted-foreground text-xs">COMEX</p>
            <p className="font-mono font-semibold">${formatPrice(data.comex.price)}</p>
            <p className={cn(
              "text-xs",
              data.comex.changePercent >= 0 ? "text-success" : "text-destructive"
            )}>
              {formatPercent(data.comex.changePercent)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Shanghai (SGE)</p>
            <p className="font-mono font-semibold">${formatPrice(data.shanghai.priceUSD)}</p>
            <p className="text-xs text-muted-foreground">
              {metalType === 'gold' ? `¥${formatPrice(data.shanghai.priceCNY)}/g` : `¥${formatPrice(data.shanghai.priceCNY, 0)}/kg`}
            </p>
          </div>
        </div>
        
        <Separator />
        
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted-foreground text-xs">Premium/Discount</p>
            <div className="flex items-center gap-2">
              <TrendIndicator value={data.spread.percent} />
              <span className={cn(
                "font-mono font-bold text-lg",
                isPremium && "text-success",
                isDiscount && "text-destructive"
              )}>
                {formatPercent(data.spread.percent)}
              </span>
              <span className="text-xs text-muted-foreground">
                (${formatPrice(Math.abs(data.spread.value))})
              </span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-muted-foreground text-xs">Session</p>
            <Badge variant="outline" className="text-xs">
              {data.shanghai.session}
            </Badge>
          </div>
        </div>
        
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>USD/CNY: {data.exchangeRate.usdcny.toFixed(4)}</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {new Date(data.lastUpdated).toLocaleTimeString()}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function CryptoPerformanceCard({ 
  commodities 
}: { 
  commodities: Array<{ id: string; name: string; symbol: string; price: number; change: number; changePercent: number }>;
}) {
  const btc = commodities.find(c => c.id === 'bitcoin');
  const eth = commodities.find(c => c.id === 'ethereum');
  
  const cryptos = [btc, eth].filter(Boolean);
  
  if (cryptos.length === 0) {
    return (
      <Card className="bg-card/50">
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">Crypto data unavailable</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card/50">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-primary" />
          Crypto Performance (24h)
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0 space-y-3">
        {cryptos.map(crypto => crypto && (
          <div key={crypto.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold">{crypto.symbol}</span>
              <span className="text-xs text-muted-foreground">{crypto.name}</span>
            </div>
            <div className="text-right">
              <p className="font-mono font-semibold">${formatPrice(crypto.price)}</p>
              <div className="flex items-center gap-1 justify-end">
                <TrendIndicator value={crypto.changePercent} />
                <span className={cn(
                  "text-sm font-mono",
                  crypto.changePercent >= 0 ? "text-success" : "text-destructive"
                )}>
                  {formatPercent(crypto.changePercent)}
                </span>
              </div>
            </div>
          </div>
        ))}
        
        <div className="pt-2 text-xs text-muted-foreground">
          <p className="flex items-center gap-1">
            <Globe className="w-3 h-3" />
            Crypto markets operate 24/7 globally
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function MetalPerformanceCard({ 
  commodities 
}: { 
  commodities: Array<{ id: string; name: string; symbol: string; price: number; change: number; changePercent: number }>;
}) {
  const gold = commodities.find(c => c.id === 'gold');
  const silver = commodities.find(c => c.id === 'silver');
  
  const metals = [gold, silver].filter(Boolean);
  
  if (metals.length === 0) {
    return null;
  }

  return (
    <Card className="bg-card/50">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          Precious Metals Performance (24h)
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0 space-y-3">
        {metals.map(metal => metal && (
          <div key={metal.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold">{metal.symbol}</span>
              <span className="text-xs text-muted-foreground">{metal.name}</span>
            </div>
            <div className="text-right">
              <p className="font-mono font-semibold">${formatPrice(metal.price)}</p>
              <div className="flex items-center gap-1 justify-end">
                <TrendIndicator value={metal.changePercent} />
                <span className={cn(
                  "text-sm font-mono",
                  metal.changePercent >= 0 ? "text-success" : "text-destructive"
                )}>
                  {formatPercent(metal.changePercent)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function MarketInsightsDialog() {
  const [open, setOpen] = useState(false);
  const { data: goldData, isLoading: goldLoading, refetch: refetchGold } = useGoldSpread();
  const { data: silverData, isLoading: silverLoading, refetch: refetchSilver } = useSilverSpread();
  const { commodities, isLoading: pricesLoading, refetch: refetchPrices } = useLivePrices(60000);
  
  const currentSession = getCurrentSession();
  const isRefreshing = goldLoading || silverLoading || pricesLoading;

  const handleRefresh = () => {
    refetchGold();
    refetchSilver();
    refetchPrices();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          title="Market Insights"
        >
          <Info className="w-5 h-5 text-muted-foreground hover:text-primary transition-colors" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Info className="w-5 h-5 text-primary" />
            Market Insights
          </DialogTitle>
          <DialogDescription className="flex items-center justify-between">
            <span>Real-time market data and analysis</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="gap-1"
            >
              <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
              Refresh
            </Button>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Market Session */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-primary" />
                  <div>
                    <p className="font-semibold text-sm">{currentSession.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date().toLocaleString('en-US', { 
                        weekday: 'short', 
                        month: 'short', 
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        timeZoneName: 'short'
                      })}
                    </p>
                  </div>
                </div>
                <Badge variant={currentSession.isOpen ? "default" : "secondary"}>
                  {currentSession.isOpen ? 'ACTIVE' : 'CLOSED'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Shanghai vs COMEX Premiums */}
          <div>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary" />
              Shanghai vs COMEX Premium
            </h3>
            <div className="space-y-3">
              <PremiumCard 
                title="Gold (XAU)" 
                data={goldData} 
                isLoading={goldLoading}
                metalType="gold"
              />
              <PremiumCard 
                title="Silver (XAG)" 
                data={silverData} 
                isLoading={silverLoading}
                metalType="silver"
              />
            </div>
          </div>

          <Separator />

          {/* Metals Performance */}
          <div>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              Precious Metals Movement
            </h3>
            <MetalPerformanceCard commodities={commodities} />
          </div>

          <Separator />

          {/* Crypto Performance */}
          <div>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              Crypto Movement (BTC & ETH)
            </h3>
            <CryptoPerformanceCard commodities={commodities} />
          </div>

          {/* Data Sources */}
          <div className="text-xs text-muted-foreground pt-2 border-t">
            <p className="flex items-center gap-1 mb-1">
              <Info className="w-3 h-3" />
              Data Sources:
            </p>
            <ul className="list-disc list-inside space-y-0.5 text-[11px]">
              <li>COMEX Futures: Yahoo Finance (GC=F, SI=F)</li>
              <li>Shanghai Prices: Shanghai Gold Exchange (sge.com.cn)</li>
              <li>Crypto: CoinGecko API</li>
              <li>Exchange Rates: Yahoo Finance (CNY=X)</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
