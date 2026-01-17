import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CommodityData, PricePoint } from '@/lib/tradingData';
import { useToast } from '@/hooks/use-toast';

interface LivePriceData {
  id: string;
  name: string;
  symbol: string;
  category: 'metal' | 'crypto' | 'index';
  price: number;
  priceUnit: string;
  change: number;
  changePercent: number;
  high24h: number;
  low24h: number;
  volume: string;
  marketCap: string;
  lastUpdated: string;
}

// Cache for historical price data
const historicalCache: Map<string, { data: PricePoint[], timestamp: number }> = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Fetch real historical prices from edge function
async function fetchHistoricalPrices(assetId: string, category: string, days: number = 365): Promise<PricePoint[]> {
  const cacheKey = `${assetId}-${days}`;
  const cached = historicalCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  
  try {
    const { data, error } = await supabase.functions.invoke('fetch-historical-prices', {
      body: {},
      headers: {},
    });
    
    // Use query params via URL approach since invoke doesn't support query params well
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
    
    if (result.success && result.data) {
      const priceHistory: PricePoint[] = result.data.map((point: any) => ({
        timestamp: point.timestamp,
        open: point.open,
        high: point.high,
        low: point.low,
        close: point.close,
        volume: point.volume,
      }));
      
      historicalCache.set(cacheKey, { data: priceHistory, timestamp: Date.now() });
      return priceHistory;
    }
    
    throw new Error('Invalid response format');
  } catch (error) {
    console.error(`Error fetching historical prices for ${assetId}:`, error);
    // Return fallback generated data
    return generateFallbackHistory(assetId, category, days);
  }
}

// Generate fallback history with realistic price ranges
function generateFallbackHistory(assetId: string, category: string, days: number): PricePoint[] {
  const history: PricePoint[] = [];
  const now = Date.now();
  
  // Realistic starting prices and volatility (going back from current prices)
  const configs: Record<string, { current: number; yearAgo: number; volatility: number }> = {
    gold: { current: 4600, yearAgo: 2100, volatility: 0.01 },
    silver: { current: 90, yearAgo: 25, volatility: 0.015 },
    copper: { current: 0.40, yearAgo: 0.30, volatility: 0.02 },
    bitcoin: { current: 95000, yearAgo: 45000, volatility: 0.04 },
    ethereum: { current: 3300, yearAgo: 2500, volatility: 0.045 },
    nasdaq100: { current: 21500, yearAgo: 17000, volatility: 0.015 },
    sp500: { current: 5900, yearAgo: 5000, volatility: 0.012 },
  };
  
  const config = configs[assetId] || { current: 100, yearAgo: 80, volatility: 0.02 };
  
  let currentPrice = config.yearAgo;
  const dailyTrend = (config.current - config.yearAgo) / days;
  
  for (let i = days; i >= 0; i--) {
    const timestamp = now - i * 24 * 60 * 60 * 1000;
    const randomChange = (Math.random() - 0.5) * config.volatility * currentPrice;
    
    const open = currentPrice;
    const close = i === 0 ? config.current : currentPrice + dailyTrend + randomChange;
    const high = Math.max(open, close) * (1 + Math.random() * 0.015);
    const low = Math.min(open, close) * (1 - Math.random() * 0.015);
    
    history.push({
      timestamp,
      open,
      high,
      low,
      close: Math.max(close, 0.01),
      volume: Math.floor(Math.random() * 1000000) + 500000,
    });
    
    currentPrice = close;
  }
  
  return history;
}

export function useLivePrices(refreshInterval: number = 60000) {
  const [commodities, setCommodities] = useState<CommodityData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const { toast } = useToast();

  const fetchPrices = useCallback(async () => {
    try {
      const { data, error: fetchError } = await supabase.functions.invoke('fetch-prices');
      
      if (fetchError) {
        throw new Error(fetchError.message);
      }
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch prices');
      }
      
      const livePrices: LivePriceData[] = data.data;
      
      // Convert to CommodityData format with generated price history
      const commodityData: CommodityData[] = livePrices.map((item) => ({
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
        priceHistory: generateFallbackHistory(item.id, item.category, 365),
      }));
      
      setCommodities(commodityData);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch prices';
      console.error('Error fetching live prices:', errorMessage);
      setError(errorMessage);
      
      // Only show toast on first error
      if (!error) {
        toast({
          title: "Using simulated data",
          description: "Live prices unavailable. Showing simulated data.",
          variant: "default",
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [error, toast]);

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
