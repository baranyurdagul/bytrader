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
  dataSource: 'live' | 'simulated';
  // ETF-specific fields
  dividendYield?: number;
  expenseRatio?: number;
}

// Yahoo Finance tickers for commodities, indices, and ETFs
const YAHOO_TICKERS = {
  gold: 'GC=F',      // Gold Futures
  silver: 'SI=F',    // Silver Futures
  nasdaq100: '^NDX', // Nasdaq 100 Index
  sp500: '^GSPC',    // S&P 500 Index
  // ETFs
  vym: 'VYM',        // Vanguard High Dividend Yield ETF
  vymi: 'VYMI',      // Vanguard International High Dividend Yield ETF
  gldm: 'GLDM',      // SPDR Gold MiniShares Trust
  slv: 'SLV',        // iShares Silver Trust
};

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

// Fetch metal prices from Yahoo Finance
async function fetchMetalPrices(): Promise<PriceData[]> {
  console.log('Fetching metal prices from Yahoo Finance...');
  
  const [goldQuote, silverQuote] = await Promise.all([
    fetchYahooQuote(YAHOO_TICKERS.gold),
    fetchYahooQuote(YAHOO_TICKERS.silver),
  ]);
  
  const results: PriceData[] = [];
  
  if (goldQuote?.price) {
    const change = goldQuote.price - (goldQuote.previousClose || goldQuote.price);
    results.push({
      id: 'gold',
      name: 'Gold',
      symbol: 'XAU/USD',
      category: 'metal',
      price: goldQuote.price,
      priceUnit: '/oz',
      change,
      changePercent: goldQuote.previousClose ? (change / goldQuote.previousClose) * 100 : 0,
      high24h: goldQuote.high || goldQuote.price,
      low24h: goldQuote.low || goldQuote.price,
      volume: formatVolume(goldQuote.volume || 125000),
      marketCap: '$15.8T',
      lastUpdated: new Date().toISOString(),
      dataSource: 'live',
    });
  }
  
  if (silverQuote?.price) {
    const change = silverQuote.price - (silverQuote.previousClose || silverQuote.price);
    results.push({
      id: 'silver',
      name: 'Silver',
      symbol: 'XAG/USD',
      category: 'metal',
      price: silverQuote.price,
      priceUnit: '/oz',
      change,
      changePercent: silverQuote.previousClose ? (change / silverQuote.previousClose) * 100 : 0,
      high24h: silverQuote.high || silverQuote.price,
      low24h: silverQuote.low || silverQuote.price,
      volume: formatVolume(silverQuote.volume || 89000),
      marketCap: '$1.4T',
      lastUpdated: new Date().toISOString(),
      dataSource: 'live',
    });
  }
  
  // If Yahoo Finance failed, use fallback
  if (results.length === 0) {
    console.log('Yahoo Finance failed for metals, using fallback');
    return getMetalFallbackData();
  }
  
  // Fill in any missing metals with fallback
  const fallback = getMetalFallbackData();
  if (!results.find(r => r.id === 'gold')) results.push(fallback.find(f => f.id === 'gold')!);
  if (!results.find(r => r.id === 'silver')) results.push(fallback.find(f => f.id === 'silver')!);
  
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
  
  const etfConfigs = [
    { quote: vymQuote, id: 'vym', name: 'Vanguard High Dividend Yield', symbol: 'VYM', marketCap: '$56B', dividendYield: 2.85, expenseRatio: 0.06 },
    { quote: vymiQuote, id: 'vymi', name: 'Vanguard Intl High Dividend', symbol: 'VYMI', marketCap: '$8.5B', dividendYield: 4.52, expenseRatio: 0.22 },
    { quote: gldmQuote, id: 'gldm', name: 'SPDR Gold MiniShares', symbol: 'GLDM', marketCap: '$9.2B', dividendYield: 0, expenseRatio: 0.10 },
    { quote: slvQuote, id: 'slv', name: 'iShares Silver Trust', symbol: 'SLV', marketCap: '$11.5B', dividendYield: 0, expenseRatio: 0.50 },
  ];
  
  for (const config of etfConfigs) {
    if (config.quote?.price) {
      const change = config.quote.price - (config.quote.previousClose || config.quote.price);
      results.push({
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
        lastUpdated: new Date().toISOString(),
        dataSource: 'live',
        dividendYield: config.dividendYield,
        expenseRatio: config.expenseRatio,
      });
    }
  }
  
  // If Yahoo Finance failed, use fallback
  if (results.length === 0) {
    console.log('Yahoo Finance failed for ETFs, using fallback');
    return getETFFallbackData();
  }
  
  // Fill in any missing ETFs with fallback
  const fallback = getETFFallbackData();
  for (const fb of fallback) {
    if (!results.find(r => r.id === fb.id)) {
      results.push(fb);
    }
  }
  
  console.log(`Fetched ${results.filter(r => r.dataSource === 'live').length} live ETF prices`);
  return results;
}

