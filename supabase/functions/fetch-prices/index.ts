const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PriceData {
  id: string;
  name: string;
  symbol: string;
  category: 'metal' | 'crypto' | 'index' | 'etf';
  price: number;
  priceUnit: string;
  change: number;
  changePercent: number;
  high24h: number;
  low24h: number;
  volume: string;
  marketCap: string;
  lastUpdated: string;
  dataSource: 'live' | 'cached' | 'unavailable';
  // ETF-specific fields
  dividendYield?: number;
  expenseRatio?: number;
}

// In-memory cache for last known good prices (no random generation)
const priceCache: Map<string, PriceData> = new Map();
const CACHE_EXPIRY = 30 * 60 * 1000; // 30 minutes before marking as stale

// Yahoo Finance tickers for commodities, indices, and ETFs
const YAHOO_TICKERS = {
  // Gold ETFs for calculating spot price
  gld: 'GLD',          // SPDR Gold Trust - 1 share ≈ 1/10 oz gold (most liquid gold ETF)
  silver_spot: 'SI=F', // Silver Futures as fallback
  gold_spot: 'GC=F',   // Gold Futures as fallback
  nasdaq100: '^NDX',   // Nasdaq 100 Index
  sp500: '^GSPC',      // S&P 500 Index
  // ETFs for portfolio display
  vym: 'VYM',          // Vanguard High Dividend Yield ETF
  vymi: 'VYMI',        // Vanguard International High Dividend Yield ETF
  gldm: 'GLDM',        // SPDR Gold MiniShares Trust
  slv: 'SLV',          // iShares Silver Trust
};

// GLD holds roughly 0.159 oz of gold per share (recalibrated Feb 2026)
// So spot gold = GLD price / 0.159 
// SLV holds roughly 2.43 oz of silver per share (recalibrated Feb 2026)
// So spot silver = SLV price / 2.43
const GLD_OZ_PER_SHARE = 0.159;  
const SLV_OZ_PER_SHARE = 2.43;

