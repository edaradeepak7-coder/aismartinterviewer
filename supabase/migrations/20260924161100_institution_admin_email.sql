-- Optional admin_email on institutions (email already stores contact; this is an explicit alias)
ALTER TABLE public.institutions
  ADD COLUMN IF NOT EXISTS admin_email text;
