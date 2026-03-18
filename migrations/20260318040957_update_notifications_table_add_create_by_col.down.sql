DROP INDEX IF EXISTS public.ix_notifications_created_by;

ALTER TABLE public.notifications
DROP CONSTRAINT IF EXISTS fk_notifications_created_by;

ALTER TABLE public.notifications
DROP COLUMN IF EXISTS created_by;
