-- Add Google identity linking and short-lived, single-use email OTP codes.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS google_id varchar(255);

CREATE UNIQUE INDEX IF NOT EXISTS users_google_id_key
  ON public.users (google_id);

CREATE TABLE IF NOT EXISTS public.email_otps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email varchar(254) NOT NULL UNIQUE,
  code_hash varchar(64) NOT NULL,
  first_name varchar(60),
  last_name varchar(60),
  phone varchar(30),
  attempts integer NOT NULL DEFAULT 0,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS email_otps_expires_at_idx
  ON public.email_otps (expires_at);

ALTER TABLE public.email_otps ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.email_otps FROM anon, authenticated;
