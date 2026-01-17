import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PullToRefreshProps {
  pullDistance: number;
  pullProgress: number;
  isRefreshing: boolean;
  shouldTrigger: boolean;
}

export function PullToRefresh({
  pullDistance,
  pullProgress,
  isRefreshing,
  shouldTrigger,
}: PullToRefreshProps) {
  if (pullDistance <= 0 && !isRefreshing) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center pointer-events-none"
      style={{
        height: `${Math.max(pullDistance, isRefreshing ? 60 : 0)}px`,
        transition: pullDistance === 0 ? 'height 0.3s ease-out' : 'none',
      }}
    >
      <div
        className={cn(
          "flex items-center justify-center w-10 h-10 rounded-full bg-card border border-border shadow-lg",
          shouldTrigger && "bg-primary/10 border-primary/30"
        )}
        style={{
          transform: `scale(${0.5 + pullProgress * 0.5}) rotate(${pullProgress * 180}deg)`,
          opacity: Math.min(pullProgress * 1.5, 1),
          transition: pullDistance === 0 ? 'all 0.3s ease-out' : 'none',
        }}
      >
        <RefreshCw
          className={cn(
            "w-5 h-5",
            shouldTrigger ? "text-primary" : "text-muted-foreground",
            isRefreshing && "animate-spin"
          )}
        />
      </div>
    </div>
  );
}
