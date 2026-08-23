# Esquema de Base de Datos SQLite (Proyecto Inventario StockApp)

Este documento contiene el esquema completo DDL extraído directamente de la base de datos SQLite del sistema (`data.db`). Sirve como especificación técnica oficial para la futura migración e integración con **PostgreSQL / Supabase**.

---

## 1. Resumen de Tablas y Estrategia de Sincronización Online (Supabase)

La base de datos contiene **29 tablas**. A continuación se detalla su rol arquitectónico para la migración cloud:

### ☁️ Tablas Críticas para Sincronización Online (Supabase)
Estas tablas contienen la información operativa central del negocio y deben replicarse en PostgreSQL para permitir acceso multiusuario, sincronización entre dispositivos y consolidación de datos.

1. **`productos`**: Catálogo de productos, stock, precios y costo.
2. **`categorias`**: Categorización global de productos.
3. **`ventas`**: Registro de operaciones de venta realizadas.
4. **`tickets`**: Comprobantes/tickets emitidos.
5. **`gastos`**: Control de egresos y gastos operativos.
6. **`ajustes_caja`**: Movimientos y ajustes manuales de caja.
7. **`proveedores`**: Padrón de proveedores.
8. **`compras_proveedor`**: Registro de compras a proveedores.
9. **`pagos_proveedor`**: Pagos efectuados a proveedores.
10. **`cuenta_corriente_proveedor`**: Estado de cuenta corriente con proveedores.
11. **`empleados`**: Padrón de personal de la empresa.
12. **`horarios`**: Configuración de turnos y esquemas de trabajo.
13. **`asistencias`**: Registro de entradas, salidas y presentismo.
14. **`empleado_liquidacion_config`**: Tarifas y configuración de sueldos/liquidaciones.
15. **`empleado_liquidaciones`**: Liquidaciones de sueldo generadas por período.
16. **`maquinas`**: Inventario de maquinaria y vehículos de la empresa.
17. **`trabajos_maquinas`**: Registro de horas y servicios prestados por máquina.
18. **`combustible_maquinas`**: Carga de combustible y consumos.
19. **`mantenimiento_maquinas`**: Servicios preventivos y correctivos de máquinas.
20. **`municipio_ordenes`**: Licitaciones / Órdenes de compra del municipio.
21. **`municipio_pagos`**: Cobros y pagos registrados para órdenes del municipio.
22. **`municipio_orden_items`**: Ítems / Productos asociados a las órdenes del municipio.
23. **`atmos_ordenes`**: Registro de órdenes de servicios atmosféricos.
24. **`atmos_pagos`**: Cobros de servicios atmosféricos.
25. **`presupuestos`**: Presupuestos cotizados a clientes.
26. **`remitos`**: Remitos de entrega emitidos.

### 💻 Tablas Locales (Persistencia Exclusiva en Electron)
Estas tablas gestionan el estado del cliente local de Electron o información contextual de la app de escritorio y **no requieren** migración inmediata a Supabase (o pueden mantenerse locales):

1. **`sync_status`**: Estado local de sincronización (`OFFLINE`/`ONLINE`, marcas de tiempo de `push`/`pull`).
2. **`historial`**: Log de auditoría y acciones locales dentro del cliente desktop.
3. **`notificaciones`**: Alertas locales y notificaciones dentro de la app desktop.

---

## 2. Esquema DDL Completo y Relaciones

### 1. `productos`
* **Descripción**: Almacena el inventario de artículos.
* **Relaciones Implícitas / Explícitas**:
  * `proveedor_id` ➔ `proveedores.id` (Relación implícita a proveedor).
* **Sentencia DDL Original**:
```sql
CREATE TABLE productos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo TEXT NOT NULL,
  nombre TEXT NOT NULL,
  categoria TEXT,
  stock REAL DEFAULT 0,
  unidad TEXT DEFAULT 'un',
  precio_costo REAL DEFAULT 0,
  precio REAL DEFAULT 0,
  stock_minimo REAL DEFAULT 10,
  proveedor_id INTEGER DEFAULT NULL,
  UNIQUE(codigo, nombre)
);
```

