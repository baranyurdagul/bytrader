const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GoldSpreadData {
  comex: {
    price: number;  // USD per troy oz
    change: number;
    changePercent: number;
    source: string;
    lastUpdated: string;
  };
  shanghai: {
    priceUSD: number;  // Converted to USD per troy oz
    priceCNY: number;  // Original CNY per gram
    source: string;
    lastUpdated: string;
    session: 'AM' | 'PM';
  };
  spread: {
    value: number;      // USD difference (Shanghai - COMEX)
    percent: number;    // Premium/discount percentage
    direction: 'premium' | 'discount' | 'neutral';
  };
  exchangeRate: {
    usdcny: number;
    source: string;
  };
  dataSource: 'live' | 'cached' | 'unavailable';
  lastUpdated: string;
}

// Cache for storing last known good data
let dataCache: GoldSpreadData | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 60 * 1000; // 1 minute (reduced for fresher data)

// Conversion constants
const GRAMS_PER_TROY_OZ = 31.1035;
const GLD_OZ_PER_SHARE = 0.091;  // GLD holds ~0.091 oz gold per share

// Fetch COMEX gold price derived from GLD ETF
// GLD is more reliable than futures contracts for spot price approximation
async function fetchComexGold(): Promise<{ price: number; change: number; changePercent: number } | null> {
  try {
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/GLD?interval=1d&range=2d`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      }
    );
    
    if (!response.ok) {
      console.error(`Yahoo Finance error for GLD:`, response.status);
      return null;
    }
    
    const data = await response.json();
    const result = data?.chart?.result?.[0];
    
    if (!result?.meta?.regularMarketPrice) {
      console.error(`No price data for GLD`);
      return null;
    }
    
    const meta = result.meta;
    const gldPrice = meta.regularMarketPrice;
    const gldPrevClose = meta.chartPreviousClose || meta.previousClose || gldPrice;
    
    // Derive spot gold price from GLD
    const price = gldPrice / GLD_OZ_PER_SHARE;
    const prevPrice = gldPrevClose / GLD_OZ_PER_SHARE;
    
    const change = price - prevPrice;
    const changePercent = prevPrice ? (change / prevPrice) * 100 : 0;
    
    console.log(`COMEX Gold (derived from GLD $${gldPrice.toFixed(2)}): $${price.toFixed(2)}/oz`);
    return { price, change, changePercent };
  } catch (error) {
    console.error(`Error fetching GLD:`, error);
    return null;
  }
}

// Fetch USD/CNY exchange rate
async function fetchExchangeRate(): Promise<number | null> {
  try {
    const response = await fetch(
      'https://query1.finance.yahoo.com/v8/finance/chart/CNY=X?interval=1d&range=1d',
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      }
    );
    
    if (!response.ok) {
      console.error('Exchange rate fetch error:', response.status);
      return null;
    }
    
    const data = await response.json();
    const result = data?.chart?.result?.[0];
    const rate = result?.meta?.regularMarketPrice;
    
    console.log(`USD/CNY rate: ${rate}`);
    return rate || null;
  } catch (error) {
    console.error('Error fetching exchange rate:', error);
    return null;
  }
}

// Fetch Shanghai Gold Benchmark from SGE
async function fetchShanghaiGold(): Promise<{ priceCNY: number; session: 'AM' | 'PM'; date: string } | null> {
  try {
    // Use the Chinese SGE website which has the gold data
    const response = await fetch('https://www.sge.com.cn/web/guest/gold', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      },
    });
    
    if (!response.ok) {
      console.error('SGE Chinese fetch error:', response.status);
      return null;
    }
    
    const html = await response.text();
    console.log(`SGE Gold HTML length: ${html.length} chars`);
    
    // Look for Shanghai Gold benchmark data in the Chinese page
    // Pattern: 上海金早盘价（元/克）</p><span class="colorRed fs20">685.00</span>
    // Pattern: 上海金午盘价（元/克）</p><span class="colorRed fs20">686.50</span>
    
    // Extract AM price (早盘价)
    const amPriceMatch = html.match(/上海金早盘价[^>]*>[^<]*<span[^>]*>([\d.]+)/);
    // Extract PM price (午盘价)
    const pmPriceMatch = html.match(/上海金午盘价[^>]*>[^<]*<span[^>]*>([\d.]+)/);
    // Extract date (行情日期)
    const dateMatch = html.match(/行情日期[：:]\s*(\d{4}-\d{2}-\d{2})/);
    
    const amPrice = amPriceMatch ? parseFloat(amPriceMatch[1]) : 0;
    const pmPrice = pmPriceMatch ? parseFloat(pmPriceMatch[1]) : 0;
    const date = dateMatch ? dateMatch[1].replace(/-/g, '') : new Date().toISOString().slice(0, 10).replace(/-/g, '');
    
    console.log(`SGE Gold parsed - AM: ${amPrice}, PM: ${pmPrice}, Date: ${date}`);
    
    if (pmPrice > 0 || amPrice > 0) {
      const priceCNY = pmPrice > 0 ? pmPrice : amPrice;
      const session: 'AM' | 'PM' = pmPrice > 0 ? 'PM' : 'AM';
      
      console.log(`Shanghai Gold (SHAU): ¥${priceCNY}/g (${session} session, date: ${date})`);
      return { priceCNY, session, date };
    }
    
    // Fallback: Look for alternative patterns
    const pricePattern = /上海金[^<]*<[^>]*>([\d.]+)/g;
    const prices = [...html.matchAll(pricePattern)];
    
    if (prices.length >= 2) {
      const price1 = parseFloat(prices[0][1]);
      const price2 = parseFloat(prices[1][1]);
      const priceCNY = price2 > 0 ? price2 : price1;
      const session: 'AM' | 'PM' = price2 > 0 ? 'PM' : 'AM';
      
      console.log(`Shanghai Gold (fallback): ¥${priceCNY}/g (${session} session)`);
      return { priceCNY, session, date };
    }
    
    console.error('Could not parse Shanghai Gold price from SGE Chinese site');
    
    // Log some context for debugging
    const goldIndex = html.indexOf('上海金');
    if (goldIndex > -1) {
      console.log(`Context around 上海金: ${html.substring(goldIndex, goldIndex + 300)}`);
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching Shanghai gold:', error);
    return null;
  }
}

// Convert CNY per gram to USD per troy oz
function convertToUSDPerOz(priceCNYPerGram: number, usdcnyRate: number): number {
  // 1 troy oz = 31.1035 grams
  // Price in CNY/g → Price in CNY/oz → Price in USD/oz
  const pricePerOzCNY = priceCNYPerGram * GRAMS_PER_TROY_OZ;
  const pricePerOzUSD = pricePerOzCNY / usdcnyRate;
  return pricePerOzUSD;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Fetching Shanghai vs COMEX gold spread...');
    
    // Check cache first
    const now = Date.now();
    if (dataCache && (now - cacheTimestamp) < CACHE_DURATION) {
      console.log('Returning cached gold spread data');
      return new Response(
        JSON.stringify({ success: true, data: { ...dataCache, dataSource: 'cached' } }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Fetch all data in parallel
    const [comexResult, shanghaiResult, exchangeRate] = await Promise.all([
      fetchComexGold(),
      fetchShanghaiGold(),
      fetchExchangeRate(),
    ]);
    
    const timestamp = new Date().toISOString();
    
    // Build response with available data
    if (!comexResult) {
      console.error('COMEX gold data unavailable');
      if (dataCache) {
        return new Response(
          JSON.stringify({ success: true, data: { ...dataCache, dataSource: 'cached' } }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      return new Response(
        JSON.stringify({ success: false, error: 'COMEX gold data unavailable' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Default exchange rate if fetch fails (approximate)
    const usdcny = exchangeRate || 7.25;
    
    // Calculate Shanghai price in USD per oz
    let shanghaiData = null;
    let spreadData = null;
    
    if (shanghaiResult && shanghaiResult.priceCNY > 0) {
      const shanghaiUSD = convertToUSDPerOz(shanghaiResult.priceCNY, usdcny);
      
      shanghaiData = {
        priceUSD: Math.round(shanghaiUSD * 100) / 100,
        priceCNY: shanghaiResult.priceCNY,
        source: 'Shanghai Gold Exchange',
        lastUpdated: timestamp,
        session: shanghaiResult.session,
      };
      
      // Calculate spread (Shanghai premium/discount vs COMEX)
      const spreadValue = shanghaiUSD - comexResult.price;
      const spreadPercent = (spreadValue / comexResult.price) * 100;
      
      const direction: 'premium' | 'discount' | 'neutral' = 
        spreadValue > 0.5 ? 'premium' : (spreadValue < -0.5 ? 'discount' : 'neutral');
      
      spreadData = {
        value: Math.round(spreadValue * 100) / 100,
        percent: Math.round(spreadPercent * 100) / 100,
        direction,
      };
      
      console.log(`Gold Spread: $${spreadValue.toFixed(2)} (${spreadPercent.toFixed(2)}%)`);
    }
    
    const responseData: GoldSpreadData = {
      comex: {
        price: Math.round(comexResult.price * 100) / 100,
        change: Math.round(comexResult.change * 100) / 100,
        changePercent: Math.round(comexResult.changePercent * 100) / 100,
        source: 'COMEX (Yahoo Finance)',
        lastUpdated: timestamp,
      },
      shanghai: shanghaiData || {
        priceUSD: 0,
        priceCNY: 0,
        source: 'Shanghai Gold Exchange',
        lastUpdated: timestamp,
        session: 'AM',
      },
      spread: spreadData || {
        value: 0,
        percent: 0,
        direction: 'neutral',
      },
      exchangeRate: {
        usdcny,
        source: 'Yahoo Finance',
      },
      dataSource: shanghaiData ? 'live' : 'cached',
      lastUpdated: timestamp,
    };
    
    // Update cache
    dataCache = responseData;
    cacheTimestamp = now;
    
    return new Response(
      JSON.stringify({ success: true, data: responseData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching gold spread:', error);
    
    // Return cached data if available
    if (dataCache) {
      return new Response(
        JSON.stringify({ success: true, data: { ...dataCache, dataSource: 'cached' } }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
