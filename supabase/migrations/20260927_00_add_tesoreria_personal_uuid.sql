-- Migration: Add nullable UUID columns and unique constraints/indexes to Tesorería, Caja, and Personal entities
-- Date: 2026-09-27
-- Description: Adds uuid identity and relational uuid columns to gastos, ajustes_caja, empleado_liquidacion_config, and empleado_liquidaciones.

DO $$
BEGIN
    -- 1. Tabla gastos
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gastos' AND column_name = 'uuid') THEN
        ALTER TABLE public.gastos ADD COLUMN uuid UUID DEFAULT gen_random_uuid();
        ALTER TABLE public.gastos ADD CONSTRAINT gastos_uuid_key UNIQUE (uuid);
    END IF;

    -- 2. Tabla ajustes_caja
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ajustes_caja' AND column_name = 'uuid') THEN
        ALTER TABLE public.ajustes_caja ADD COLUMN uuid UUID DEFAULT gen_random_uuid();
        ALTER TABLE public.ajustes_caja ADD CONSTRAINT ajustes_caja_uuid_key UNIQUE (uuid);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ajustes_caja' AND column_name = 'venta_uuid') THEN
        ALTER TABLE public.ajustes_caja ADD COLUMN venta_uuid UUID;
    END IF;

    -- 3. Tabla empleado_liquidacion_config
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'empleado_liquidacion_config' AND column_name = 'empleado_uuid') THEN
        ALTER TABLE public.empleado_liquidacion_config ADD COLUMN empleado_uuid UUID;
        ALTER TABLE public.empleado_liquidacion_config ADD CONSTRAINT empleado_liq_cfg_emp_uuid_key UNIQUE (empleado_uuid);
    END IF;

    -- 4. Tabla empleado_liquidaciones
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'empleado_liquidaciones' AND column_name = 'uuid') THEN
        ALTER TABLE public.empleado_liquidaciones ADD COLUMN uuid UUID DEFAULT gen_random_uuid();
        ALTER TABLE public.empleado_liquidaciones ADD CONSTRAINT empleado_liquidaciones_uuid_key UNIQUE (uuid);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'empleado_liquidaciones' AND column_name = 'empleado_uuid') THEN
        ALTER TABLE public.empleado_liquidaciones ADD COLUMN empleado_uuid UUID;
    END IF;
END $$;

-- Índices B-Tree secundarios para acelerar consultas relacionales y sincronización Realtime
CREATE INDEX IF NOT EXISTS idx_gastos_uuid ON public.gastos(uuid);
CREATE INDEX IF NOT EXISTS idx_ajustes_caja_uuid ON public.ajustes_caja(uuid);
CREATE INDEX IF NOT EXISTS idx_ajustes_caja_venta_uuid ON public.ajustes_caja(venta_uuid);
CREATE INDEX IF NOT EXISTS idx_empleado_liq_cfg_emp_uuid ON public.empleado_liquidacion_config(empleado_uuid);
CREATE INDEX IF NOT EXISTS idx_empleado_liquidaciones_uuid ON public.empleado_liquidaciones(uuid);
CREATE INDEX IF NOT EXISTS idx_empleado_liquidaciones_emp_uuid ON public.empleado_liquidaciones(empleado_uuid);
