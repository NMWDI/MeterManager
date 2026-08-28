ALTER TABLE public.meter_contacts
    DROP COLUMN IF EXISTS phone,
    DROP COLUMN IF EXISTS cell,
    DROP COLUMN IF EXISTS email;