---

### 2. `categorias`
* **Descripción**: Categorías para organizar productos.
* **Sentencia DDL Original**:
```sql
CREATE TABLE categorias (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT UNIQUE
);
```

---

### 3. `ventas`
* **Descripción**: Transacciones de ventas individuales por producto.
* **Relaciones Implícitas / Explícitas**:
  * `producto_id` ➔ `productos.id` (Relación implícita al producto vendido).
* **Sentencia DDL Original**:
```sql
CREATE TABLE ventas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  producto_id INTEGER,
  cantidad REAL,
  total REAL,
  cliente TEXT,
  metodo_pago TEXT,
  fecha TEXT DEFAULT (datetime('now', 'localtime'))
);
```

---

### 4. `historial`
* **Descripción**: Registro de eventos y auditoría del sistema.
* **Sentencia DDL Original**:
```sql
CREATE TABLE historial (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  accion TEXT,
  detalle TEXT,
  fecha TEXT DEFAULT (datetime('now', 'localtime'))
);
```

---

### 5. `tickets`
* **Descripción**: Encabezado de comprobantes / tickets de venta emitidos.
* **Campos con JSON/TEXT**: `productos` almacena la lista de productos incluidos en el ticket como JSON serializado.
* **Sentencia DDL Original**:
```sql
CREATE TABLE tickets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fecha TEXT DEFAULT (datetime('now', 'localtime')),
  metodo_pago TEXT,
  total REAL,
  productos TEXT,
  tipo TEXT,
  descuento REAL DEFAULT 0,
  subtotal REAL DEFAULT 0,
  cliente TEXT,
  observaciones TEXT,
  recargo REAL DEFAULT 0
);
```

---

### 6. `horarios`
* **Descripción**: Plantillas de turnos de trabajo para empleados.
* **Sentencia DDL Original**:
```sql
CREATE TABLE horarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  lunes TEXT DEFAULT 'Libre',
  martes TEXT DEFAULT 'Libre',
  miercoles TEXT DEFAULT 'Libre',
  jueves TEXT DEFAULT 'Libre',
  viernes TEXT DEFAULT 'Libre',
  sabado TEXT DEFAULT 'Libre',
  domingo TEXT DEFAULT 'Libre'
);
```

---

### 7. `empleados`
* **Descripción**: Legajo de empleados de la empresa.
* **Relaciones Implícitas / Explícitas**:
  * `horario_id` ➔ `horarios.id` (`FOREIGN KEY` con `ON DELETE SET NULL`).
* **Sentencia DDL Original**:
```sql
CREATE TABLE empleados (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  apellido TEXT NOT NULL,
  dni TEXT UNIQUE NOT NULL,
  fecha_nacimiento TEXT,
  telefono TEXT,
  email TEXT,
  direccion TEXT,
  cargo TEXT,
  fecha_ingreso TEXT,
  salario REAL,
  observaciones TEXT,
  estado TEXT DEFAULT 'Activo',
  horario_id INTEGER,
  FOREIGN KEY (horario_id) REFERENCES horarios(id) ON DELETE SET NULL
);
```

---

### 8. `asistencias`
* **Descripción**: Control diario de asistencia por empleado.
* **Relaciones Implícitas / Explícitas**:
  * `empleado_id` ➔ `empleados.id` (`FOREIGN KEY` con `ON DELETE CASCADE`).
* **Sentencia DDL Original**:
```sql
CREATE TABLE asistencias (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  empleado_id INTEGER NOT NULL,
  fecha TEXT NOT NULL,
  hora_entrada TEXT,
  hora_salida TEXT,
  estado TEXT NOT NULL,
  observaciones TEXT,
  UNIQUE(empleado_id, fecha),
  FOREIGN KEY (empleado_id) REFERENCES empleados(id) ON DELETE CASCADE
);
```

