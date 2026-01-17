import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface AlertEmailRequest {
  alertId: string;
  assetName: string;
  assetSymbol: string;
  condition: string;
  targetPrice: number;
  currentPrice: number;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("send-alert-email function invoked");
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get user from auth header
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      console.error("No authorization header provided");
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create Supabase client with user's auth
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error("User auth error:", userError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("User authenticated:", user.email);

    const { assetName, assetSymbol, condition, targetPrice, currentPrice }: AlertEmailRequest = await req.json();
    
    console.log("Alert details:", { assetName, assetSymbol, condition, targetPrice, currentPrice });

    if (!user.email) {
      console.error("User has no email");
      return new Response(
        JSON.stringify({ error: "User has no email" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const formattedTargetPrice = targetPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const formattedCurrentPrice = currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const conditionText = condition === 'above' ? 'risen above' : 'fallen below';
    const emoji = condition === 'above' ? '📈' : '📉';

    const emailResponse = await resend.emails.send({
      from: "Price Alerts <onboarding@resend.dev>",
      to: [user.email],
      subject: `${emoji} Price Alert: ${assetName} ${conditionText} $${formattedTargetPrice}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; padding: 32px; border: 1px solid #2a2a4a;">
              <div style="text-align: center; margin-bottom: 32px;">
                <h1 style="color: #ffffff; font-size: 28px; margin: 0 0 8px 0;">
                  ${emoji} Price Alert Triggered
                </h1>
                <p style="color: #a0a0a0; font-size: 14px; margin: 0;">
                  Your price alert has been triggered
                </p>
              </div>
              
              <div style="background: rgba(255,255,255,0.05); border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                <div style="text-align: center;">
                  <p style="color: #a0a0a0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 8px 0;">Asset</p>
                  <h2 style="color: #ffffff; font-size: 24px; margin: 0 0 4px 0;">${assetName}</h2>
                  <p style="color: #888; font-size: 14px; margin: 0;">${assetSymbol}</p>
                </div>
              </div>
              
              <div style="display: flex; gap: 16px; margin-bottom: 24px;">
                <div style="flex: 1; background: rgba(255,255,255,0.05); border-radius: 12px; padding: 20px; text-align: center;">
                  <p style="color: #a0a0a0; font-size: 12px; margin: 0 0 8px 0;">Target Price</p>
                  <p style="color: #ffffff; font-size: 20px; font-weight: bold; margin: 0;">$${formattedTargetPrice}</p>
                </div>
                <div style="flex: 1; background: rgba(255,255,255,0.05); border-radius: 12px; padding: 20px; text-align: center;">
                  <p style="color: #a0a0a0; font-size: 12px; margin: 0 0 8px 0;">Current Price</p>
                  <p style="color: ${condition === 'above' ? '#22c55e' : '#ef4444'}; font-size: 20px; font-weight: bold; margin: 0;">$${formattedCurrentPrice}</p>
                </div>
              </div>
              
              <div style="background: ${condition === 'above' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)'}; border: 1px solid ${condition === 'above' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}; border-radius: 12px; padding: 16px; text-align: center;">
                <p style="color: ${condition === 'above' ? '#22c55e' : '#ef4444'}; font-size: 16px; margin: 0;">
                  ${assetSymbol} has ${conditionText} your target of $${formattedTargetPrice}
                </p>
              </div>
              
              <div style="text-align: center; margin-top: 32px; padding-top: 24px; border-top: 1px solid rgba(255,255,255,0.1);">
                <p style="color: #666; font-size: 12px; margin: 0;">
                  This alert was triggered on ${new Date().toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })}
                </p>
              </div>
            </div>
            
            <p style="color: #555; font-size: 11px; text-align: center; margin-top: 24px;">
              You received this email because you set up a price alert. 
            </p>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-alert-email function:", error);
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