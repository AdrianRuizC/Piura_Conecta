-- Migración: crear tabla foro (temas)
CREATE TABLE IF NOT EXISTS foro (
  id SERIAL PRIMARY KEY,
  titulo TEXT NOT NULL,
  autor TEXT,
  fecha TIMESTAMP WITH TIME ZONE DEFAULT now()
);
