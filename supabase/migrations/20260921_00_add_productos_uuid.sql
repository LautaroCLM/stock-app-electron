-- Migration 3: Add nullable uuid column and unique constraint to productos
-- Date: 2026-09-20
-- Description: Adds uuid column as logical global identity for productos without disrupting physical int8 PKs.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'productos' AND column_name = 'uuid'
    ) THEN
        ALTER TABLE productos ADD COLUMN uuid UUID;
        ALTER TABLE productos ADD CONSTRAINT productos_uuid_key UNIQUE (uuid);
    END IF;
END $$;
