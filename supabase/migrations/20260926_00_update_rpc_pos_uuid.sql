-- =============================================================================
-- MIGRACIÓN DE RPC POS CON IDENTIDAD NATIVA UUID Y SEGURIDAD HARDENED (FASE 1C.3)
-- Fecha: 2026-09-26
-- Archivo: supabase/migrations/20260926_00_update_rpc_pos_uuid.sql
-- =============================================================================

CREATE OR REPLACE FUNCTION public.procesar_venta_multiproducto(
    p_items jsonb,
    p_metodo_pago text DEFAULT 'Efectivo',
    p_cliente text DEFAULT 'Consumidor Final',
    p_client_transaction_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_item jsonb;
    v_producto_id bigint;
    v_producto_uuid uuid;
    v_db_prod_uuid uuid;
    v_venta_uuid uuid;
    v_cantidad numeric;
    v_total_item numeric;
    v_stock_actual numeric;
    v_nombre_prod text;
    v_subtotal numeric := 0;
    v_ticket_id bigint;
    v_ticket_uuid uuid;
BEGIN
    -- 1. Validar payload de ítems
    IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'El carrito de productos está vacío.');
    END IF;

    -- 2. VERIFICACIÓN DE IDEMPOTENCIA ATÓMICA
    IF p_client_transaction_id IS NOT NULL THEN
        SELECT id, uuid INTO v_ticket_id, v_ticket_uuid
        FROM public.tickets
        WHERE client_transaction_id = p_client_transaction_id OR uuid = p_client_transaction_id;

        IF FOUND THEN
            SELECT total INTO v_subtotal FROM public.tickets WHERE id = v_ticket_id;
            RETURN jsonb_build_object(
                'success', true,
                'ticket_id', v_ticket_id,
                'ticket_uuid', COALESCE(v_ticket_uuid, p_client_transaction_id),
                'total', v_subtotal,
                'idempotent_replay', true
            );
        END IF;
    END IF;

    -- 3. VALIDACIÓN DE STOCK Y BLOQUEO DE FILAS (FOR UPDATE en orden ascendente)
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) ORDER BY (value->>'producto_id')::bigint ASC LOOP
        v_producto_id := (v_item->>'producto_id')::bigint;
        v_cantidad := (v_item->>'cantidad')::numeric;
        v_total_item := (v_item->>'total')::numeric;

        SELECT stock, nombre INTO v_stock_actual, v_nombre_prod
        FROM public.productos
        WHERE id = v_producto_id
        FOR UPDATE;

        IF NOT FOUND THEN
            RETURN jsonb_build_object('success', false, 'error', 'Producto ID ' || v_producto_id || ' no existe.');
        END IF;

        IF v_stock_actual < v_cantidad THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'STOCK_INSUFICIENTE: Producto "' || v_nombre_prod || '" (ID ' || v_producto_id || ') tiene stock ' || v_stock_actual || ', pero se solicitaron ' || v_cantidad
            );
        END IF;

        v_subtotal := v_subtotal + v_total_item;
    END LOOP;

    -- Definir ticket_uuid (reutiliza p_client_transaction_id si viene, o genera uno si NULL)
    v_ticket_uuid := COALESCE(p_client_transaction_id, gen_random_uuid());

    -- 4. INSERT EN TABLA TICKETS (CON uuid = v_ticket_uuid Y client_transaction_id)
    INSERT INTO public.tickets (fecha, metodo_pago, total, productos, tipo, subtotal, cliente, client_transaction_id, uuid)
    VALUES (NOW(), p_metodo_pago, v_subtotal, p_items, 'Venta', v_subtotal, p_cliente, p_client_transaction_id, v_ticket_uuid)
    RETURNING id INTO v_ticket_id;

    -- 5. DESCUENTO DE STOCK E INSERT EN TABLA VENTAS (CON uuid, producto_uuid, ticket_uuid)
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
        v_producto_id := (v_item->>'producto_id')::bigint;
        v_cantidad := (v_item->>'cantidad')::numeric;
        v_total_item := (v_item->>'total')::numeric;

        -- Resolución segura de producto_uuid: priorizar UUID de la tabla productos de Supabase
        SELECT uuid INTO v_db_prod_uuid FROM public.productos WHERE id = v_producto_id;
        IF v_db_prod_uuid IS NOT NULL THEN
            v_producto_uuid := v_db_prod_uuid;
        ELSIF (v_item->>'producto_uuid') IS NOT NULL AND (v_item->>'producto_uuid') <> '' THEN
            v_producto_uuid := (v_item->>'producto_uuid')::uuid;
        ELSE
            v_producto_uuid := NULL;
        END IF;

        -- Extraer o generar uuid de la venta
        IF (v_item->>'uuid') IS NOT NULL AND (v_item->>'uuid') <> '' THEN
            v_venta_uuid := (v_item->>'uuid')::uuid;
        ELSE
            v_venta_uuid := gen_random_uuid();
        END IF;

        UPDATE public.productos
        SET stock = stock - v_cantidad
        WHERE id = v_producto_id;

        INSERT INTO public.ventas (producto_id, cantidad, total, metodo_pago, cliente, fecha, client_transaction_id, uuid, producto_uuid, ticket_uuid)
        VALUES (v_producto_id, v_cantidad, v_total_item, p_metodo_pago, p_cliente, NOW(), p_client_transaction_id, v_venta_uuid, v_producto_uuid, v_ticket_uuid);
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'ticket_id', v_ticket_id,
        'ticket_uuid', v_ticket_uuid,
        'total', v_subtotal,
        'idempotent_replay', false
    );
EXCEPTION
    WHEN unique_violation THEN
        IF p_client_transaction_id IS NOT NULL THEN
            SELECT id, uuid INTO v_ticket_id, v_ticket_uuid FROM public.tickets WHERE client_transaction_id = p_client_transaction_id OR uuid = p_client_transaction_id;
            IF FOUND THEN
                SELECT total INTO v_subtotal FROM public.tickets WHERE id = v_ticket_id;
                RETURN jsonb_build_object(
                    'success', true,
                    'ticket_id', v_ticket_id,
                    'ticket_uuid', COALESCE(v_ticket_uuid, p_client_transaction_id),
                    'total', v_subtotal,
                    'idempotent_replay', true
                );
            END IF;
        END IF;
        RETURN jsonb_build_object('success', false, 'error', SQLERRM);
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
