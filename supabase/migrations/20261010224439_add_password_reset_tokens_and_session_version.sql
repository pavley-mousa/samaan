-- Add password reset storage and a per-user session version.
-- Reset tokens are hashed, short-lived, single-use, and unavailable to the public Supabase API.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS session_version integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  token_hash varchar(64) NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS password_reset_tokens_expires_at_idx
  ON public.password_reset_tokens (expires_at);

ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.password_reset_tokens FROM anon, authenticated;
