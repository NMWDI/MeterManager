ALTER TABLE public.notifications
ADD COLUMN created_by int4 NULL;

ALTER TABLE public.notifications
ADD CONSTRAINT fk_notifications_created_by
FOREIGN KEY (created_by)
REFERENCES public."Users"(id)
ON DELETE SET NULL
ON UPDATE CASCADE;

CREATE INDEX ix_notifications_created_by
ON public.notifications USING btree (created_by);
