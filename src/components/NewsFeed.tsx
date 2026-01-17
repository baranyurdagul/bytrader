import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Newspaper, TrendingUp, TrendingDown, Minus, RefreshCw, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface NewsItem {
  title: string;
  summary: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  timestamp?: string;
  details?: string;
}

interface NewsFeedProps {
  assetName: string;
  assetSymbol: string;
}

export function NewsFeed({ assetName, assetSymbol }: NewsFeedProps) {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const fetchNews = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error: fnError } = await supabase.functions.invoke('fetch-asset-news', {
        body: { assetName, assetSymbol }
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (data?.news) {
        setNews(data.news);
      }
    } catch (err) {
      console.error('Failed to fetch news:', err);
      setError('Failed to load news');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, [assetName, assetSymbol]);

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
    <div className="glass-card rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <Newspaper className="w-5 h-5 text-primary" />
          Latest News
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchNews}
          disabled={isLoading}
          className="gap-2"
        >
          <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {isLoading && news.length === 0 ? (
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="w-6 h-6 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">Loading news...</span>
        </div>
      ) : error ? (
        <div className="flex items-center justify-center py-8 text-muted-foreground">
          <AlertCircle className="w-5 h-5 mr-2" />
          {error}
        </div>
      ) : news.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Newspaper className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No news available</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin">
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
                              {item.timestamp && (
                                <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                                  {item.timestamp}
                                </span>
                              )}
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4 text-muted-foreground" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-muted-foreground" />
                              )}
                            </div>
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
                              ? `This news is generally considered bullish for ${assetName}. Traders may interpret this as a potential buying signal.`
                              : item.sentiment === 'negative'
                              ? `This news is generally considered bearish for ${assetName}. Traders may want to exercise caution or consider hedging positions.`
                              : `This news has a neutral impact on ${assetName}. Market direction may depend on other factors.`
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
  );
}