// Fetch crypto prices from CoinGecko (free, no API key needed)
async function fetchCryptoPrices(): Promise<PriceData[]> {
  try {
    const response = await fetch(
      'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin,ethereum&order=market_cap_desc&sparkline=false&price_change_percentage=24h'
    );
    
    if (!response.ok) {
      console.error('CoinGecko API error:', response.status);
      return getCryptoFallbackData();
    }
    
    const data = await response.json();
    
    return data.map((coin: any) => ({
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
      lastUpdated: new Date().toISOString(),
      dataSource: 'live' as const,
    }));
  } catch (error) {
    console.error('Error fetching crypto prices:', error);
    return getCryptoFallbackData();
  }
}

// Fetch indices from Yahoo Finance
async function fetchIndicesPrices(): Promise<PriceData[]> {
  console.log('Fetching indices from Yahoo Finance...');
  
  const [nasdaqQuote, sp500Quote] = await Promise.all([
    fetchYahooQuote(YAHOO_TICKERS.nasdaq100),
    fetchYahooQuote(YAHOO_TICKERS.sp500),
  ]);
  
  const results: PriceData[] = [];
  
  if (nasdaqQuote?.price) {
    const change = nasdaqQuote.price - (nasdaqQuote.previousClose || nasdaqQuote.price);
    results.push({
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
      lastUpdated: new Date().toISOString(),
      dataSource: 'live',
    });
  }
  
  if (sp500Quote?.price) {
    const change = sp500Quote.price - (sp500Quote.previousClose || sp500Quote.price);
    results.push({
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
      lastUpdated: new Date().toISOString(),
      dataSource: 'live',
    });
  }
  
  if (results.length === 0) {
    console.log('Yahoo Finance failed for indices, using fallback');
    return getIndicesFallbackData();
  }
  
  // Fill in missing indices
  const fallback = getIndicesFallbackData();
  if (!results.find(r => r.id === 'nasdaq100')) results.push(fallback.find(f => f.id === 'nasdaq100')!);
  if (!results.find(r => r.id === 'sp500')) results.push(fallback.find(f => f.id === 'sp500')!);
  
  console.log(`Fetched ${results.filter(r => r.dataSource === 'live').length} live index prices`);
  return results;
}

// Fallback prices (used when Yahoo Finance is unavailable)
// Current prices as of Jan 2026
function getMetalFallbackData(): PriceData[] {
  const goldBase = 4500 + (Math.random() - 0.5) * 50;
  const silverBase = 90 + (Math.random() - 0.5) * 3;
  
  return [
    {
      id: 'gold',
      name: 'Gold',
      symbol: 'XAU/USD',
      category: 'metal',
      price: goldBase,
      priceUnit: '/oz',
      change: (Math.random() - 0.5) * 40,
      changePercent: (Math.random() - 0.5) * 1,
      high24h: goldBase * 1.005,
      low24h: goldBase * 0.995,
      volume: '125.4K',
      marketCap: '$15.8T',
      lastUpdated: new Date().toISOString(),
      dataSource: 'simulated',
    },
    {
      id: 'silver',
      name: 'Silver',
      symbol: 'XAG/USD',
      category: 'metal',
      price: silverBase,
      priceUnit: '/oz',
      change: (Math.random() - 0.5) * 2,
      changePercent: (Math.random() - 0.5) * 2,
      high24h: silverBase * 1.008,
      low24h: silverBase * 0.992,
      volume: '89.2K',
      marketCap: '$1.4T',
      lastUpdated: new Date().toISOString(),
      dataSource: 'simulated',
    },
  ];
}

function getETFFallbackData(): PriceData[] {
  const vymBase = 125 + (Math.random() - 0.5) * 2;
  const vymiBase = 72 + (Math.random() - 0.5) * 1.5;
  const gldmBase = 58 + (Math.random() - 0.5) * 1;
  const slvBase = 28 + (Math.random() - 0.5) * 0.5;
  
  return [
    {
      id: 'vym',
      name: 'Vanguard High Dividend Yield',
      symbol: 'VYM',
      category: 'etf',
      price: vymBase,
      priceUnit: '',
      change: (Math.random() - 0.5) * 1.5,
      changePercent: (Math.random() - 0.5) * 1.2,
      high24h: vymBase * 1.005,
      low24h: vymBase * 0.995,
      volume: '2.1M',
      marketCap: '$56B',
      lastUpdated: new Date().toISOString(),
      dataSource: 'simulated',
      dividendYield: 2.85,
      expenseRatio: 0.06,
    },
    {
      id: 'vymi',
      name: 'Vanguard Intl High Dividend',
      symbol: 'VYMI',
      category: 'etf',
      price: vymiBase,
      priceUnit: '',
      change: (Math.random() - 0.5) * 1,
      changePercent: (Math.random() - 0.5) * 1.4,
      high24h: vymiBase * 1.006,
      low24h: vymiBase * 0.994,
      volume: '450K',
      marketCap: '$8.5B',
      lastUpdated: new Date().toISOString(),
      dataSource: 'simulated',
      dividendYield: 4.52,
      expenseRatio: 0.22,
    },
    {
      id: 'gldm',
      name: 'SPDR Gold MiniShares',
      symbol: 'GLDM',
      category: 'etf',
      price: gldmBase,
      priceUnit: '',
      change: (Math.random() - 0.5) * 0.8,
      changePercent: (Math.random() - 0.5) * 1.3,
      high24h: gldmBase * 1.004,
      low24h: gldmBase * 0.996,
      volume: '3.5M',
      marketCap: '$9.2B',
      lastUpdated: new Date().toISOString(),
      dataSource: 'simulated',
      dividendYield: 0,
      expenseRatio: 0.10,
    },
    {
      id: 'slv',
      name: 'iShares Silver Trust',
      symbol: 'SLV',
      category: 'etf',
      price: slvBase,
      priceUnit: '',
      change: (Math.random() - 0.5) * 0.6,
      changePercent: (Math.random() - 0.5) * 2,
      high24h: slvBase * 1.008,
      low24h: slvBase * 0.992,
      volume: '12.5M',
      marketCap: '$11.5B',
      lastUpdated: new Date().toISOString(),
      dataSource: 'simulated',
      dividendYield: 0,
      expenseRatio: 0.50,
    },
  ];
}

