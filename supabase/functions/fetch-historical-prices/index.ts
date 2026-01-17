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
  copper: 'HG=F',
  nasdaq100: '^NDX',
  sp500: '^GSPC',
};

// Fetch historical data from Yahoo Finance
async function fetchYahooHistory(ticker: string, days: number): Promise<HistoricalPrice[]> {
  try {
    // Calculate date range
    const endDate = Math.floor(Date.now() / 1000);
    const startDate = endDate - (days * 24 * 60 * 60);
    
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?period1=${startDate}&period2=${endDate}&interval=1d`,
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
    
    console.log(`Fetched ${history.length} historical points from Yahoo Finance for ${ticker}`);
    return history;
  } catch (error) {
    console.error(`Error fetching Yahoo history for ${ticker}:`, error);
    return [];
  }
}

// Fetch historical metal prices from Yahoo Finance
async function fetchMetalHistory(metal: string, days: number = 365): Promise<HistoricalPrice[]> {
  const ticker = YAHOO_TICKERS[metal];
  
  if (ticker) {
    const history = await fetchYahooHistory(ticker, days);
    if (history.length > 0) {
      return history;
    }
  }
  
  console.log(`Using generated data for ${metal}`);
  return generateRealisticHistory(metal, days);
}

// Fetch historical crypto prices from CoinGecko (free, supports 1 year)
async function fetchCryptoHistory(coinId: string, days: number = 365): Promise<HistoricalPrice[]> {
  try {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=${days}&interval=daily`
    );
    
    if (!response.ok) {
      console.error('CoinGecko history API error:', response.status);
      return generateRealisticHistory(coinId, days);
    }
    
    const data = await response.json();
    
    if (!data.prices || !Array.isArray(data.prices)) {
      return generateRealisticHistory(coinId, days);
    }
    
    return data.prices.map((pricePoint: [number, number], index: number) => {
      const [timestamp, price] = pricePoint;
      return {
        timestamp,
        open: price * (1 + (Math.random() - 0.5) * 0.02),
        high: price * (1 + Math.random() * 0.03),
        low: price * (1 - Math.random() * 0.03),
        close: price,
        volume: data.total_volumes?.[index]?.[1] || Math.floor(Math.random() * 10000000000),
      };
    });
  } catch (error) {
    console.error('Error fetching crypto history:', error);
    return generateRealisticHistory(coinId, days);
  }
}

// Fetch historical index prices from Yahoo Finance
async function fetchIndexHistory(indexId: string, days: number = 365): Promise<HistoricalPrice[]> {
  const ticker = YAHOO_TICKERS[indexId];
  
  if (ticker) {
    const history = await fetchYahooHistory(ticker, days);
    if (history.length > 0) {
      return history;
    }
  }
  
  console.log(`Using generated data for ${indexId}`);
  return generateRealisticHistory(indexId, days);
}

// Generate realistic price history based on asset type and current price ranges (fallback)
// Prices as of Jan 2026
function generateRealisticHistory(assetId: string, days: number, endPrice?: number): HistoricalPrice[] {
  const history: HistoricalPrice[] = [];
  const now = Date.now();
  
  // Realistic price ranges for each asset
  const priceRanges: Record<string, { current: number; yearAgoRange: [number, number]; volatility: number }> = {
    gold: { current: endPrice || 4500, yearAgoRange: [2600, 2750], volatility: 0.008 },
    silver: { current: endPrice || 90, yearAgoRange: [30, 35], volatility: 0.012 },
    copper: { current: endPrice || 5.50, yearAgoRange: [4.00, 4.50], volatility: 0.015 },
    bitcoin: { current: endPrice || 95000, yearAgoRange: [40000, 50000], volatility: 0.04 },
    ethereum: { current: endPrice || 3300, yearAgoRange: [2200, 2800], volatility: 0.045 },
    nasdaq100: { current: endPrice || 21500, yearAgoRange: [16000, 18000], volatility: 0.015 },
    sp500: { current: endPrice || 5900, yearAgoRange: [4800, 5200], volatility: 0.012 },
  };
  
  const config = priceRanges[assetId] || { current: endPrice || 100, yearAgoRange: [80, 120], volatility: 0.02 };
  
  // Calculate starting price based on how far back we're going
  const startPrice = config.yearAgoRange[0] + Math.random() * (config.yearAgoRange[1] - config.yearAgoRange[0]);
  const priceTarget = config.current;
  
  let currentPrice = startPrice;
  const dailyTrend = (priceTarget - startPrice) / days;
  
  for (let i = days; i >= 0; i--) {
    const timestamp = now - i * 24 * 60 * 60 * 1000;
    
    // Add trend + random walk
    const randomChange = (Math.random() - 0.5) * config.volatility * currentPrice;
    const trendChange = dailyTrend * (0.8 + Math.random() * 0.4);
    
    const open = currentPrice;
    const close = i === 0 ? priceTarget : currentPrice + trendChange + randomChange;
    const high = Math.max(open, close) * (1 + Math.random() * 0.015);
    const low = Math.min(open, close) * (1 - Math.random() * 0.015);
    
    history.push({
      timestamp,
      open,
      high,
      low,
      close: Math.max(close, 0.01), // Prevent negative prices
      volume: Math.floor(Math.random() * 1000000) + 500000,
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
    
    console.log(`Fetching ${days} days of history for ${assetId} (${category})`);
    
    let history: HistoricalPrice[];
    
    if (category === 'crypto') {
      history = await fetchCryptoHistory(assetId, days);
    } else if (category === 'metal') {
      history = await fetchMetalHistory(assetId, days);
    } else if (category === 'index') {
      history = await fetchIndexHistory(assetId, days);
    } else {
      history = generateRealisticHistory(assetId, days);
    }
    
    console.log(`Returning ${history.length} price points`);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        data: history,
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
