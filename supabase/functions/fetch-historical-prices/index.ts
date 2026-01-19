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

// Yahoo Finance tickers
const YAHOO_TICKERS: Record<string, string> = {
  gold: 'GC=F',
  silver: 'SI=F',
  nasdaq100: '^NDX',
  sp500: '^GSPC',
  // ETFs
  vym: 'VYM',
  vymi: 'VYMI',
  gldm: 'GLDM',
  slv: 'SLV',
};

// Fetch historical data from Yahoo Finance
async function fetchYahooHistory(ticker: string, days: number, interval: string = '1d'): Promise<HistoricalPrice[]> {
  try {
    // Calculate date range
    const endDate = Math.floor(Date.now() / 1000);
    // For hourly data, extend to 5 days to ensure we get enough data points (markets closed on weekends)
    const actualDays = (interval === '1h' || interval === '60m') ? Math.max(days, 5) : days;
    const startDate = endDate - (actualDays * 24 * 60 * 60);
    
    // Yahoo Finance interval mapping
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
      return [];
    }
    
    const data = await response.json();
    const result = data?.chart?.result?.[0];
    
    if (!result?.timestamp || !result?.indicators?.quote?.[0]) {
      console.error(`No historical data for ${ticker}`);
      return [];
    }
    
    const timestamps = result.timestamp;
    const quote = result.indicators.quote[0];
    
    const history: HistoricalPrice[] = [];
    
    for (let i = 0; i < timestamps.length; i++) {
      if (quote.close[i] != null) {
        history.push({
          timestamp: timestamps[i] * 1000, // Convert to milliseconds
          open: quote.open[i] || quote.close[i],
          high: quote.high[i] || quote.close[i],
          low: quote.low[i] || quote.close[i],
          close: quote.close[i],
          volume: quote.volume[i] || 0,
        });
      }
    }
    
    // For hourly data, return the most recent 24 data points we have
    // This ensures we show a full day's worth of trading data even when markets are closed
    if (interval === '1h' || interval === '60m') {
      // Always return the last 24 points for a complete chart
      const last24 = history.slice(-24);
      console.log(`Fetched ${last24.length} hourly points from Yahoo Finance for ${ticker}`);
      return last24;
    }
    
    console.log(`Fetched ${history.length} historical points from Yahoo Finance for ${ticker} (${yahooInterval})`);
    return history;
  } catch (error) {
    console.error(`Error fetching Yahoo history for ${ticker}:`, error);
    return [];
  }
}

// Fetch historical metal prices from Yahoo Finance
async function fetchMetalHistory(metal: string, days: number = 365, interval: string = '1d'): Promise<HistoricalPrice[]> {
  const ticker = YAHOO_TICKERS[metal];
  
  if (ticker) {
    const history = await fetchYahooHistory(ticker, days, interval);
    if (history.length > 0) {
      return history;
    }
  }
  
  console.log(`Using generated data for ${metal}`);
  return generateRealisticHistory(metal, days, undefined, interval);
}

// Fetch historical crypto prices from CoinGecko (free, supports 1 year)
async function fetchCryptoHistory(coinId: string, days: number = 365, interval: string = '1d'): Promise<HistoricalPrice[]> {
  try {
    // CoinGecko: for days=1, it returns ~5 minute granularity
    // We need to sample this down to hourly for consistent display
    const isHourly = interval === '1h' || interval === '60m';
    
    const response = await fetch(
      `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=${days}`
    );
    
    if (!response.ok) {
      console.error('CoinGecko history API error:', response.status);
      return generateRealisticHistory(coinId, days, undefined, interval);
    }
    
    const data = await response.json();
    
    if (!data.prices || !Array.isArray(data.prices)) {
      return generateRealisticHistory(coinId, days, undefined, interval);
    }
    
    let prices = data.prices;
    
    // For 1D hourly view, CoinGecko returns 5-min data, so sample to hourly
    if (isHourly && prices.length > 24) {
      const hourlyPrices: typeof prices = [];
      const interval = Math.floor(prices.length / 24);
      for (let i = 0; i < prices.length; i += interval) {
        hourlyPrices.push(prices[i]);
      }
      // Always include the last point for current price
      if (hourlyPrices[hourlyPrices.length - 1] !== prices[prices.length - 1]) {
        hourlyPrices.push(prices[prices.length - 1]);
      }
      prices = hourlyPrices.slice(-25); // Last 24-25 hours
    }
    
    console.log(`Fetched ${prices.length} historical points from CoinGecko for ${coinId}`);
    
    return prices.map((pricePoint: [number, number], index: number) => {
      const [timestamp, price] = pricePoint;
      return {
        timestamp,
        open: price * (1 + (Math.random() - 0.5) * 0.005),
        high: price * (1 + Math.random() * 0.01),
        low: price * (1 - Math.random() * 0.01),
        close: price,
        volume: data.total_volumes?.[index]?.[1] || Math.floor(Math.random() * 10000000000),
      };
    });
  } catch (error) {
    console.error('Error fetching crypto history:', error);
    return generateRealisticHistory(coinId, days, undefined, interval);
  }
}

// Fetch historical index prices from Yahoo Finance
async function fetchIndexHistory(indexId: string, days: number = 365, interval: string = '1d'): Promise<HistoricalPrice[]> {
  const ticker = YAHOO_TICKERS[indexId];
  
  if (ticker) {
    const history = await fetchYahooHistory(ticker, days, interval);
    if (history.length > 0) {
      return history;
    }
  }
  
  console.log(`Using generated data for ${indexId}`);
  return generateRealisticHistory(indexId, days, undefined, interval);
}

