import { useState, useMemo } from 'react';
import { Header } from '@/components/Header';
import { CommodityCard } from '@/components/CommodityCard';
import { SignalCard } from '@/components/SignalCard';
import { TrendMeter } from '@/components/TrendMeter';
import { TechnicalIndicatorsPanel } from '@/components/TechnicalIndicators';
import { PriceChart } from '@/components/PriceChart';
import { SignalHistory } from '@/components/SignalHistory';
import { useLivePrices } from '@/hooks/useLivePrices';
import { 
  getTechnicalIndicators, 
  getSignal, 
  getTrendAnalysis,
  getCommodityData 
} from '@/lib/tradingData';
import { RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const Index = () => {
  const { commodities: liveCommodities, isLoading, error, lastUpdated, refetch } = useLivePrices(60000);
  const [selectedCommodityId, setSelectedCommodityId] = useState('gold');
  
  // Fall back to simulated data if live data is not available
  const commodities = liveCommodities.length > 0 ? liveCommodities : getCommodityData();
  
  const selectedCommodity = useMemo(() => 
    commodities.find(c => c.id === selectedCommodityId) || commodities[0],
    [commodities, selectedCommodityId]
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

  // Group commodities by category
  const metalAssets = commodities.filter(c => c.category === 'metal');
  const cryptoAssets = commodities.filter(c => c.category === 'crypto');
  const indexAssets = commodities.filter(c => c.category === 'index');

  if (!selectedCommodity || !indicators || !signal || !trend) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading market data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-6">
        {/* Connection Status Bar */}
        <div className="flex items-center justify-between mb-6 p-3 rounded-lg bg-card border border-border">
          <div className="flex items-center gap-3">
            {error ? (
              <>
                <WifiOff className="w-4 h-4 text-warning" />
                <span className="text-sm text-muted-foreground">
                  Using simulated data
                </span>
              </>
            ) : (
              <>
                <Wifi className="w-4 h-4 text-success" />
                <span className="text-sm text-muted-foreground">
                  Live prices {lastUpdated && `• Updated ${lastUpdated.toLocaleTimeString()}`}
                </span>
              </>
            )}
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={refetch}
            disabled={isLoading}
            className="gap-2"
          >
            <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
            Refresh
          </Button>
        </div>

        {/* Metals Section */}
        <section className="mb-6">
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            🏆 Precious Metals <span className="text-xs text-muted-foreground font-normal">(price per troy ounce)</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {metalAssets.map((commodity) => (
              <CommodityCard
                key={commodity.id}
                commodity={commodity}
                isSelected={commodity.id === selectedCommodityId}
                onClick={() => setSelectedCommodityId(commodity.id)}
              />
            ))}
          </div>
        </section>

        {/* Crypto Section */}
        <section className="mb-6">
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            ₿ Cryptocurrencies
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {cryptoAssets.map((commodity) => (
              <CommodityCard
                key={commodity.id}
                commodity={commodity}
                isSelected={commodity.id === selectedCommodityId}
                onClick={() => setSelectedCommodityId(commodity.id)}
              />
            ))}
          </div>
        </section>

        {/* Indices Section */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            📊 Stock Indices
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {indexAssets.map((commodity) => (
              <CommodityCard
                key={commodity.id}
                commodity={commodity}
                isSelected={commodity.id === selectedCommodityId}
                onClick={() => setSelectedCommodityId(commodity.id)}
              />
            ))}
          </div>
        </section>
        
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

export default Index;
