import { useState, useMemo, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { CommodityCard, PriceUnit } from '@/components/CommodityCard';
import { AddAlertDialog } from '@/components/AddAlertDialog';
import { AlertsList } from '@/components/AlertsList';
import { useLivePrices } from '@/hooks/useLivePrices';
import { usePriceAlerts } from '@/hooks/usePriceAlerts';
import { useWatchlist } from '@/hooks/useWatchlist';
import { useAuth } from '@/hooks/useAuth';
import { getCommodityData } from '@/lib/tradingData';
import { RefreshCw, Wifi, WifiOff, Bell, BellRing, Scale, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

const Index = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { commodities: liveCommodities, isLoading, error, lastUpdated, refetch } = useLivePrices(60000);
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
  const [showWatchlist, setShowWatchlist] = useState(false);
  const [metalPriceUnit, setMetalPriceUnit] = useState<PriceUnit>('oz');
  
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

  const handleAssetClick = (assetId: string) => {
    navigate(`/asset/${assetId}`);
  };

  return (
    <Layout>
      
      <main className="container mx-auto px-4 py-6">
        {/* Connection Status Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 p-3 rounded-lg bg-card border border-border">
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
          <div className="flex flex-wrap items-center gap-2">
            {isAuthenticated && (
              <>
                <Button
                  variant={showWatchlist ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowWatchlist(!showWatchlist)}
                  className="gap-1.5 text-xs sm:text-sm"
                >
                  <Star className={cn("w-3.5 h-3.5 sm:w-4 sm:h-4", showWatchlist && "fill-current")} />
                  <span className="hidden xs:inline">Watchlist</span>
                  <span className="xs:hidden">Watch</span>
                  {watchlist.length > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-primary-foreground text-primary">
                      {watchlist.length}
                    </span>
                  )}
                </Button>
                <Button
                  variant={showAlerts ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowAlerts(!showAlerts)}
                  className="gap-1.5 text-xs sm:text-sm"
                >
                  {activeAlertsCount > 0 ? (
                    <BellRing className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  ) : (
                    <Bell className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  )}
                  Alerts
                  {activeAlertsCount > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-primary-foreground text-primary">
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
                className="gap-2"
              >
                <Star className="w-4 h-4" />
                Sign in for Watchlist
              </Button>
            )}
            <Button 
              variant="ghost" 
              size="icon"
              onClick={refetch}
              disabled={isLoading}
              title="Refresh prices"
            >
              <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
            </Button>
          </div>
        </div>

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

        {/* Watchlist Section */}
        {showWatchlist && isAuthenticated && (
          <section className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Star className="w-5 h-5 text-yellow-500 fill-current" />
              <h2 className="text-lg font-semibold text-foreground">My Watchlist</h2>
            </div>
            {watchlistCommodities.length === 0 ? (
              <div className="p-6 rounded-xl bg-card border border-border text-center">
                <Star className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-2">Your watchlist is empty</p>
                <p className="text-sm text-muted-foreground">
                  Click the star icon on any asset to add it to your watchlist
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {watchlistCommodities.map((commodity) => commodity && (
                  <CommodityCard
                    key={commodity.id}
                    commodity={commodity}
                    isSelected={false}
                    onClick={() => handleAssetClick(commodity.id)}
                    priceUnit={commodity.category === 'metal' ? metalPriceUnit : 'oz'}
                    isInWatchlist={true}
                    onToggleWatchlist={() => toggleWatchlist({
                      asset_id: commodity.id,
                      asset_name: commodity.name,
                      asset_symbol: commodity.symbol,
                    })}
                    showWatchlistButton={true}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {/* Hero Section */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Market Dashboard</h1>
          <p className="text-muted-foreground">
            Select an asset to view detailed analysis, charts, and trading signals
          </p>
        </div>

        {/* Metals Section */}
        <section className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              🏆 Precious Metals
            </h2>
            <div className="flex items-center gap-2">
              <Scale className="w-4 h-4 text-muted-foreground" />
              <ToggleGroup
                type="single"
                value={metalPriceUnit}
                onValueChange={(value) => value && setMetalPriceUnit(value as PriceUnit)}
                className="bg-muted rounded-lg p-1"
              >
                <ToggleGroupItem 
                  value="oz" 
                  className="text-xs px-3 py-1 data-[state=on]:bg-background data-[state=on]:text-foreground"
                >
                  per troy oz
                </ToggleGroupItem>
                <ToggleGroupItem 
                  value="gram" 
                  className="text-xs px-3 py-1 data-[state=on]:bg-background data-[state=on]:text-foreground"
                >
                  per gram
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {metalAssets.map((commodity) => (
              <CommodityCard
                key={commodity.id}
                commodity={commodity}
                isSelected={false}
                onClick={() => handleAssetClick(commodity.id)}
                priceUnit={metalPriceUnit}
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
                isSelected={false}
                onClick={() => handleAssetClick(commodity.id)}
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
        </section>

        {/* Indices Section */}
        <section className="mb-6">
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            📊 Stock Indices
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {indexAssets.map((commodity) => (
              <CommodityCard
                key={commodity.id}
                commodity={commodity}
                isSelected={false}
                onClick={() => handleAssetClick(commodity.id)}
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
        </section>

        {/* ETFs Section */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            📈 ETFs
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {etfAssets.map((commodity) => (
              <CommodityCard
                key={commodity.id}
                commodity={commodity}
                isSelected={false}
                onClick={() => handleAssetClick(commodity.id)}
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
        </section>
        
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