---

### 9. `proveedores`
* **Descripción**: Padrón general de proveedores.
* **Sentencia DDL Original**:
```sql
CREATE TABLE proveedores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
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
  created_at TEXT DEFAULT (datetime('now', 'localtime'))
);
```

---

### 10. `compras_proveedor`
* **Descripción**: Compras realizadas a proveedores.
* **Relaciones Implícitas / Explícitas**:
  * `proveedor_id` ➔ `proveedores.id` (`FOREIGN KEY` con `ON DELETE CASCADE`).
* **Sentencia DDL Original**:
```sql
CREATE TABLE compras_proveedor (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  proveedor_id INTEGER NOT NULL,
  fecha TEXT NOT NULL,
  descripcion TEXT,
  total REAL DEFAULT 0,
  metodo_pago TEXT DEFAULT 'Efectivo',
  estado TEXT DEFAULT 'Pagado',
  observaciones TEXT,
  created_at TEXT DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (proveedor_id) REFERENCES proveedores(id) ON DELETE CASCADE
);
```

---

### 11. `pagos_proveedor`
* **Descripción**: Registros de pagos abonados a proveedores.
* **Relaciones Implícitas / Explícitas**:
  * `proveedor_id` ➔ `proveedores.id` (`FOREIGN KEY` con `ON DELETE CASCADE`).
  * `compra_id` ➔ `compras_proveedor.id` (Relación implícita a la compra).
* **Sentencia DDL Original**:
```sql
CREATE TABLE pagos_proveedor (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  proveedor_id INTEGER NOT NULL,
  compra_id INTEGER,
  fecha TEXT NOT NULL,
  monto REAL DEFAULT 0,
  metodo_pago TEXT DEFAULT 'Efectivo',
  comprobante TEXT,
  observaciones TEXT,
  created_at TEXT DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (proveedor_id) REFERENCES proveedores(id) ON DELETE CASCADE
);
```

---

### 12. `cuenta_corriente_proveedor`
* **Descripción**: Movimientos de débitos y créditos en la cuenta corriente de proveedores.
* **Relaciones Implícitas / Explícitas**:
  * `proveedor_id` ➔ `proveedores.id` (`FOREIGN KEY` con `ON DELETE CASCADE`).
  * `referencia_id` ➔ ID de la compra o pago asociado (Relación implícita según contexto).
* **Sentencia DDL Original**:
```sql
CREATE TABLE cuenta_corriente_proveedor (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  proveedor_id INTEGER NOT NULL,
  fecha TEXT NOT NULL,
  tipo TEXT NOT NULL,
  descripcion TEXT,
  debito REAL DEFAULT 0,
  credito REAL DEFAULT 0,
  referencia_id INTEGER,
  fecha_vencimiento TEXT,
  estado_pago TEXT DEFAULT 'Pendiente',
  created_at TEXT DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (proveedor_id) REFERENCES proveedores(id) ON DELETE CASCADE
);
```

---

### 13. `maquinas`
* **Descripción**: Catálogo de maquinarias y flota vehicular.
* **Sentencia DDL Original**:
```sql
CREATE TABLE maquinas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  tipo TEXT,
  marca TEXT,
  modelo TEXT,
  anio INTEGER,
  numero_serie TEXT,
  precio_hora REAL DEFAULT 0,
  consumo_hora REAL DEFAULT 0,
  estado TEXT DEFAULT 'Disponible',
  observaciones TEXT,
  ultimo_servicio TEXT,
  horas_totales REAL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now','localtime'))
);
```

---

### 14. `trabajos_maquinas`
* **Descripción**: Parte diario de trabajo u horas facturadas por máquina.
* **Relaciones Implícitas / Explícitas**:
  * `maquina_id` ➔ `maquinas.id` (`FOREIGN KEY` con `ON DELETE CASCADE`).
