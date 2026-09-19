-- Migration 2: Apply UNIQUE indexes and NOT NULL constraints
-- IMPORTANT: Run ONLY after Coordinated Backfill is complete and verification confirms 0 NULLs, 0 orphan FKs, and 0 duplicate UUIDs.

CREATE UNIQUE INDEX IF NOT EXISTS idx_empleados_uuid
ON empleados(uuid);

CREATE UNIQUE INDEX IF NOT EXISTS idx_asistencias_uuid
ON asistencias(uuid);

CREATE INDEX IF NOT EXISTS idx_asistencias_empleado_uuid
ON asistencias(empleado_uuid);

ALTER TABLE empleados
ALTER COLUMN uuid SET NOT NULL;

ALTER TABLE asistencias
ALTER COLUMN uuid SET NOT NULL;