function getCryptoFallbackData(): PriceData[] {
  const btcBase = 95000 + (Math.random() - 0.5) * 2000;
  const ethBase = 3300 + (Math.random() - 0.5) * 100;
  
  return [
    {
      id: 'bitcoin',
      name: 'Bitcoin',
      symbol: 'BTC/USD',
      category: 'crypto',
      price: btcBase,
      priceUnit: '',
      change: (Math.random() - 0.5) * 1000,
      changePercent: (Math.random() - 0.5) * 3,
      high24h: btcBase * 1.02,
      low24h: btcBase * 0.98,
      volume: '27.8B',
      marketCap: '$1.9T',
      lastUpdated: new Date().toISOString(),
      dataSource: 'simulated',
    },
    {
      id: 'ethereum',
      name: 'Ethereum',
      symbol: 'ETH/USD',
      category: 'crypto',
      price: ethBase,
      priceUnit: '',
      change: (Math.random() - 0.5) * 50,
      changePercent: (Math.random() - 0.5) * 3,
      high24h: ethBase * 1.02,
      low24h: ethBase * 0.98,
      volume: '19.4B',
      marketCap: '$398B',
      lastUpdated: new Date().toISOString(),
      dataSource: 'simulated',
    },
  ];
}

function getIndicesFallbackData(): PriceData[] {
  const nasdaqBase = 21500 + (Math.random() - 0.5) * 200;
  const spBase = 5900 + (Math.random() - 0.5) * 50;
  
  return [
    {
      id: 'nasdaq100',
      name: 'Nasdaq 100',
      symbol: 'NDX',
      category: 'index',
      price: nasdaqBase,
      priceUnit: '',
      change: (Math.random() - 0.5) * 100,
      changePercent: (Math.random() - 0.5) * 1,
      high24h: nasdaqBase * 1.005,
      low24h: nasdaqBase * 0.995,
      volume: '4.2B',
      marketCap: '$25T',
      lastUpdated: new Date().toISOString(),
      dataSource: 'simulated',
    },
    {
      id: 'sp500',
      name: 'S&P 500',
      symbol: 'SPX',
      category: 'index',
      price: spBase,
      priceUnit: '',
      change: (Math.random() - 0.5) * 30,
      changePercent: (Math.random() - 0.5) * 0.8,
      high24h: spBase * 1.004,
      low24h: spBase * 0.996,
      volume: '3.8B',
      marketCap: '$42T',
      lastUpdated: new Date().toISOString(),
      dataSource: 'simulated',
    },
  ];
}

function formatVolume(volume: number): string {
  if (volume >= 1e9) return `${(volume / 1e9).toFixed(1)}B`;
  if (volume >= 1e6) return `${(volume / 1e6).toFixed(1)}M`;
  if (volume >= 1e3) return `${(volume / 1e3).toFixed(1)}K`;
  return volume.toString();
}

function formatMarketCap(cap: number): string {
  if (cap >= 1e12) return `$${(cap / 1e12).toFixed(1)}T`;
  if (cap >= 1e9) return `$${(cap / 1e9).toFixed(0)}B`;
  if (cap >= 1e6) return `$${(cap / 1e6).toFixed(0)}M`;
  return `$${cap}`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Fetching live prices from Yahoo Finance + CoinGecko...');
    
    // Fetch from all sources in parallel
    const [metalPrices, cryptoPrices, indicesPrices, etfPrices] = await Promise.all([
      fetchMetalPrices(),
      fetchCryptoPrices(),
      fetchIndicesPrices(),
      fetchETFPrices(),
    ]);
    
    // Combine all prices
    const allPrices = [...metalPrices, ...cryptoPrices, ...indicesPrices, ...etfPrices];
    
    const liveCount = allPrices.filter(p => p.dataSource === 'live').length;
    console.log(`Fetched ${allPrices.length} prices (${liveCount} live, ${allPrices.length - liveCount} simulated)`);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        data: allPrices,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching prices:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch prices'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
