-- Migration 1: Add nullable uuid columns to empleados and asistencias
-- IMPORTANT: Does NOT modify existing data, does NOT generate uncoordinated random UUIDs, does NOT set NOT NULL or UNIQUE indexes.
-- Safe to execute before Coordinated Backfill.

ALTER TABLE empleados
ADD COLUMN IF NOT EXISTS uuid UUID;

ALTER TABLE asistencias
ADD COLUMN IF NOT EXISTS uuid UUID;

ALTER TABLE asistencias
ADD COLUMN IF NOT EXISTS empleado_uuid UUID;
