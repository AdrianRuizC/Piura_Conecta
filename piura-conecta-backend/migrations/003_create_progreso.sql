-- Migración: crear tabla progreso (esquema simple)
CREATE TABLE IF NOT EXISTS progreso (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER,
  nombre TEXT,
  progreso JSONB,
  actualizado TIMESTAMP WITH TIME ZONE DEFAULT now()
);
