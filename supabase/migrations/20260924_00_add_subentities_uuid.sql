-- Migration: Add nullable uuid columns and unique constraints/indexes to sub-entities of Clientes and Proveedores
-- Date: 2026-09-24
-- Description: Adds uuid identity and relational uuid columns to cliente_ventas, pagos_cliente, cuenta_corriente_cliente, compras_proveedor, pagos_proveedor, and cuenta_corriente_proveedor without altering existing int8 PKs.

DO $$
BEGIN
    -- 1. cliente_ventas
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cliente_ventas' AND column_name = 'uuid') THEN
        ALTER TABLE cliente_ventas ADD COLUMN uuid UUID;
        ALTER TABLE cliente_ventas ADD CONSTRAINT cliente_ventas_uuid_key UNIQUE (uuid);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cliente_ventas' AND column_name = 'cliente_uuid') THEN
        ALTER TABLE cliente_ventas ADD COLUMN cliente_uuid UUID;
    END IF;

    -- 2. pagos_cliente
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pagos_cliente' AND column_name = 'uuid') THEN
        ALTER TABLE pagos_cliente ADD COLUMN uuid UUID;
        ALTER TABLE pagos_cliente ADD CONSTRAINT pagos_cliente_uuid_key UNIQUE (uuid);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pagos_cliente' AND column_name = 'cliente_uuid') THEN
        ALTER TABLE pagos_cliente ADD COLUMN cliente_uuid UUID;
    END IF;

    -- 3. cuenta_corriente_cliente
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cuenta_corriente_cliente' AND column_name = 'uuid') THEN
        ALTER TABLE cuenta_corriente_cliente ADD COLUMN uuid UUID;
        ALTER TABLE cuenta_corriente_cliente ADD CONSTRAINT cuenta_corriente_cliente_uuid_key UNIQUE (uuid);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cuenta_corriente_cliente' AND column_name = 'cliente_uuid') THEN
        ALTER TABLE cuenta_corriente_cliente ADD COLUMN cliente_uuid UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cuenta_corriente_cliente' AND column_name = 'referencia_uuid') THEN
        ALTER TABLE cuenta_corriente_cliente ADD COLUMN referencia_uuid UUID;
    END IF;

    -- 4. compras_proveedor
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'compras_proveedor' AND column_name = 'uuid') THEN
        ALTER TABLE compras_proveedor ADD COLUMN uuid UUID;
        ALTER TABLE compras_proveedor ADD CONSTRAINT compras_proveedor_uuid_key UNIQUE (uuid);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'compras_proveedor' AND column_name = 'proveedor_uuid') THEN
        ALTER TABLE compras_proveedor ADD COLUMN proveedor_uuid UUID;
    END IF;

    -- 5. pagos_proveedor
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pagos_proveedor' AND column_name = 'uuid') THEN
        ALTER TABLE pagos_proveedor ADD COLUMN uuid UUID;
        ALTER TABLE pagos_proveedor ADD CONSTRAINT pagos_proveedor_uuid_key UNIQUE (uuid);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pagos_proveedor' AND column_name = 'proveedor_uuid') THEN
        ALTER TABLE pagos_proveedor ADD COLUMN proveedor_uuid UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pagos_proveedor' AND column_name = 'compra_uuid') THEN
        ALTER TABLE pagos_proveedor ADD COLUMN compra_uuid UUID;
    END IF;

    -- 6. cuenta_corriente_proveedor
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cuenta_corriente_proveedor' AND column_name = 'uuid') THEN
        ALTER TABLE cuenta_corriente_proveedor ADD COLUMN uuid UUID;
        ALTER TABLE cuenta_corriente_proveedor ADD CONSTRAINT cuenta_corriente_proveedor_uuid_key UNIQUE (uuid);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cuenta_corriente_proveedor' AND column_name = 'proveedor_uuid') THEN
        ALTER TABLE cuenta_corriente_proveedor ADD COLUMN proveedor_uuid UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cuenta_corriente_proveedor' AND column_name = 'referencia_uuid') THEN
        ALTER TABLE cuenta_corriente_proveedor ADD COLUMN referencia_uuid UUID;
    END IF;
END $$;

-- Indexes for performance & Realtime resolution
CREATE INDEX IF NOT EXISTS idx_cliente_ventas_cliente_uuid ON cliente_ventas(cliente_uuid);
CREATE INDEX IF NOT EXISTS idx_pagos_cliente_cliente_uuid ON pagos_cliente(cliente_uuid);
CREATE INDEX IF NOT EXISTS idx_cuenta_corriente_cliente_cliente_uuid ON cuenta_corriente_cliente(cliente_uuid);
CREATE INDEX IF NOT EXISTS idx_cuenta_corriente_cliente_referencia_uuid ON cuenta_corriente_cliente(referencia_uuid);

CREATE INDEX IF NOT EXISTS idx_compras_proveedor_proveedor_uuid ON compras_proveedor(proveedor_uuid);
CREATE INDEX IF NOT EXISTS idx_pagos_proveedor_proveedor_uuid ON pagos_proveedor(proveedor_uuid);
CREATE INDEX IF NOT EXISTS idx_pagos_proveedor_compra_uuid ON pagos_proveedor(compra_uuid);
CREATE INDEX IF NOT EXISTS idx_cuenta_corriente_proveedor_proveedor_uuid ON cuenta_corriente_proveedor(proveedor_uuid);
CREATE INDEX IF NOT EXISTS idx_cuenta_corriente_proveedor_referencia_uuid ON cuenta_corriente_proveedor(referencia_uuid);
