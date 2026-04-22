ALTER TABLE public."PartsAdded"
ALTER COLUMN "date" TYPE timestamp without time zone
USING "date"::timestamp without time zone;

-- Keep the default behavior aligned with the new type
ALTER TABLE public."PartsAdded"
ALTER COLUMN "date" SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE public."PartsUsed"
ALTER COLUMN "date" TYPE timestamp without time zone
USING "date"::timestamp without time zone;
