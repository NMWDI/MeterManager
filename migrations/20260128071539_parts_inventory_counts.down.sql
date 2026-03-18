-- Rename initial_count back to count
ALTER TABLE public."Parts"
RENAME COLUMN initial_count TO count;

-- Allow NULLs again (original behavior)
ALTER TABLE public."Parts"
ALTER COLUMN count DROP NOT NULL;

ALTER TABLE public."Parts"
ALTER COLUMN count DROP DEFAULT;

ALTER TABLE public."PartsUsed"
ALTER COLUMN count DROP NOT NULL;

ALTER TABLE public."PartsUsed"
ALTER COLUMN count DROP DEFAULT;
