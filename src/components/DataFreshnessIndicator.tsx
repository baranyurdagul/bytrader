import { forwardRef } from 'react';
import { Clock, Database } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface DataFreshnessIndicatorProps {
  lastUpdated: Date | null;
  historicalFetchedAt: Date | null;
  dataSource: 'live' | 'cached' | 'unavailable' | 'simulated';
  sourceProvider: string;
  className?: string;
}

export const DataFreshnessIndicator = forwardRef<HTMLDivElement, DataFreshnessIndicatorProps>(
  function DataFreshnessIndicator({
    lastUpdated,
    historicalFetchedAt,
    dataSource,
    sourceProvider,
    className,
  }, ref) {
  const formatTimeAgo = (date: Date | null): string => {
    if (!date) return 'Never';
    
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 120) return '1 min ago';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} mins ago`;
    if (seconds < 7200) return '1 hour ago';
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    return date.toLocaleDateString();
  };

  const isLive = dataSource === 'live' || dataSource === 'cached';

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div 
              ref={ref}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs cursor-help transition-colors",
                isLive 
                  ? "bg-success/10 text-success border border-success/20" 
                  : "bg-muted text-muted-foreground border border-border",
                className
              )}
            >
              <Database className="w-3.5 h-3.5" />
              <span className="font-medium">{sourceProvider}</span>
              <span className="text-muted-foreground">•</span>
              <Clock className="w-3 h-3" />
              <span>{formatTimeAgo(lastUpdated)}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-[280px]">
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <span className={cn(
                  "w-2 h-2 rounded-full",
                  isLive ? "bg-success" : "bg-muted-foreground"
                )} />
                <span className="font-medium">
                  {isLive ? 'Live Data' : 'Simulated Data'}
                </span>
              </div>
              <div className="space-y-1 text-muted-foreground">
                <p><strong>Source:</strong> {sourceProvider}</p>
                <p><strong>Prices updated:</strong> {lastUpdated?.toLocaleTimeString() || 'Never'}</p>
                <p><strong>History fetched:</strong> {historicalFetchedAt?.toLocaleTimeString() || 'Never'}</p>
              </div>
              {isLive && (
                <p className="text-[10px] text-muted-foreground/70 pt-1 border-t border-border">
                  Data refreshes every 60 seconds. Historical data cached for 5 minutes.
                </p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
);
