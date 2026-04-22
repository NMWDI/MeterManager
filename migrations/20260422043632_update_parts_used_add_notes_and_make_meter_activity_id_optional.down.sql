-- Fail if any NULL values exist
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM public."PartsUsed"
        WHERE meter_activity_id IS NULL
    ) THEN
        RAISE EXCEPTION 'Cannot revert migration: meter_activity_id contains NULL values';
    END IF;
END $$;

ALTER TABLE public."PartsUsed"
DROP COLUMN note,
DROP COLUMN date;

-- Restore NOT NULL constraint
ALTER TABLE public."PartsUsed"
ALTER COLUMN meter_activity_id SET NOT NULL;
