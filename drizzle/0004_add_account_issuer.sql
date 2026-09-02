ALTER TABLE account ADD COLUMN issuer TEXT;

UPDATE account
SET issuer = 'local:credential'
WHERE issuer IS NULL;