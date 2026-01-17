import { useState, useEffect, useCallback } from 'react';
import { PricePoint } from '@/lib/tradingData';

interface UseHistoricalPricesOptions {
  assetId: string;
  category: 'metal' | 'crypto' | 'index';
  days: number;
  interval?: '1h' | '1d';
}

interface UseHistoricalPricesResult {
  priceHistory: PricePoint[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

// Cache for historical price data
const historicalCache: Map<string, { data: PricePoint[], timestamp: number }> = new Map();
const CACHE_DURATION = 60 * 1000; // 1 minute for more frequent updates

// Generate fallback hourly history
function generateHourlyFallback(assetId: string, currentPrice: number): PricePoint[] {
  const history: PricePoint[] = [];
  const now = Date.now();
  const volatility = assetId === 'bitcoin' || assetId === 'ethereum' ? 0.015 : 0.003;
  
  let price = currentPrice * (1 - volatility * 2);
  const trend = (currentPrice - price) / 24;
  
  for (let i = 24; i >= 0; i--) {
    const timestamp = now - i * 60 * 60 * 1000;
    const randomChange = (Math.random() - 0.5) * volatility * price;
    
    const open = price;
    const close = i === 0 ? currentPrice : price + trend + randomChange;
    const high = Math.max(open, close) * (1 + Math.random() * 0.002);
    const low = Math.min(open, close) * (1 - Math.random() * 0.002);
    
    history.push({
      timestamp,
      open,
      high,
      low,
      close: Math.max(close, 0.01),
      volume: Math.floor(Math.random() * 100000) + 50000,
    });
    
    price = close;
  }
  
  return history;
}

export function useHistoricalPrices({ 
  assetId, 
  category, 
  days, 
  interval = '1d' 
}: UseHistoricalPricesOptions): UseHistoricalPricesResult {
  const [priceHistory, setPriceHistory] = useState<PricePoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    const cacheKey = `${assetId}-${days}-${interval}`;
    const cached = historicalCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      setPriceHistory(cached.data);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-historical-prices?asset=${assetId}&category=${category}&days=${days}&interval=${interval}`,
        {
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`);
      }

      const result = await response.json();

      if (result.success && result.data) {
        const history: PricePoint[] = result.data.map((point: any) => ({
          timestamp: point.timestamp,
          open: point.open,
          high: point.high,
          low: point.low,
          close: point.close,
          volume: point.volume,
        }));

        historicalCache.set(cacheKey, { data: history, timestamp: Date.now() });
        setPriceHistory(history);
      } else {
        throw new Error(result.error || 'Invalid response');
      }
    } catch (err) {
      console.error(`Error fetching historical prices for ${assetId}:`, err);
      setError(err instanceof Error ? err.message : 'Failed to fetch');
      
      // Use fallback data
      if (interval === '1h') {
        const fallback = generateHourlyFallback(assetId, 100);
        setPriceHistory(fallback);
      }
    } finally {
      setIsLoading(false);
    }
  }, [assetId, category, days, interval]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    priceHistory,
    isLoading,
    error,
    refetch: fetchData,
  };
}
