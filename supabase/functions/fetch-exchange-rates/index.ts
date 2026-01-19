import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExchangeRateResponse {
  result: string;
  base_code: string;
  rates: Record<string, number>;
  time_last_update_utc: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const base = url.searchParams.get('base') || 'USD';
    
    // Fetch from ExchangeRate-API (free, no key required)
    const response = await fetch(`https://open.er-api.com/v6/latest/${base}`);
    
    if (!response.ok) {
      throw new Error(`Exchange rate API returned ${response.status}`);
    }
    
    const data: ExchangeRateResponse = await response.json();
    
    if (data.result !== 'success') {
      throw new Error('Exchange rate API returned unsuccessful result');
    }
    
    // Filter to main currencies requested + some popular ones
    const mainCurrencies = ['USD', 'EUR', 'AED', 'QAR', 'TRY', 'GBP', 'SAR', 'KWD', 'BHD', 'OMR', 'EGP', 'INR', 'PKR', 'CNY', 'JPY', 'CHF', 'CAD', 'AUD'];
    
    const filteredRates: Record<string, number> = {};
    for (const currency of mainCurrencies) {
      if (data.rates[currency] !== undefined) {
        filteredRates[currency] = data.rates[currency];
      }
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        base: data.base_code,
        rates: filteredRates,
        lastUpdated: data.time_last_update_utc,
        allRates: data.rates, // Include all rates for flexibility
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error fetching exchange rates:', error);
    
    // Return fallback rates if API fails
    const fallbackRates: Record<string, number> = {
      USD: 1,
      EUR: 0.92,
      AED: 3.67,
      QAR: 3.64,
      TRY: 34.15,
      GBP: 0.79,
      SAR: 3.75,
      KWD: 0.31,
      BHD: 0.38,
      OMR: 0.38,
      EGP: 50.85,
      INR: 86.50,
      PKR: 278.50,
      CNY: 7.25,
      JPY: 156.50,
      CHF: 0.89,
      CAD: 1.44,
      AUD: 1.60,
    };
    
    return new Response(
      JSON.stringify({
        success: true,
        base: 'USD',
        rates: fallbackRates,
        lastUpdated: new Date().toUTCString(),
        allRates: fallbackRates,
        isFallback: true,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
