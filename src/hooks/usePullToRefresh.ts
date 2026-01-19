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
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef(0);
  const isPullingRef = useRef(false);
  const isRefreshingRef = useRef(false);
  const { toast } = useToast();

  const handleRefresh = useCallback(async () => {
    if (isRefreshingRef.current) return;
    
    setIsRefreshing(true);
    isRefreshingRef.current = true;
    
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
    } finally {
      setIsRefreshing(false);
      isRefreshingRef.current = false;
    }
  }, [onRefresh, toast]);

  useEffect(() => {
    let currentPullDistance = 0;
    
    const handleTouchStart = (e: TouchEvent) => {
      // Only trigger if at top of page and not already refreshing
      if (window.scrollY <= 0 && !isRefreshingRef.current) {
        startY.current = e.touches[0].clientY;
        isPullingRef.current = true;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPullingRef.current || isRefreshingRef.current) return;
      
      const currentY = e.touches[0].clientY;
      const diff = currentY - startY.current;
      
      if (diff > 0 && window.scrollY <= 0) {
        // Apply resistance to make it feel natural
        const resistance = 0.5;
        const distance = Math.min(diff * resistance, maxPull);
        currentPullDistance = distance;
        setPullDistance(distance);
        
        // Prevent default scroll when pulling down
        if (distance > 10) {
          e.preventDefault();
        }
      } else {
        // Reset if scrolling up or page is scrolled
        currentPullDistance = 0;
        setPullDistance(0);
      }
    };

    const handleTouchEnd = async () => {
      if (!isPullingRef.current) return;
      
      isPullingRef.current = false;
      
      if (currentPullDistance >= threshold && !isRefreshingRef.current) {
        await handleRefresh();
      }
      
      currentPullDistance = 0;
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
  }, [threshold, maxPull, handleRefresh]);

  const pullProgress = Math.min(pullDistance / threshold, 1);
  const shouldTrigger = pullDistance >= threshold;

  return {
    pullDistance,
    pullProgress,
    isPulling: isPullingRef.current,
    isRefreshing,
    shouldTrigger,
  };
}
