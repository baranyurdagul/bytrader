import { useState, useEffect, useCallback, useRef } from 'react';

export interface ArbitragePoint {
  timestamp: number;
  goldSpreadPercent: number;
  silverSpreadPercent: number;
  goldComex: number;
  goldShanghai: number;
  silverComex: number;
  silverShanghai: number;
}

interface UseArbitrageHistoryResult {
  data: ArbitragePoint[];
  isLoading: boolean;
  error: string | null;
  dataSource: 'live' | 'cached' | 'unavailable';
  refetch: () => void;
}

// Cache for history data
const historyCache: Map<string, { data: ArbitragePoint[], timestamp: number, dataSource: string }> = new Map();
const CACHE_DURATION = 60 * 1000; // 1 minute client-side cache

export function useArbitrageHistory(period: '1D' | '1W' | '1M'): UseArbitrageHistoryResult {
  const [data, setData] = useState<ArbitragePoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<'live' | 'cached' | 'unavailable'>('live');
  const isFetching = useRef(false);

  const fetchData = useCallback(async () => {
    if (isFetching.current) return;
    
    const cacheKey = `arbitrage-${period}`;
    const cached = historyCache.get(cacheKey);
    
    // Use cache if valid
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      setData(cached.data);
      setDataSource(cached.dataSource as 'live' | 'cached');
      setIsLoading(false);
      return;
    }
    
    isFetching.current = true;
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-arbitrage-history?period=${period}`,
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
        const source = result.dataSource === 'live' ? 'live' : 'cached';
        
        historyCache.set(cacheKey, {
          data: result.data,
          timestamp: Date.now(),
          dataSource: source,
        });
        
        setData(result.data);
        setDataSource(source as 'live' | 'cached');
      } else {
        throw new Error(result.error || 'No data available');
      }
    } catch (err) {
      console.error('Error fetching arbitrage history:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch');
      
      // Use stale cache if available
      if (cached) {
        setData(cached.data);
        setDataSource('cached');
      } else {
        setData([]);
        setDataSource('unavailable');
      }
    } finally {
      setIsLoading(false);
      isFetching.current = false;
    }
  }, [period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refetch = useCallback(() => {
    const cacheKey = `arbitrage-${period}`;
    historyCache.delete(cacheKey);
    fetchData();
  }, [period, fetchData]);

  return { data, isLoading, error, dataSource, refetch };
}
