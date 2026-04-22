ALTER TABLE public."PartsAdded"
ALTER COLUMN "date" TYPE date
USING "date"::date;

-- Restore the old default
ALTER TABLE public."PartsAdded"
ALTER COLUMN "date" SET DEFAULT CURRENT_DATE;

ALTER TABLE public."PartsUsed"
ALTER COLUMN "date" TYPE date
USING "date"::date;
