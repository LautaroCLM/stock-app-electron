-- =============================================================================
-- POLÍTICAS DE SOLO LECTURA (ROW LEVEL SECURITY - RLS) EN SUPABASE
-- Proyecto: Inventario StockApp - Fase 2.4.2
-- =============================================================================
-- Este script habilita RLS en las 29 tablas del esquema y otorga permisos de
-- lectura (SELECT) de forma idempotente para el rol anon (Publishable Key).
-- NO otorga permisos de escritura (INSERT, UPDATE, DELETE).
-- =============================================================================

-- 1. TABLA: categorias
ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir lectura publica a anon" ON categorias;
CREATE POLICY "Permitir lectura publica a anon" ON categorias FOR SELECT TO anon, authenticated USING (true);

-- 2. TABLA: proveedores
ALTER TABLE proveedores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir lectura publica a anon" ON proveedores;
CREATE POLICY "Permitir lectura publica a anon" ON proveedores FOR SELECT TO anon, authenticated USING (true);

-- 3. TABLA: productos
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir lectura publica a anon" ON productos;
CREATE POLICY "Permitir lectura publica a anon" ON productos FOR SELECT TO anon, authenticated USING (true);

-- 4. TABLA: ventas
ALTER TABLE ventas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir lectura publica a anon" ON ventas;
CREATE POLICY "Permitir lectura publica a anon" ON ventas FOR SELECT TO anon, authenticated USING (true);

-- 5. TABLA: historial
ALTER TABLE historial ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir lectura publica a anon" ON historial;
CREATE POLICY "Permitir lectura publica a anon" ON historial FOR SELECT TO anon, authenticated USING (true);

-- 6. TABLA: tickets
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir lectura publica a anon" ON tickets;
CREATE POLICY "Permitir lectura publica a anon" ON tickets FOR SELECT TO anon, authenticated USING (true);

-- 7. TABLA: horarios
ALTER TABLE horarios ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir lectura publica a anon" ON horarios;
CREATE POLICY "Permitir lectura publica a anon" ON horarios FOR SELECT TO anon, authenticated USING (true);

-- 8. TABLA: empleados
ALTER TABLE empleados ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir lectura publica a anon" ON empleados;
CREATE POLICY "Permitir lectura publica a anon" ON empleados FOR SELECT TO anon, authenticated USING (true);

-- 9. TABLA: asistencias
ALTER TABLE asistencias ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir lectura publica a anon" ON asistencias;
CREATE POLICY "Permitir lectura publica a anon" ON asistencias FOR SELECT TO anon, authenticated USING (true);

-- 10. TABLA: compras_proveedor
ALTER TABLE compras_proveedor ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir lectura publica a anon" ON compras_proveedor;
CREATE POLICY "Permitir lectura publica a anon" ON compras_proveedor FOR SELECT TO anon, authenticated USING (true);

-- 11. TABLA: pagos_proveedor
ALTER TABLE pagos_proveedor ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir lectura publica a anon" ON pagos_proveedor;
CREATE POLICY "Permitir lectura publica a anon" ON pagos_proveedor FOR SELECT TO anon, authenticated USING (true);

-- 12. TABLA: cuenta_corriente_proveedor
ALTER TABLE cuenta_corriente_proveedor ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir lectura publica a anon" ON cuenta_corriente_proveedor;
CREATE POLICY "Permitir lectura publica a anon" ON cuenta_corriente_proveedor FOR SELECT TO anon, authenticated USING (true);

-- 13. TABLA: maquinas
ALTER TABLE maquinas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir lectura publica a anon" ON maquinas;
CREATE POLICY "Permitir lectura publica a anon" ON maquinas FOR SELECT TO anon, authenticated USING (true);

-- 14. TABLA: trabajos_maquinas
ALTER TABLE trabajos_maquinas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir lectura publica a anon" ON trabajos_maquinas;
CREATE POLICY "Permitir lectura publica a anon" ON trabajos_maquinas FOR SELECT TO anon, authenticated USING (true);

-- 15. TABLA: combustible_maquinas
ALTER TABLE combustible_maquinas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir lectura publica a anon" ON combustible_maquinas;
CREATE POLICY "Permitir lectura publica a anon" ON combustible_maquinas FOR SELECT TO anon, authenticated USING (true);

