-- Ensure split customer names exist in the live database and align the status constraint
-- with the canonical tailoring state used by the API.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS first_name varchar(60),
  ADD COLUMN IF NOT EXISTS last_name varchar(60);

ALTER TABLE public.tailoring_requests
  DROP CONSTRAINT IF EXISTS tailoring_requests_status_check;

ALTER TABLE public.tailoring_requests
  ADD CONSTRAINT tailoring_requests_status_check
  CHECK (status = ANY (ARRAY[
    'submitted'::text,
    'reviewing'::text,
    'quoted'::text,
    'approved'::text,
    'in_production'::text,
    'in_progress'::text,
    'ready'::text,
    'delivered'::text,
    'rejected'::text,
    'cancelled'::text
  ]));
