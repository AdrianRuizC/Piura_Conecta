-- Migration: add ruta_archivo column to materiales and remove archivo
ALTER TABLE materiales ADD COLUMN IF NOT EXISTS ruta_archivo TEXT;
-- If a legacy 'archivo' column exists, copy data and drop it
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='materiales' AND column_name='archivo') THEN
    UPDATE materiales SET ruta_archivo = archivo WHERE ruta_archivo IS NULL;
    ALTER TABLE materiales DROP COLUMN IF EXISTS archivo;
  END IF;
END$$;
