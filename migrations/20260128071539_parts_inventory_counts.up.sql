-- Rename Parts.count -> Parts.initial_count
ALTER TABLE public."Parts"
RENAME COLUMN count TO initial_count;

-- Ensure initial_count is NOT NULL and defaults to 0
UPDATE public."Parts"
SET initial_count = 0
WHERE initial_count IS NULL;

ALTER TABLE public."Parts"
ALTER COLUMN initial_count SET NOT NULL;

ALTER TABLE public."Parts"
ALTER COLUMN initial_count SET DEFAULT 0;

-- Normalize PartsUsed.count to 1
UPDATE public."PartsUsed"
SET count = 1
WHERE count IS DISTINCT FROM 1;

-- Enforce count semantics going forward
ALTER TABLE public."PartsUsed"
ALTER COLUMN count SET NOT NULL;

ALTER TABLE public."PartsUsed"
ALTER COLUMN count SET DEFAULT 1;

