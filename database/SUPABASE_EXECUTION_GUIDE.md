# Guía de Ejecución y Verificación en Supabase — Fase 1.2

Esta guía proporciona el procedimiento paso a paso para ejecutar el script [`database/supabase_schema.sql`](file:///c:/Users/herna/Desktop/actual/mi-app/database/supabase_schema.sql) en el **SQL Editor de Supabase** y verificar que las 29 tablas, sus claves foráneas e índices se hayan creado correctamente.

---

## 📌 Paso 1: Abrir el SQL Editor en Supabase

1. Inicia sesión en tu panel de control de [Supabase Dashboard](https://supabase.com/dashboard).
2. Selecciona tu proyecto.
3. En la barra lateral izquierda, haz clic en el icono de **SQL Editor** (o presiona `S` + `Q`).
4. Haz clic en **"New Query"** (Nueva Consulta).

---

## 📌 Paso 2: Ejecutar el Script de Creación del Esquema

1. Abre el archivo [`database/supabase_schema.sql`](file:///c:/Users/herna/Desktop/actual/mi-app/database/supabase_schema.sql) de tu proyecto.
2. Copia todo su contenido (Ctrl + A ➔ Ctrl + C).
3. Pega el contenido completo dentro del editor SQL de Supabase.
4. Haz clic en el botón verde **"Run"** (o presiona `Ctrl` + `Enter`).

> **Resultado esperado**: Deberás ver el mensaje `Success. No rows returned` o `Success`.

---

## 📌 Paso 3: Verificación de la Creación de las 29 Tablas

Para confirmar que las **29 tablas** existen en el esquema público de Supabase, ejecuta la siguiente consulta en una nueva pestaña del SQL Editor:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY table_name;
```

### Lista de Tablas esperadas (29 en total):
1. `ajustes_caja`
2. `asistencias`
3. `atmos_ordenes`
4. `atmos_pagos`
5. `categorias`
6. `combustible_maquinas`
7. `compras_proveedor`
8. `cuenta_corriente_proveedor`
9. `empleado_liquidacion_config`
10. `empleado_liquidaciones`
11. `empleados`
12. `gastos`
13. `historial`
14. `horarios`
15. `mantenimiento_maquinas`
16. `maquinas`
17. `municipio_orden_items`
18. `municipio_ordenes`
19. `municipio_pagos`
20. `notificaciones`
21. `pagos_proveedor`
22. `presupuestos`
23. `productos`
24. `proveedores`
25. `remitos`
26. `sync_status`
27. `tickets`
28. `trabajos_maquinas`
29. `ventas`

---

## 📌 Paso 4: Comprobación de Foreign Keys (Relaciones)

Ejecuta esta consulta para listar todas las restricciones de Foreign Key creadas en Supabase:

```sql
SELECT 
    tc.table_name AS tabla_origen, 
    kcu.column_name AS columna_origen, 
    ccu.table_name AS tabla_destino,
    ccu.column_name AS columna_destino,
    rc.delete_rule AS accion_borrado
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
  ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;
```

---

## 📌 Paso 5: Comprobación de Índices de Rendimiento

Ejecuta esta consulta para verificar que los **17 índices explícitos** sobre las claves foráneas existen y están activos:

```sql
SELECT 
    tablename AS tabla,
    indexname AS nombre_indice,
    indexdef AS definicion
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;
```

---

## 📌 Paso 6: Verificación en el Table Editor UI de Supabase

1. En el menú lateral izquierdo de Supabase, entra a **"Table Editor"**.
2. Verifica que las 29 tablas aparezcan listadas en la barra lateral.
3. Al seleccionar tablas como `tickets`, `presupuestos`, `remitos` o `municipio_ordenes`, la columna `productos` mostrará la insignia de tipo **`jsonb`**.
4. Al seleccionar columnas de dinero o precios, su tipo figurará como **`numeric`**.
