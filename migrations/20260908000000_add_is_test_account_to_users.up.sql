ALTER TABLE public."Users"
ADD COLUMN IF NOT EXISTS is_test_account boolean NOT NULL DEFAULT false;
