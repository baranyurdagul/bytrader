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
  dataSource?: 'live' | 'simulated';
  dividendYield?: number;
  expenseRatio?: number;
}

// Cache for historical price data - persist across renders
const historicalCache: Map<string, { data: PricePoint[], timestamp: number, dataSource: 'live' | 'simulated' }> = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Fetch real historical prices from edge function
async function fetchHistoricalPrices(assetId: string, category: string, days: number = 365): Promise<{ data: PricePoint[], dataSource: 'live' | 'simulated' }> {
  const cacheKey = `${assetId}-${days}`;
  const cached = historicalCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return { data: cached.data, dataSource: cached.dataSource };
  }
  
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
      
      // Determine if data is from real API or generated
      const dataSource: 'live' | 'simulated' = priceHistory.length > 10 ? 'live' : 'simulated';
      
      historicalCache.set(cacheKey, { data: priceHistory, timestamp: Date.now(), dataSource });
      return { data: priceHistory, dataSource };
    }
    
    throw new Error('Invalid response format or empty data');
  } catch (error) {
    console.warn(`Using cached/fallback history for ${assetId}:`, error);
    // Return existing cache if available, even if expired
    if (cached) {
      return { data: cached.data, dataSource: cached.dataSource };
    }
    return { data: [], dataSource: 'simulated' };
  }
}

export function useLivePrices(refreshInterval: number = 60000) {
  const [commodities, setCommodities] = useState<CommodityData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const { toast } = useToast();
  const hasShownToast = useRef(false);
  const isFetching = useRef(false);

  const fetchPrices = useCallback(async () => {
    // Prevent concurrent fetches
    if (isFetching.current) return;
    isFetching.current = true;
    
    try {
      const { data, error: fetchError } = await supabase.functions.invoke('fetch-prices');
      
      if (fetchError) {
        throw new Error(fetchError.message);
      }
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch prices');
      }
      
      const livePrices: LivePriceData[] = data.data;
      
      // Fetch historical data for all assets in parallel
      const historicalPromises = livePrices.map(item => 
        fetchHistoricalPrices(item.id, item.category)
      );
      
      const historicalResults = await Promise.all(historicalPromises);
      
      // Convert to CommodityData format with real historical data
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
          dataSource: item.dataSource || histResult.dataSource,
          dividendYield: item.dividendYield,
          expenseRatio: item.expenseRatio,
        };
      });
      
      setCommodities(commodityData);
      setLastUpdated(new Date());
      setError(null);
      hasShownToast.current = false;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch prices';
      console.error('Error fetching live prices:', errorMessage);
      setError(errorMessage);
      
      // Only show toast once per error session
      if (!hasShownToast.current) {
        hasShownToast.current = true;
        toast({
          title: "Using cached data",
          description: "Live prices unavailable. Showing cached data.",
          variant: "default",
        });
      }
    } finally {
      setIsLoading(false);
      isFetching.current = false;
    }
  }, [toast]);

  useEffect(() => {
    // Initial fetch
    fetchPrices();
    
    // Set up interval for periodic updates
    const intervalId = setInterval(fetchPrices, refreshInterval);
    
    return () => clearInterval(intervalId);
  }, [fetchPrices, refreshInterval]);

  const refetch = useCallback(() => {
    setIsLoading(true);
    fetchPrices();
  }, [fetchPrices]);

  return {
    commodities,
    isLoading,
    error,
    lastUpdated,
    refetch,
  };
}
