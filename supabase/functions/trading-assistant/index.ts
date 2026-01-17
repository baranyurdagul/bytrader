import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BASE_SYSTEM_PROMPT = `You are an expert trading assistant specializing in commodities (Gold, Silver, Copper) and cryptocurrencies (Bitcoin, Ethereum). You provide:

1. **Market Analysis**: Technical and fundamental analysis, price trends, support/resistance levels
2. **Trading Signals**: Explain buy/sell signals, momentum indicators (RSI, MACD, Moving Averages)
3. **Risk Assessment**: Market volatility, geopolitical factors, economic indicators affecting prices
4. **Portfolio Insights**: Diversification strategies, position sizing, risk management

Guidelines:
- Be concise but informative
- Use bullet points for clarity when appropriate
- Include specific price levels when discussing support/resistance
- Mention relevant technical indicators
- Always remind users that this is educational and not financial advice
- Use emojis sparingly for visual clarity (📈 📉 ⚠️ 💡)

Current market context (January 2026):
- Gold: ~$4,500/oz (historic highs due to economic uncertainty)
- Silver: ~$90/oz (strong industrial demand + investment)
- Bitcoin: ~$105,000 (post-halving rally)
- Ethereum: ~$4,200 (DeFi growth)

When users ask about specific assets, provide current context and what to watch for.`;

function buildSystemPrompt(portfolio: any): string {
  if (!portfolio || !portfolio.positions || portfolio.positions.length === 0) {
    return BASE_SYSTEM_PROMPT + "\n\nThe user has no portfolio data available.";
  }

  const positionsSummary = portfolio.positions.map((p: any) => 
    `- ${p.asset_name} (${p.asset_symbol}): ${p.quantity.toFixed(4)} units, avg buy $${p.averageBuyPrice.toFixed(2)}, current value $${p.currentValue.toFixed(2)}, P/L: ${p.profitLoss >= 0 ? '+' : ''}$${p.profitLoss.toFixed(2)} (${p.profitLossPercent >= 0 ? '+' : ''}${p.profitLossPercent.toFixed(1)}%)`
  ).join('\n');

  return `${BASE_SYSTEM_PROMPT}

**USER'S CURRENT PORTFOLIO:**
${positionsSummary}

**Portfolio Summary:**
- Total Value: $${portfolio.totalValue.toFixed(2)}
- Total P/L: ${portfolio.totalProfitLoss >= 0 ? '+' : ''}$${portfolio.totalProfitLoss.toFixed(2)} (${portfolio.totalProfitLossPercent >= 0 ? '+' : ''}${portfolio.totalProfitLossPercent.toFixed(1)}%)

Use this portfolio data to provide personalized insights when relevant. Reference specific holdings when giving advice.`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, portfolio } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = buildSystemPrompt(portfolio);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please try again later." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "Failed to get AI response" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Trading assistant error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
