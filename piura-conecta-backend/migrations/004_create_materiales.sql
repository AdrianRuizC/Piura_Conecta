-- Migration: create materiales table
CREATE TABLE IF NOT EXISTS materiales (
  id SERIAL PRIMARY KEY,
  titulo TEXT NOT NULL,
  archivo TEXT NOT NULL,
  curso_id INTEGER,
  creado_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
