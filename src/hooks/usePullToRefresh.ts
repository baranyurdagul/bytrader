import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';

interface UsePullToRefreshOptions {
  onRefresh?: () => Promise<void>;
  threshold?: number;
  maxPull?: number;
}

export function usePullToRefresh({
  onRefresh,
  threshold = 80,
  maxPull = 120,
}: UsePullToRefreshOptions = {}) {
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef(0);
  const currentY = useRef(0);
  const { toast } = useToast();

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    
    try {
      // Clear all caches for PWA
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }
      
      // Update service workers
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map(reg => reg.update()));
      }

      if (onRefresh) {
        await onRefresh();
      }
      
      toast({
        title: "Refreshing app...",
        description: "Loading latest version",
      });
      
      // Force reload from server
      setTimeout(() => {
        window.location.reload();
      }, 300);
    } catch (error) {
      console.error('Refresh error:', error);
      window.location.reload();
    }
  }, [onRefresh, toast]);

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      // Only trigger if at top of page
      if (window.scrollY === 0) {
        startY.current = e.touches[0].clientY;
        setIsPulling(true);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPulling || isRefreshing) return;
      
      currentY.current = e.touches[0].clientY;
      const diff = currentY.current - startY.current;
      
      if (diff > 0 && window.scrollY === 0) {
        // Apply resistance to make it feel natural
        const resistance = 0.5;
        const distance = Math.min(diff * resistance, maxPull);
        setPullDistance(distance);
        
        // Prevent default scroll when pulling down
        if (distance > 10) {
          e.preventDefault();
        }
      }
    };

    const handleTouchEnd = async () => {
      if (!isPulling) return;
      
      if (pullDistance >= threshold && !isRefreshing) {
        await handleRefresh();
      }
      
      setIsPulling(false);
      setPullDistance(0);
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isPulling, pullDistance, threshold, maxPull, isRefreshing, handleRefresh]);

  const pullProgress = Math.min(pullDistance / threshold, 1);
  const shouldTrigger = pullDistance >= threshold;

  return {
    pullDistance,
    pullProgress,
    isPulling,
    isRefreshing,
    shouldTrigger,
  };
}
