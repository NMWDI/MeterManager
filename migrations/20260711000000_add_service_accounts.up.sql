ALTER TABLE public."Users"
ADD COLUMN IF NOT EXISTS is_service_account bool NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.service_account_api_keys (
    id serial4 NOT NULL,
    user_id int4 NOT NULL,
    key_identifier varchar(32) NOT NULL,
    key_hash varchar(64) NOT NULL,
    key_prefix varchar(32) NOT NULL,
    created_at timestamp NOT NULL DEFAULT now(),
    last_used_at timestamp NULL,
    revoked_at timestamp NULL,
    CONSTRAINT service_account_api_keys_pkey PRIMARY KEY (id),
    CONSTRAINT service_account_api_keys_key_identifier_key UNIQUE (key_identifier),
    CONSTRAINT service_account_api_keys_key_hash_key UNIQUE (key_hash),
    CONSTRAINT fk_service_account_api_keys_user
        FOREIGN KEY (user_id)
        REFERENCES public."Users"(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS ix_service_account_api_keys_id
    ON public.service_account_api_keys USING btree (id);

CREATE INDEX IF NOT EXISTS ix_service_account_api_keys_user_id
    ON public.service_account_api_keys USING btree (user_id);

CREATE INDEX IF NOT EXISTS ix_service_account_api_keys_key_identifier
    ON public.service_account_api_keys USING btree (key_identifier);

CREATE INDEX IF NOT EXISTS ix_service_account_api_keys_created_at
    ON public.service_account_api_keys USING btree (created_at);

CREATE INDEX IF NOT EXISTS ix_service_account_api_keys_last_used_at
    ON public.service_account_api_keys USING btree (last_used_at);

CREATE INDEX IF NOT EXISTS ix_service_account_api_keys_revoked_at
    ON public.service_account_api_keys USING btree (revoked_at);