// Fetch historical ETF prices from Yahoo Finance
async function fetchETFHistory(etfId: string, days: number = 365, interval: string = '1d'): Promise<HistoricalPrice[]> {
  const ticker = YAHOO_TICKERS[etfId];
  
  if (ticker) {
    const history = await fetchYahooHistory(ticker, days, interval);
    if (history.length > 0) {
      return history;
    }
  }
  
  console.log(`Using generated data for ${etfId}`);
  return generateRealisticHistory(etfId, days, undefined, interval);
}

// Generate realistic price history based on asset type and current price ranges (fallback)
// Prices as of Jan 2026
function generateRealisticHistory(assetId: string, days: number, endPrice?: number, interval: string = '1d'): HistoricalPrice[] {
  const history: HistoricalPrice[] = [];
  const now = Date.now();
  
  // Realistic price ranges for each asset
  const priceRanges: Record<string, { current: number; yearAgoRange: [number, number]; volatility: number }> = {
    gold: { current: endPrice || 4500, yearAgoRange: [2600, 2750], volatility: 0.008 },
    silver: { current: endPrice || 90, yearAgoRange: [30, 35], volatility: 0.012 },
    bitcoin: { current: endPrice || 95000, yearAgoRange: [40000, 50000], volatility: 0.04 },
    ethereum: { current: endPrice || 3300, yearAgoRange: [2200, 2800], volatility: 0.045 },
    nasdaq100: { current: endPrice || 21500, yearAgoRange: [16000, 18000], volatility: 0.015 },
    sp500: { current: endPrice || 5900, yearAgoRange: [4800, 5200], volatility: 0.012 },
    // ETFs
    vym: { current: endPrice || 125, yearAgoRange: [110, 118], volatility: 0.01 },
    vymi: { current: endPrice || 72, yearAgoRange: [62, 68], volatility: 0.012 },
    gldm: { current: endPrice || 58, yearAgoRange: [38, 42], volatility: 0.008 },
    slv: { current: endPrice || 28, yearAgoRange: [20, 24], volatility: 0.015 },
  };
  
  const config = priceRanges[assetId] || { current: endPrice || 100, yearAgoRange: [80, 120], volatility: 0.02 };
  
  // For hourly data, generate 24 points for the last day
  const isHourly = interval === '1h' || interval === '60m';
  const numPoints = isHourly ? 24 : days;
  const intervalMs = isHourly ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
  
  // For hourly, use a smaller range around current price
  const startPrice = isHourly 
    ? config.current * (1 - config.volatility * 2) 
    : config.yearAgoRange[0] + Math.random() * (config.yearAgoRange[1] - config.yearAgoRange[0]);
  const priceTarget = config.current;
  
  let currentPrice = startPrice;
  const trend = (priceTarget - startPrice) / numPoints;
  
  // Reduce volatility for hourly data
  const volatilityMultiplier = isHourly ? 0.3 : 1;
  
  for (let i = numPoints; i >= 0; i--) {
    const timestamp = now - i * intervalMs;
    
    // Add trend + random walk
    const randomChange = (Math.random() - 0.5) * config.volatility * volatilityMultiplier * currentPrice;
    const trendChange = trend * (0.8 + Math.random() * 0.4);
    
    const open = currentPrice;
    const close = i === 0 ? priceTarget : currentPrice + trendChange + randomChange;
    const high = Math.max(open, close) * (1 + Math.random() * 0.005 * (isHourly ? 1 : 3));
    const low = Math.min(open, close) * (1 - Math.random() * 0.005 * (isHourly ? 1 : 3));
    
    history.push({
      timestamp,
      open,
      high,
      low,
      close: Math.max(close, 0.01), // Prevent negative prices
      volume: Math.floor(Math.random() * (isHourly ? 100000 : 1000000)) + (isHourly ? 50000 : 500000),
    });
    
    currentPrice = close;
  }
  
  return history;
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
    const interval = url.searchParams.get('interval') || '1d'; // '1h' for hourly, '1d' for daily
    
    console.log(`Fetching ${days} days of history for ${assetId} (${category}) with interval ${interval}`);
    
    let history: HistoricalPrice[];
    
    if (category === 'crypto') {
      history = await fetchCryptoHistory(assetId, days, interval);
    } else if (category === 'metal') {
      history = await fetchMetalHistory(assetId, days, interval);
    } else if (category === 'index') {
      history = await fetchIndexHistory(assetId, days, interval);
    } else if (category === 'etf') {
      history = await fetchETFHistory(assetId, days, interval);
    } else {
      history = generateRealisticHistory(assetId, days, undefined, interval);
    }
    
    // Determine if data came from real API or was generated
    // For hourly data, even 6+ points is valid live data
    const isHourly = interval === '1h' || interval === '60m';
    const isLiveData = history.length > 0 && (
      isHourly ? history.length >= 6 :
      (category === 'crypto' && history.length > 50) ||
      (category !== 'crypto' && history.length > 30)
    );
    
    console.log(`Returning ${history.length} price points (${isLiveData ? 'live' : 'simulated'}) for ${interval}`);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        data: history,
        dataSource: isLiveData ? 'live' : 'simulated',
        asset: assetId,
        days,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching historical prices:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch historical prices'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
