const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface HistoricalPrice {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// Cache for historical data - persists between requests
const historyCache: Map<string, { data: HistoricalPrice[], timestamp: number }> = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Price bounds for validation (updated for 2026 market conditions)
// Silver rallied from ~$25/oz in 2024 to ~$75-80/oz in early 2026
// Gold rallied from ~$2000/oz in 2024 to ~$4600/oz in early 2026
const PRICE_BOUNDS: Record<string, { min: number; max: number }> = {
  gold: { min: 1500, max: 10000 },
  silver: { min: 15, max: 150 },
};

// Yahoo Finance tickers - using spot/ETF proxies for more accurate historical data
const YAHOO_TICKERS: Record<string, string> = {
  gold: 'GC=F',
  silver: 'SLV',  // Use SLV ETF for historical - futures contracts cause price jumps
  nasdaq100: '^NDX',
  sp500: '^GSPC',
  vym: 'VYM',
  vymi: 'VYMI',
  gldm: 'GLDM',
  slv: 'SLV',
};

// SLV ETF to spot silver conversion (1 share ≈ 0.93 oz of silver)
const SLV_TO_SPOT_RATIO = 1 / 0.93;

// Fetch historical data from Yahoo Finance
async function fetchYahooHistory(ticker: string, days: number, interval: string = '1d', assetId?: string): Promise<HistoricalPrice[]> {
  const cacheKey = `${ticker}-${days}-${interval}`;
  const cached = historyCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log(`Using cached history for ${ticker}`);
    return cached.data;
  }

  try {
    const endDate = Math.floor(Date.now() / 1000);
    // For hourly data, extend to 5 days to ensure enough data points (markets closed on weekends)
    const actualDays = (interval === '1h' || interval === '60m') ? Math.max(days, 5) : days;
    const startDate = endDate - (actualDays * 24 * 60 * 60);
    
    const yahooInterval = interval === '1h' ? '60m' : interval === '15m' ? '15m' : '1d';
    
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?period1=${startDate}&period2=${endDate}&interval=${yahooInterval}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      }
    );
    
    if (!response.ok) {
      console.error(`Yahoo Finance history error for ${ticker}:`, response.status);
      return cached?.data || [];
    }
    
    const data = await response.json();
    const result = data?.chart?.result?.[0];
    
    if (!result?.timestamp || !result?.indicators?.quote?.[0]) {
      console.error(`No historical data for ${ticker}`);
      return cached?.data || [];
    }
    
    const timestamps = result.timestamp;
    const quote = result.indicators.quote[0];
    
    // Log the date range being returned
    const firstDate = new Date(timestamps[0] * 1000).toISOString();
    const lastDate = new Date(timestamps[timestamps.length - 1] * 1000).toISOString();
    console.log(`Yahoo returned data for ${ticker}: ${firstDate} to ${lastDate} (${timestamps.length} points)`);
    
    // Determine if this is an ETF that needs conversion to spot price
    const isSilverETF = ticker === 'SLV' && assetId === 'silver';
    const conversionRatio = isSilverETF ? SLV_TO_SPOT_RATIO : 1;
    
    const history: HistoricalPrice[] = [];
    const bounds = assetId ? PRICE_BOUNDS[assetId] : null;
    
    for (let i = 0; i < timestamps.length; i++) {
      if (quote.close[i] != null) {
        const rawClose = quote.close[i] * conversionRatio;
        const rawOpen = (quote.open[i] || quote.close[i]) * conversionRatio;
        const rawHigh = (quote.high[i] || quote.close[i]) * conversionRatio;
        const rawLow = (quote.low[i] || quote.close[i]) * conversionRatio;
        
        // Validate price is within bounds if bounds exist
        if (bounds && (rawClose < bounds.min || rawClose > bounds.max)) {
          console.warn(`Skipping out-of-bounds price for ${assetId}: $${rawClose.toFixed(2)}`);
          continue;
        }
        
        history.push({
          timestamp: timestamps[i] * 1000,
          open: rawOpen,
          high: rawHigh,
          low: rawLow,
          close: rawClose,
          volume: quote.volume[i] || 0,
        });
      }
    }
    
    // For hourly data, return the most recent 24 data points
    if (interval === '1h' || interval === '60m') {
      const last24 = history.slice(-24);
      console.log(`Fetched ${last24.length} hourly points from Yahoo Finance for ${ticker}`);
      historyCache.set(cacheKey, { data: last24, timestamp: Date.now() });
      return last24;
    }
    
    console.log(`Fetched ${history.length} historical points from Yahoo Finance for ${ticker} (${yahooInterval})`);
    historyCache.set(cacheKey, { data: history, timestamp: Date.now() });
    return history;
  } catch (error) {
    console.error(`Error fetching Yahoo history for ${ticker}:`, error);
    return cached?.data || [];
  }
}

