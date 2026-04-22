ALTER TABLE public."PartsUsed"
ADD COLUMN note varchar NULL,
ADD COLUMN date date NULL;

ALTER TABLE public."PartsUsed"
ALTER COLUMN meter_activity_id DROP NOT NULL;
