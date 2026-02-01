-- Create table for storing daily arbitrage snapshots
CREATE TABLE public.arbitrage_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  snapshot_date DATE NOT NULL UNIQUE,
  gold_comex_price NUMERIC NOT NULL,
  gold_shanghai_price NUMERIC NOT NULL,
  gold_spread_percent NUMERIC NOT NULL,
  silver_comex_price NUMERIC NOT NULL,
  silver_shanghai_price NUMERIC NOT NULL,
  silver_spread_percent NUMERIC NOT NULL,
  usd_cny_rate NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for efficient date-range queries
CREATE INDEX idx_arbitrage_snapshots_date ON public.arbitrage_snapshots(snapshot_date DESC);

-- This is public read-only data (market prices), no user-specific RLS needed
-- But we still enable RLS and allow public read access
ALTER TABLE public.arbitrage_snapshots ENABLE ROW LEVEL SECURITY;

-- Anyone can read arbitrage data (it's public market data)
CREATE POLICY "Arbitrage snapshots are publicly readable"
ON public.arbitrage_snapshots
FOR SELECT
USING (true);

-- Only backend functions can insert (no direct user inserts)
-- This is handled by the edge function using service role key