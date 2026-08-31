ALTER TABLE public.meter_contacts
    ADD COLUMN IF NOT EXISTS phone varchar NULL,
    ADD COLUMN IF NOT EXISTS cell varchar NULL,
    ADD COLUMN IF NOT EXISTS email varchar NULL;
