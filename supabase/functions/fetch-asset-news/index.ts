import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { DOMParser, Element } from "https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts";

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
  // Metals
  'gold': 'GC=F',
  'silver': 'SI=F',
  'XAU/USD': 'GC=F',
  'XAG/USD': 'SI=F',
  // Crypto
  'bitcoin': 'BTC-USD',
  'ethereum': 'ETH-USD',
  'BTC/USD': 'BTC-USD',
  'ETH/USD': 'ETH-USD',
  // Indices
  'nasdaq100': '^NDX',
  'sp500': '^GSPC',
  'NDX': '^NDX',
  'SPX': '^GSPC',
  // ETFs
  'vym': 'VYM',
  'vymi': 'VYMI',
  'gldm': 'GLDM',
  'slv': 'SLV',
};

// Keywords for general market news searches
const SEARCH_KEYWORDS: Record<string, string[]> = {
  'gold': ['gold', 'precious metals', 'gold price'],
  'silver': ['silver', 'precious metals', 'silver price'],
  'bitcoin': ['bitcoin', 'cryptocurrency', 'BTC'],
  'ethereum': ['ethereum', 'cryptocurrency', 'ETH'],
  'nasdaq100': ['nasdaq', 'tech stocks', 'nasdaq 100'],
  'sp500': ['S&P 500', 'stock market', 'wall street'],
  'vym': ['dividend ETF', 'VYM', 'Vanguard dividend'],
  'vymi': ['international dividend', 'VYMI', 'Vanguard international'],
  'gldm': ['gold ETF', 'GLDM', 'gold fund'],
  'slv': ['silver ETF', 'SLV', 'silver fund'],
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

// Parse relative timestamp
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

// Extract text content from an element by tag name
function getElementText(parent: Element, tagName: string): string {
  const el = parent.getElementsByTagName(tagName)[0];
  return el?.textContent?.trim() || '';
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
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'text/xml');
    
    if (!doc) {
      console.error('Failed to parse XML');
      return [];
    }
    
    const items = doc.getElementsByTagName('item');
    const news: NewsItem[] = [];
    
    for (let i = 0; i < Math.min(items.length, 5); i++) {
      const item = items[i] as Element;
      const title = getElementText(item, 'title');
      const link = getElementText(item, 'link');
      const description = getElementText(item, 'description');
      const pubDate = getElementText(item, 'pubDate');
      
      if (title) {
        // Clean up description (remove HTML tags)
        const cleanDescription = description.replace(/<[^>]*>/g, '').trim();
        
        news.push({
          title,
          summary: cleanDescription || title,
          sentiment: analyzeSentiment(title + ' ' + cleanDescription),
          timestamp: formatTimestamp(pubDate),
          url: link,
          source: 'Yahoo Finance',
        });
      }
    }
    
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
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'text/xml');
    
    if (!doc) return [];
    
    const items = doc.getElementsByTagName('item');
    const news: NewsItem[] = [];
    
    for (let i = 0; i < Math.min(items.length, 10); i++) {
      const item = items[i] as Element;
      const title = getElementText(item, 'title');
      const link = getElementText(item, 'link');
      const description = getElementText(item, 'description');
      const pubDate = getElementText(item, 'pubDate');
      
      if (title) {
        const cleanDescription = description.replace(/<[^>]*>/g, '').trim();
        
        news.push({
          title,
          summary: cleanDescription || title,
          sentiment: analyzeSentiment(title + ' ' + cleanDescription),
          timestamp: formatTimestamp(pubDate),
          url: link,
          source: 'Yahoo Finance',
        });
      }
    }
    
    return news;
  } catch (error) {
    console.error('Error fetching general news:', error);
    return [];
  }
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

    console.log(`Fetching real news for ${assetName} (${assetSymbol})`);

    // Get ticker symbol for the asset
    const assetId = assetName.toLowerCase().replace(/\s+/g, '');
    const ticker = TICKER_MAP[assetId] || TICKER_MAP[assetSymbol] || assetSymbol;
    
    console.log(`Using ticker: ${ticker}`);
    
    // Fetch ticker-specific news
    let news = await fetchYahooRSS(ticker);
    
    // If no ticker-specific news, try general finance news and filter
    if (news.length === 0) {
      console.log('No ticker-specific news, fetching general news...');
      const generalNews = await fetchGeneralFinanceNews();
      
      // Filter by keywords if we have them
      const keywords = SEARCH_KEYWORDS[assetId] || [assetName.toLowerCase()];
      news = generalNews.filter(item => {
        const text = (item.title + ' ' + item.summary).toLowerCase();
        return keywords.some(kw => text.includes(kw.toLowerCase()));
      }).slice(0, 5);
      
      // If still no news, just return top general news
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
