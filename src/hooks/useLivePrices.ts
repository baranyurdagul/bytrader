import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CommodityData, PricePoint } from '@/lib/tradingData';
import { useToast } from '@/hooks/use-toast';

interface LivePriceData {
  id: string;
  name: string;
  symbol: string;
  category: 'metal' | 'crypto' | 'index' | 'etf';
  price: number;
  priceUnit: string;
  change: number;
  changePercent: number;
  high24h: number;
  low24h: number;
  volume: string;
  marketCap: string;
  lastUpdated: string;
  dataSource?: 'live' | 'cached' | 'unavailable';
  dividendYield?: number;
  expenseRatio?: number;
}

// Unified cache for all data - single source of truth
interface CacheEntry {
  prices: CommodityData[];
  timestamp: number;
}

let globalPriceCache: CacheEntry | null = null;
const CACHE_DURATION = 60 * 1000; // 1 minute

// Get source provider based on category
function getSourceProvider(category: string): string {
  return category === 'crypto' ? 'CoinGecko' : 'Yahoo Finance';
}

// Fetch historical prices for a specific asset
async function fetchHistoricalPrices(
  assetId: string, 
  category: string, 
  days: number = 365
): Promise<{ data: PricePoint[], dataSource: 'live' | 'unavailable', sourceProvider: string }> {
  const sourceProvider = getSourceProvider(category);
  
  try {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-historical-prices?asset=${assetId}&category=${category}&days=${days}`,
      {
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`Failed to fetch historical prices: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (result.success && result.data && result.data.length > 0) {
      const priceHistory: PricePoint[] = result.data.map((point: any) => ({
        timestamp: point.timestamp,
        open: point.open,
        high: point.high,
        low: point.low,
        close: point.close,
        volume: point.volume,
      }));
      
      return { 
        data: priceHistory, 
        dataSource: 'live', 
        sourceProvider 
      };
    }
    
    return { data: [], dataSource: 'unavailable', sourceProvider };
  } catch (error) {
    console.error(`Error fetching history for ${assetId}:`, error);
    return { data: [], dataSource: 'unavailable', sourceProvider };
  }
}

export interface DataFreshnessInfo {
  lastPriceUpdate: Date | null;
  lastHistoricalFetch: Date | null;
  sourceProviders: Map<string, string>;
  hasStaleData: boolean;
  hasMissingData: boolean;
}

export function useLivePrices(refreshInterval: number = 60000) {
  const [commodities, setCommodities] = useState<CommodityData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [dataFreshness, setDataFreshness] = useState<DataFreshnessInfo>({
    lastPriceUpdate: null,
    lastHistoricalFetch: null,
    sourceProviders: new Map(),
    hasStaleData: false,
    hasMissingData: false,
  });
  const { toast } = useToast();
  const hasShownToast = useRef(false);
  const isFetching = useRef(false);

  const fetchPrices = useCallback(async () => {
    // Prevent concurrent fetches
    if (isFetching.current) return;
    isFetching.current = true;
    
    try {
      // Check global cache first
      if (globalPriceCache && Date.now() - globalPriceCache.timestamp < CACHE_DURATION) {
        setCommodities(globalPriceCache.prices);
        setLastUpdated(new Date(globalPriceCache.timestamp));
        setIsLoading(false);
        isFetching.current = false;
        return;
      }

      const { data, error: fetchError } = await supabase.functions.invoke('fetch-prices');
      
      if (fetchError) {
        throw new Error(fetchError.message);
      }
      
      if (!data.success || !data.data || data.data.length === 0) {
        throw new Error(data.error || 'No price data available');
      }
      
      const livePrices: LivePriceData[] = data.data;
      
      // Fetch historical data for all assets in parallel
      const historicalPromises = livePrices.map(item => 
        fetchHistoricalPrices(item.id, item.category)
      );
      
      const historicalResults = await Promise.all(historicalPromises);
      
      // Build source providers map and track data quality
      const newSourceProviders = new Map<string, string>();
      let hasStaleData = false;
      let hasMissingData = false;
      
      historicalResults.forEach((histResult, index) => {
        const assetId = livePrices[index].id;
        newSourceProviders.set(assetId, histResult.sourceProvider);
        if (histResult.dataSource === 'unavailable') {
          hasMissingData = true;
        }
      });
      
      // Check for stale/cached price data
      livePrices.forEach(item => {
        if (item.dataSource === 'cached') {
          hasStaleData = true;
        } else if (item.dataSource === 'unavailable') {
          hasMissingData = true;
        }
      });
      
      // Convert to CommodityData format
      const commodityData: CommodityData[] = livePrices.map((item, index) => {
        const histResult = historicalResults[index];
        
        return {
          id: item.id,
          name: item.name,
          symbol: item.symbol,
          category: item.category,
          price: item.price,
          priceUnit: item.priceUnit,
          change: item.change,
          changePercent: item.changePercent,
          high24h: item.high24h,
          low24h: item.low24h,
          volume: item.volume,
          marketCap: item.marketCap,
          priceHistory: histResult.data,
          dataSource: item.dataSource || 'live',
          sourceProvider: histResult.sourceProvider,
          dividendYield: item.dividendYield,
          expenseRatio: item.expenseRatio,
        };
      });
      
      const now = new Date();
      
      // Update global cache
      globalPriceCache = {
        prices: commodityData,
        timestamp: now.getTime(),
      };
      
      setCommodities(commodityData);
      setLastUpdated(now);
      setDataFreshness({
        lastPriceUpdate: now,
        lastHistoricalFetch: now,
        sourceProviders: newSourceProviders,
        hasStaleData,
        hasMissingData,
      });
      setError(null);
      hasShownToast.current = false;
      
      // Show warning if data quality issues
      if (hasMissingData && !hasShownToast.current) {
        hasShownToast.current = true;
        toast({
          title: "Some data unavailable",
          description: "Unable to fetch all price data. Some assets may show stale values.",
          variant: "default",
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch prices';
      console.error('Error fetching live prices:', errorMessage);
      setError(errorMessage);
      
      // Use cached data if available
      if (globalPriceCache) {
        setCommodities(globalPriceCache.prices);
        setDataFreshness(prev => ({ ...prev, hasStaleData: true }));
      }
      
      if (!hasShownToast.current) {
        hasShownToast.current = true;
        toast({
          title: "Connection issue",
          description: "Unable to fetch live prices. Showing cached data.",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
      isFetching.current = false;
    }
  }, [toast]);

  useEffect(() => {
    fetchPrices();
    
    const intervalId = setInterval(fetchPrices, refreshInterval);
    
    return () => clearInterval(intervalId);
  }, [fetchPrices, refreshInterval]);

  const refetch = useCallback(() => {
    // Clear cache to force fresh fetch
    globalPriceCache = null;
    setIsLoading(true);
    fetchPrices();
  }, [fetchPrices]);

  return {
    commodities,
    isLoading,
    error,
    lastUpdated,
    dataFreshness,
    refetch,
  };
}
