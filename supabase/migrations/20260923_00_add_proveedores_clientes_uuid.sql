-- Migration: Add nullable uuid column and unique constraint to proveedores and clientes
-- Date: 2026-09-23
-- Description: Adds uuid column as logical global identity for proveedores and clientes without disrupting physical int8 PKs.

DO $$
BEGIN
    -- 1. Add uuid column to proveedores if missing
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'proveedores' AND column_name = 'uuid'
    ) THEN
        ALTER TABLE proveedores ADD COLUMN uuid UUID;
        ALTER TABLE proveedores ADD CONSTRAINT proveedores_uuid_key UNIQUE (uuid);
    END IF;

    -- 2. Add uuid column to clientes if missing
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'clientes' AND column_name = 'uuid'
    ) THEN
        ALTER TABLE clientes ADD COLUMN uuid UUID;
        ALTER TABLE clientes ADD CONSTRAINT clientes_uuid_key UNIQUE (uuid);
    END IF;
END $$;
