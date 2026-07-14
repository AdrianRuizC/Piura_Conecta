-- Migration: remove restrictive role check on usuarios (dev convenience)
ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_rol_check;