* **Sentencia DDL Original**:
```sql
CREATE TABLE trabajos_maquinas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  maquina_id INTEGER NOT NULL,
  fecha TEXT NOT NULL,
  cliente TEXT,
  operador TEXT,
  hora_inicio TEXT,
  hora_fin TEXT,
  horas REAL DEFAULT 0,
  precio_hora REAL DEFAULT 0,
  total REAL DEFAULT 0,
  observaciones TEXT,
  created_at TEXT DEFAULT (datetime('now','localtime')),
  FOREIGN KEY (maquina_id) REFERENCES maquinas(id) ON DELETE CASCADE
);
```

---

### 15. `combustible_maquinas`
* **Descripción**: Registro de recargas de combustible por máquina.
* **Relaciones Implícitas / Explícitas**:
  * `maquina_id` ➔ `maquinas.id` (`FOREIGN KEY` con `ON DELETE CASCADE`).
* **Sentencia DDL Original**:
```sql
CREATE TABLE combustible_maquinas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  maquina_id INTEGER NOT NULL,
  fecha TEXT NOT NULL,
  litros REAL DEFAULT 0,
  precio_litro REAL DEFAULT 0,
  total REAL DEFAULT 0,
  observaciones TEXT,
  created_at TEXT DEFAULT (datetime('now','localtime')),
  FOREIGN KEY (maquina_id) REFERENCES maquinas(id) ON DELETE CASCADE
);
```

---

### 16. `mantenimiento_maquinas`
* **Descripción**: Histórico de servicios y mantenimientos a maquinaria.
* **Relaciones Implícitas / Explícitas**:
  * `maquina_id` ➔ `maquinas.id` (`FOREIGN KEY` con `ON DELETE CASCADE`).
* **Sentencia DDL Original**:
```sql
CREATE TABLE mantenimiento_maquinas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  maquina_id INTEGER NOT NULL,
  fecha TEXT NOT NULL,
  tipo TEXT,
  descripcion TEXT,
  costo REAL DEFAULT 0,
  proximo_mantenimiento TEXT,
  estado TEXT DEFAULT 'Realizado',
  observaciones TEXT,
  created_at TEXT DEFAULT (datetime('now','localtime')),
  FOREIGN KEY (maquina_id) REFERENCES maquinas(id) ON DELETE CASCADE
);
```

---

### 17. `notificaciones`
* **Descripción**: Centro de notificaciones internas de la aplicación.
* **Sentencia DDL Original**:
```sql
CREATE TABLE notificaciones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,
  icon TEXT,
  title TEXT NOT NULL,
  description TEXT,
  is_read INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now','localtime'))
);
```

---

### 18. `municipio_ordenes`
* **Descripción**: Órdenes de compra y licitaciones del Municipio.
* **Campos con JSON/TEXT**: `productos` almacena resumen o arreglo de ítems en texto.
* **Sentencia DDL Original**:
```sql
CREATE TABLE municipio_ordenes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fecha TEXT NOT NULL,
  expediente TEXT,
  orden_compra TEXT,
  fecha_estimada_cobro TEXT,
  observaciones TEXT,
  total REAL DEFAULT 0,
  saldo_pendiente REAL DEFAULT 0,
  estado TEXT DEFAULT 'Pendiente',
  productos TEXT,
  created_at TEXT DEFAULT (datetime('now', 'localtime'))
);
```

---

### 19. `municipio_pagos`
* **Descripción**: Cobros registrados a órdenes del Municipio.
* **Relaciones Implícitas / Explícitas**:
  * `orden_id` ➔ `municipio_ordenes.id` (`FOREIGN KEY` con `ON DELETE CASCADE`).
* **Sentencia DDL Original**:
```sql
CREATE TABLE municipio_pagos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  orden_id INTEGER NOT NULL,
  fecha TEXT NOT NULL,
  monto REAL DEFAULT 0,
  metodo_pago TEXT DEFAULT 'Transferencia',
  observaciones TEXT,
  created_at TEXT DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (orden_id) REFERENCES municipio_ordenes(id) ON DELETE CASCADE
);
```

