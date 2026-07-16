-- Migración: añadir video_id y timestamp a foro y crear tabla de respuestas
ALTER TABLE IF EXISTS foro
  ADD COLUMN IF NOT EXISTS video_id INTEGER,
  ADD COLUMN IF NOT EXISTS timestamp INTEGER;

CREATE TABLE IF NOT EXISTS foro_respuestas (
  id SERIAL PRIMARY KEY,
  foro_id INTEGER NOT NULL REFERENCES foro(id) ON DELETE CASCADE,
  autor TEXT,
  contenido TEXT,
  creado_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
