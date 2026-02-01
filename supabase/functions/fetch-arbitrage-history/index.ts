import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

interface DbSnapshot {
  snapshot_date: string;
  gold_comex_price: number;
  gold_shanghai_price: number;
  gold_spread_percent: number;
  silver_comex_price: number;
  silver_shanghai_price: number;
  silver_spread_percent: number;
}

// Cache for API data
const historyCache: Map<string, { data: ArbitragePoint[], timestamp: number }> = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const url = new URL(req.url);
    const period = url.searchParams.get('period') || '1W';
    
    const daysMap: Record<string, number> = {
      '1D': 1,
      '1W': 7,
      '1M': 30,
    };
    const days = daysMap[period] || 7;
    
    const cacheKey = `arbitrage-db-${period}`;
    const cached = historyCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log(`Returning cached arbitrage history for ${period}`);
      return new Response(
        JSON.stringify({ success: true, data: cached.data, period, dataSource: 'cached' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`Fetching arbitrage history from database for ${period} (${days} days)...`);
    
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    // Fetch from database
    const { data: snapshots, error } = await supabase
      .from('arbitrage_snapshots')
      .select('*')
      .gte('snapshot_date', startDate.toISOString().split('T')[0])
      .lte('snapshot_date', endDate.toISOString().split('T')[0])
      .order('snapshot_date', { ascending: true });

    if (error) {
      console.error('Database error:', error);
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Transform database records to ArbitragePoint format
    const arbitrageHistory: ArbitragePoint[] = (snapshots || []).map((s: DbSnapshot) => ({
      timestamp: new Date(s.snapshot_date).getTime(),
      goldSpreadPercent: Number(s.gold_spread_percent),
      silverSpreadPercent: Number(s.silver_spread_percent),
      goldComex: Number(s.gold_comex_price),
      goldShanghai: Number(s.gold_shanghai_price),
      silverComex: Number(s.silver_comex_price),
      silverShanghai: Number(s.silver_shanghai_price),
    }));

    // Cache the result
    historyCache.set(cacheKey, { data: arbitrageHistory, timestamp: Date.now() });
    
    console.log(`Returning ${arbitrageHistory.length} arbitrage history points from database for ${period}`);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        data: arbitrageHistory, 
        period,
        dataSource: arbitrageHistory.length > 0 ? 'database' : 'empty',
        recordCount: arbitrageHistory.length,
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
