import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Newspaper, TrendingUp, TrendingDown, Minus, RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface NewsItem {
  title: string;
  summary: string;
  sentiment: 'positive' | 'negative' | 'neutral';
}

interface NewsFeedProps {
  assetName: string;
  assetSymbol: string;
}

export function NewsFeed({ assetName, assetSymbol }: NewsFeedProps) {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          {news.map((item, index) => (
            <div
              key={index}
              className={cn(
                "p-3 rounded-lg border transition-colors hover:bg-accent/50",
                getSentimentBg(item.sentiment)
              )}
            >
              <div className="flex items-start gap-2">
                <div className="mt-0.5">
                  {getSentimentIcon(item.sentiment)}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm text-foreground leading-tight mb-1">
                    {item.title}
                  </h4>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {item.summary}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
