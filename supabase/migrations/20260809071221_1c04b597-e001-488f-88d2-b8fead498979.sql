REVOKE EXECUTE ON FUNCTION public.expire_subscriptions() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.expire_subscriptions() FROM anon;
REVOKE EXECUTE ON FUNCTION public.expire_subscriptions() FROM authenticated;
ALTER FUNCTION public.expire_subscriptions() SET search_path = public;