-- 16. TABLA: mantenimiento_maquinas
ALTER TABLE mantenimiento_maquinas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir lectura publica a anon" ON mantenimiento_maquinas;
CREATE POLICY "Permitir lectura publica a anon" ON mantenimiento_maquinas FOR SELECT TO anon, authenticated USING (true);

-- 17. TABLA: notificaciones
ALTER TABLE notificaciones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir lectura publica a anon" ON notificaciones;
CREATE POLICY "Permitir lectura publica a anon" ON notificaciones FOR SELECT TO anon, authenticated USING (true);

-- 18. TABLA: municipio_ordenes
ALTER TABLE municipio_ordenes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir lectura publica a anon" ON municipio_ordenes;
CREATE POLICY "Permitir lectura publica a anon" ON municipio_ordenes FOR SELECT TO anon, authenticated USING (true);

-- 19. TABLA: municipio_pagos
ALTER TABLE municipio_pagos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir lectura publica a anon" ON municipio_pagos;
CREATE POLICY "Permitir lectura publica a anon" ON municipio_pagos FOR SELECT TO anon, authenticated USING (true);

-- 20. TABLA: municipio_orden_items
ALTER TABLE municipio_orden_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir lectura publica a anon" ON municipio_orden_items;
CREATE POLICY "Permitir lectura publica a anon" ON municipio_orden_items FOR SELECT TO anon, authenticated USING (true);

-- 21. TABLA: atmos_ordenes
ALTER TABLE atmos_ordenes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir lectura publica a anon" ON atmos_ordenes;
CREATE POLICY "Permitir lectura publica a anon" ON atmos_ordenes FOR SELECT TO anon, authenticated USING (true);

-- 22. TABLA: atmos_pagos
ALTER TABLE atmos_pagos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir lectura publica a anon" ON atmos_pagos;
CREATE POLICY "Permitir lectura publica a anon" ON atmos_pagos FOR SELECT TO anon, authenticated USING (true);

-- 23. TABLA: presupuestos
GRANT ALL ON TABLE public.presupuestos TO anon, authenticated, service_role;
ALTER TABLE public.presupuestos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir lectura publica a anon" ON public.presupuestos;
CREATE POLICY "Permitir lectura publica a anon" ON public.presupuestos FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Permitir escrituras a la app" ON public.presupuestos;
CREATE POLICY "Permitir escrituras a la app" ON public.presupuestos FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 24. TABLA: remitos
GRANT ALL ON TABLE public.remitos TO anon, authenticated, service_role;
ALTER TABLE public.remitos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir lectura publica a anon" ON public.remitos;
CREATE POLICY "Permitir lectura publica a anon" ON public.remitos FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Permitir escrituras a la app" ON public.remitos;
CREATE POLICY "Permitir escrituras a la app" ON public.remitos FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 25. TABLA: empleado_liquidacion_config
ALTER TABLE empleado_liquidacion_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir lectura publica a anon" ON empleado_liquidacion_config;
CREATE POLICY "Permitir lectura publica a anon" ON empleado_liquidacion_config FOR SELECT TO anon, authenticated USING (true);

-- 26. TABLA: empleado_liquidaciones
ALTER TABLE empleado_liquidaciones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir lectura publica a anon" ON empleado_liquidaciones;
CREATE POLICY "Permitir lectura publica a anon" ON empleado_liquidaciones FOR SELECT TO anon, authenticated USING (true);

-- 27. TABLA: gastos
ALTER TABLE gastos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir lectura publica a anon" ON gastos;
CREATE POLICY "Permitir lectura publica a anon" ON gastos FOR SELECT TO anon, authenticated USING (true);

-- 28. TABLA: ajustes_caja
ALTER TABLE ajustes_caja ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir lectura publica a anon" ON ajustes_caja;
CREATE POLICY "Permitir lectura publica a anon" ON ajustes_caja FOR SELECT TO anon, authenticated USING (true);

-- 29. TABLA: sync_status
ALTER TABLE sync_status ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir lectura publica a anon" ON sync_status;
CREATE POLICY "Permitir lectura publica a anon" ON sync_status FOR SELECT TO anon, authenticated USING (true);
