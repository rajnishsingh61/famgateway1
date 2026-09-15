-- Payment verification hardening for Nano Pay.
-- Existing deployments can apply this migration safely.
CREATE UNIQUE INDEX IF NOT EXISTS orders_utr_unique
  ON public.orders (utr)
  WHERE utr IS NOT NULL AND utr <> '';

CREATE INDEX IF NOT EXISTS orders_pending_expiry_idx
  ON public.orders (user_id, status, expires_at);

CREATE INDEX IF NOT EXISTS orders_order_user_idx
  ON public.orders (order_id, user_id);

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_utr text;
CREATE INDEX IF NOT EXISTS orders_customer_utr_idx ON public.orders(customer_utr) WHERE customer_utr IS NOT NULL;
