-- Migration: Add nullable UUID columns and unique constraints/indexes to POS entities (ventas, tickets)
-- Date: 2026-09-25
-- Description: Adds uuid identity and relational uuid columns to ventas and tickets without altering int8 PKs.

DO $$
BEGIN
    -- 1. Tabla ventas
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ventas' AND column_name = 'uuid') THEN
        ALTER TABLE public.ventas ADD COLUMN uuid UUID;
        ALTER TABLE public.ventas ADD CONSTRAINT ventas_uuid_key UNIQUE (uuid);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ventas' AND column_name = 'producto_uuid') THEN
        ALTER TABLE public.ventas ADD COLUMN producto_uuid UUID;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ventas' AND column_name = 'ticket_uuid') THEN
        ALTER TABLE public.ventas ADD COLUMN ticket_uuid UUID;
    END IF;

    -- 2. Tabla tickets
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tickets' AND column_name = 'uuid') THEN
        ALTER TABLE public.tickets ADD COLUMN uuid UUID;
        ALTER TABLE public.tickets ADD CONSTRAINT tickets_uuid_key UNIQUE (uuid);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tickets' AND column_name = 'cliente_uuid') THEN
        ALTER TABLE public.tickets ADD COLUMN cliente_uuid UUID;
    END IF;
END $$;

-- Índices B-Tree secundarios para acelerar consultas relacionales y sincronización Realtime
CREATE INDEX IF NOT EXISTS idx_ventas_producto_uuid ON public.ventas(producto_uuid);
CREATE INDEX IF NOT EXISTS idx_ventas_ticket_uuid ON public.ventas(ticket_uuid);
CREATE INDEX IF NOT EXISTS idx_tickets_cliente_uuid ON public.tickets(cliente_uuid);
