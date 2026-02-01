import { useState, useMemo, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { CommodityCard, PriceUnit } from '@/components/CommodityCard';
import { CompactAssetRow } from '@/components/CompactAssetRow';
import { MarketOverview } from '@/components/MarketOverview';
import { AddAlertDialog } from '@/components/AddAlertDialog';
import { AlertsList } from '@/components/AlertsList';
import { DataFreshnessIndicator } from '@/components/DataFreshnessIndicator';
import { useLivePrices } from '@/hooks/useLivePrices';
import { usePriceAlerts } from '@/hooks/usePriceAlerts';
import { useWatchlist } from '@/hooks/useWatchlist';
import { useAuth } from '@/hooks/useAuth';
import { getCommodityData } from '@/lib/tradingData';
import { RefreshCw, Wifi, WifiOff, Bell, BellRing, Scale, Star, TrendingUp, Grid3X3, List, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

const Index = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { commodities: liveCommodities, isLoading, error, lastUpdated, dataFreshness, refetch, forceRefresh } = useLivePrices(60000);
  const { 
    alerts, 
    addAlert, 
    deleteAlert, 
    toggleAlert, 
    checkAlerts,
    requestNotificationPermission,
    activeAlertsCount 
  } = usePriceAlerts();
  const { watchlist, isInWatchlist, toggleWatchlist } = useWatchlist();
  const [showAlerts, setShowAlerts] = useState(false);
  const [metalPriceUnit, setMetalPriceUnit] = useState<PriceUnit>('oz');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [activeCategory, setActiveCategory] = useState('all');
  
  // Fall back to simulated data if live data is not available
  const commodities = liveCommodities.length > 0 ? liveCommodities : getCommodityData();

  // Create price map for alert checking
  const currentPrices = useMemo(() => {
    const prices: Record<string, number> = {};
    commodities.forEach(c => {
      prices[c.id] = c.price;
    });
    return prices;
  }, [commodities]);

  // Check alerts whenever prices update
  useEffect(() => {
    if (isAuthenticated && Object.keys(currentPrices).length > 0) {
      checkAlerts(currentPrices);
    }
  }, [currentPrices, checkAlerts, isAuthenticated]);

  // Group commodities by category
  const metalAssets = commodities.filter(c => c.category === 'metal');
  const cryptoAssets = commodities.filter(c => c.category === 'crypto');
  const indexAssets = commodities.filter(c => c.category === 'index');
  const etfAssets = commodities.filter(c => c.category === 'etf');
  
  // Get watchlist commodities
  const watchlistCommodities = useMemo(() => {
    return watchlist
      .map(item => commodities.find(c => c.id === item.asset_id))
      .filter(Boolean);
  }, [watchlist, commodities]);

  // Filter commodities based on active category
  const filteredCommodities = useMemo(() => {
    switch (activeCategory) {
      case 'metals': return metalAssets;
      case 'crypto': return cryptoAssets;
      case 'indices': return indexAssets;
      case 'etfs': return etfAssets;
      case 'watchlist': return watchlistCommodities;
      default: return commodities;
    }
  }, [activeCategory, commodities, metalAssets, cryptoAssets, indexAssets, etfAssets, watchlistCommodities]);

  const handleAssetClick = (assetId: string) => {
    navigate(`/asset/${assetId}`);
  };

  return (
    <Layout>
      <main className="container mx-auto px-4 py-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-primary" />
              Market Dashboard
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Real-time prices • Click any asset for details
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            {/* Connection Status */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card border border-border">
              {error ? (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-warning" />
                  <span className="text-xs text-muted-foreground">Simulated</span>
                </>
              ) : (
                <>
                  <Wifi className="w-3.5 h-3.5 text-success" />
                  <span className="text-xs text-muted-foreground">Live</span>
                  {commodities.length > 0 && (
                    <DataFreshnessIndicator
                      lastUpdated={dataFreshness.lastPriceUpdate}
                      historicalFetchedAt={dataFreshness.lastHistoricalFetch}
                      dataSource={commodities[0]?.dataSource || 'live'}
                      sourceProvider="Yahoo Finance / CoinGecko"
                      className="text-xs"
                    />
                  )}
                </>
              )}
            </div>
            
            {isAuthenticated && (
              <>
                <Button
                  variant={showAlerts ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowAlerts(!showAlerts)}
                  className="gap-1.5 text-xs"
                >
                  {activeAlertsCount > 0 ? (
                    <BellRing className="w-3.5 h-3.5" />
                  ) : (
                    <Bell className="w-3.5 h-3.5" />
                  )}
                  {activeAlertsCount > 0 && (
                    <span className="px-1.5 py-0.5 text-xs rounded-full bg-primary-foreground text-primary">
                      {activeAlertsCount}
                    </span>
                  )}
                </Button>
                <AddAlertDialog 
                  commodities={commodities} 
                  onAddAlert={addAlert}
                />
              </>
            )}
            
            {!isAuthenticated && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigate('/auth')}
                className="gap-1.5 text-xs"
              >
                <Star className="w-3.5 h-3.5" />
                Sign in
              </Button>
            )}
            
            <Button 
              variant="ghost" 
              size="icon"
              onClick={refetch}
              disabled={isLoading}
              title="Refresh prices"
              className="h-8 w-8"
            >
              <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
            </Button>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={forceRefresh}
              disabled={isLoading}
              title="Force refresh - clears all caches"
              className="gap-1.5 text-xs"
            >
              <RotateCcw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />
              Force
            </Button>
          </div>
        </div>

        {/* Market Overview Cards */}
        <MarketOverview commodities={commodities} />

        {/* Alerts Panel */}
        {showAlerts && isAuthenticated && (
          <div className="mb-6 p-4 rounded-xl bg-card border border-border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary" />
                Price Alerts
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={requestNotificationPermission}
                className="text-xs"
              >
                Enable Push Notifications
              </Button>
            </div>
            <AlertsList
              alerts={alerts}
              onDelete={deleteAlert}
              onToggle={toggleAlert}
              currentPrices={currentPrices}
            />
          </div>
        )}

        {/* Category Tabs & View Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <Tabs value={activeCategory} onValueChange={setActiveCategory} className="w-full sm:w-auto">
            <TabsList className="bg-card border border-border h-9">
              <TabsTrigger value="all" className="text-xs px-3">All</TabsTrigger>
              <TabsTrigger value="metals" className="text-xs px-3">🏆 Metals</TabsTrigger>
              <TabsTrigger value="crypto" className="text-xs px-3">₿ Crypto</TabsTrigger>
              <TabsTrigger value="indices" className="text-xs px-3">📊 Indices</TabsTrigger>
              <TabsTrigger value="etfs" className="text-xs px-3">📈 ETFs</TabsTrigger>
              {isAuthenticated && watchlist.length > 0 && (
                <TabsTrigger value="watchlist" className="text-xs px-3">
                  <Star className="w-3 h-3 mr-1 fill-current text-yellow-500" />
                  Watchlist
                </TabsTrigger>
              )}
            </TabsList>
          </Tabs>
          
          <div className="flex items-center gap-2">
            {activeCategory === 'metals' && (
              <div className="flex items-center gap-2 mr-2">
                <Scale className="w-4 h-4 text-muted-foreground" />
                <ToggleGroup
                  type="single"
                  value={metalPriceUnit}
                  onValueChange={(value) => value && setMetalPriceUnit(value as PriceUnit)}
                  className="bg-muted rounded-lg p-0.5"
                >
                  <ToggleGroupItem 
                    value="oz" 
                    className="text-xs px-2 py-1 h-7 data-[state=on]:bg-background data-[state=on]:text-foreground"
                  >
                    /oz
                  </ToggleGroupItem>
                  <ToggleGroupItem 
                    value="gram" 
                    className="text-xs px-2 py-1 h-7 data-[state=on]:bg-background data-[state=on]:text-foreground"
                  >
                    /g
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
            )}
            
            <ToggleGroup
              type="single"
              value={viewMode}
              onValueChange={(value) => value && setViewMode(value as 'grid' | 'list')}
              className="bg-muted rounded-lg p-0.5"
            >
              <ToggleGroupItem 
                value="list" 
                className="px-2 py-1 h-7 data-[state=on]:bg-background"
                title="List view"
              >
                <List className="w-4 h-4" />
              </ToggleGroupItem>
              <ToggleGroupItem 
                value="grid" 
                className="px-2 py-1 h-7 data-[state=on]:bg-background"
                title="Grid view"
              >
                <Grid3X3 className="w-4 h-4" />
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>

        {/* Assets Display */}
        {viewMode === 'list' ? (
          <div className="space-y-2">
            {filteredCommodities.map((commodity) => commodity && (
              <CompactAssetRow
                key={commodity.id}
                commodity={commodity}
                onClick={() => handleAssetClick(commodity.id)}
                priceUnit={commodity.category === 'metal' ? metalPriceUnit : 'oz'}
                isInWatchlist={isInWatchlist(commodity.id)}
                onToggleWatchlist={() => toggleWatchlist({
                  asset_id: commodity.id,
                  asset_name: commodity.name,
                  asset_symbol: commodity.symbol,
                })}
                showWatchlistButton={isAuthenticated}
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCommodities.map((commodity) => commodity && (
              <CommodityCard
                key={commodity.id}
                commodity={commodity}
                isSelected={false}
                onClick={() => handleAssetClick(commodity.id)}
                priceUnit={commodity.category === 'metal' ? metalPriceUnit : 'oz'}
                isInWatchlist={isInWatchlist(commodity.id)}
                onToggleWatchlist={() => toggleWatchlist({
                  asset_id: commodity.id,
                  asset_name: commodity.name,
                  asset_symbol: commodity.symbol,
                })}
                showWatchlistButton={isAuthenticated}
              />
            ))}
          </div>
        )}

        {/* Empty State */}
        {filteredCommodities.length === 0 && activeCategory === 'watchlist' && (
          <div className="p-12 rounded-xl bg-card border border-border text-center">
            <Star className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-2">Your watchlist is empty</p>
            <p className="text-sm text-muted-foreground">
              Click the star icon on any asset to add it to your watchlist
            </p>
          </div>
        )}
        
        {/* Footer Note */}
        <footer className="mt-12 text-center">
          <p className="text-xs text-muted-foreground">
            Disclaimer: Trading signals are for educational purposes only. 
            Always conduct your own research before making investment decisions.
          </p>
        </footer>
      </main>
    </Layout>
  );
};

export default Index;