---

### 20. `municipio_orden_items`
* **Descripción**: Desglose de ítems incluidos en cada orden municipal.
* **Relaciones Implícitas / Explícitas**:
  * `orden_id` ➔ `municipio_ordenes.id` (`FOREIGN KEY` con `ON DELETE CASCADE`).
  * `producto_id` ➔ `productos.id` (Relación implícita a productos).
* **Sentencia DDL Original**:
```sql
CREATE TABLE municipio_orden_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  orden_id INTEGER NOT NULL,
  producto_id INTEGER,
  codigo TEXT,
  nombre TEXT,
  precio REAL DEFAULT 0,
  cantidad INTEGER DEFAULT 0,
  FOREIGN KEY (orden_id) REFERENCES municipio_ordenes(id) ON DELETE CASCADE
);
```

---

### 21. `atmos_ordenes`
* **Descripción**: Órdenes de servicios atmosféricos.
* **Sentencia DDL Original**:
```sql
CREATE TABLE atmos_ordenes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fecha TEXT NOT NULL,
  cliente TEXT NOT NULL,
  direccion TEXT NOT NULL,
  telefono TEXT,
  tipo_servicio TEXT NOT NULL,
  descripcion TEXT,
  monto REAL DEFAULT 0,
  saldo_pendiente REAL DEFAULT 0,
  estado TEXT DEFAULT 'Pendiente',
  observaciones TEXT,
  fecha_estimada_cobro TEXT,
  created_at TEXT DEFAULT (datetime('now', 'localtime'))
);
```

---

### 22. `atmos_pagos`
* **Descripción**: Pagos y cobros recibidos por servicios atmosféricos.
* **Relaciones Implícitas / Explícitas**:
  * `orden_id` ➔ `atmos_ordenes.id` (`FOREIGN KEY` con `ON DELETE CASCADE`).
* **Sentencia DDL Original**:
```sql
CREATE TABLE atmos_pagos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  orden_id INTEGER NOT NULL,
  fecha TEXT NOT NULL,
  monto REAL DEFAULT 0,
  metodo_pago TEXT NOT NULL,
  observaciones TEXT,
  created_at TEXT DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (orden_id) REFERENCES atmos_ordenes(id) ON DELETE CASCADE
);
```

---

### 23. `presupuestos`
* **Descripción**: Cotizaciones y presupuestos emitidos.
* **Campos con JSON/TEXT**: `productos` almacena la lista de ítems codificada como JSON en TEXT.
* **Sentencia DDL Original**:
```sql
CREATE TABLE presupuestos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fecha TEXT DEFAULT (datetime('now', 'localtime')),
  total REAL,
  productos TEXT,
  descuento REAL DEFAULT 0,
  recargo REAL DEFAULT 0,
  subtotal REAL DEFAULT 0,
  cliente TEXT,
  observaciones TEXT,
  direccion TEXT,
  localidad TEXT,
  cuit TEXT,
  telefono TEXT
);
```

---

### 24. `remitos`
* **Descripción**: Remitos de entrega generados.
* **Campos con JSON/TEXT**: `productos` almacena los datos de los ítems en formato TEXT/JSON.
* **Sentencia DDL Original**:
```sql
CREATE TABLE remitos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fecha TEXT DEFAULT (datetime('now', 'localtime')),
  total REAL,
  productos TEXT,
  descuento REAL DEFAULT 0,
  recargo REAL DEFAULT 0,
  subtotal REAL DEFAULT 0,
  cliente TEXT,
  metodo_pago TEXT,
  observaciones TEXT,
  direccion TEXT,
  localidad TEXT,
  cuit TEXT,
  telefono TEXT
);
```

---

### 25. `empleado_liquidacion_config`
* **Descripción**: Parámetros de liquidación de sueldo por empleado.
* **Relaciones Implícitas / Explícitas**:
  * `empleado_id` ➔ `empleados.id` (`PRIMARY KEY` + `FOREIGN KEY` con `ON DELETE CASCADE`).
