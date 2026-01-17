import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export interface WatchlistItem {
  id: string;
  user_id: string;
  asset_id: string;
  asset_name: string;
  asset_symbol: string;
  created_at: string;
}

export function useWatchlist() {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchWatchlist = useCallback(async () => {
    if (!user) {
      setWatchlist([]);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('watchlist')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setWatchlist(data as WatchlistItem[]);
    } catch (error) {
      console.error('Error fetching watchlist:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchWatchlist();
  }, [fetchWatchlist]);

  const addToWatchlist = useCallback(async (asset: {
    asset_id: string;
    asset_name: string;
    asset_symbol: string;
  }) => {
    if (!user) return { error: new Error('Not authenticated') };

    try {
      const { error } = await supabase
        .from('watchlist')
        .insert({
          user_id: user.id,
          asset_id: asset.asset_id,
          asset_name: asset.asset_name,
          asset_symbol: asset.asset_symbol,
        });

      if (error) {
        if (error.code === '23505') {
          toast({
            title: "Already in Watchlist",
            description: `${asset.asset_name} is already in your watchlist`,
          });
          return { error: null };
        }
        throw error;
      }

      await fetchWatchlist();
      
      toast({
        title: "Added to Watchlist",
        description: `${asset.asset_name} has been added to your watchlist`,
      });

      return { error: null };
    } catch (error) {
      console.error('Error adding to watchlist:', error);
      toast({
        title: "Error",
        description: "Failed to add to watchlist",
        variant: "destructive",
      });
      return { error };
    }
  }, [user, fetchWatchlist, toast]);

  const removeFromWatchlist = useCallback(async (assetId: string) => {
    try {
      const { error } = await supabase
        .from('watchlist')
        .delete()
        .eq('asset_id', assetId)
        .eq('user_id', user?.id);

      if (error) throw error;

      await fetchWatchlist();
      
      toast({
        title: "Removed from Watchlist",
        description: "Asset has been removed from your watchlist",
      });

      return { error: null };
    } catch (error) {
      console.error('Error removing from watchlist:', error);
      return { error };
    }
  }, [user, fetchWatchlist, toast]);

  const isInWatchlist = useCallback((assetId: string) => {
    return watchlist.some(item => item.asset_id === assetId);
  }, [watchlist]);

  const toggleWatchlist = useCallback(async (asset: {
    asset_id: string;
    asset_name: string;
    asset_symbol: string;
  }) => {
    if (isInWatchlist(asset.asset_id)) {
      return removeFromWatchlist(asset.asset_id);
    } else {
      return addToWatchlist(asset);
    }
  }, [isInWatchlist, addToWatchlist, removeFromWatchlist]);

  return {
    watchlist,
    isLoading,
    addToWatchlist,
    removeFromWatchlist,
    isInWatchlist,
    toggleWatchlist,
    refetch: fetchWatchlist,
  };
}