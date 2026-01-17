import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { SignalCard } from '@/components/SignalCard';
import { TrendMeter } from '@/components/TrendMeter';
import { TechnicalIndicatorsPanel } from '@/components/TechnicalIndicators';
import { PriceChart } from '@/components/PriceChart';
import { SignalHistory } from '@/components/SignalHistory';
import { NewsFeed } from '@/components/NewsFeed';
import { useLivePrices } from '@/hooks/useLivePrices';
import { useWatchlist } from '@/hooks/useWatchlist';
import { useAuth } from '@/hooks/useAuth';
import { 
  getTechnicalIndicators, 
  getSignal, 
  getTrendAnalysis,
  getCommodityData 
} from '@/lib/tradingData';
import { ArrowLeft, RefreshCw, Star, TrendingUp, TrendingDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const AssetDetail = () => {
  const { assetId } = useParams<{ assetId: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { commodities: liveCommodities, isLoading, refetch } = useLivePrices(60000);
  const { isInWatchlist, toggleWatchlist } = useWatchlist();
  
  const commodities = liveCommodities.length > 0 ? liveCommodities : getCommodityData();
  
  const selectedCommodity = useMemo(() => 
    commodities.find(c => c.id === assetId),
    [commodities, assetId]
  );
  
  const indicators = useMemo(() => 
    selectedCommodity ? getTechnicalIndicators(selectedCommodity.priceHistory) : null,
    [selectedCommodity]
  );
  
  const signal = useMemo(() => 
    indicators && selectedCommodity ? getSignal(indicators, selectedCommodity.price, selectedCommodity.name) : null,
    [indicators, selectedCommodity]
  );
  
  const trend = useMemo(() => 
    selectedCommodity ? getTrendAnalysis(selectedCommodity.priceHistory, selectedCommodity.price) : null,
    [selectedCommodity]
  );

  if (!selectedCommodity) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-12 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Asset Not Found</h1>
          <p className="text-muted-foreground mb-6">The asset you're looking for doesn't exist.</p>
          <Button onClick={() => navigate('/')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </main>
      </div>
    );
  }

  if (!indicators || !signal || !trend) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading analysis...</p>
        </div>
      </div>
    );
  }

  const isPositive = selectedCommodity.change >= 0;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-6">
        {/* Back Button & Asset Header */}
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-xl bg-card border border-border">
            <div className="flex items-center gap-4">
              <div className="text-4xl">{selectedCommodity.id === 'gold' ? '🥇' : selectedCommodity.id === 'silver' ? '🥈' : selectedCommodity.id === 'platinum' ? '⚪' : selectedCommodity.category === 'crypto' ? '₿' : '📊'}</div>
              <div>
                <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                  {selectedCommodity.name}
                  <span className="text-sm font-normal text-muted-foreground">
                    {selectedCommodity.symbol}
                  </span>
                </h1>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-3xl font-mono font-bold text-foreground">
                    ${selectedCommodity.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className={cn(
                    "flex items-center gap-1 text-sm font-medium px-2 py-1 rounded-full",
                    isPositive ? "text-success bg-success/10" : "text-destructive bg-destructive/10"
                  )}>
                    {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    {isPositive ? '+' : ''}{selectedCommodity.change.toFixed(2)}%
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {isAuthenticated && (
                <Button
                  variant={isInWatchlist(selectedCommodity.id) ? "default" : "outline"}
                  onClick={() => toggleWatchlist({
                    asset_id: selectedCommodity.id,
                    asset_name: selectedCommodity.name,
                    asset_symbol: selectedCommodity.symbol,
                  })}
                  className="gap-2"
                >
                  <Star className={cn("w-4 h-4", isInWatchlist(selectedCommodity.id) && "fill-current")} />
                  {isInWatchlist(selectedCommodity.id) ? 'In Watchlist' : 'Add to Watchlist'}
                </Button>
              )}
              <Button 
                variant="ghost" 
                onClick={refetch}
                disabled={isLoading}
              >
                <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column - Signal & Trend */}
          <div className="lg:col-span-4 space-y-6">
            <SignalCard signal={signal} commodityName={selectedCommodity.name} />
            <TrendMeter trend={trend} />
            <SignalHistory commodityName={selectedCommodity.name} />
          </div>
          
          {/* Center Column - Chart */}
          <div className="lg:col-span-5 space-y-6">
            <PriceChart 
              priceHistory={selectedCommodity.priceHistory}
              indicators={indicators}
              commodityId={selectedCommodity.id}
            />
            
            {/* Quick Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="glass-card rounded-xl p-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">RSI</p>
                <p className="text-lg font-mono font-semibold text-foreground">
                  {indicators.rsi.toFixed(1)}
                </p>
              </div>
              <div className="glass-card rounded-xl p-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">MACD</p>
                <p className={`text-lg font-mono font-semibold ${indicators.macd.histogram > 0 ? 'text-success' : 'text-destructive'}`}>
                  {indicators.macd.histogram > 0 ? '+' : ''}{indicators.macd.histogram.toFixed(3)}
                </p>
              </div>
              <div className="glass-card rounded-xl p-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">ATR</p>
                <p className="text-lg font-mono font-semibold text-foreground">
                  ${indicators.atr.toFixed(2)}
                </p>
              </div>
              <div className="glass-card rounded-xl p-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">ADX</p>
                <p className="text-lg font-mono font-semibold text-foreground">
                  {indicators.adx.toFixed(1)}
                </p>
              </div>
            </div>

            {/* News Feed */}
            <NewsFeed assetName={selectedCommodity.name} assetSymbol={selectedCommodity.symbol} />
          </div>
          
          {/* Right Column - Technical Indicators */}
          <div className="lg:col-span-3">
            <h2 className="text-lg font-semibold text-foreground mb-4">Technical Analysis</h2>
            <div className="max-h-[calc(100vh-200px)] overflow-y-auto scrollbar-thin pr-2">
              <TechnicalIndicatorsPanel 
                indicators={indicators} 
                currentPrice={selectedCommodity.price}
              />
            </div>
          </div>
        </div>
        
        {/* Footer Note */}
        <footer className="mt-12 text-center">
          <p className="text-xs text-muted-foreground">
            Disclaimer: Trading signals are for educational purposes only. 
            Always conduct your own research before making investment decisions.
          </p>
        </footer>
      </main>
    </div>
  );
};

export default AssetDetail;
