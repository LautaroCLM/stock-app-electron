-- Migration: 20260928_00_add_remaining_uuid.sql
-- Description: Adds nullable UUID identity and relational UUID columns for Municipio, Atmosférico, Maquinaria, Presupuestos, and Remitos.
-- Date: 2026-09-28

DO $$
BEGIN
    -- 1. Municipio
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'municipio_ordenes' AND column_name = 'uuid') THEN
        ALTER TABLE public.municipio_ordenes ADD COLUMN uuid UUID;
        ALTER TABLE public.municipio_ordenes ADD CONSTRAINT municipio_ordenes_uuid_key UNIQUE (uuid);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'municipio_pagos' AND column_name = 'uuid') THEN
        ALTER TABLE public.municipio_pagos ADD COLUMN uuid UUID;
        ALTER TABLE public.municipio_pagos ADD CONSTRAINT municipio_pagos_uuid_key UNIQUE (uuid);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'municipio_pagos' AND column_name = 'orden_uuid') THEN
        ALTER TABLE public.municipio_pagos ADD COLUMN orden_uuid UUID;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'municipio_orden_items' AND column_name = 'uuid') THEN
        ALTER TABLE public.municipio_orden_items ADD COLUMN uuid UUID;
        ALTER TABLE public.municipio_orden_items ADD CONSTRAINT municipio_orden_items_uuid_key UNIQUE (uuid);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'municipio_orden_items' AND column_name = 'orden_uuid') THEN
        ALTER TABLE public.municipio_orden_items ADD COLUMN orden_uuid UUID;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'municipio_orden_items' AND column_name = 'producto_uuid') THEN
        ALTER TABLE public.municipio_orden_items ADD COLUMN producto_uuid UUID;
    END IF;

    -- 2. Atmosférico
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'atmos_ordenes' AND column_name = 'uuid') THEN
        ALTER TABLE public.atmos_ordenes ADD COLUMN uuid UUID;
        ALTER TABLE public.atmos_ordenes ADD CONSTRAINT atmos_ordenes_uuid_key UNIQUE (uuid);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'atmos_pagos' AND column_name = 'uuid') THEN
        ALTER TABLE public.atmos_pagos ADD COLUMN uuid UUID;
        ALTER TABLE public.atmos_pagos ADD CONSTRAINT atmos_pagos_uuid_key UNIQUE (uuid);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'atmos_pagos' AND column_name = 'orden_uuid') THEN
        ALTER TABLE public.atmos_pagos ADD COLUMN orden_uuid UUID;
    END IF;

    -- 3. Maquinaria
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'maquinas' AND column_name = 'uuid') THEN
        ALTER TABLE public.maquinas ADD COLUMN uuid UUID;
        ALTER TABLE public.maquinas ADD CONSTRAINT maquinas_uuid_key UNIQUE (uuid);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trabajos_maquinas' AND column_name = 'uuid') THEN
        ALTER TABLE public.trabajos_maquinas ADD COLUMN uuid UUID;
        ALTER TABLE public.trabajos_maquinas ADD CONSTRAINT trabajos_maquinas_uuid_key UNIQUE (uuid);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trabajos_maquinas' AND column_name = 'maquina_uuid') THEN
        ALTER TABLE public.trabajos_maquinas ADD COLUMN maquina_uuid UUID;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'combustible_maquinas' AND column_name = 'uuid') THEN
        ALTER TABLE public.combustible_maquinas ADD COLUMN uuid UUID;
        ALTER TABLE public.combustible_maquinas ADD CONSTRAINT combustible_maquinas_uuid_key UNIQUE (uuid);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'combustible_maquinas' AND column_name = 'maquina_uuid') THEN
        ALTER TABLE public.combustible_maquinas ADD COLUMN maquina_uuid UUID;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mantenimiento_maquinas' AND column_name = 'uuid') THEN
        ALTER TABLE public.mantenimiento_maquinas ADD COLUMN uuid UUID;
        ALTER TABLE public.mantenimiento_maquinas ADD CONSTRAINT mantenimiento_maquinas_uuid_key UNIQUE (uuid);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mantenimiento_maquinas' AND column_name = 'maquina_uuid') THEN
        ALTER TABLE public.mantenimiento_maquinas ADD COLUMN maquina_uuid UUID;
    END IF;

    -- 4. Documentos
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'presupuestos' AND column_name = 'uuid') THEN
        ALTER TABLE public.presupuestos ADD COLUMN uuid UUID;
        ALTER TABLE public.presupuestos ADD CONSTRAINT presupuestos_uuid_key UNIQUE (uuid);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'remitos' AND column_name = 'uuid') THEN
        ALTER TABLE public.remitos ADD COLUMN uuid UUID;
        ALTER TABLE public.remitos ADD CONSTRAINT remitos_uuid_key UNIQUE (uuid);
    END IF;
END $$;

-- Índices B-Tree Secundarios
CREATE INDEX IF NOT EXISTS idx_municipio_ordenes_uuid ON public.municipio_ordenes(uuid);
CREATE INDEX IF NOT EXISTS idx_municipio_pagos_uuid ON public.municipio_pagos(uuid);
CREATE INDEX IF NOT EXISTS idx_municipio_pagos_orden_uuid ON public.municipio_pagos(orden_uuid);
CREATE INDEX IF NOT EXISTS idx_municipio_orden_items_uuid ON public.municipio_orden_items(uuid);
CREATE INDEX IF NOT EXISTS idx_municipio_orden_items_orden_uuid ON public.municipio_orden_items(orden_uuid);
CREATE INDEX IF NOT EXISTS idx_municipio_orden_items_prod_uuid ON public.municipio_orden_items(producto_uuid);
CREATE INDEX IF NOT EXISTS idx_atmos_ordenes_uuid ON public.atmos_ordenes(uuid);
CREATE INDEX IF NOT EXISTS idx_atmos_pagos_uuid ON public.atmos_pagos(uuid);
CREATE INDEX IF NOT EXISTS idx_atmos_pagos_orden_uuid ON public.atmos_pagos(orden_uuid);
CREATE INDEX IF NOT EXISTS idx_maquinas_uuid ON public.maquinas(uuid);
CREATE INDEX IF NOT EXISTS idx_trabajos_maquinas_uuid ON public.trabajos_maquinas(uuid);
CREATE INDEX IF NOT EXISTS idx_trabajos_maquinas_maq_uuid ON public.trabajos_maquinas(maquina_uuid);
CREATE INDEX IF NOT EXISTS idx_combustible_maquinas_uuid ON public.combustible_maquinas(uuid);
CREATE INDEX IF NOT EXISTS idx_combustible_maquinas_maq_uuid ON public.combustible_maquinas(maquina_uuid);
CREATE INDEX IF NOT EXISTS idx_mantenimiento_maquinas_uuid ON public.mantenimiento_maquinas(uuid);
CREATE INDEX IF NOT EXISTS idx_mantenimiento_maquinas_maq_uuid ON public.mantenimiento_maquinas(maquina_uuid);
CREATE INDEX IF NOT EXISTS idx_presupuestos_uuid ON public.presupuestos(uuid);
CREATE INDEX IF NOT EXISTS idx_remitos_uuid ON public.remitos(uuid);
