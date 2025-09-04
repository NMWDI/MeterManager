WITH extracted_prices AS (
  SELECT 
    id, 
    (REGEXP_MATCHES(note, '\$(?!.*:)([0-9]+\.[0-9]+)'))[1]::NUMERIC AS extracted_price
  FROM "Parts"
  WHERE note ~ '\$(?!.*:)[0-9]+\.[0-9]+'
)
UPDATE "Parts"
SET price = extracted_prices.extracted_price
FROM extracted_prices
WHERE "Parts".id = extracted_prices.id;

UPDATE "Parts"
SET price = NULL
WHERE note NOT LIKE '%$%';
