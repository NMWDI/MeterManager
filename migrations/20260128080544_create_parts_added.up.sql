CREATE TABLE public."PartsAdded" (
    id serial4 NOT NULL,
    part_id int4 NOT NULL,
    count int4 NOT NULL DEFAULT 1,
    date date NOT NULL DEFAULT CURRENT_DATE,
    note varchar NULL,

    CONSTRAINT "PartsAdded_pkey" PRIMARY KEY (id),
    CONSTRAINT "PartsAdded_part_id_fkey"
        FOREIGN KEY (part_id)
        REFERENCES public."Parts"(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

-- Helpful indexes
CREATE INDEX "ix_PartsAdded_part_id" ON public."PartsAdded" USING btree (part_id);
CREATE INDEX "ix_PartsAdded_date" ON public."PartsAdded" USING btree (date);
