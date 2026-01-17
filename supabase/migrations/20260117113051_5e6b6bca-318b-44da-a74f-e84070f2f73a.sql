-- Create trades table for portfolio tracking
CREATE TABLE public.trades (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  asset_id TEXT NOT NULL,
  asset_name TEXT NOT NULL,
  asset_symbol TEXT NOT NULL,
  trade_type TEXT NOT NULL CHECK (trade_type IN ('BUY', 'SELL')),
  quantity DECIMAL(20, 8) NOT NULL CHECK (quantity > 0),
  price_per_unit DECIMAL(20, 8) NOT NULL CHECK (price_per_unit > 0),
  total_value DECIMAL(20, 2) NOT NULL,
  notes TEXT,
  trade_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;

-- Users can only view their own trades
CREATE POLICY "Users can view their own trades"
ON public.trades
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own trades
CREATE POLICY "Users can insert their own trades"
ON public.trades
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own trades
CREATE POLICY "Users can update their own trades"
ON public.trades
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own trades
CREATE POLICY "Users can delete their own trades"
ON public.trades
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_trades_user_id ON public.trades(user_id);
CREATE INDEX idx_trades_asset_id ON public.trades(user_id, asset_id);
CREATE INDEX idx_trades_trade_date ON public.trades(user_id, trade_date DESC);