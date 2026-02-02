import { useState } from 'react';
import { Info, TrendingUp, TrendingDown, Minus, RefreshCw, Clock, Globe, BarChart3, Sun, Moon } from 'lucide-react';
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

// Market session times (UTC) - approximate main trading hours
const MARKET_SESSIONS = {
  china: { 
    open: 1.5, // 9:30 AM CST = 1:30 UTC
    close: 7.5, // 3:30 PM CST = 7:30 UTC  
    label: 'China Market',
    flag: '🇨🇳',
    timezone: 'CST (UTC+8)'
  },
  us: { 
    open: 14.5, // 9:30 AM EST = 14:30 UTC
    close: 21, // 4:00 PM EST = 21:00 UTC
    label: 'US Market',
    flag: '🇺🇸',
    timezone: 'EST (UTC-5)'
  },
};

interface MarketStatus {
  isOpen: boolean;
  label: string;
  flag: string;
  nextEvent: string;
  localTime: string;
  hoursOpen?: number;
}

function getMarketStatus(market: 'china' | 'us'): MarketStatus {
  const now = new Date();
  const utcHour = now.getUTCHours() + now.getUTCMinutes() / 60;
  const session = MARKET_SESSIONS[market];
  
  const isOpen = utcHour >= session.open && utcHour < session.close;
  
  // Calculate next event
  let nextEvent = '';
  let hoursOpen = 0;
  
  if (isOpen) {
    hoursOpen = utcHour - session.open;
    const hoursToClose = session.close - utcHour;
    if (hoursToClose < 1) {
      nextEvent = `Closes in ${Math.round(hoursToClose * 60)}m`;
    } else {
      nextEvent = `Closes in ${Math.floor(hoursToClose)}h ${Math.round((hoursToClose % 1) * 60)}m`;
    }
  } else {
    let hoursToOpen = session.open - utcHour;
    if (hoursToOpen < 0) hoursToOpen += 24;
    if (hoursToOpen < 1) {
      nextEvent = `Opens in ${Math.round(hoursToOpen * 60)}m`;
    } else {
      nextEvent = `Opens in ${Math.floor(hoursToOpen)}h`;
    }
  }
  
  // Get local time for that market
  const localTime = market === 'china' 
    ? now.toLocaleString('en-US', { timeZone: 'Asia/Shanghai', hour: '2-digit', minute: '2-digit', hour12: true })
    : now.toLocaleString('en-US', { timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit', hour12: true });
  
  return { isOpen, label: session.label, flag: session.flag, nextEvent, localTime, hoursOpen };
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

function MarketStatusCard({ market }: { market: 'china' | 'us' }) {
  const status = getMarketStatus(market);
  
  return (
    <Card className={cn(
      "bg-card/50 flex-1",
      status.isOpen ? "border-success/30" : "border-muted"
    )}>
      <CardContent className="p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">{status.flag}</span>
            <span className="font-semibold text-sm">{status.label}</span>
          </div>
          <Badge 
            variant={status.isOpen ? "default" : "secondary"}
            className={cn("text-xs", status.isOpen && "bg-success text-success-foreground")}
          >
            {status.isOpen ? 'OPEN' : 'CLOSED'}
          </Badge>
        </div>
        <div className="text-xs text-muted-foreground space-y-1">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>Local: {status.localTime}</span>
          </div>
          <div className="flex items-center gap-1">
            {status.isOpen ? <Sun className="w-3 h-3 text-amber-500" /> : <Moon className="w-3 h-3" />}
            <span>{status.nextEvent}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
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
            <p className="text-muted-foreground text-xs">COMEX 🇺🇸</p>
            <p className="font-mono font-semibold">${formatPrice(data.comex.price)}</p>
            <p className={cn(
              "text-xs",
              data.comex.changePercent >= 0 ? "text-success" : "text-destructive"
            )}>
              {formatPercent(data.comex.changePercent)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Shanghai 🇨🇳</p>
            <p className="font-mono font-semibold">${formatPrice(data.shanghai.priceUSD)}</p>
            <p className="text-xs text-muted-foreground">
              {metalType === 'gold' ? `¥${formatPrice(data.shanghai.priceCNY)}/g` : `¥${formatPrice(data.shanghai.priceCNY, 0)}/kg`}
            </p>
          </div>
        </div>
        
        <Separator />
        
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted-foreground text-xs">Shanghai Premium</p>
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
            <p className="text-muted-foreground text-xs">SGE Session</p>
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

function AssetRow({ symbol, name, changePercent }: { symbol: string; name: string; changePercent: number }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <div className="flex items-center gap-2">
        <span className="font-semibold text-sm">{symbol}</span>
        <span className="text-xs text-muted-foreground">{name}</span>
      </div>
      <div className="flex items-center gap-2">
        <TrendIndicator value={changePercent} />
        <span className={cn(
          "text-sm font-mono font-semibold",
          changePercent >= 0 ? "text-success" : "text-destructive"
        )}>
          {formatPercent(changePercent)}
        </span>
      </div>
    </div>
  );
}

function SessionMovementCard({ 
  commodities,
  goldData,
  silverData
}: { 
  commodities: Array<{ id: string; name: string; symbol: string; price: number; change: number; changePercent: number }>;
  goldData: GoldSpreadData | null;
  silverData: SilverSpreadData | null;
}) {
  const chinaStatus = getMarketStatus('china');
  const usStatus = getMarketStatus('us');
  
  const btc = commodities.find(c => c.id === 'bitcoin');
  const eth = commodities.find(c => c.id === 'ethereum');
  const gold = commodities.find(c => c.id === 'gold');
  const silver = commodities.find(c => c.id === 'silver');

  const assets = [
    { id: 'gold', name: 'Gold', symbol: 'XAU', changePercent: goldData?.comex.changePercent ?? gold?.changePercent ?? 0 },
    { id: 'silver', name: 'Silver', symbol: 'XAG', changePercent: silverData?.comex.changePercent ?? silver?.changePercent ?? 0 },
    { id: 'btc', name: 'Bitcoin', symbol: 'BTC', changePercent: btc?.changePercent ?? 0 },
    { id: 'eth', name: 'Ethereum', symbol: 'ETH', changePercent: eth?.changePercent ?? 0 },
  ];

  return (
    <div className="space-y-4">
      {/* After China Market Opening */}
      <Card className={cn(
        "bg-card/50 border-l-4",
        chinaStatus.isOpen ? "border-l-amber-500" : "border-l-muted"
      )}>
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">🇨🇳</span>
              <span>After China Market Opening</span>
            </div>
            {chinaStatus.isOpen ? (
              <Badge className="bg-amber-500 text-white text-xs">LIVE</Badge>
            ) : (
              <Badge variant="secondary" className="text-xs">
                {chinaStatus.nextEvent}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="space-y-1">
            {assets.map(asset => (
              <AssetRow key={`china-${asset.id}`} {...asset} />
            ))}
          </div>
          {chinaStatus.isOpen && (
            <div className="mt-3 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Open for {chinaStatus.hoursOpen?.toFixed(1)}h — {chinaStatus.nextEvent}
            </div>
          )}
        </CardContent>
      </Card>

      {/* After US Market Opening */}
      <Card className={cn(
        "bg-card/50 border-l-4",
        usStatus.isOpen ? "border-l-blue-500" : "border-l-muted"
      )}>
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">🇺🇸</span>
              <span>After US Market Opening</span>
            </div>
            {usStatus.isOpen ? (
              <Badge className="bg-blue-500 text-white text-xs">LIVE</Badge>
            ) : (
              <Badge variant="secondary" className="text-xs">
                {usStatus.nextEvent}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="space-y-1">
            {assets.map(asset => (
              <AssetRow key={`us-${asset.id}`} {...asset} />
            ))}
          </div>
          {usStatus.isOpen && (
            <div className="mt-3 text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Open for {usStatus.hoursOpen?.toFixed(1)}h — {usStatus.nextEvent}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="text-[11px] text-muted-foreground">
        <p>💡 24h change shown. Crypto trades 24/7; metals follow exchange hours.</p>
      </div>
    </div>
  );
}

export function MarketInsightsDialog() {
  const [open, setOpen] = useState(false);
  const { data: goldData, isLoading: goldLoading, refetch: refetchGold } = useGoldSpread();
  const { data: silverData, isLoading: silverLoading, refetch: refetchSilver } = useSilverSpread();
  const { commodities, isLoading: pricesLoading, refetch: refetchPrices } = useLivePrices(60000);
  
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
          {/* Market Status - China & US */}
          <div>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Globe className="w-4 h-4 text-primary" />
              Market Status
            </h3>
            <div className="flex gap-3">
              <MarketStatusCard market="china" />
              <MarketStatusCard market="us" />
            </div>
          </div>

          <Separator />

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

          {/* Session-Based Movement */}
          <div>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              Session Movement
            </h3>
            <SessionMovementCard 
              commodities={commodities}
              goldData={goldData}
              silverData={silverData}
            />
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
