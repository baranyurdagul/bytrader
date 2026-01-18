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
  url: string;
  source: string;
}

// Map asset IDs to Yahoo Finance ticker symbols for RSS feeds
const TICKER_MAP: Record<string, string> = {
  'gold': 'GC=F',
  'silver': 'SI=F',
  'XAU/USD': 'GC=F',
  'XAG/USD': 'SI=F',
  'bitcoin': 'BTC-USD',
  'ethereum': 'ETH-USD',
  'BTC/USD': 'BTC-USD',
  'ETH/USD': 'ETH-USD',
  'nasdaq100': '^NDX',
  'sp500': '^GSPC',
  'NDX': '^NDX',
  'SPX': '^GSPC',
  'vym': 'VYM',
  'vymi': 'VYMI',
  'gldm': 'GLDM',
  'slv': 'SLV',
};

// Simple sentiment analysis based on keywords
function analyzeSentiment(text: string): 'positive' | 'negative' | 'neutral' {
  const lowerText = text.toLowerCase();
  
  const positiveWords = [
    'surge', 'jump', 'rise', 'gain', 'rally', 'bullish', 'soar', 'climb',
    'record high', 'breakthrough', 'optimism', 'growth', 'boost', 'uptick',
    'outperform', 'beat', 'positive', 'strong', 'higher', 'up', 'advances'
  ];
  
  const negativeWords = [
    'drop', 'fall', 'decline', 'crash', 'plunge', 'bearish', 'slump', 'sink',
    'record low', 'concern', 'fear', 'loss', 'downturn', 'selloff', 'sell-off',
    'underperform', 'miss', 'negative', 'weak', 'lower', 'down', 'tumble'
  ];
  
  let positiveScore = 0;
  let negativeScore = 0;
  
  for (const word of positiveWords) {
    if (lowerText.includes(word)) positiveScore++;
  }
  
  for (const word of negativeWords) {
    if (lowerText.includes(word)) negativeScore++;
  }
  
  if (positiveScore > negativeScore) return 'positive';
  if (negativeScore > positiveScore) return 'negative';
  return 'neutral';
}

// Format timestamp
function formatTimestamp(pubDate: string): string {
  try {
    const date = new Date(pubDate);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 5) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  } catch {
    return 'Recently';
  }
}

// Extract text between XML tags using regex
function extractTag(xml: string, tag: string): string {
  const regex = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>|<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i');
  const match = xml.match(regex);
  if (match) {
    return (match[1] || match[2] || '').trim();
  }
  return '';
}

// Parse RSS XML using regex (works in Deno edge functions)
function parseRSSItems(xml: string): Array<{ title: string; link: string; description: string; pubDate: string }> {
  const items: Array<{ title: string; link: string; description: string; pubDate: string }> = [];
  
  // Find all <item> blocks
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match;
  
  while ((match = itemRegex.exec(xml)) !== null) {
    const itemXml = match[1];
    const title = extractTag(itemXml, 'title');
    const link = extractTag(itemXml, 'link');
    const description = extractTag(itemXml, 'description');
    const pubDate = extractTag(itemXml, 'pubDate');
    
    if (title) {
      items.push({ title, link, description, pubDate });
    }
  }
  
  return items;
}

// Fetch news from Yahoo Finance RSS
async function fetchYahooRSS(ticker: string): Promise<NewsItem[]> {
  try {
    const rssUrl = `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${encodeURIComponent(ticker)}&region=US&lang=en-US`;
    console.log(`Fetching RSS from: ${rssUrl}`);
    
    const response = await fetch(rssUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });
    
    if (!response.ok) {
      console.error(`RSS fetch failed: ${response.status}`);
      return [];
    }
    
    const xml = await response.text();
    console.log(`Received ${xml.length} bytes of XML`);
    
    const items = parseRSSItems(xml);
    console.log(`Parsed ${items.length} items`);
    
    const news: NewsItem[] = items.slice(0, 5).map(item => {
      const cleanDescription = item.description.replace(/<[^>]*>/g, '').trim();
      
      return {
        title: item.title,
        summary: cleanDescription || item.title,
        sentiment: analyzeSentiment(item.title + ' ' + cleanDescription),
        timestamp: formatTimestamp(item.pubDate),
        url: item.link,
        source: 'Yahoo Finance',
      };
    });
    
    return news;
  } catch (error) {
    console.error('Error fetching Yahoo RSS:', error);
    return [];
  }
}

// Fetch general finance news
async function fetchGeneralFinanceNews(): Promise<NewsItem[]> {
  try {
    const rssUrl = 'https://finance.yahoo.com/news/rssindex';
    console.log('Fetching general finance news');
    
    const response = await fetch(rssUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });
    
    if (!response.ok) {
      console.error(`General RSS fetch failed: ${response.status}`);
      return [];
    }
    
    const xml = await response.text();
    const items = parseRSSItems(xml);
    
    return items.slice(0, 10).map(item => {
      const cleanDescription = item.description.replace(/<[^>]*>/g, '').trim();
      
      return {
        title: item.title,
        summary: cleanDescription || item.title,
        sentiment: analyzeSentiment(item.title + ' ' + cleanDescription),
        timestamp: formatTimestamp(item.pubDate),
        url: item.link,
        source: 'Yahoo Finance',
      };
    });
  } catch (error) {
    console.error('Error fetching general news:', error);
    return [];
  }
}

serve(async (req: Request) => {
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

    console.log(`Fetching real news for ${assetName} (${assetSymbol})`);

    const assetId = assetName.toLowerCase().replace(/\s+/g, '');
    const ticker = TICKER_MAP[assetId] || TICKER_MAP[assetSymbol] || assetSymbol;
    
    console.log(`Using ticker: ${ticker}`);
    
    let news = await fetchYahooRSS(ticker);
    
    if (news.length === 0) {
      console.log('No ticker-specific news, fetching general news...');
      const generalNews = await fetchGeneralFinanceNews();
      
      const keywords = [assetName.toLowerCase(), assetSymbol.toLowerCase()];
      news = generalNews.filter(item => {
        const text = (item.title + ' ' + item.summary).toLowerCase();
        return keywords.some(kw => text.includes(kw));
      }).slice(0, 5);
      
      if (news.length === 0) {
        news = generalNews.slice(0, 5);
      }
    }

    console.log(`Returning ${news.length} news items`);

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