// Fetch quote from Yahoo Finance
async function fetchYahooQuote(ticker: string): Promise<any | null> {
  try {
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=2d`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      }
    );
    
    if (!response.ok) {
      console.error(`Yahoo Finance error for ${ticker}:`, response.status);
      return null;
    }
    
    const data = await response.json();
    const result = data?.chart?.result?.[0];
    
    if (!result?.meta) {
      console.error(`No data for ${ticker}`);
      return null;
    }
    
    const meta = result.meta;
    const quote = result.indicators?.quote?.[0];
    const lastIdx = quote?.close?.length - 1 || 0;
    
    return {
      price: meta.regularMarketPrice || quote?.close?.[lastIdx],
      previousClose: meta.chartPreviousClose || meta.previousClose,
      high: quote?.high?.[lastIdx] || meta.regularMarketDayHigh,
      low: quote?.low?.[lastIdx] || meta.regularMarketDayLow,
      volume: meta.regularMarketVolume,
    };
  } catch (error) {
    console.error(`Error fetching Yahoo quote for ${ticker}:`, error);
    return null;
  }
}

// Fetch metal prices by deriving spot from GLD and SLV ETFs
// GLD and SLV are proxies for spot gold/silver - much more reliable than futures
async function fetchMetalPrices(): Promise<PriceData[]> {
  console.log('Fetching metal prices via ETF derivation (GLD, SLV)...');
  
  const [gldQuote, slvQuote] = await Promise.all([
    fetchYahooQuote('GLD'),  // SPDR Gold Trust
    fetchYahooQuote('SLV'),  // iShares Silver Trust
  ]);
  
  const results: PriceData[] = [];
  const now = new Date().toISOString();
  
  // Derive gold spot price from GLD ETF
  // GLD holds approximately 0.091 oz of gold per share
  if (gldQuote?.price) {
    const goldSpot = gldQuote.price / GLD_OZ_PER_SHARE;
    const prevGoldSpot = gldQuote.previousClose ? gldQuote.previousClose / GLD_OZ_PER_SHARE : goldSpot;
    const change = goldSpot - prevGoldSpot;
    
    const priceData: PriceData = {
      id: 'gold',
      name: 'Gold',
      symbol: 'XAU/USD',
      category: 'metal',
      price: Math.round(goldSpot * 100) / 100,
      priceUnit: '/oz',
      change: Math.round(change * 100) / 100,
      changePercent: prevGoldSpot ? (change / prevGoldSpot) * 100 : 0,
      high24h: gldQuote.high ? gldQuote.high / GLD_OZ_PER_SHARE : goldSpot,
      low24h: gldQuote.low ? gldQuote.low / GLD_OZ_PER_SHARE : goldSpot,
      volume: formatVolume(gldQuote.volume || 125000),
      marketCap: '$15.8T',
      lastUpdated: now,
      dataSource: 'live',
    };
    results.push(priceData);
    priceCache.set('gold', { ...priceData, lastUpdated: now });
    console.log(`Gold (derived from GLD $${gldQuote.price.toFixed(2)}): $${goldSpot.toFixed(2)}/oz`);
  } else {
    const cached = priceCache.get('gold');
    if (cached) {
      results.push({ ...cached, dataSource: 'cached', lastUpdated: now });
    }
  }
  
  // Derive silver spot price from SLV ETF
  // SLV holds approximately 0.885 oz of silver per share
  if (slvQuote?.price) {
    const silverSpot = slvQuote.price / SLV_OZ_PER_SHARE;
    const prevSilverSpot = slvQuote.previousClose ? slvQuote.previousClose / SLV_OZ_PER_SHARE : silverSpot;
    const change = silverSpot - prevSilverSpot;
    
    const priceData: PriceData = {
      id: 'silver',
      name: 'Silver',
      symbol: 'XAG/USD',
      category: 'metal',
      price: Math.round(silverSpot * 100) / 100,
      priceUnit: '/oz',
      change: Math.round(change * 100) / 100,
      changePercent: prevSilverSpot ? (change / prevSilverSpot) * 100 : 0,
      high24h: slvQuote.high ? slvQuote.high / SLV_OZ_PER_SHARE : silverSpot,
      low24h: slvQuote.low ? slvQuote.low / SLV_OZ_PER_SHARE : silverSpot,
      volume: formatVolume(slvQuote.volume || 89000),
      marketCap: '$1.4T',
      lastUpdated: now,
      dataSource: 'live',
    };
    results.push(priceData);
    priceCache.set('silver', { ...priceData, lastUpdated: now });
    console.log(`Silver (derived from SLV $${slvQuote.price.toFixed(2)}): $${silverSpot.toFixed(2)}/oz`);
  } else {
    const cached = priceCache.get('silver');
    if (cached) {
      results.push({ ...cached, dataSource: 'cached', lastUpdated: now });
    }
  }
  
  console.log(`Fetched ${results.filter(r => r.dataSource === 'live').length} live metal prices`);
  return results;
}

// Fetch ETF prices from Yahoo Finance
async function fetchETFPrices(): Promise<PriceData[]> {
  console.log('Fetching ETF prices from Yahoo Finance...');
  
  const [vymQuote, vymiQuote, gldmQuote, slvQuote] = await Promise.all([
    fetchYahooQuote(YAHOO_TICKERS.vym),
    fetchYahooQuote(YAHOO_TICKERS.vymi),
    fetchYahooQuote(YAHOO_TICKERS.gldm),
    fetchYahooQuote(YAHOO_TICKERS.slv),
  ]);
  
  const results: PriceData[] = [];
  const now = new Date().toISOString();
  
  const etfConfigs = [
    { quote: vymQuote, id: 'vym', name: 'Vanguard High Dividend Yield', symbol: 'VYM', marketCap: '$56B', dividendYield: 2.85, expenseRatio: 0.06 },
    { quote: vymiQuote, id: 'vymi', name: 'Vanguard Intl High Dividend', symbol: 'VYMI', marketCap: '$8.5B', dividendYield: 4.52, expenseRatio: 0.22 },
    { quote: gldmQuote, id: 'gldm', name: 'SPDR Gold MiniShares', symbol: 'GLDM', marketCap: '$9.2B', dividendYield: 0, expenseRatio: 0.10 },
    { quote: slvQuote, id: 'slv', name: 'iShares Silver Trust', symbol: 'SLV', marketCap: '$11.5B', dividendYield: 0, expenseRatio: 0.50 },
  ];
  
  for (const config of etfConfigs) {
    if (config.quote?.price) {
      const change = config.quote.price - (config.quote.previousClose || config.quote.price);
      const priceData: PriceData = {
        id: config.id,
        name: config.name,
        symbol: config.symbol,
        category: 'etf',
        price: config.quote.price,
        priceUnit: '',
        change,
        changePercent: config.quote.previousClose ? (change / config.quote.previousClose) * 100 : 0,
        high24h: config.quote.high || config.quote.price,
        low24h: config.quote.low || config.quote.price,
        volume: formatVolume(config.quote.volume || 1000000),
        marketCap: config.marketCap,
        lastUpdated: now,
        dataSource: 'live',
        dividendYield: config.dividendYield,
        expenseRatio: config.expenseRatio,
      };
      results.push(priceData);
      priceCache.set(config.id, { ...priceData, lastUpdated: now });
    } else {
      const cached = priceCache.get(config.id);
      if (cached) {
        results.push({ ...cached, dataSource: 'cached', lastUpdated: now });
      }
    }
  }
  
  console.log(`Fetched ${results.filter(r => r.dataSource === 'live').length} live ETF prices`);
  return results;
}

// Fetch crypto prices from CoinGecko (free, no API key needed)
async function fetchCryptoPrices(): Promise<PriceData[]> {
  const now = new Date().toISOString();
  
  try {
    const response = await fetch(
      'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin,ethereum&order=market_cap_desc&sparkline=false&price_change_percentage=24h'
    );
    
    if (!response.ok) {
      console.error('CoinGecko API error:', response.status);
      // Return cached data
      return getCachedCryptos(now);
    }
    
    const data = await response.json();
    
    const results = data.map((coin: any) => {
      const priceData: PriceData = {
        id: coin.id,
        name: coin.name,
        symbol: coin.symbol.toUpperCase() + '/USD',
        category: 'crypto' as const,
        price: coin.current_price,
        priceUnit: '',
        change: coin.price_change_24h || 0,
        changePercent: coin.price_change_percentage_24h || 0,
        high24h: coin.high_24h || coin.current_price,
        low24h: coin.low_24h || coin.current_price,
        volume: formatVolume(coin.total_volume),
        marketCap: formatMarketCap(coin.market_cap),
        lastUpdated: now,
        dataSource: 'live' as const,
      };
      priceCache.set(coin.id, { ...priceData, lastUpdated: now });
      return priceData;
    });
    
    return results;
  } catch (error) {
    console.error('Error fetching crypto prices:', error);
    return getCachedCryptos(now);
  }
}

function getCachedCryptos(now: string): PriceData[] {
  const results: PriceData[] = [];
  const btc = priceCache.get('bitcoin');
  const eth = priceCache.get('ethereum');
  if (btc) results.push({ ...btc, dataSource: 'cached', lastUpdated: now });
  if (eth) results.push({ ...eth, dataSource: 'cached', lastUpdated: now });
  return results;
}

// Fetch indices from Yahoo Finance
async function fetchIndicesPrices(): Promise<PriceData[]> {
  console.log('Fetching indices from Yahoo Finance...');
  
  const [nasdaqQuote, sp500Quote] = await Promise.all([
    fetchYahooQuote(YAHOO_TICKERS.nasdaq100),
    fetchYahooQuote(YAHOO_TICKERS.sp500),
  ]);
  
  const results: PriceData[] = [];
  const now = new Date().toISOString();
  
  if (nasdaqQuote?.price) {
    const change = nasdaqQuote.price - (nasdaqQuote.previousClose || nasdaqQuote.price);
    const priceData: PriceData = {
      id: 'nasdaq100',
      name: 'Nasdaq 100',
      symbol: 'NDX',
      category: 'index',
      price: nasdaqQuote.price,
      priceUnit: '',
      change,
      changePercent: nasdaqQuote.previousClose ? (change / nasdaqQuote.previousClose) * 100 : 0,
      high24h: nasdaqQuote.high || nasdaqQuote.price,
      low24h: nasdaqQuote.low || nasdaqQuote.price,
      volume: formatVolume(nasdaqQuote.volume || 4200000000),
      marketCap: '$25T',
      lastUpdated: now,
      dataSource: 'live',
    };
    results.push(priceData);
    priceCache.set('nasdaq100', { ...priceData, lastUpdated: now });
  } else {
    const cached = priceCache.get('nasdaq100');
    if (cached) {
      results.push({ ...cached, dataSource: 'cached', lastUpdated: now });
    }
  }
  
  if (sp500Quote?.price) {
    const change = sp500Quote.price - (sp500Quote.previousClose || sp500Quote.price);
    const priceData: PriceData = {
      id: 'sp500',
      name: 'S&P 500',
      symbol: 'SPX',
      category: 'index',
      price: sp500Quote.price,
      priceUnit: '',
      change,
      changePercent: sp500Quote.previousClose ? (change / sp500Quote.previousClose) * 100 : 0,
      high24h: sp500Quote.high || sp500Quote.price,
      low24h: sp500Quote.low || sp500Quote.price,
      volume: formatVolume(sp500Quote.volume || 3800000000),
      marketCap: '$42T',
      lastUpdated: now,
      dataSource: 'live',
    };
    results.push(priceData);
    priceCache.set('sp500', { ...priceData, lastUpdated: now });
  } else {
    const cached = priceCache.get('sp500');
    if (cached) {
      results.push({ ...cached, dataSource: 'cached', lastUpdated: now });
    }
  }
  
  console.log(`Fetched ${results.filter(r => r.dataSource === 'live').length} live index prices`);
  return results;
}

function formatVolume(volume: number): string {
  if (volume >= 1e9) return `${(volume / 1e9).toFixed(1)}B`;
  if (volume >= 1e6) return `${(volume / 1e6).toFixed(1)}M`;
  if (volume >= 1e3) return `${(volume / 1e3).toFixed(1)}K`;
  return volume.toString();
}

function formatMarketCap(marketCap: number): string {
  if (marketCap >= 1e12) return `$${(marketCap / 1e12).toFixed(1)}T`;
  if (marketCap >= 1e9) return `$${(marketCap / 1e9).toFixed(0)}B`;
  if (marketCap >= 1e6) return `$${(marketCap / 1e6).toFixed(0)}M`;
  return `$${marketCap}`;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Fetching live prices from Yahoo Finance + CoinGecko...');
    
    // Fetch all prices in parallel
    const [metals, etfs, cryptos, indices] = await Promise.all([
      fetchMetalPrices(),
      fetchETFPrices(),
      fetchCryptoPrices(),
      fetchIndicesPrices(),
    ]);
    
    const allPrices = [...metals, ...cryptos, ...indices, ...etfs];
    
    const liveCount = allPrices.filter(p => p.dataSource === 'live').length;
    const cachedCount = allPrices.filter(p => p.dataSource === 'cached').length;
    
    console.log(`Fetched ${allPrices.length} prices (${liveCount} live, ${cachedCount} cached)`);
    
    // If no data at all, return an error
    if (allPrices.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Unable to fetch any price data. Please try again later.',
          data: []
        }),
        { 
          status: 503,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        data: allPrices,
        meta: {
          liveCount,
          cachedCount,
          timestamp: new Date().toISOString()
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching prices:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        data: []
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
