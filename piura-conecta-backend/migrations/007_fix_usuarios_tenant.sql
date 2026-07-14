-- Migration: ensure usuarios has tenant_id and created_at
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS tenant_id INTEGER DEFAULT 1;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS creado_at TIMESTAMP WITH TIME ZONE DEFAULT now();
