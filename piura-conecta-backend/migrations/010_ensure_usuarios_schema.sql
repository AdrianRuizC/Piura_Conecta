-- Asegura que la tabla usuarios tenga tenant_id y elimina constraints problemáticas
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS tenant_id INTEGER DEFAULT 1;

-- Eliminar constraint de rol si aún existe (en algunos entornos quedó pendiente)
ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_rol_check;

-- Asegurar que la columna creado_at exista
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS creado_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Index para tenant_id
CREATE INDEX IF NOT EXISTS idx_usuarios_tenant ON usuarios(tenant_id);
