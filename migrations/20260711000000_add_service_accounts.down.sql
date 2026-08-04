DROP INDEX IF EXISTS public.ix_service_account_api_keys_revoked_at;
DROP INDEX IF EXISTS public.ix_service_account_api_keys_last_used_at;
DROP INDEX IF EXISTS public.ix_service_account_api_keys_created_at;
DROP INDEX IF EXISTS public.ix_service_account_api_keys_key_identifier;
DROP INDEX IF EXISTS public.ix_service_account_api_keys_user_id;
DROP INDEX IF EXISTS public.ix_service_account_api_keys_id;

DROP TABLE IF EXISTS public.service_account_api_keys;

ALTER TABLE public."Users"
DROP COLUMN IF EXISTS is_service_account;
