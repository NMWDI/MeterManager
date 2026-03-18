CREATE TABLE public.notification_type_lu (
    id serial4 NOT NULL,
    "name" varchar(50) NOT NULL,
    description text NULL,
    CONSTRAINT notification_type_lu_pkey PRIMARY KEY (id),
    CONSTRAINT notification_type_lu_name_key UNIQUE ("name")
);

INSERT INTO public.notification_type_lu ("name", description) VALUES
    ('system', 'General system notification'),
    ('warning', 'A Warning that may require user attention'),
    ('message', 'A User-to-user message'),
    ('approval', 'Approval required or granted notification'),
    ('work_order', 'A work order update'),
    ('owner_change', 'An ownership change'),
    ('system_improvement', 'Notification about improvements, enhancements, or updates to the application');

CREATE TABLE public.notifications (
    id serial4 NOT NULL,
    user_id int4 NOT NULL,
    notification_type_id int4 NOT NULL,
    title varchar(255) NOT NULL,
    message text NOT NULL,
    link varchar(500) NULL,
    is_read bool NOT NULL DEFAULT false,
    created_at timestamp NOT NULL DEFAULT now(),
    read_at timestamp NULL,
    CONSTRAINT notifications_pkey PRIMARY KEY (id),
    CONSTRAINT fk_notifications_user
        FOREIGN KEY (user_id)
        REFERENCES public."Users"(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT fk_notifications_type
        FOREIGN KEY (notification_type_id)
        REFERENCES public.notification_type_lu(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
);

CREATE INDEX ix_notifications_id
    ON public.notifications USING btree (id);

CREATE INDEX ix_notifications_user_id
    ON public.notifications USING btree (user_id);

CREATE INDEX ix_notifications_user_id_is_read
    ON public.notifications USING btree (user_id, is_read);

CREATE INDEX ix_notifications_created_at
    ON public.notifications USING btree (created_at);

CREATE INDEX ix_notifications_notification_type_id
    ON public.notifications USING btree (notification_type_id);
