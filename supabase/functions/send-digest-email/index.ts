import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface DigestRequest {
  testMode?: boolean;
  userId?: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("send-digest-email function invoked");
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: DigestRequest = await req.json().catch(() => ({}));
    const isTestMode = body.testMode === true;
    const specificUserId = body.userId;

    console.log("Test mode:", isTestMode, "Specific user:", specificUserId);

    // Get users who have email digest enabled
    let query = supabase
      .from('notification_preferences')
      .select('user_id, digest_frequency')
      .eq('email_enabled', true)
      .eq('email_digest', true);

    if (specificUserId) {
      query = query.eq('user_id', specificUserId);
    }

    const { data: digestUsers, error: prefError } = await query;

    if (prefError) {
      console.error("Error fetching digest preferences:", prefError);
      throw prefError;
    }

    console.log(`Found ${digestUsers?.length || 0} users with digest enabled`);

    const emailsSent: string[] = [];

    for (const userPref of digestUsers || []) {
      // Get user email from auth
      const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userPref.user_id);
      
      if (userError || !userData?.user?.email) {
        console.error(`Could not get email for user ${userPref.user_id}:`, userError);
        continue;
      }

      const userEmail = userData.user.email;
      console.log(`Processing digest for: ${userEmail}`);

      // Get user's triggered alerts from the last 24 hours (or all for test)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      const { data: triggeredAlerts, error: alertsError } = await supabase
        .from('price_alerts')
        .select('*')
        .eq('user_id', userPref.user_id)
        .eq('is_triggered', true)
        .gte('triggered_at', isTestMode ? '1970-01-01' : oneDayAgo)
        .order('triggered_at', { ascending: false });

      if (alertsError) {
        console.error(`Error fetching alerts for ${userEmail}:`, alertsError);
        continue;
      }

      // Get user's active alerts count
      const { count: activeAlertsCount } = await supabase
        .from('price_alerts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userPref.user_id)
        .eq('is_active', true);

      // Get user's watchlist
      const { data: watchlist } = await supabase
        .from('watchlist')
        .select('asset_name, asset_symbol')
        .eq('user_id', userPref.user_id)
        .limit(5);

      // Build the digest email
      const triggeredCount = triggeredAlerts?.length || 0;
      const watchlistItems = watchlist || [];
      
      const alertsHtml = triggeredAlerts && triggeredAlerts.length > 0
        ? triggeredAlerts.map(a => `
            <tr>
              <td style="padding: 12px; border-bottom: 1px solid #2a2a4a;">
                <strong style="color: #ffffff;">${a.asset_name}</strong>
                <span style="color: #888; font-size: 12px;"> (${a.asset_symbol})</span>
              </td>
              <td style="padding: 12px; border-bottom: 1px solid #2a2a4a; text-align: center;">
                <span style="color: ${a.condition === 'above' ? '#22c55e' : '#ef4444'};">
                  ${a.condition === 'above' ? '📈' : '📉'} ${a.condition}
                </span>
              </td>
              <td style="padding: 12px; border-bottom: 1px solid #2a2a4a; text-align: right; color: #ffffff;">
                $${a.triggered_price?.toFixed(2) || a.target_price.toFixed(2)}
              </td>
            </tr>
          `).join('')
        : `<tr><td colspan="3" style="padding: 20px; text-align: center; color: #888;">No alerts triggered ${isTestMode ? '' : 'in the last 24 hours'}</td></tr>`;

      const watchlistHtml = watchlistItems.length > 0
        ? watchlistItems.map(w => `
            <span style="display: inline-block; background: rgba(255,255,255,0.1); padding: 6px 12px; border-radius: 20px; margin: 4px; color: #ffffff; font-size: 13px;">
              ${w.asset_symbol}
            </span>
          `).join('')
        : '<span style="color: #888;">No assets in watchlist</span>';

      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; padding: 32px; border: 1px solid #2a2a4a;">
              
              <!-- Header -->
              <div style="text-align: center; margin-bottom: 32px;">
                <h1 style="color: #ffffff; font-size: 28px; margin: 0 0 8px 0;">
                  📊 Your Daily Market Digest
                </h1>
                <p style="color: #a0a0a0; font-size: 14px; margin: 0;">
                  ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  ${isTestMode ? ' (TEST EMAIL)' : ''}
                </p>
              </div>
              
              <!-- Summary Stats -->
              <div style="display: flex; gap: 16px; margin-bottom: 24px;">
                <div style="flex: 1; background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.3); border-radius: 12px; padding: 20px; text-align: center;">
                  <p style="color: #22c55e; font-size: 28px; font-weight: bold; margin: 0;">${triggeredCount}</p>
                  <p style="color: #a0a0a0; font-size: 12px; margin: 4px 0 0 0;">Alerts Triggered</p>
                </div>
                <div style="flex: 1; background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 12px; padding: 20px; text-align: center;">
                  <p style="color: #3b82f6; font-size: 28px; font-weight: bold; margin: 0;">${activeAlertsCount || 0}</p>
                  <p style="color: #a0a0a0; font-size: 12px; margin: 4px 0 0 0;">Active Alerts</p>
                </div>
              </div>
              
              <!-- Triggered Alerts -->
              <div style="background: rgba(255,255,255,0.05); border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                <h3 style="color: #ffffff; font-size: 16px; margin: 0 0 16px 0;">🔔 Triggered Alerts</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <thead>
                    <tr style="border-bottom: 2px solid #2a2a4a;">
                      <th style="padding: 8px 12px; text-align: left; color: #888; font-size: 11px; text-transform: uppercase;">Asset</th>
                      <th style="padding: 8px 12px; text-align: center; color: #888; font-size: 11px; text-transform: uppercase;">Condition</th>
                      <th style="padding: 8px 12px; text-align: right; color: #888; font-size: 11px; text-transform: uppercase;">Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${alertsHtml}
                  </tbody>
                </table>
              </div>
              
              <!-- Watchlist -->
              <div style="background: rgba(255,255,255,0.05); border-radius: 12px; padding: 20px;">
                <h3 style="color: #ffffff; font-size: 16px; margin: 0 0 12px 0;">👀 Your Watchlist</h3>
                <div>
                  ${watchlistHtml}
                </div>
              </div>
              
              <!-- Footer -->
              <div style="text-align: center; margin-top: 32px; padding-top: 24px; border-top: 1px solid rgba(255,255,255,0.1);">
                <p style="color: #666; font-size: 12px; margin: 0;">
                  You're receiving this because you enabled ${userPref.digest_frequency} email digests.
                </p>
              </div>
            </div>
            
            <p style="color: #555; font-size: 11px; text-align: center; margin-top: 24px;">
              Manage your notification preferences in the app settings.
            </p>
          </div>
        </body>
        </html>
      `;

      // Send the email
      const emailResponse = await resend.emails.send({
        from: "Market Digest <onboarding@resend.dev>",
        to: [userEmail],
        subject: `📊 Your ${isTestMode ? 'Test ' : ''}Daily Market Digest - ${triggeredCount} Alert${triggeredCount !== 1 ? 's' : ''} Triggered`,
        html: emailHtml,
      });

      console.log(`Digest email sent to ${userEmail}:`, emailResponse);
      emailsSent.push(userEmail);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      emailsSent,
      count: emailsSent.length 
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-digest-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
