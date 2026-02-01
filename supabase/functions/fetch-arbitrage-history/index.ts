const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ArbitragePoint {
  timestamp: number;
  goldSpreadPercent: number;
  silverSpreadPercent: number;
  goldComex: number;
  goldShanghai: number;
  silverComex: number;
  silverShanghai: number;
}

// Conversion constants
const GRAMS_PER_TROY_OZ = 31.1035;
const GLD_OZ_PER_SHARE = 0.091;
const SLV_OZ_PER_SHARE = 0.885;

// Cache for historical data
const historyCache: Map<string, { data: ArbitragePoint[], timestamp: number }> = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Fetch historical prices from Yahoo Finance
async function fetchYahooHistory(ticker: string, days: number): Promise<{ timestamps: number[], prices: number[] }> {
  try {
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
      return { timestamps: [], prices: [] };
    }
    
    const data = await response.json();
    const result = data?.chart?.result?.[0];
    
    if (!result?.timestamp || !result?.indicators?.quote?.[0]) {
      console.error(`No historical data for ${ticker}`);
      return { timestamps: [], prices: [] };
    }
    
    const timestamps = result.timestamp.map((t: number) => t * 1000);
    const prices = result.indicators.quote[0].close;
    
    console.log(`Fetched ${timestamps.length} points for ${ticker}`);
    return { timestamps, prices };
  } catch (error) {
    console.error(`Error fetching ${ticker} history:`, error);
    return { timestamps: [], prices: [] };
  }
}

// Fetch USD/CNY exchange rate history
async function fetchExchangeRateHistory(days: number): Promise<{ timestamps: number[], rates: number[] }> {
  const result = await fetchYahooHistory('CNY=X', days);
  return { timestamps: result.timestamps, rates: result.prices };
}

// For Shanghai historical data, we'll estimate based on typical premium patterns
// Since SGE doesn't provide historical data via API, we use COMEX + estimated premium
function estimateShanghaiPremium(date: Date): number {
  // Historical Shanghai premium typically ranges from 0% to 8%
  // Higher during Asian market stress, lower during calm periods
  // This is a simplified model - in production you'd store actual historical data
  const dayOfWeek = date.getDay();
  const month = date.getMonth();
  
  // Base premium around 2-4%
  let basePremium = 2.5 + Math.sin(date.getTime() / (7 * 24 * 60 * 60 * 1000)) * 1.5;
  
  // Slight seasonal variation
  if (month >= 9 && month <= 11) {
    basePremium += 0.5; // Higher in Q4 (festival season)
  }
  
  // Weekend effect (no trading, but for display continuity)
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    basePremium *= 0.95;
  }
  
  return Math.max(0, Math.min(8, basePremium));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const period = url.searchParams.get('period') || '1W'; // 1D, 1W, 1M
    
    // Determine days based on period
    const daysMap: Record<string, number> = {
      '1D': 1,
      '1W': 7,
      '1M': 30,
    };
    const days = daysMap[period] || 7;
    
    const cacheKey = `arbitrage-${period}`;
    const cached = historyCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log(`Returning cached arbitrage history for ${period}`);
      return new Response(
        JSON.stringify({ success: true, data: cached.data, period, dataSource: 'cached' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`Fetching arbitrage history for ${period} (${days} days)...`);
    
    // Fetch historical data in parallel
    const [gldHistory, slvHistory, exchangeHistory] = await Promise.all([
      fetchYahooHistory('GLD', days + 5), // Extra days for weekends
      fetchYahooHistory('SLV', days + 5),
      fetchExchangeRateHistory(days + 5),
    ]);
    
    if (gldHistory.timestamps.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unable to fetch historical data' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Build arbitrage history
    const arbitrageHistory: ArbitragePoint[] = [];
    
    for (let i = 0; i < gldHistory.timestamps.length; i++) {
      const timestamp = gldHistory.timestamps[i];
      const gldPrice = gldHistory.prices[i];
      const slvPrice = slvHistory.prices[i] || 0;
      const exchangeRate = exchangeHistory.rates[i] || 7.25;
      
      if (!gldPrice) continue;
      
      // Convert ETF prices to spot prices
      const goldComex = gldPrice / GLD_OZ_PER_SHARE;
      const silverComex = slvPrice ? slvPrice / SLV_OZ_PER_SHARE : 0;
      
      // Estimate Shanghai prices based on historical premium patterns
      const date = new Date(timestamp);
      const premiumPercent = estimateShanghaiPremium(date);
      
      const goldShanghai = goldComex * (1 + premiumPercent / 100);
      const silverShanghai = silverComex * (1 + (premiumPercent * 0.8) / 100); // Silver typically has lower premium
      
      const goldSpreadPercent = premiumPercent;
      const silverSpreadPercent = premiumPercent * 0.8;
      
      arbitrageHistory.push({
        timestamp,
        goldSpreadPercent: Math.round(goldSpreadPercent * 100) / 100,
        silverSpreadPercent: Math.round(silverSpreadPercent * 100) / 100,
        goldComex: Math.round(goldComex * 100) / 100,
        goldShanghai: Math.round(goldShanghai * 100) / 100,
        silverComex: Math.round(silverComex * 100) / 100,
        silverShanghai: Math.round(silverShanghai * 100) / 100,
      });
    }
    
    // Sort by timestamp and limit to requested period
    arbitrageHistory.sort((a, b) => a.timestamp - b.timestamp);
    const limitedHistory = arbitrageHistory.slice(-days);
    
    // Cache the result
    historyCache.set(cacheKey, { data: limitedHistory, timestamp: Date.now() });
    
    console.log(`Returning ${limitedHistory.length} arbitrage history points for ${period}`);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        data: limitedHistory, 
        period,
        dataSource: 'live',
        note: 'Shanghai prices estimated from typical premium patterns. Real-time data available for current spreads.'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching arbitrage history:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
