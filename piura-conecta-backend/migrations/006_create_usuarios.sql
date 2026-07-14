-- Migration: create usuarios table with tenant support
CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  nombre_completo TEXT NOT NULL,
  usuario TEXT UNIQUE NOT NULL,
  contrasena TEXT NOT NULL,
  rol TEXT NOT NULL CHECK (rol IN ('estudiante','profesor','admin')),
  tenant_id INTEGER DEFAULT 1,
  creado_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
