import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { supabase } from '@/integrations/supabase/client';
import { Newspaper, TrendingUp, TrendingDown, Minus, RefreshCw, AlertCircle, ChevronDown, ChevronUp, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface NewsItem {
  title: string;
  summary: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  timestamp?: string;
  asset?: string;
}

const commodities = [
  { id: 'all', name: 'All Commodities', symbol: '' },
  { id: 'gold', name: 'Gold', symbol: 'XAU/USD' },
  { id: 'silver', name: 'Silver', symbol: 'XAG/USD' },
  { id: 'copper', name: 'Copper', symbol: 'HG/USD' },
  { id: 'bitcoin', name: 'Bitcoin', symbol: 'BTC/USD' },
  { id: 'ethereum', name: 'Ethereum', symbol: 'ETH/USD' },
  { id: 'nasdaq', name: 'NASDAQ', symbol: 'IXIC' },
  { id: 'sp500', name: 'S&P 500', symbol: 'SPX' },
];

export default function News() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [selectedCommodity, setSelectedCommodity] = useState('all');

  const fetchNews = async (commodityId: string) => {
    setIsLoading(true);
    setError(null);
    setNews([]);

    try {
      if (commodityId === 'all') {
        // Fetch news for multiple commodities
        const commoditiesToFetch = commodities.slice(1, 4); // Gold, Silver, Copper for speed
        const allNews: NewsItem[] = [];

        for (const commodity of commoditiesToFetch) {
          const { data, error: fnError } = await supabase.functions.invoke('fetch-asset-news', {
            body: { assetName: commodity.name, assetSymbol: commodity.symbol }
          });

          if (!fnError && data?.news) {
            const newsWithAsset = data.news.map((item: NewsItem) => ({
              ...item,
              asset: commodity.name
            }));
            allNews.push(...newsWithAsset);
          }
        }

        // Shuffle and limit to show variety
        const shuffled = allNews.sort(() => Math.random() - 0.5).slice(0, 10);
        setNews(shuffled);
      } else {
        const commodity = commodities.find(c => c.id === commodityId);
        if (!commodity) return;

        const { data, error: fnError } = await supabase.functions.invoke('fetch-asset-news', {
          body: { assetName: commodity.name, assetSymbol: commodity.symbol }
        });

        if (fnError) {
          throw new Error(fnError.message);
        }

        if (data?.news) {
          const newsWithAsset = data.news.map((item: NewsItem) => ({
            ...item,
            asset: commodity.name
          }));
          setNews(newsWithAsset);
        }
      }
    } catch (err) {
      console.error('Failed to fetch news:', err);
      setError('Failed to load news');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNews(selectedCommodity);
  }, [selectedCommodity]);

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return <TrendingUp className="w-4 h-4 text-success" />;
      case 'negative':
        return <TrendingDown className="w-4 h-4 text-destructive" />;
      default:
        return <Minus className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getSentimentBg = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return 'border-success/20 bg-success/5';
      case 'negative':
        return 'border-destructive/20 bg-destructive/5';
      default:
        return 'border-border bg-card';
    }
  };

  const getSentimentLabel = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return { text: 'Bullish', color: 'text-success bg-success/10' };
      case 'negative':
        return { text: 'Bearish', color: 'text-destructive bg-destructive/10' };
      default:
        return { text: 'Neutral', color: 'text-muted-foreground bg-muted' };
    }
  };

  const toggleExpanded = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  return (
    <Layout>
      <div className="space-y-4 pb-20">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Newspaper className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-bold text-foreground">Market News</h1>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fetchNews(selectedCommodity)}
            disabled={isLoading}
            className="gap-2"
          >
            <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
            Refresh
          </Button>
        </div>

        {/* Filter */}
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center gap-3">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Filter by:</span>
            <Select value={selectedCommodity} onValueChange={setSelectedCommodity}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select commodity" />
              </SelectTrigger>
              <SelectContent>
                {commodities.map((commodity) => (
                  <SelectItem key={commodity.id} value={commodity.id}>
                    {commodity.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* News List */}
        <div className="glass-card rounded-xl p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-6 h-6 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">Loading news...</span>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <AlertCircle className="w-5 h-5 mr-2" />
              {error}
            </div>
          ) : news.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Newspaper className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p>No news available</p>
              <p className="text-xs mt-1">Try refreshing or selecting a different commodity</p>
            </div>
          ) : (
            <div className="space-y-3">
              {news.map((item, index) => {
                const isExpanded = expandedIndex === index;
                const sentimentLabel = getSentimentLabel(item.sentiment);

                return (
                  <Collapsible
                    key={index}
                    open={isExpanded}
                    onOpenChange={() => toggleExpanded(index)}
                  >
                    <div
                      className={cn(
                        "rounded-lg border transition-all",
                        getSentimentBg(item.sentiment),
                        isExpanded && "ring-1 ring-primary/30"
                      )}
                    >
                      <CollapsibleTrigger asChild>
                        <button className="w-full p-3 text-left hover:bg-accent/30 transition-colors rounded-lg">
                          <div className="flex items-start gap-2">
                            <div className="mt-0.5">
                              {getSentimentIcon(item.sentiment)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <h4 className="font-medium text-sm text-foreground leading-tight flex-1">
                                  {item.title}
                                </h4>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  {isExpanded ? (
                                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 mb-1">
                                {item.asset && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
                                    {item.asset}
                                  </span>
                                )}
                                {item.timestamp && (
                                  <span className="text-[10px] text-muted-foreground">
                                    {item.timestamp}
                                  </span>
                                )}
                              </div>
                              <p className={cn(
                                "text-xs text-muted-foreground",
                                !isExpanded && "line-clamp-2"
                              )}>
                                {item.summary}
                              </p>
                            </div>
                          </div>
                        </button>
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        <div className="px-3 pb-3 pt-1 border-t border-border/50 mt-1">
                          <div className="space-y-3">
                            {/* Sentiment Badge */}
                            <div className="flex items-center gap-2">
                              <span className={cn(
                                "text-xs px-2 py-1 rounded-full font-medium",
                                sentimentLabel.color
                              )}>
                                {sentimentLabel.text} Sentiment
                              </span>
                            </div>

                            {/* Full Summary */}
                            <div>
                              <h5 className="text-xs font-medium text-foreground mb-1">Summary</h5>
                              <p className="text-xs text-muted-foreground leading-relaxed">
                                {item.summary}
                              </p>
                            </div>

                            {/* Market Impact */}
                            <div>
                              <h5 className="text-xs font-medium text-foreground mb-1">Market Impact</h5>
                              <p className="text-xs text-muted-foreground leading-relaxed">
                                {item.sentiment === 'positive'
                                  ? `This news is generally considered bullish for ${item.asset || 'this asset'}. Traders may interpret this as a potential buying signal.`
                                  : item.sentiment === 'negative'
                                  ? `This news is generally considered bearish for ${item.asset || 'this asset'}. Traders may want to exercise caution or consider hedging positions.`
                                  : `This news has a neutral impact on ${item.asset || 'this asset'}. Market direction may depend on other factors.`
                                }
                              </p>
                            </div>
                          </div>
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
