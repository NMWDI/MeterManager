DROP INDEX IF EXISTS public.ix_user_sessions_sign_out_reason_type_id;
DROP INDEX IF EXISTS public.ix_user_sessions_fingerprint_hash;
DROP INDEX IF EXISTS public.ix_user_sessions_signed_out_at;
DROP INDEX IF EXISTS public.ix_user_sessions_signed_in_at;
DROP INDEX IF EXISTS public.ix_user_sessions_last_seen_at;
DROP INDEX IF EXISTS public.ix_user_sessions_is_active;
DROP INDEX IF EXISTS public.ix_user_sessions_session_identifier;
DROP INDEX IF EXISTS public.ix_user_sessions_user_id;
DROP INDEX IF EXISTS public.ix_user_sessions_id;

DROP TABLE IF EXISTS public.user_sessions;
DROP TABLE IF EXISTS public.sign_out_reason_type_lu;
