-- Migración: crear tabla examenes
CREATE TABLE IF NOT EXISTS examenes (
  id SERIAL PRIMARY KEY,
  titulo TEXT NOT NULL,
  fecha TIMESTAMP WITH TIME ZONE DEFAULT now()
);
