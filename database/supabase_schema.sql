-- =============================================================================
-- ESQUEMA COMPLETO POSTGRESQL / SUPABASE - MIGRACIÓN FASE 1.1
-- Proyecto: Inventario StockApp
-- =============================================================================
-- Este script es idempotente y compatible con el SQL Editor de Supabase.
-- Convierte las 29 tablas del esquema SQLite a tipos nativos de PostgreSQL.
-- =============================================================================

-- 1. TABLA: categorias
CREATE TABLE IF NOT EXISTS categorias (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre TEXT UNIQUE
);

-- 2. TABLA: proveedores
CREATE TABLE IF NOT EXISTS proveedores (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    razon_social TEXT NOT NULL,
    contacto TEXT,
    telefono TEXT,
    email TEXT,
    direccion TEXT,
    ciudad TEXT,
    provincia TEXT,
    cuit TEXT,
    observaciones TEXT,
    estado TEXT DEFAULT 'Activo',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABLA: productos
CREATE TABLE IF NOT EXISTS productos (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo TEXT NOT NULL,
    nombre TEXT NOT NULL,
    categoria TEXT,
    stock NUMERIC(12,3) DEFAULT 0,
    unidad TEXT DEFAULT 'un',
    precio_costo NUMERIC(12,2) DEFAULT 0,
    precio NUMERIC(12,2) DEFAULT 0,
    stock_minimo NUMERIC(12,3) DEFAULT 10,
    proveedor_id BIGINT REFERENCES proveedores(id) ON DELETE SET NULL DEFAULT NULL,
    CONSTRAINT productos_codigo_nombre_key UNIQUE(codigo, nombre)
);

-- 4. TABLA: ventas
CREATE TABLE IF NOT EXISTS ventas (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    producto_id BIGINT REFERENCES productos(id) ON DELETE SET NULL,
    cantidad NUMERIC(12,3),
    total NUMERIC(12,2),
    cliente TEXT,
    metodo_pago TEXT,
    fecha TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABLA: historial
CREATE TABLE IF NOT EXISTS historial (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    accion TEXT,
    detalle TEXT,
    fecha TIMESTAMPTZ DEFAULT NOW()
);

-- 6. TABLA: tickets
CREATE TABLE IF NOT EXISTS tickets (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    fecha TIMESTAMPTZ DEFAULT NOW(),
    metodo_pago TEXT,
    total NUMERIC(12,2),
    productos JSONB,
    tipo TEXT,
    descuento NUMERIC(12,2) DEFAULT 0,
    subtotal NUMERIC(12,2) DEFAULT 0,
    cliente TEXT,
    observaciones TEXT,
    recargo NUMERIC(12,2) DEFAULT 0
);

-- 7. TABLA: horarios
CREATE TABLE IF NOT EXISTS horarios (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre TEXT NOT NULL,
    lunes TEXT DEFAULT 'Libre',
    martes TEXT DEFAULT 'Libre',
    miercoles TEXT DEFAULT 'Libre',
    jueves TEXT DEFAULT 'Libre',
    viernes TEXT DEFAULT 'Libre',
    sabado TEXT DEFAULT 'Libre',
    domingo TEXT DEFAULT 'Libre'
);

-- 8. TABLA: empleados
CREATE TABLE IF NOT EXISTS empleados (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre TEXT NOT NULL,
    apellido TEXT NOT NULL,
    dni TEXT UNIQUE NOT NULL,
    fecha_nacimiento TEXT,
    telefono TEXT,
    email TEXT,
    direccion TEXT,
    cargo TEXT,
    fecha_ingreso TEXT,
    salario NUMERIC(12,2),
    observaciones TEXT,
    estado TEXT DEFAULT 'Activo',
    horario_id BIGINT REFERENCES horarios(id) ON DELETE SET NULL
);

-- 9. TABLA: asistencias
CREATE TABLE IF NOT EXISTS asistencias (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    empleado_id BIGINT NOT NULL REFERENCES empleados(id) ON DELETE CASCADE,
    fecha TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    hora_entrada TEXT,
    hora_salida TEXT,
    estado TEXT NOT NULL,
    observaciones TEXT,
    CONSTRAINT asistencias_empleado_fecha_key UNIQUE(empleado_id, fecha)
);

-- 10. TABLA: compras_proveedor
CREATE TABLE IF NOT EXISTS compras_proveedor (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    proveedor_id BIGINT NOT NULL REFERENCES proveedores(id) ON DELETE CASCADE,
    fecha TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    descripcion TEXT,
    total NUMERIC(12,2) DEFAULT 0,
    metodo_pago TEXT DEFAULT 'Efectivo',
    estado TEXT DEFAULT 'Pagado',
    observaciones TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. TABLA: pagos_proveedor
CREATE TABLE IF NOT EXISTS pagos_proveedor (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    proveedor_id BIGINT NOT NULL REFERENCES proveedores(id) ON DELETE CASCADE,
    compra_id BIGINT REFERENCES compras_proveedor(id) ON DELETE SET NULL,
    fecha TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    monto NUMERIC(12,2) DEFAULT 0,
    metodo_pago TEXT DEFAULT 'Efectivo',
    comprobante TEXT,
    observaciones TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. TABLA: cuenta_corriente_proveedor
CREATE TABLE IF NOT EXISTS cuenta_corriente_proveedor (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    proveedor_id BIGINT NOT NULL REFERENCES proveedores(id) ON DELETE CASCADE,
    fecha TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    tipo TEXT NOT NULL,
    descripcion TEXT,
    debito NUMERIC(12,2) DEFAULT 0,
    credito NUMERIC(12,2) DEFAULT 0,
    referencia_id BIGINT,
    fecha_vencimiento TIMESTAMPTZ,
    estado_pago TEXT DEFAULT 'Pendiente',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. TABLA: maquinas
CREATE TABLE IF NOT EXISTS maquinas (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre TEXT NOT NULL,
    tipo TEXT,
    marca TEXT,
    modelo TEXT,
    anio INTEGER,
    numero_serie TEXT,
    precio_hora NUMERIC(12,2) DEFAULT 0,
    consumo_hora NUMERIC(12,3) DEFAULT 0,
    estado TEXT DEFAULT 'Disponible',
    observaciones TEXT,
    ultimo_servicio TIMESTAMPTZ,
    horas_totales NUMERIC(12,3) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. TABLA: trabajos_maquinas
CREATE TABLE IF NOT EXISTS trabajos_maquinas (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    maquina_id BIGINT NOT NULL REFERENCES maquinas(id) ON DELETE CASCADE,
    fecha TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    cliente TEXT,
    operador TEXT,
    hora_inicio TEXT,
    hora_fin TEXT,
    horas NUMERIC(12,3) DEFAULT 0,
    precio_hora NUMERIC(12,2) DEFAULT 0,
    total NUMERIC(12,2) DEFAULT 0,
    observaciones TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. TABLA: combustible_maquinas
CREATE TABLE IF NOT EXISTS combustible_maquinas (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    maquina_id BIGINT NOT NULL REFERENCES maquinas(id) ON DELETE CASCADE,
    fecha TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    litros NUMERIC(12,3) DEFAULT 0,
    precio_litro NUMERIC(12,2) DEFAULT 0,
    total NUMERIC(12,2) DEFAULT 0,
    observaciones TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 16. TABLA: mantenimiento_maquinas
CREATE TABLE IF NOT EXISTS mantenimiento_maquinas (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    maquina_id BIGINT NOT NULL REFERENCES maquinas(id) ON DELETE CASCADE,
    fecha TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    tipo TEXT,
    descripcion TEXT,
    costo NUMERIC(12,2) DEFAULT 0,
    proximo_mantenimiento TIMESTAMPTZ,
    estado TEXT DEFAULT 'Realizado',
    observaciones TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 17. TABLA: notificaciones
CREATE TABLE IF NOT EXISTS notificaciones (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    type TEXT NOT NULL,
    icon TEXT,
    title TEXT NOT NULL,
    description TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 18. TABLA: municipio_ordenes
CREATE TABLE IF NOT EXISTS municipio_ordenes (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    fecha TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expediente TEXT,
    orden_compra TEXT,
    fecha_estimada_cobro TIMESTAMPTZ,
    observaciones TEXT,
    total NUMERIC(12,2) DEFAULT 0,
    saldo_pendiente NUMERIC(12,2) DEFAULT 0,
    estado TEXT DEFAULT 'Pendiente',
    productos JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 19. TABLA: municipio_pagos
CREATE TABLE IF NOT EXISTS municipio_pagos (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    orden_id BIGINT NOT NULL REFERENCES municipio_ordenes(id) ON DELETE CASCADE,
    fecha TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    monto NUMERIC(12,2) DEFAULT 0,
    metodo_pago TEXT DEFAULT 'Transferencia',
    observaciones TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 20. TABLA: municipio_orden_items
CREATE TABLE IF NOT EXISTS municipio_orden_items (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    orden_id BIGINT NOT NULL REFERENCES municipio_ordenes(id) ON DELETE CASCADE,
    producto_id BIGINT REFERENCES productos(id) ON DELETE SET NULL,
    codigo TEXT,
    nombre TEXT,
    precio NUMERIC(12,2) DEFAULT 0,
    cantidad NUMERIC(12,3) DEFAULT 0
);

-- 21. TABLA: atmos_ordenes
CREATE TABLE IF NOT EXISTS atmos_ordenes (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    fecha TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    cliente TEXT NOT NULL,
    direccion TEXT NOT NULL,
    telefono TEXT,
    tipo_servicio TEXT NOT NULL,
    descripcion TEXT,
    monto NUMERIC(12,2) DEFAULT 0,
    saldo_pendiente NUMERIC(12,2) DEFAULT 0,
    estado TEXT DEFAULT 'Pendiente',
    observaciones TEXT,
    fecha_estimada_cobro TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 22. TABLA: atmos_pagos
CREATE TABLE IF NOT EXISTS atmos_pagos (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    orden_id BIGINT NOT NULL REFERENCES atmos_ordenes(id) ON DELETE CASCADE,
    fecha TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    monto NUMERIC(12,2) DEFAULT 0,
    metodo_pago TEXT NOT NULL,
    observaciones TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 23. TABLA: presupuestos
CREATE TABLE IF NOT EXISTS presupuestos (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    fecha TIMESTAMPTZ DEFAULT NOW(),
    total NUMERIC(12,2),
    productos JSONB,
    descuento NUMERIC(12,2) DEFAULT 0,
    recargo NUMERIC(12,2) DEFAULT 0,
    subtotal NUMERIC(12,2) DEFAULT 0,
    cliente TEXT,
    observaciones TEXT,
    direccion TEXT,
    localidad TEXT,
    cuit TEXT,
    telefono TEXT
);

-- 24. TABLA: remitos
CREATE TABLE IF NOT EXISTS remitos (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    fecha TIMESTAMPTZ DEFAULT NOW(),
    total NUMERIC(12,2),
    productos JSONB,
    descuento NUMERIC(12,2) DEFAULT 0,
    recargo NUMERIC(12,2) DEFAULT 0,
    subtotal NUMERIC(12,2) DEFAULT 0,
    cliente TEXT,
    metodo_pago TEXT,
    observaciones TEXT,
    direccion TEXT,
    localidad TEXT,
    cuit TEXT,
    telefono TEXT
);

-- 25. TABLA: empleado_liquidacion_config
CREATE TABLE IF NOT EXISTS empleado_liquidacion_config (
    empleado_id BIGINT PRIMARY KEY REFERENCES empleados(id) ON DELETE CASCADE,
    valor_hora NUMERIC(12,2) DEFAULT 0,
    costo_mensual NUMERIC(12,2),
    estado TEXT DEFAULT 'Activo'
);

-- 26. TABLA: empleado_liquidaciones
CREATE TABLE IF NOT EXISTS empleado_liquidaciones (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    empleado_id BIGINT NOT NULL REFERENCES empleados(id) ON DELETE CASCADE,
    mes TEXT NOT NULL,
    horas_trabajadas NUMERIC(12,3) DEFAULT 0,
    valor_hora NUMERIC(12,2) DEFAULT 0,
    adicionales NUMERIC(12,2) DEFAULT 0,
    descuentos NUMERIC(12,2) DEFAULT 0,
    total_generado NUMERIC(12,2) DEFAULT 0,
    total_liquidacion NUMERIC(12,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT empleado_liquidaciones_emp_mes_key UNIQUE(empleado_id, mes)
);

-- 27. TABLA: gastos
CREATE TABLE IF NOT EXISTS gastos (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    fecha TIMESTAMPTZ DEFAULT NOW(),
    concepto TEXT,
    categoria TEXT,
    monto NUMERIC(12,2),
    observacion TEXT,
    estado TEXT
);

-- 28. TABLA: ajustes_caja
CREATE TABLE IF NOT EXISTS ajustes_caja (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    fecha TIMESTAMPTZ DEFAULT NOW(),
    tipo TEXT,
    motivo TEXT,
    monto NUMERIC(12,2),
    observacion TEXT,
    venta_id BIGINT REFERENCES ventas(id) ON DELETE SET NULL
);

-- 29. TABLA: sync_status
CREATE TABLE IF NOT EXISTS sync_status (
    id BIGINT PRIMARY KEY CHECK (id = 1),
    status TEXT DEFAULT 'OFFLINE',
    last_sync TIMESTAMPTZ,
    last_push TIMESTAMPTZ,
    last_pull TIMESTAMPTZ
);


-- =============================================================================
-- INDICES PARA CLAVES FORANEAS (OPTIMIZACIÓN DE CONSULTAS Y JOINS)
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_productos_proveedor_id ON productos(proveedor_id);
CREATE INDEX IF NOT EXISTS idx_ventas_producto_id ON ventas(producto_id);
CREATE INDEX IF NOT EXISTS idx_empleados_horario_id ON empleados(horario_id);
CREATE INDEX IF NOT EXISTS idx_asistencias_empleado_id ON asistencias(empleado_id);
CREATE INDEX IF NOT EXISTS idx_compras_proveedor_proveedor_id ON compras_proveedor(proveedor_id);
CREATE INDEX IF NOT EXISTS idx_pagos_proveedor_proveedor_id ON pagos_proveedor(proveedor_id);
CREATE INDEX IF NOT EXISTS idx_pagos_proveedor_compra_id ON pagos_proveedor(compra_id);
CREATE INDEX IF NOT EXISTS idx_cuenta_corriente_proveedor_proveedor_id ON cuenta_corriente_proveedor(proveedor_id);
CREATE INDEX IF NOT EXISTS idx_trabajos_maquinas_maquina_id ON trabajos_maquinas(maquina_id);
CREATE INDEX IF NOT EXISTS idx_combustible_maquinas_maquina_id ON combustible_maquinas(maquina_id);
CREATE INDEX IF NOT EXISTS idx_mantenimiento_maquinas_maquina_id ON mantenimiento_maquinas(maquina_id);
CREATE INDEX IF NOT EXISTS idx_municipio_pagos_orden_id ON municipio_pagos(orden_id);
CREATE INDEX IF NOT EXISTS idx_municipio_orden_items_orden_id ON municipio_orden_items(orden_id);
CREATE INDEX IF NOT EXISTS idx_municipio_orden_items_producto_id ON municipio_orden_items(producto_id);
CREATE INDEX IF NOT EXISTS idx_atmos_pagos_orden_id ON atmos_pagos(orden_id);
CREATE INDEX IF NOT EXISTS idx_empleado_liquidaciones_empleado_id ON empleado_liquidaciones(empleado_id);
CREATE INDEX IF NOT EXISTS idx_ajustes_caja_venta_id ON ajustes_caja(venta_id);