// Fetch historical crypto prices from CoinGecko
async function fetchCryptoHistory(coinId: string, days: number = 365, interval: string = '1d'): Promise<HistoricalPrice[]> {
  const cacheKey = `crypto-${coinId}-${days}-${interval}`;
  const cached = historyCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log(`Using cached crypto history for ${coinId}`);
    return cached.data;
  }

  try {
    const isHourly = interval === '1h' || interval === '60m';
    
    const response = await fetch(
      `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=${days}`
    );
    
    if (!response.ok) {
      console.error('CoinGecko history API error:', response.status);
      return cached?.data || [];
    }
    
    const data = await response.json();
    
    if (!data.prices || !Array.isArray(data.prices)) {
      return cached?.data || [];
    }
    
    let prices = data.prices;
    
    // For 1D hourly view, CoinGecko returns 5-min data, so sample to hourly
    if (isHourly && prices.length > 24) {
      const hourlyPrices: typeof prices = [];
      const sampleInterval = Math.floor(prices.length / 24);
      for (let i = 0; i < prices.length; i += sampleInterval) {
        hourlyPrices.push(prices[i]);
      }
      // Always include the last point for current price
      if (hourlyPrices[hourlyPrices.length - 1] !== prices[prices.length - 1]) {
        hourlyPrices.push(prices[prices.length - 1]);
      }
      prices = hourlyPrices.slice(-25);
    }
    
    console.log(`Fetched ${prices.length} historical points from CoinGecko for ${coinId}`);
    
    const history = prices.map((pricePoint: [number, number], index: number) => {
      const [timestamp, price] = pricePoint;
      // Use actual price data, no random generation
      return {
        timestamp,
        open: price,
        high: price * 1.002, // Small realistic spread
        low: price * 0.998,
        close: price,
        volume: data.total_volumes?.[index]?.[1] || 0,
      };
    });

    historyCache.set(cacheKey, { data: history, timestamp: Date.now() });
    return history;
  } catch (error) {
    console.error('Error fetching crypto history:', error);
    return cached?.data || [];
  }
}

// Fetch historical prices based on category
async function fetchHistoryByCategory(assetId: string, category: string, days: number, interval: string): Promise<HistoricalPrice[]> {
  if (category === 'crypto') {
    return fetchCryptoHistory(assetId, days, interval);
  }
  
  const ticker = YAHOO_TICKERS[assetId];
  if (ticker) {
    return fetchYahooHistory(ticker, days, interval, assetId);
  }
  
  console.error(`Unknown asset: ${assetId}`);
  return [];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const assetId = url.searchParams.get('asset') || 'gold';
    const days = parseInt(url.searchParams.get('days') || '365');
    const category = url.searchParams.get('category') || 'metal';
    const interval = url.searchParams.get('interval') || '1d';
    
    console.log(`Fetching ${days} days of history for ${assetId} (${category}) with interval ${interval}`);
    
    const history = await fetchHistoryByCategory(assetId, category, days, interval);
    
    // Determine data quality
    const isHourly = interval === '1h' || interval === '60m';
    const hasData = history.length > 0;
    const dataSource = hasData ? 'live' : 'unavailable';
    
    console.log(`Returning ${history.length} price points (${dataSource}) for ${interval}`);
    
    return new Response(
      JSON.stringify({ 
        success: hasData, 
        data: history,
        dataSource,
        asset: assetId,
        days,
        interval,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching historical prices:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch historical prices',
        data: []
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
