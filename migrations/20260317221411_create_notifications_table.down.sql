DROP INDEX IF EXISTS public.ix_notifications_notification_type_id;
DROP INDEX IF EXISTS public.ix_notifications_created_at;
DROP INDEX IF EXISTS public.ix_notifications_user_id_is_read;
DROP INDEX IF EXISTS public.ix_notifications_user_id;
DROP INDEX IF EXISTS public.ix_notifications_id;

DROP TABLE IF EXISTS public.notifications;
DROP TABLE IF EXISTS public.notification_type_lu;
