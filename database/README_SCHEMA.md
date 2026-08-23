# Documentación de Migración de Esquema (SQLite a PostgreSQL / Supabase) — Fase 1.1

Este documento explica las decisiones técnicas, diferencias dialectales, optimizaciones y posibles consideraciones de compatibilidad aplicadas en la transformación del esquema SQLite original al esquema nativo de **PostgreSQL / Supabase** contenido en [`database/supabase_schema.sql`](file:///c:/Users/herna/Desktop/actual/mi-app/database/supabase_schema.sql).

---

## 1. Decisiones de Diseño y Conversión de Tipos

### 1.1 Claves Primarias Identidad
* **SQLite original**: `INTEGER PRIMARY KEY AUTOINCREMENT`
* **PostgreSQL / Supabase**: `BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY`
* **Fundamentación**: `BIGINT` previene el desbordamiento de identificadores a medida que escala la base de datos cloud. `GENERATED ALWAYS AS IDENTITY` es el estándar ISO SQL moderno soportado en PostgreSQL 10+, superando las secuencias legacy `serial`/`bigserial`.

### 1.2 Mapeo de Números Flotantes y Moneda (`REAL`)
* **Dinero y Precios**: Convertidos de `REAL` a `NUMERIC(12,2)`
  * Afecta a: `precio`, `precio_costo`, `total`, `subtotal`, `descuento`, `recargo`, `monto`, `salario`, `debito`, `credito`, `costo`, `saldo_pendiente`, etc.
  * **Motivo**: Evita imprecisiones de redondeo de punto flotante IEEE 754 inherentes al tipo `REAL` / `FLOAT`.
* **Cantidades y Unidades Medibles**: Convertidos de `REAL` a `NUMERIC(12,3)`
  * Afecta a: `stock`, `stock_minimo`, `cantidad` (en ventas e ítems), `litros`, `horas`, `horas_totales`, `consumo_hora`, `horas_trabajadas`.
  * **Motivo**: Permite representar fracciones precisas con hasta 3 decimales (gramos, mililitros, fracciones de hora).

### 1.3 Timestamps y Fechas (`TEXT`)
* **SQLite original**: `TEXT DEFAULT (datetime('now', 'localtime'))`
* **PostgreSQL / Supabase**: `TIMESTAMPTZ DEFAULT NOW()`
* **Motivo**: Utiliza la zona horaria del servidor con precisión ISO 8601. Las columnas de tipo timestamp puro (ej. `created_at`, `fecha`, `fecha_vencimiento`, `ultimo_servicio`, `fecha_estimada_cobro`) se manejaron con `TIMESTAMPTZ`.

### 1.4 Booleans (`INTEGER` 0/1)
* **SQLite original**: `is_read INTEGER DEFAULT 0`
* **PostgreSQL / Supabase**: `is_read BOOLEAN DEFAULT FALSE`
* **Motivo**: Usa el tipo nativo booleano de PostgreSQL en la tabla `notificaciones`.

---

## 2. Columnas Convertidas a `JSONB`

SQLite almacenaba estructuras complejas serializadas como texto plano JSON. En PostgreSQL se convirtieron a `JSONB` para permitir consultas avanzadas e indexación GIN sin modificar la lógica funcional de la aplicación actual:

| Tabla | Columna Original (`TEXT`) | Nuevo Tipo (`JSONB`) | Descripción |
| :--- | :--- | :--- | :--- |
| **`tickets`** | `productos TEXT` | `productos JSONB` | Arreglo de ítems vendidos con sus cantidades y precios |
| **`presupuestos`** | `productos TEXT` | `productos JSONB` | Lista de productos cotizados |
| **`remitos`** | `productos TEXT` | `productos JSONB` | Lista de productos remitidos |
| **`municipio_ordenes`** | `productos TEXT` | `productos JSONB` | Detalle o desglose de productos solicitados por el municipio |

*Nota*: No se realizó normalización a tablas secundarias (como `tickets_items`) en esta fase para garantizar cero impacto funcional, conforme a las especificaciones de la Fase 1.1.

---

## 3. Relaciones y Foreign Keys Agregadas

SQLite mantenía ciertas referencias solo a nivel lógico o conceptual. En el esquema PostgreSQL se declararon formalmente con `FOREIGN KEY ... REFERENCES ...`:

1. **`productos.proveedor_id`** ➔ `proveedores(id) ON DELETE SET NULL`
2. **`ventas.producto_id`** ➔ `productos(id) ON DELETE SET NULL`
3. **`pagos_proveedor.compra_id`** ➔ `compras_proveedor(id) ON DELETE SET NULL`
4. **`municipio_orden_items.producto_id`** ➔ `productos(id) ON DELETE SET NULL`
5. **`ajustes_caja.venta_id`** ➔ `ventas(id) ON DELETE SET NULL`

*(Se mantuvieron todas las FKs explícitas existentes en `empleados`, `asistencias`, `compras_proveedor`, `pagos_proveedor`, `cuenta_corriente_proveedor`, `trabajos_maquinas`, `combustible_maquinas`, `mantenimiento_maquinas`, `municipio_pagos`, `municipio_orden_items`, `atmos_pagos`, `empleado_liquidacion_config`, `empleado_liquidaciones`).*

---

## 4. Índices de Rendimiento Agregados

Para asegurar la velocidad de ejecución en Joins y filtros relacionales en Supabase, se crearon 17 índices explícitos sobre todas las Claves Foráneas:

* `idx_productos_proveedor_id` ON `productos(proveedor_id)`
* `idx_ventas_producto_id` ON `ventas(producto_id)`
* `idx_empleados_horario_id` ON `empleados(horario_id)`
* `idx_asistencias_empleado_id` ON `asistencias(empleado_id)`
* `idx_compras_proveedor_proveedor_id` ON `compras_proveedor(proveedor_id)`
* `idx_pagos_proveedor_proveedor_id` ON `pagos_proveedor(proveedor_id)`
* `idx_pagos_proveedor_compra_id` ON `pagos_proveedor(compra_id)`
* `idx_cuenta_corriente_proveedor_proveedor_id` ON `cuenta_corriente_proveedor(proveedor_id)`
* `idx_trabajos_maquinas_maquina_id` ON `trabajos_maquinas(maquina_id)`
* `idx_combustible_maquinas_maquina_id` ON `combustible_maquinas(maquina_id)`
* `idx_mantenimiento_maquinas_maquina_id` ON `mantenimiento_maquinas(maquina_id)`
* `idx_municipio_pagos_orden_id` ON `municipio_pagos(orden_id)`
* `idx_municipio_orden_items_orden_id` ON `municipio_orden_items(orden_id)`
* `idx_municipio_orden_items_producto_id` ON `municipio_orden_items(producto_id)`
* `idx_atmos_pagos_orden_id` ON `atmos_pagos(orden_id)`
* `idx_empleado_liquidaciones_empleado_id` ON `empleado_liquidaciones(empleado_id)`
* `idx_ajustes_caja_venta_id` ON `ajustes_caja(venta_id)`

---

## 5. Posibles Incompatibilidades y Puntos a Considerar

1. **Inserción de Fechas desde Node.js**:
   * SQLite permitía insertar cadenas con cualquier formato libre. PostgreSQL valida el formato ISO al parsear `TIMESTAMPTZ`.
2. **Campos JSONB**:
   * Al hacer inserciones directas via `better-sqlite3`, el driver enviaba un `string`. Con la API REST de Supabase o `@supabase/supabase-js`, las columnas `JSONB` aceptan directamente objetos o arreglos JavaScript nativos sin requerir `JSON.stringify()`.
3. **Identidades en PostgreSQL (`ALWAYS AS IDENTITY`)**:
   * Si se efectúa una migración masiva de datos desde SQLite especificando los `id` originales, se debe usar `OVERRIDING SYSTEM VALUE` o ajustar la secuencia al finalizar con `SELECT setval(pg_get_serial_sequence('tabla', 'id'), coalesce(max(id), 1)) FROM tabla;`.
