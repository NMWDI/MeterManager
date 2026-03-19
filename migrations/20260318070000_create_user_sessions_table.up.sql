CREATE TABLE public.sign_out_reason_type_lu (
    id serial4 NOT NULL,
    "name" varchar(50) NOT NULL,
    description text NULL,
    CONSTRAINT sign_out_reason_type_lu_pkey PRIMARY KEY (id),
    CONSTRAINT sign_out_reason_type_lu_name_key UNIQUE ("name")
);

INSERT INTO public.sign_out_reason_type_lu ("name", description) VALUES
    ('manual_logout', 'The user explicitly signed out of the application'),
    ('session_expired', 'The client session expired before an authenticated logout could be completed'),
    ('forced_logout', 'The session was invalidated administratively or due to a security event'),
    ('unknown', 'The session ended without a known sign-out reason');

CREATE TABLE public.user_sessions (
    id serial4 NOT NULL,
    user_id int4 NOT NULL,
    session_identifier varchar(36) NOT NULL,
    ip_address varchar(255) NULL,
    user_agent text NULL,
    device_label varchar(255) NULL,
    device_type varchar(100) NULL,
    browser varchar(100) NULL,
    operating_system varchar(100) NULL,
    fingerprint_hash varchar(128) NULL,
    signed_in_at timestamp NOT NULL DEFAULT now(),
    last_seen_at timestamp NOT NULL DEFAULT now(),
    signed_out_at timestamp NULL,
    is_active bool NOT NULL DEFAULT true,
    sign_out_reason_type_id int4 NULL,
    CONSTRAINT user_sessions_pkey PRIMARY KEY (id),
    CONSTRAINT user_sessions_session_identifier_key UNIQUE (session_identifier),
    CONSTRAINT fk_user_sessions_user
        FOREIGN KEY (user_id)
        REFERENCES public."Users"(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT fk_user_sessions_sign_out_reason_type
        FOREIGN KEY (sign_out_reason_type_id)
        REFERENCES public.sign_out_reason_type_lu(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
);

CREATE INDEX ix_user_sessions_id
    ON public.user_sessions USING btree (id);

CREATE INDEX ix_user_sessions_user_id
    ON public.user_sessions USING btree (user_id);

CREATE INDEX ix_user_sessions_session_identifier
    ON public.user_sessions USING btree (session_identifier);

CREATE INDEX ix_user_sessions_is_active
    ON public.user_sessions USING btree (is_active);

CREATE INDEX ix_user_sessions_last_seen_at
    ON public.user_sessions USING btree (last_seen_at);

CREATE INDEX ix_user_sessions_signed_in_at
    ON public.user_sessions USING btree (signed_in_at);

CREATE INDEX ix_user_sessions_signed_out_at
    ON public.user_sessions USING btree (signed_out_at);

CREATE INDEX ix_user_sessions_fingerprint_hash
    ON public.user_sessions USING btree (fingerprint_hash);

CREATE INDEX ix_user_sessions_sign_out_reason_type_id
    ON public.user_sessions USING btree (sign_out_reason_type_id);
