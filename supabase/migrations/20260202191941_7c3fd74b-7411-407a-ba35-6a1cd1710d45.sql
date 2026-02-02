-- Drop all existing RLS policies that allow client access to push_subscriptions
DROP POLICY IF EXISTS "Users can create their own subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Users can delete their own subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Users can update their own subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Users can view their own subscriptions" ON public.push_subscriptions;

-- Create restrictive policies that deny all client access
-- Only service role (used by edge functions) can access this table
CREATE POLICY "No direct client access - insert"
ON public.push_subscriptions
FOR INSERT
TO authenticated
WITH CHECK (false);

CREATE POLICY "No direct client access - select"
ON public.push_subscriptions
FOR SELECT
TO authenticated
USING (false);

CREATE POLICY "No direct client access - update"
ON public.push_subscriptions
FOR UPDATE
TO authenticated
USING (false);

CREATE POLICY "No direct client access - delete"
ON public.push_subscriptions
FOR DELETE
TO authenticated
USING (false);

-- Add unique constraint for upsert if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'push_subscriptions_user_endpoint_unique'
  ) THEN
    ALTER TABLE public.push_subscriptions 
    ADD CONSTRAINT push_subscriptions_user_endpoint_unique 
    UNIQUE (user_id, endpoint);
  END IF;
END $$;