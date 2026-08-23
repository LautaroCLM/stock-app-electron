# ONLINE_MIGRATION_PLAN.md
# Plan de Migración Online — Stock App (Ferretería BAUPI)

Este documento detalla la arquitectura de software actual de la aplicación, el estado de preparación (Fases 0.1 y 0.2) y el plan estratégico para la transición hacia una sincronización online centralizada.

---

## 1. ORGANIZACIÓN Y ARQUITECTURA DEL PROYECTO

La aplicación está construida sobre **Electron**, estructurada bajo el patrón de separación de procesos y comunicación asíncrona:

```
┌──────────────────────────────────────┐
│          PROCESO DE RENDERIZADO      │
│  (UI / index.html / renderer.js)     │
└──────────────────┬───────────────────┘
                   │ window.electronAPI.X()
                   ▼ (Puente Preload / preload.js)
┌──────────────────────────────────────┐
│          PROCESO PRINCIPAL (Main)    │
│  (Orquestador / main.js)             │
└──────┬───────────────────────┬───────┘
       │                       │
       ▼                       ▼
┌──────────────┐       ┌───────────────┐
│ SERVICIOS    │       │ CONFIG/SYNC   │
│ (Capa Datos) │       │ (syncManager) │
└──────┬───────┘       └───────┬───────┘
       │                       │
       └───────────┬───────────┘
                   ▼
┌──────────────────────────────────────┐
│          ALMACENAMIENTO LOCAL        │
│  (Base de datos local SQLite)        │
└──────────────────────────────────────┘
```

* **Proceso de Renderizado (UI)**: Ejecuta `index.html` y la lógica de interacción visual contenida en el monolito `renderer.js`. Se comunica con el backend a través del contexto seguro `window.electronAPI`.
* **Proceso Principal (Backend)**: Escucha y resuelve los eventos IPC en `main.js` delegándolos a la nueva capa de servicios.
* **Capa de Servicios**: Clases independientes en la carpeta `/services` que encapsulan el acceso y la manipulación de los datos.

---

## 2. SERVICIOS ACTUALES (FASE 0.1)

Se ha extraído con éxito la lógica de datos de los 5 módulos principales de la aplicación a sus respectivos servicios independientes. Esto reduce el acoplamiento directo de `main.js` con SQLite:

1. **`productService.js`**: Responsable del ABM (Alta, Baja, Modificación) y consulta de productos de inventario.
2. **`expenseService.js`**: Administra la carga, listado y eliminación de gastos operativos del comercio.
3. **`budgetService.js`**: Encapsula el registro y recuperación de presupuestos para clientes.
4. **`remitoService.js`**: Se encarga del almacenamiento y trazabilidad de remitos.
5. **`ticketService.js`**: Administra el guardado, consulta y la limpieza automática (tickets mayores a 30 días) de los tickets del punto de venta.
6. **`supplierService.js`**: Gestiona proveedores, órdenes de compra, pagos y balances de cuentas corrientes.

---

## 3. ARQUITECTURA DE SINCRONIZACIÓN (FASE 0.2)

Se preparó la estructura de red y almacenamiento diferido para soportar operaciones híbridas offline/online:

### 3.1 `SyncManager`
El archivo `services/syncManager.js` define el orquestador principal de sincronización:
* **`initialize()`**: Inicia rutinas, configuraciones o detectores de conectividad.
* **`isOnline()`**: Detección dinámica de conexión a internet (actualmente retorna `false` de forma pasiva).
* **`pushChanges()`**: Subida de las transacciones locales encoladas hacia la base de datos remota.
* **`pullChanges()`**: Descarga incremental de nuevos registros del servidor para integrarlos localmente.

### 3.2 `OfflineQueue`
El archivo `services/offlineQueue.js` gestiona una cola de operaciones pendientes en memoria:
* Registra operaciones fallidas o diferidas cuando no hay conexión a internet (`addOperation`).
* Otorga un identificador único y un timestamp local a cada elemento.
* Proporciona métodos para limpiar (`clearQueue`), listar (`getOperations`) y confirmar la sincronización individual de ítems (`removeOperation`).

### 3.3 `Configuración Central`
El archivo `services/config.js` expone las flags de control global de la sincronización (`ENABLE_SYNC: false`, `APP_MODE: 'LOCAL'`), permitiendo activar o desactivar la sincronización en caliente sin alterar el código de la aplicación.

---

## 4. ESTRATEGIA DE CONEXIÓN CON SUPABASE

Cuando se decida habilitar la sincronización online, la arquitectura de inyección de dependencias facilitará la integración de Supabase de la siguiente manera:

```
┌──────────────────┐
│   productService │
└────────┬─────────┘
         │
         ├───► APP_MODE == "LOCAL"  ──► SQLite local (db)
         │
         └───► APP_MODE == "ONLINE" ──► Supabase SDK / REST API Client
```

1. **Instalación**: Se instalará el cliente de Supabase (`@supabase/supabase-js`).
2. **Autenticación**: Se reemplazará el login plano actual de `login.html` (que solo guarda una cadena en localStorage) por `supabase.auth.signInWithPassword()`, implementando manejo seguro de JWT.
3. **Capa de Servicios**: Los archivos en `/services` validarán la constante `CONFIG.APP_MODE`. Si es `'ONLINE'`, utilizarán el cliente de Supabase para realizar las peticiones HTTP seguras en lugar de ejecutar `db.prepare().run()`.
4. **Respaldo local**: En caso de pérdida de conexión, el servicio local SQLite guardará la operación y la registrará en `offlineQueue` para que el `SyncManager` la procese una vez se reestablezca el canal online.

---

## 5. MÓDULOS QUE CONTINÚAN EN SQLITE LOCAL

Durante la transición, los siguientes módulos mantendrán su persistencia local en SQLite por motivos de rendimiento o hasta que finalicen las pruebas de integración:

* **Asistencias y Horarios**: Control de marcaje diario de empleados.
* **Mantenimiento y Combustible de Máquinas**: Gestión de taller mecánico.
* **Liquidación de Empleados**: Lógica de cálculo de salarios mensuales.
* **Notificaciones locales**: Avisos automáticos de stock crítico e inicio del sistema.

---

## 6. FASES RESTANTES Y PASOS A SEGUIR

### Fase 1: Desacoplamiento de Módulos Restantes
* Modularizar y extraer a servicios independientes los módulos de:
  * Empleados y Asistencias (`services/employeeService.js`).
  * Máquinas (`services/machineService.js`).
  * Municipio y Atmosférico (`services/municipalityService.js`).

### Fase 2: Conexión Remota y Base de Datos en la Nube
* Habilitar el feature flag `ENABLE_SYNC` en `services/config.js`.
* Configurar las credenciales seguras de Supabase.
* Implementar las llamadas HTTP/REST en los servicios utilizando Supabase SDK.

### Fase 3: Sincronización Bidireccional Completa
* Habilitar `offlineQueue` persistiendo la cola en una tabla local SQLite en lugar de memoria.
* Programar el `SyncManager` para que realice polling de conectividad y vacíe la cola automáticamente (`processQueue`).
* Establecer mecanismos de resolución de conflictos (por ejemplo, priorizar cambios más recientes usando timestamps locales).

---
*Fin del Plan de Migración.*
