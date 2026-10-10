-- Store first/last name, nested product categories, editable brand pages, video guide settings and tailoring pickup slots.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS first_name varchar(60),
  ADD COLUMN IF NOT EXISTS last_name varchar(60);

ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS product_type text;
CREATE INDEX IF NOT EXISTS categories_parent_id_idx ON public.categories(parent_id);
CREATE INDEX IF NOT EXISTS categories_product_type_idx ON public.categories(product_type);

CREATE TABLE IF NOT EXISTS public.site_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug varchar(100) NOT NULL UNIQUE,
  title varchar(160) NOT NULL,
  content text NOT NULL DEFAULT '',
  is_published boolean NOT NULL DEFAULT false,
  show_in_footer boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS site_pages_footer_order_idx
  ON public.site_pages(is_published, show_in_footer, sort_order);

CREATE TABLE IF NOT EXISTS public.site_settings (
  key varchar(100) PRIMARY KEY,
  value text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pickup_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label varchar(160) NOT NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  capacity integer NOT NULL DEFAULT 1 CHECK (capacity > 0),
  reserved_count integer NOT NULL DEFAULT 0 CHECK (reserved_count >= 0 AND reserved_count <= capacity),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pickup_slots_valid_time CHECK (ends_at > starts_at)
);
CREATE INDEX IF NOT EXISTS pickup_slots_availability_idx
  ON public.pickup_slots(is_active, starts_at, ends_at);

ALTER TABLE public.tailoring_requests
  ADD COLUMN IF NOT EXISTS pickup_slot_id uuid REFERENCES public.pickup_slots(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS tailoring_requests_pickup_slot_id_idx
  ON public.tailoring_requests(pickup_slot_id);

ALTER TABLE public.site_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pickup_slots ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.site_pages FROM anon, authenticated;
REVOKE ALL ON TABLE public.site_settings FROM anon, authenticated;
REVOKE ALL ON TABLE public.pickup_slots FROM anon, authenticated;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('measurement-guides', 'measurement-guides', true, 104857600,
        ARRAY['video/mp4', 'video/webm', 'video/quicktime'])
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;
