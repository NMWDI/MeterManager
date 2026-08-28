CREATE TABLE public.meter_contacts (
    id serial4 NOT NULL,
    meter_id int4 NOT NULL,
    name varchar NULL,
    phone varchar NULL,
    cell varchar NULL,
    email varchar NULL,
    address text NULL,
    CONSTRAINT meter_contacts_pkey PRIMARY KEY (id),
    CONSTRAINT fk_meter_contacts_meter
        FOREIGN KEY (meter_id)
        REFERENCES public."Meters"(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

CREATE INDEX ix_meter_contacts_id
    ON public.meter_contacts USING btree (id);

CREATE INDEX ix_meter_contacts_meter_id
    ON public.meter_contacts USING btree (meter_id);

INSERT INTO public.meter_contacts (meter_id, name, phone)
SELECT id, contact_name, contact_phone
FROM public."Meters"
WHERE NULLIF(TRIM(contact_name), '') IS NOT NULL
   OR NULLIF(TRIM(contact_phone), '') IS NOT NULL;

CREATE TABLE public.meter_owner_change_requests (
    id serial4 NOT NULL,
    meter_id int4 NOT NULL,
    serial_number varchar NOT NULL,
    ose_meter_id int4 NULL,
    old_water_users text NULL,
    new_water_users text NULL,
    old_contacts jsonb NOT NULL DEFAULT '[]'::jsonb,
    new_contacts jsonb NOT NULL DEFAULT '[]'::jsonb,
    status varchar(20) NOT NULL DEFAULT 'pending',
    created_by int4 NULL,
    resolved_by int4 NULL,
    created_at timestamp NOT NULL DEFAULT now(),
    resolved_at timestamp NULL,
    CONSTRAINT meter_owner_change_requests_pkey PRIMARY KEY (id),
    CONSTRAINT meter_owner_change_requests_status_check
        CHECK (status IN ('pending', 'accepted', 'partially_accepted', 'rejected')),
    CONSTRAINT fk_meter_owner_change_requests_meter
        FOREIGN KEY (meter_id)
        REFERENCES public."Meters"(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT fk_meter_owner_change_requests_created_by
        FOREIGN KEY (created_by)
        REFERENCES public."Users"(id)
        ON DELETE SET NULL
        ON UPDATE CASCADE,
    CONSTRAINT fk_meter_owner_change_requests_resolved_by
        FOREIGN KEY (resolved_by)
        REFERENCES public."Users"(id)
        ON DELETE SET NULL
        ON UPDATE CASCADE
);

CREATE INDEX ix_meter_owner_change_requests_id
    ON public.meter_owner_change_requests USING btree (id);

CREATE INDEX ix_meter_owner_change_requests_meter_id
    ON public.meter_owner_change_requests USING btree (meter_id);

CREATE INDEX ix_meter_owner_change_requests_status
    ON public.meter_owner_change_requests USING btree (status);