* **Sentencia DDL Original**:
```sql
CREATE TABLE empleado_liquidacion_config (
  empleado_id INTEGER PRIMARY KEY,
  valor_hora REAL DEFAULT 0,
  costo_mensual REAL,
  estado TEXT DEFAULT 'Activo',
  FOREIGN KEY (empleado_id) REFERENCES empleados(id) ON DELETE CASCADE
);
```

---

### 26. `empleado_liquidaciones`
* **Descripción**: Liquidaciones periódicas mensuales por empleado.
* **Relaciones Implícitas / Explícitas**:
  * `empleado_id` ➔ `empleados.id` (`FOREIGN KEY` con `ON DELETE CASCADE`).
* **Sentencia DDL Original**:
```sql
CREATE TABLE empleado_liquidaciones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  empleado_id INTEGER NOT NULL,
  mes TEXT NOT NULL,
  horas_trabajadas REAL DEFAULT 0,
  valor_hora REAL DEFAULT 0,
  adicionales REAL DEFAULT 0,
  descuentos REAL DEFAULT 0,
  total_generado REAL DEFAULT 0,
  total_liquidacion REAL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now', 'localtime')),
  UNIQUE(empleado_id, mes),
  FOREIGN KEY (empleado_id) REFERENCES empleados(id) ON DELETE CASCADE
);
```

---

### 27. `gastos`
* **Descripción**: Registro general de gastos operativos e imprevistos.
* **Sentencia DDL Original**:
```sql
CREATE TABLE gastos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fecha TEXT,
  concepto TEXT,
  categoria TEXT,
  monto REAL,
  observacion TEXT,
  estado TEXT
);
```

---

### 28. `ajustes_caja`
* **Descripción**: Movimientos de ajuste manual o correcciones en caja.
* **Relaciones Implícitas / Explícitas**:
  * `venta_id` ➔ `ventas.id` (Relación implícita a la venta si el ajuste fue derivado de una venta).
* **Sentencia DDL Original**:
```sql
CREATE TABLE ajustes_caja (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fecha TEXT,
  tipo TEXT,
  motivo TEXT,
  monto REAL,
  observacion TEXT,
  venta_id INTEGER
);
```

---

### 29. `sync_status`
* **Descripción**: Estado interno de sincronización del cliente local de Electron.
* **Sentencia DDL Original**:
```sql
CREATE TABLE sync_status (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  status TEXT DEFAULT 'OFFLINE',
  last_sync TEXT,
  last_push TEXT,
  last_pull TEXT
);
```

---

## 3. Consideraciones Técnicas para la Migración a PostgreSQL (Supabase)

1. **Tipos de Datos**:
   * `INTEGER AUTOINCREMENT` ➔ `bigint GENERATED ALWAYS AS IDENTITY` o `bigserial` en PostgreSQL.
   * `REAL` ➔ `numeric` o `double precision` (para montos de dinero se recomienda `numeric(12,2)`).
   * `TEXT` ➔ `text` o `varchar`.
   * Fechas en `TEXT` (ej. `datetime('now', 'localtime')`) ➔ `timestamptz DEFAULT now()`.
2. **Columnas de tipo JSON**:
   * Las tablas `tickets`, `presupuestos`, `remitos` y `municipio_ordenes` guardan ítems serializados en la columna `productos` de tipo `TEXT`. En Supabase/PostgreSQL conviene migrarlos como `jsonb` o normalizarlos en tablas relacionales secundarias.
3. **Claves Foráneas (Foreign Keys)**:
   * SQLite permitía relaciones implícitas en algunos módulos (`productos.proveedor_id`, `ventas.producto_id`, `ajustes_caja.venta_id`). Al migrar a Supabase es altamente recomendable formalizar estas restricciones con `FOREIGN KEY ... REFERENCES ...`.
