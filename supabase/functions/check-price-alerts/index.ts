import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PriceAlert {
  id: string;
  user_id: string;
  asset_id: string;
  asset_name: string;
  asset_symbol: string;
  target_price: number;
  condition: 'above' | 'below';
  is_active: boolean;
  is_triggered: boolean;
}

interface NotificationPrefs {
  email_enabled: boolean;
  push_enabled: boolean;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
}

interface PriceData {
  id: string;
  price: number;
}

// Yahoo Finance tickers
const YAHOO_TICKERS: Record<string, string> = {
  gold: 'GC=F',
  silver: 'SI=F',
  copper: 'HG=F',
  nasdaq100: '^NDX',
  sp500: '^GSPC',
};

async function fetchYahooQuote(ticker: string): Promise<number | null> {
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
    const result = data?.chart?.result?.[0];
    return result?.meta?.regularMarketPrice || null;
  } catch (error) {
    console.error(`Error fetching Yahoo quote for ${ticker}:`, error);
    return null;
  }
}

async function fetchCryptoPrices(): Promise<Map<string, number>> {
  const prices = new Map<string, number>();
  try {
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd'
    );
    
    if (response.ok) {
      const data = await response.json();
      if (data.bitcoin?.usd) prices.set('bitcoin', data.bitcoin.usd);
      if (data.ethereum?.usd) prices.set('ethereum', data.ethereum.usd);
    }
  } catch (error) {
    console.error('Error fetching crypto prices:', error);
  }
  return prices;
}

async function fetchAllPrices(): Promise<Map<string, number>> {
  const prices = new Map<string, number>();
  
  // Fetch Yahoo Finance prices in parallel
  const yahooPromises = Object.entries(YAHOO_TICKERS).map(async ([id, ticker]) => {
    const price = await fetchYahooQuote(ticker);
    if (price) prices.set(id, price);
  });
  
  // Fetch crypto prices
  const cryptoPromise = fetchCryptoPrices().then(cryptoPrices => {
    cryptoPrices.forEach((price, id) => prices.set(id, price));
  });
  
  await Promise.all([...yahooPromises, cryptoPromise]);
  
  console.log(`Fetched ${prices.size} prices for alert checking`);
  return prices;
}

function isInQuietHours(prefs: NotificationPrefs): boolean {
  if (!prefs.quiet_hours_enabled || !prefs.quiet_hours_start || !prefs.quiet_hours_end) {
    return false;
  }
  
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  
  const [startH, startM] = prefs.quiet_hours_start.split(':').map(Number);
  const [endH, endM] = prefs.quiet_hours_end.split(':').map(Number);
  
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;
  
  if (startMinutes <= endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  } else {
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }
}

function formatPrice(price: number): string {
  if (price >= 1000) {
    return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return price.toFixed(price < 10 ? 4 : 2);
}

async function sendEmailNotification(
  supabase: any,
  alert: PriceAlert,
  currentPrice: number
): Promise<void> {
  try {
    const { error } = await supabase.functions.invoke('send-alert-email', {
      body: {
        asset_name: alert.asset_name,
        asset_symbol: alert.asset_symbol,
        target_price: alert.target_price,
        current_price: currentPrice,
        condition: alert.condition,
        alert_id: alert.id,
      },
    });
    
    if (error) {
      console.error('Failed to send email notification:', error);
    } else {
      console.log(`Email sent for alert ${alert.id}`);
    }
  } catch (error) {
    console.error('Error sending email notification:', error);
  }
}

async function sendPushNotification(
  supabase: any,
  alert: PriceAlert,
  currentPrice: number
): Promise<void> {
  try {
    const title = `📊 ${alert.asset_symbol} Alert Triggered!`;
    const body = `${alert.asset_name} is now $${formatPrice(currentPrice)} (${alert.condition} $${formatPrice(alert.target_price)})`;
    
    const { error } = await supabase.functions.invoke('send-push-notification', {
      body: {
        userId: alert.user_id,
        title,
        body,
        tag: `alert-${alert.id}`,
        alertId: alert.id,
        url: '/alerts',
      },
    });
    
    if (error) {
      console.error('Failed to send push notification:', error);
    } else {
      console.log(`Push notification sent for alert ${alert.id}`);
    }
  } catch (error) {
    console.error('Error sending push notification:', error);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting scheduled price alert check...');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Fetch current prices
    const currentPrices = await fetchAllPrices();
    
    if (currentPrices.size === 0) {
      console.log('No prices fetched, skipping alert check');
      return new Response(
        JSON.stringify({ success: true, message: 'No prices available', triggered: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Get all active, non-triggered alerts
    const { data: alerts, error: alertsError } = await supabase
      .from('price_alerts')
      .select('*')
      .eq('is_active', true)
      .eq('is_triggered', false);
    
    if (alertsError) {
      console.error('Error fetching alerts:', alertsError);
      throw alertsError;
    }
    
    if (!alerts || alerts.length === 0) {
      console.log('No active alerts to check');
      return new Response(
        JSON.stringify({ success: true, message: 'No active alerts', triggered: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`Checking ${alerts.length} active alerts against ${currentPrices.size} prices`);
    
    // Get notification preferences for all users with alerts
    const userIds = [...new Set(alerts.map(a => a.user_id))];
    const { data: allPrefs } = await supabase
      .from('notification_preferences')
      .select('*')
      .in('user_id', userIds);
    
    const prefsMap = new Map<string, NotificationPrefs>();
    allPrefs?.forEach(p => prefsMap.set(p.user_id, p));
    
    const triggeredAlerts: string[] = [];
    const now = new Date().toISOString();
    
    for (const alert of alerts) {
      const currentPrice = currentPrices.get(alert.asset_id);
      
      if (currentPrice === undefined) {
        continue;
      }
      
      const shouldTrigger = 
        (alert.condition === 'above' && currentPrice >= alert.target_price) ||
        (alert.condition === 'below' && currentPrice <= alert.target_price);
      
      if (shouldTrigger) {
        console.log(`Alert triggered: ${alert.asset_name} ${alert.condition} $${alert.target_price} (current: $${currentPrice})`);
        
        // Update alert as triggered
        const { error: updateError } = await supabase
          .from('price_alerts')
          .update({
            is_triggered: true,
            is_active: false,
            triggered_at: now,
            triggered_price: currentPrice,
          })
          .eq('id', alert.id);
        
        if (updateError) {
          console.error('Error updating alert:', updateError);
          continue;
        }
        
        triggeredAlerts.push(alert.id);
        
        // Check notification preferences
        const prefs = prefsMap.get(alert.user_id);
        const inQuietHours = prefs && isInQuietHours(prefs);
        
        if (inQuietHours) {
          console.log(`User ${alert.user_id} is in quiet hours, skipping notifications`);
          continue;
        }
        
        // Send email notification if enabled
        if (prefs?.email_enabled) {
          await sendEmailNotification(supabase, alert, currentPrice);
        }
        
        // Send push notification if enabled
        if (prefs?.push_enabled) {
          await sendPushNotification(supabase, alert, currentPrice);
        }
      }
    }
    
    console.log(`Alert check complete. Triggered: ${triggeredAlerts.length}`);
    
    return new Response(
      JSON.stringify({
        success: true,
        message: `Checked ${alerts.length} alerts`,
        triggered: triggeredAlerts.length,
        triggeredAlerts,
        timestamp: now,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in check-price-alerts:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
