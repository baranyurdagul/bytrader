import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SilverSpreadData {
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

interface UseSilverSpreadResult {
  data: SilverSpreadData | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

// Cache for spread data
let cachedData: SilverSpreadData | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 60 * 1000; // 1 minute client-side cache

export function useSilverSpread(refreshInterval: number = 60000): UseSilverSpreadResult {
  const [data, setData] = useState<SilverSpreadData | null>(cachedData);
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
      const { data: result, error: fetchError } = await supabase.functions.invoke('fetch-silver-spread');
      
      if (fetchError) {
        throw new Error(fetchError.message);
      }
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch silver spread');
      }
      
      const spreadData = result.data as SilverSpreadData;
      
      // Update cache
      cachedData = spreadData;
      cacheTimestamp = now;
      
      setData(spreadData);
      setError(null);
    } catch (err) {
      console.error('Error fetching silver spread:', err);
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
