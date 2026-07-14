-- 012_create_examenes.sql
BEGIN;

CREATE TABLE IF NOT EXISTS examenes (
  id SERIAL PRIMARY KEY,
  titulo TEXT NOT NULL,
  tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('quiz','pdf')),
  contenido JSONB,
  curso_id INTEGER REFERENCES cursos(id) ON DELETE SET NULL,
  tenant_id INTEGER,
  creado_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS examen_submissions (
  id SERIAL PRIMARY KEY,
  examen_id INTEGER REFERENCES examenes(id) ON DELETE CASCADE,
  alumno_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
  respuestas JSONB,
  archivo_pdf TEXT,
  calificacion NUMERIC,
  estado VARCHAR(20) DEFAULT 'pendiente',
  creado_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

COMMIT;
