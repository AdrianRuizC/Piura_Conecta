-- Añade tenant_id a cursos y crea tabla inscripciones
ALTER TABLE cursos ADD COLUMN IF NOT EXISTS tenant_id INTEGER DEFAULT 1;

CREATE TABLE IF NOT EXISTS inscripciones (
  id SERIAL PRIMARY KEY,
  alumno_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  curso_id INTEGER NOT NULL REFERENCES cursos(id) ON DELETE CASCADE,
  tenant_id INTEGER,
  creado_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inscripciones_tenant ON inscripciones(tenant_id);
CREATE INDEX IF NOT EXISTS idx_inscripciones_alumno ON inscripciones(alumno_id);
*** End Patch