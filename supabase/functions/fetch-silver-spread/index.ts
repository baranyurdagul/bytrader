const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SilverSpreadData {
  comex: {
    price: number;  // USD per troy oz
    change: number;
    changePercent: number;
    source: string;
    lastUpdated: string;
  };
  shanghai: {
    priceUSD: number;  // Converted to USD per troy oz
    priceCNY: number;  // Original CNY per kg
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
let dataCache: SilverSpreadData | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 60 * 1000; // 1 minute (reduced for fresher data)

// Conversion constants
const GRAMS_PER_TROY_OZ = 31.1035;
const GRAMS_PER_KG = 1000;

// SLV holds roughly 0.885 oz of silver per share
// So spot silver = SLV price / 0.885
const SLV_OZ_PER_SHARE = 0.885;

// Fetch COMEX silver spot price via SLV ETF from Yahoo Finance
async function fetchComexSilver(): Promise<{ price: number; change: number; changePercent: number } | null> {
  try {
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/SLV?interval=1d&range=2d`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      }
    );
    
    if (!response.ok) {
      console.error(`Yahoo Finance error for SLV:`, response.status);
      return null;
    }
    
    const data = await response.json();
    const result = data?.chart?.result?.[0];
    
    if (!result?.meta?.regularMarketPrice) {
      console.error(`No price data for SLV`);
      return null;
    }
    
    const meta = result.meta;
    const slvPrice = meta.regularMarketPrice;
    const slvPrevClose = meta.chartPreviousClose || meta.previousClose || slvPrice;
    
    // Convert SLV ETF price to spot silver price per oz
    const spotPrice = slvPrice / SLV_OZ_PER_SHARE;
    const spotPrevClose = slvPrevClose / SLV_OZ_PER_SHARE;
    
    // Sanity check: silver prices should be reasonable (between $20 and $100/oz)
    if (spotPrice < 20 || spotPrice > 100) {
      console.error(`Suspicious silver spot price: $${spotPrice.toFixed(2)} - skipping`);
      return null;
    }
    
    const change = spotPrice - spotPrevClose;
    const changePercent = spotPrevClose ? (change / spotPrevClose) * 100 : 0;
    
    console.log(`COMEX Silver Spot (via SLV): $${spotPrice.toFixed(2)}/oz (SLV: $${slvPrice.toFixed(2)})`);
    return { price: spotPrice, change, changePercent };
  } catch (error) {
    console.error(`Error fetching SLV:`, error);
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

// Fetch Shanghai Silver Benchmark from SGE (Chinese site has data in HTML)
async function fetchShanghaiSilver(): Promise<{ priceCNY: number; session: 'AM' | 'PM'; date: string } | null> {
  try {
    // Use the Chinese SGE website which has the data embedded in static HTML
    const response = await fetch('https://www.sge.com.cn/web/guest/silver', {
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
    console.log(`SGE Chinese HTML length: ${html.length} chars`);
    
    // Look for Shanghai Silver benchmark data in the Chinese page
    // Pattern: 上海银早盘价（元/千克）</p><span class="colorRed fs20">29485</span>
    // Pattern: 上海银午盘价（元/千克）</p><span class="colorRed fs20">27980</span>
    
    // Extract AM price (早盘价)
    const amPriceMatch = html.match(/上海银早盘价[^>]*>[^<]*<span[^>]*>(\d+)/);
    // Extract PM price (午盘价)
    const pmPriceMatch = html.match(/上海银午盘价[^>]*>[^<]*<span[^>]*>(\d+)/);
    // Extract date (行情日期)
    const dateMatch = html.match(/行情日期[：:]\s*(\d{4}-\d{2}-\d{2})/);
    
    const amPrice = amPriceMatch ? parseInt(amPriceMatch[1], 10) : 0;
    const pmPrice = pmPriceMatch ? parseInt(pmPriceMatch[1], 10) : 0;
    const date = dateMatch ? dateMatch[1].replace(/-/g, '') : new Date().toISOString().slice(0, 10).replace(/-/g, '');
    
    console.log(`SGE parsed - AM: ${amPrice}, PM: ${pmPrice}, Date: ${date}`);
    
    if (pmPrice > 0 || amPrice > 0) {
      const priceCNY = pmPrice > 0 ? pmPrice : amPrice;
      const session: 'AM' | 'PM' = pmPrice > 0 ? 'PM' : 'AM';
      
      console.log(`Shanghai Silver (SHAG): ¥${priceCNY}/kg (${session} session, date: ${date})`);
      return { priceCNY, session, date };
    }
    
    // Fallback: Look for alternative patterns
    // Pattern: fs20">29485</span>
    const pricePattern = /上海银[^<]*<[^>]*>(\d{4,5})/g;
    const prices = [...html.matchAll(pricePattern)];
    
    if (prices.length >= 2) {
      const price1 = parseInt(prices[0][1], 10);
      const price2 = parseInt(prices[1][1], 10);
      const priceCNY = price2 > 0 ? price2 : price1;
      const session: 'AM' | 'PM' = price2 > 0 ? 'PM' : 'AM';
      
      console.log(`Shanghai Silver (fallback): ¥${priceCNY}/kg (${session} session)`);
      return { priceCNY, session, date };
    }
    
    console.error('Could not parse Shanghai Silver price from SGE Chinese site');
    
    // Log some context for debugging
    const silverIndex = html.indexOf('上海银');
    if (silverIndex > -1) {
      console.log(`Context around 上海银: ${html.substring(silverIndex, silverIndex + 300)}`);
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching Shanghai silver:', error);
    return null;
  }
}

// Convert CNY per kg to USD per troy oz
function convertToUSDPerOz(priceCNYPerKg: number, usdcnyRate: number): number {
  // 1 kg = 1000 grams
  // 1 troy oz = 31.1035 grams
  // Price in CNY/kg → Price in CNY/oz → Price in USD/oz
  const pricePerGram = priceCNYPerKg / GRAMS_PER_KG;
  const pricePerOzCNY = pricePerGram * GRAMS_PER_TROY_OZ;
  const pricePerOzUSD = pricePerOzCNY / usdcnyRate;
  return pricePerOzUSD;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Fetching Shanghai vs COMEX silver spread...');
    
    // Check cache first
    const now = Date.now();
    if (dataCache && (now - cacheTimestamp) < CACHE_DURATION) {
      console.log('Returning cached silver spread data');
      return new Response(
        JSON.stringify({ success: true, data: { ...dataCache, dataSource: 'cached' } }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Fetch all data in parallel
    const [comexResult, shanghaiResult, exchangeRate] = await Promise.all([
      fetchComexSilver(),
      fetchShanghaiSilver(),
      fetchExchangeRate(),
    ]);
    
    const timestamp = new Date().toISOString();
    
    // Build response with available data
    if (!comexResult) {
      console.error('COMEX silver data unavailable');
      if (dataCache) {
        return new Response(
          JSON.stringify({ success: true, data: { ...dataCache, dataSource: 'cached' } }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      return new Response(
        JSON.stringify({ success: false, error: 'COMEX silver data unavailable' }),
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
        spreadValue > 0.1 ? 'premium' : (spreadValue < -0.1 ? 'discount' : 'neutral');
      
      spreadData = {
        value: Math.round(spreadValue * 100) / 100,
        percent: Math.round(spreadPercent * 100) / 100,
        direction,
      };
      
      console.log(`Spread: $${spreadValue.toFixed(2)} (${spreadPercent.toFixed(2)}%)`);
    }
    
    const responseData: SilverSpreadData = {
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
    console.error('Error fetching silver spread:', error);
    
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
