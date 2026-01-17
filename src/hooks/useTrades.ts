import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export interface Trade {
  id: string;
  user_id: string;
  asset_id: string;
  asset_name: string;
  asset_symbol: string;
  trade_type: 'BUY' | 'SELL';
  quantity: number;
  price_per_unit: number;
  total_value: number;
  notes: string | null;
  trade_date: string;
  created_at: string;
}

export interface NewTrade {
  asset_id: string;
  asset_name: string;
  asset_symbol: string;
  trade_type: 'BUY' | 'SELL';
  quantity: number;
  price_per_unit: number;
  notes?: string;
  trade_date?: string;
}

export interface PortfolioPosition {
  asset_id: string;
  asset_name: string;
  asset_symbol: string;
  quantity: number;
  averageBuyPrice: number;
  totalInvested: number;
  currentValue: number;
  profitLoss: number;
  profitLossPercent: number;
}

export function useTrades() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchTrades = useCallback(async () => {
    if (!user) {
      setTrades([]);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', user.id)
        .order('trade_date', { ascending: false });

      if (error) throw error;
      
      setTrades(data as Trade[]);
    } catch (error) {
      console.error('Error fetching trades:', error);
      toast({
        title: "Error",
        description: "Failed to load trades",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchTrades();
  }, [fetchTrades]);

  const addTrade = useCallback(async (trade: NewTrade) => {
    if (!user) return { error: new Error('Not authenticated') };

    const totalValue = trade.quantity * trade.price_per_unit;
    
    try {
      const { error } = await supabase
        .from('trades')
        .insert({
          user_id: user.id,
          asset_id: trade.asset_id,
          asset_name: trade.asset_name,
          asset_symbol: trade.asset_symbol,
          trade_type: trade.trade_type,
          quantity: trade.quantity,
          price_per_unit: trade.price_per_unit,
          total_value: totalValue,
          notes: trade.notes || null,
          trade_date: trade.trade_date || new Date().toISOString(),
        });

      if (error) throw error;

      await fetchTrades();
      
      toast({
        title: "Trade Added",
        description: `${trade.trade_type} ${trade.quantity} ${trade.asset_symbol} at $${trade.price_per_unit.toFixed(2)}`,
      });

      return { error: null };
    } catch (error) {
      console.error('Error adding trade:', error);
      toast({
        title: "Error",
        description: "Failed to add trade",
        variant: "destructive",
      });
      return { error };
    }
  }, [user, fetchTrades, toast]);

  const deleteTrade = useCallback(async (tradeId: string) => {
    try {
      const { error } = await supabase
        .from('trades')
        .delete()
        .eq('id', tradeId);

      if (error) throw error;

      await fetchTrades();
      
      toast({
        title: "Trade Deleted",
        description: "Trade has been removed from your portfolio",
      });

      return { error: null };
    } catch (error) {
      console.error('Error deleting trade:', error);
      toast({
        title: "Error",
        description: "Failed to delete trade",
        variant: "destructive",
      });
      return { error };
    }
  }, [fetchTrades, toast]);

  // Calculate portfolio positions from trades
  const calculatePositions = useCallback((currentPrices: Record<string, number>): PortfolioPosition[] => {
    const positionsMap: Record<string, {
      asset_id: string;
      asset_name: string;
      asset_symbol: string;
      totalQuantity: number;
      totalCost: number;
    }> = {};

    trades.forEach(trade => {
      if (!positionsMap[trade.asset_id]) {
        positionsMap[trade.asset_id] = {
          asset_id: trade.asset_id,
          asset_name: trade.asset_name,
          asset_symbol: trade.asset_symbol,
          totalQuantity: 0,
          totalCost: 0,
        };
      }

      const pos = positionsMap[trade.asset_id];
      if (trade.trade_type === 'BUY') {
        pos.totalQuantity += Number(trade.quantity);
        pos.totalCost += Number(trade.total_value);
      } else {
        pos.totalQuantity -= Number(trade.quantity);
        // For sells, reduce cost proportionally
        const avgCost = pos.totalCost / (pos.totalQuantity + Number(trade.quantity));
        pos.totalCost -= avgCost * Number(trade.quantity);
      }
    });

    return Object.values(positionsMap)
      .filter(pos => pos.totalQuantity > 0.00000001) // Filter out zero positions
      .map(pos => {
        const currentPrice = currentPrices[pos.asset_id] || 0;
        const currentValue = pos.totalQuantity * currentPrice;
        const profitLoss = currentValue - pos.totalCost;
        const profitLossPercent = pos.totalCost > 0 ? (profitLoss / pos.totalCost) * 100 : 0;

        return {
          asset_id: pos.asset_id,
          asset_name: pos.asset_name,
          asset_symbol: pos.asset_symbol,
          quantity: pos.totalQuantity,
          averageBuyPrice: pos.totalCost / pos.totalQuantity,
          totalInvested: pos.totalCost,
          currentValue,
          profitLoss,
          profitLossPercent,
        };
      });
  }, [trades]);

  // Calculate total portfolio stats
  const calculatePortfolioStats = useCallback((currentPrices: Record<string, number>) => {
    const positions = calculatePositions(currentPrices);
    
    const totalInvested = positions.reduce((sum, pos) => sum + pos.totalInvested, 0);
    const totalValue = positions.reduce((sum, pos) => sum + pos.currentValue, 0);
    const totalProfitLoss = totalValue - totalInvested;
    const totalProfitLossPercent = totalInvested > 0 ? (totalProfitLoss / totalInvested) * 100 : 0;

    return {
      positions,
      totalInvested,
      totalValue,
      totalProfitLoss,
      totalProfitLossPercent,
      tradeCount: trades.length,
    };
  }, [trades, calculatePositions]);

  return {
    trades,
    isLoading,
    addTrade,
    deleteTrade,
    refetch: fetchTrades,
    calculatePositions,
    calculatePortfolioStats,
  };
}
