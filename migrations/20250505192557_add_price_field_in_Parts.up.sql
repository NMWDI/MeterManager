-- Add a new column named "price" to the "Parts" table
-- The field should come after the "vendor" field and be of type "decimal(10,2)"

ALTER TABLE "Parts"
ADD COLUMN "price" DECIMAL(10,2);
