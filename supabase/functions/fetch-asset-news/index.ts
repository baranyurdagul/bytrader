import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NewsRequest {
  assetName: string;
  assetSymbol: string;
}

interface NewsItem {
  title: string;
  summary: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  timestamp: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { assetName, assetSymbol }: NewsRequest = await req.json();

    if (!assetName) {
      return new Response(
        JSON.stringify({ error: 'Asset name is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Fetching news for ${assetName} (${assetSymbol})`);

    const prompt = `Generate 5 realistic financial news headlines about ${assetName} (${assetSymbol}) that could appear in financial news today. For each headline, provide:
1. A concise headline (max 100 chars)
2. A brief summary (1-2 sentences)
3. Sentiment: positive, negative, or neutral
4. Timestamp: a realistic time from the past 24 hours in relative format (e.g., "2h ago", "45m ago", "Just now", "5h ago")

Format your response as a JSON array with objects containing: title, summary, sentiment, timestamp

Example format:
[
  {"title": "Gold Prices Rise...", "summary": "Gold prices increased...", "sentiment": "positive", "timestamp": "2h ago"},
  ...
]

Make the headlines diverse covering different aspects like price movements, market analysis, institutional activity, and economic factors. Be realistic and current-sounding. Vary the timestamps to make them look natural.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: 'You are a financial news generator. Always respond with valid JSON only, no markdown formatting.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch news' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    console.log('AI response:', content);

    // Parse the JSON from the response
    let news: NewsItem[] = [];
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        news = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error('Failed to parse news JSON:', parseError);
      // Return empty news array on parse failure
    }

    return new Response(
      JSON.stringify({ news }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in fetch-asset-news:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
