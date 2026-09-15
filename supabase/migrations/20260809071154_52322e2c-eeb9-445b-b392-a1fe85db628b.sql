ALTER TABLE public.webhook_logs
  ADD COLUMN IF NOT EXISTS event text,
  ADD COLUMN IF NOT EXISTS payload jsonb,
  ADD COLUMN IF NOT EXISTS error_message text,
  ADD COLUMN IF NOT EXISTS duration_ms integer,
  ADD COLUMN IF NOT EXISTS amount numeric;

CREATE INDEX IF NOT EXISTS webhook_logs_user_created_idx ON public.webhook_logs (user_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.expire_subscriptions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.subscriptions
     SET status = 'expired', updated_at = now()
   WHERE status = 'trialing'
     AND trial_ends_at < now();

  UPDATE public.subscriptions
     SET status = 'expired', updated_at = now()
   WHERE status = 'active'
     AND current_period_end IS NOT NULL
     AND current_period_end < now();
END;
$$;

REVOKE ALL ON FUNCTION public.expire_subscriptions() FROM PUBLIC, anon, authenticated;

CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.unschedule('expire-subscriptions-hourly')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'expire-subscriptions-hourly');

SELECT cron.schedule('expire-subscriptions-hourly', '5 * * * *', $$SELECT public.expire_subscriptions();$$);