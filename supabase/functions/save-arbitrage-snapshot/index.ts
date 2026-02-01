import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Conversion constants (same as other functions)
const GLD_OZ_PER_SHARE = 0.091;
const SLV_OZ_PER_SHARE = 0.885;
const GRAMS_PER_TROY_OZ = 31.1035;

async function fetchYahooPrice(ticker: string): Promise<number | null> {
  try {
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      }
    );
    
    if (!response.ok) return null;
    
    const data = await response.json();
    const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
    return price || null;
  } catch (error) {
    console.error(`Error fetching ${ticker}:`, error);
    return null;
  }
}

async function fetchShanghaiGoldPrice(): Promise<number | null> {
  try {
    const response = await fetch('https://www.sge.com.cn/graph/Ede_Au9999', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Referer': 'https://www.sge.com.cn/',
      },
    });
    
    if (!response.ok) return null;
    
    const data = await response.json();
    if (data && data.price) {
      return parseFloat(data.price);
    }
    return null;
  } catch (error) {
    console.error('Error fetching Shanghai gold:', error);
    return null;
  }
}

async function fetchShanghaiBenchmarkPrice(type: 'gold' | 'silver'): Promise<number | null> {
  try {
    const url = type === 'gold' 
      ? 'https://www.sge.com.cn/graph/AuFix_PM'
      : 'https://www.sge.com.cn/graph/Ede_Ag9999';
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Referer': 'https://www.sge.com.cn/',
      },
    });
    
    if (!response.ok) return null;
    
    const data = await response.json();
    if (data && data.price) {
      return parseFloat(data.price);
    }
    return null;
  } catch (error) {
    console.error(`Error fetching Shanghai ${type}:`, error);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Fetching current arbitrage data for snapshot...');

    // Fetch all required data in parallel
    const [gldPrice, slvPrice, exchangeRate, shanghaiGold, shanghaiSilver] = await Promise.all([
      fetchYahooPrice('GLD'),
      fetchYahooPrice('SLV'),
      fetchYahooPrice('CNY=X'),
      fetchShanghaiBenchmarkPrice('gold'),
      fetchShanghaiBenchmarkPrice('silver'),
    ]);

    if (!gldPrice || !slvPrice) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unable to fetch ETF prices' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const usdCnyRate = exchangeRate || 7.25;
    
    // Calculate COMEX prices from ETFs
    const goldComex = gldPrice / GLD_OZ_PER_SHARE;
    const silverComex = slvPrice / SLV_OZ_PER_SHARE;

    // Calculate Shanghai prices in USD/oz
    let goldShanghai: number;
    let silverShanghai: number;

    if (shanghaiGold) {
      // Convert CNY/gram to USD/oz
      goldShanghai = (shanghaiGold * GRAMS_PER_TROY_OZ) / usdCnyRate;
    } else {
      // Estimate based on typical premium if SGE unavailable
      goldShanghai = goldComex * 1.03;
    }

    if (shanghaiSilver) {
      // Convert CNY/kg to USD/oz
      silverShanghai = (shanghaiSilver / 1000 * GRAMS_PER_TROY_OZ) / usdCnyRate;
    } else {
      silverShanghai = silverComex * 1.025;
    }

    // Calculate spreads
    const goldSpreadPercent = ((goldShanghai - goldComex) / goldComex) * 100;
    const silverSpreadPercent = ((silverShanghai - silverComex) / silverComex) * 100;

    // Get today's date in UTC
    const today = new Date().toISOString().split('T')[0];

    console.log(`Saving snapshot for ${today}:`, {
      goldComex: goldComex.toFixed(2),
      goldShanghai: goldShanghai.toFixed(2),
      goldSpreadPercent: goldSpreadPercent.toFixed(2),
      silverComex: silverComex.toFixed(2),
      silverShanghai: silverShanghai.toFixed(2),
      silverSpreadPercent: silverSpreadPercent.toFixed(2),
    });

    // Upsert the snapshot (update if exists for today, insert if not)
    const { data, error } = await supabase
      .from('arbitrage_snapshots')
      .upsert({
        snapshot_date: today,
        gold_comex_price: Math.round(goldComex * 100) / 100,
        gold_shanghai_price: Math.round(goldShanghai * 100) / 100,
        gold_spread_percent: Math.round(goldSpreadPercent * 100) / 100,
        silver_comex_price: Math.round(silverComex * 100) / 100,
        silver_shanghai_price: Math.round(silverShanghai * 100) / 100,
        silver_spread_percent: Math.round(silverSpreadPercent * 100) / 100,
        usd_cny_rate: Math.round(usdCnyRate * 10000) / 10000,
      }, {
        onConflict: 'snapshot_date',
      })
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Snapshot saved successfully:', data);

    return new Response(
      JSON.stringify({ 
        success: true, 
        snapshot: data,
        sources: {
          goldShanghai: shanghaiGold ? 'SGE' : 'estimated',
          silverShanghai: shanghaiSilver ? 'SGE' : 'estimated',
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error saving arbitrage snapshot:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
