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

// Generate price history from current price - extended to 365 days for yearly view
function generatePriceHistory(basePrice: number, volatility: number, days: number = 365): PricePoint[] {
  const history: PricePoint[] = [];
  let currentPrice = basePrice * (0.85 + Math.random() * 0.15);
  const now = Date.now();
  
  for (let i = days; i >= 0; i--) {
    const timestamp = now - i * 24 * 60 * 60 * 1000;
    const dailyChange = (Math.random() - 0.5) * volatility * currentPrice;
    const open = currentPrice;
    const close = i === 0 ? basePrice : currentPrice + dailyChange;
    const high = Math.max(open, close) * (1 + Math.random() * 0.02);
    const low = Math.min(open, close) * (1 - Math.random() * 0.02);
    const volume = Math.floor(Math.random() * 1000000) + 500000;
    
    history.push({ timestamp, open, high, low, close, volume });
    currentPrice = close;
  }
  
  return history;
}

function getVolatility(category: string, id: string): number {
  if (category === 'crypto') return 0.04;
  if (category === 'metal') {
    if (id === 'gold') return 0.015;
    if (id === 'silver') return 0.025;
    return 0.02;
  }
  if (category === 'index') return 0.015;
  return 0.02;
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
        priceHistory: generatePriceHistory(item.price, getVolatility(item.category, item.id)),
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
