ALTER TABLE public.merchant_settings ADD COLUMN IF NOT EXISTS recovery_email text;

CREATE TABLE IF NOT EXISTS public.passkey_credentials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  credential_id text not null unique,
  public_key text not null,
  counter bigint not null default 0,
  transports text[],
  device_label text,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

GRANT SELECT, DELETE ON public.passkey_credentials TO authenticated;
GRANT ALL ON public.passkey_credentials TO service_role;
ALTER TABLE public.passkey_credentials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own passkeys select" ON public.passkey_credentials;
CREATE POLICY "own passkeys select" ON public.passkey_credentials FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "own passkeys delete" ON public.passkey_credentials;
CREATE POLICY "own passkeys delete" ON public.passkey_credentials FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.webauthn_challenges (
  id uuid primary key default gen_random_uuid(),
  challenge text not null,
  user_id uuid references auth.users(id) on delete cascade,
  email text,
  kind text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '5 minutes'
);
GRANT ALL ON public.webauthn_challenges TO service_role;
ALTER TABLE public.webauthn_challenges ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS webauthn_challenges_expires_idx ON public.webauthn_challenges (expires_at);