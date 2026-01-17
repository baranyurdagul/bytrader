import { useState, useMemo } from 'react';
import { Header } from '@/components/Header';
import { CommodityCard } from '@/components/CommodityCard';
import { SignalCard } from '@/components/SignalCard';
import { TrendMeter } from '@/components/TrendMeter';
import { TechnicalIndicatorsPanel } from '@/components/TechnicalIndicators';
import { PriceChart } from '@/components/PriceChart';
import { SignalHistory } from '@/components/SignalHistory';
import { 
  getCommodityData, 
  getTechnicalIndicators, 
  getSignal, 
  getTrendAnalysis,
  CommodityData 
} from '@/lib/tradingData';

const Index = () => {
  const [commodities] = useState<CommodityData[]>(() => getCommodityData());
  const [selectedCommodityId, setSelectedCommodityId] = useState('gold');
  
  const selectedCommodity = useMemo(() => 
    commodities.find(c => c.id === selectedCommodityId)!,
    [commodities, selectedCommodityId]
  );
  
  const indicators = useMemo(() => 
    getTechnicalIndicators(selectedCommodity.priceHistory),
    [selectedCommodity]
  );
  
  const signal = useMemo(() => 
    getSignal(indicators, selectedCommodity.price),
    [indicators, selectedCommodity.price]
  );
  
  const trend = useMemo(() => 
    getTrendAnalysis(selectedCommodity.priceHistory, selectedCommodity.price),
    [selectedCommodity]
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-6">
        {/* Commodity Selection */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-foreground mb-4">Commodities</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {commodities.map((commodity) => (
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
