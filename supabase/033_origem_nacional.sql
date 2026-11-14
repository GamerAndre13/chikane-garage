-- ------------------------------------------------------------
-- 033 — Origem nacional por omissão
-- ------------------------------------------------------------
-- Ao criar uma viatura no back office, a origem passa a ser "nacional"
-- (Portugal). Só quando a viatura é importada o admin muda a origem e o país.
--
-- Idempotente: pode ser executado mais do que uma vez.

ALTER TABLE public.vehicles ALTER COLUMN origin SET DEFAULT 'national';

UPDATE public.vehicles
SET origin_country = 'Portugal'
WHERE origin = 'national' AND (origin_country IS NULL OR origin_country = '');

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    WHERE t.relname = 'vehicles' AND c.conname = 'vehicles_origin_check'
  ) THEN
    ALTER TABLE public.vehicles
      ADD CONSTRAINT vehicles_origin_check
      CHECK (origin IN ('national', 'imported'));
  END IF;
END $$;
