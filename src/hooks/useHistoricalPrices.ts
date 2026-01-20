import { useState, useEffect, useCallback, useRef } from 'react';
import { PricePoint } from '@/lib/tradingData';

interface UseHistoricalPricesOptions {
  assetId: string;
  category: 'metal' | 'crypto' | 'index' | 'etf';
  days: number;
  interval?: '1h' | '1d';
}

interface UseHistoricalPricesResult {
  priceHistory: PricePoint[];
  isLoading: boolean;
  error: string | null;
  dataSource: 'live' | 'unavailable';
  refetch: () => void;
}

// Unified cache - shared with useLivePrices conceptually
const historicalCache: Map<string, { data: PricePoint[], timestamp: number, dataSource: 'live' | 'unavailable' }> = new Map();
const CACHE_DURATION = 60 * 1000; // 1 minute - same as useLivePrices

export function useHistoricalPrices({ 
  assetId, 
  category, 
  days, 
  interval = '1d' 
}: UseHistoricalPricesOptions): UseHistoricalPricesResult {
  const [priceHistory, setPriceHistory] = useState<PricePoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<'live' | 'unavailable'>('live');
  const isFetching = useRef(false);

  const fetchData = useCallback(async () => {
    if (isFetching.current) return;
    isFetching.current = true;

    const cacheKey = `${assetId}-${days}-${interval}`;
    const cached = historicalCache.get(cacheKey);
    
    // Use cache if valid
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      setPriceHistory(cached.data);
      setDataSource(cached.dataSource);
      setIsLoading(false);
      isFetching.current = false;
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

      if (result.success && result.data && result.data.length > 0) {
        const history: PricePoint[] = result.data.map((point: any) => ({
          timestamp: point.timestamp,
          open: point.open,
          high: point.high,
          low: point.low,
          close: point.close,
          volume: point.volume,
        }));

        const source: 'live' | 'unavailable' = result.dataSource === 'live' ? 'live' : 'unavailable';
        
        historicalCache.set(cacheKey, { 
          data: history, 
          timestamp: Date.now(),
          dataSource: source
        });
        
        setPriceHistory(history);
        setDataSource(source);
      } else {
        // No data available - use cached if exists
        if (cached) {
          setPriceHistory(cached.data);
          setDataSource('unavailable');
        } else {
          setPriceHistory([]);
          setDataSource('unavailable');
        }
        setError('No data available');
      }
    } catch (err) {
      console.error(`Error fetching historical prices for ${assetId}:`, err);
      setError(err instanceof Error ? err.message : 'Failed to fetch');
      
      // Use stale cache if available
      if (cached) {
        setPriceHistory(cached.data);
        setDataSource('unavailable');
      } else {
        setPriceHistory([]);
        setDataSource('unavailable');
      }
    } finally {
      setIsLoading(false);
      isFetching.current = false;
    }
  }, [assetId, category, days, interval]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refetch = useCallback(() => {
    const cacheKey = `${assetId}-${days}-${interval}`;
    historicalCache.delete(cacheKey);
    fetchData();
  }, [assetId, days, interval, fetchData]);

  return {
    priceHistory,
    isLoading,
    error,
    dataSource,
    refetch,
  };
}
