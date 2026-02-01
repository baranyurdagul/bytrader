import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface GoldSpreadData {
  comex: {
    price: number;
    change: number;
    changePercent: number;
    source: string;
    lastUpdated: string;
  };
  shanghai: {
    priceUSD: number;
    priceCNY: number;
    source: string;
    lastUpdated: string;
    session: 'AM' | 'PM';
  };
  spread: {
    value: number;
    percent: number;
    direction: 'premium' | 'discount' | 'neutral';
  };
  exchangeRate: {
    usdcny: number;
    source: string;
  };
  dataSource: 'live' | 'cached' | 'unavailable';
  lastUpdated: string;
}

interface UseGoldSpreadResult {
  data: GoldSpreadData | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

// Cache for spread data
let cachedData: GoldSpreadData | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 60 * 1000; // 1 minute client-side cache

export function useGoldSpread(refreshInterval: number = 60000): UseGoldSpreadResult {
  const [data, setData] = useState<GoldSpreadData | null>(cachedData);
  const [isLoading, setIsLoading] = useState(!cachedData);
  const [error, setError] = useState<string | null>(null);
  const isFetching = useRef(false);

  const fetchData = useCallback(async () => {
    if (isFetching.current) return;
    
    // Check client-side cache
    const now = Date.now();
    if (cachedData && (now - cacheTimestamp) < CACHE_DURATION) {
      setData(cachedData);
      setIsLoading(false);
      return;
    }
    
    isFetching.current = true;
    
    try {
      const { data: result, error: fetchError } = await supabase.functions.invoke('fetch-gold-spread');
      
      if (fetchError) {
        throw new Error(fetchError.message);
      }
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch gold spread');
      }
      
      const spreadData = result.data as GoldSpreadData;
      
      // Update cache
      cachedData = spreadData;
      cacheTimestamp = now;
      
      setData(spreadData);
      setError(null);
    } catch (err) {
      console.error('Error fetching gold spread:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch');
      
      // Use cached data if available
      if (cachedData) {
        setData({ ...cachedData, dataSource: 'cached' });
      }
    } finally {
      setIsLoading(false);
      isFetching.current = false;
    }
  }, []);

  useEffect(() => {
    fetchData();
    
    const intervalId = setInterval(fetchData, refreshInterval);
    
    return () => clearInterval(intervalId);
  }, [fetchData, refreshInterval]);

  const refetch = useCallback(() => {
    cachedData = null;
    cacheTimestamp = 0;
    setIsLoading(true);
    fetchData();
  }, [fetchData]);

  return { data, isLoading, error, refetch };
}
