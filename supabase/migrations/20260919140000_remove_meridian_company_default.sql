-- Stop inventing a demo company name when company is omitted on insert.
ALTER TABLE public.interviews
  ALTER COLUMN company SET DEFAULT 'Unknown';

ALTER TABLE public.job_offers
  ALTER COLUMN company SET DEFAULT 'Unknown';
