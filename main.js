// main.js
const { app, BrowserWindow, ipcMain, dialog, Notification } = require('electron');
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');
const Database = require('better-sqlite3');
const createProductService = require('./services/productService');
const createCategoryService = require('./services/categoryService');
const createExpenseService = require('./services/expenseService');
const createBudgetService = require('./services/budgetService');
const createRemitoService = require('./services/remitoService');
const createTicketService = require('./services/ticketService');
const createSupplierService = require('./services/supplierService');
const createSaleService = require('./services/saleService');
const createClientService = require('./services/clientService');
const createMunicipioService = require('./services/municipioService');
const createMachineService = require('./services/machineService');
const createEmployeeService = require('./services/employeeService');
const supabaseProductService = require('./services/supabaseProductService');
const SyncManager = require('./services/syncManager');
const createSyncStatus = require('./services/syncStatus');
const createOfflineQueue = require('./services/offlineQueue');
const authService = require('./services/authService');
const realtimeManager = require('./services/realtimeManager');
const supabaseAtmosfericoService = require('./services/supabaseAtmosfericoService');
const supabaseTicketService = require('./services/supabaseTicketService');
const supabaseAjusteService = require('./services/supabaseAjusteService');



// ====================
// Base de datos (actualizado)
// ====================

// Ruta de base de datos persistente fuera del .asar
const dbPath = path.join(app.getPath('userData'), 'data.db');
const db = new Database(dbPath);


// Crear tablas base (productos incluye ahora 'unidad' y stock puede contener decimales)
db.prepare(`
CREATE TABLE IF NOT EXISTS productos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo TEXT NOT NULL,
  nombre TEXT NOT NULL,
  categoria TEXT,
  stock REAL DEFAULT 0,
  unidad TEXT DEFAULT 'un',
  precio_costo REAL DEFAULT 0,
  precio REAL DEFAULT 0,
  stock_minimo REAL DEFAULT 10,
  UNIQUE(codigo, nombre)
);
`).run();

try {
  db.prepare("ALTER TABLE productos ADD COLUMN precio_costo REAL DEFAULT 0").run();
} catch (err) {}

try {
  db.prepare("ALTER TABLE productos ADD COLUMN unidad TEXT DEFAULT 'un'").run();
} catch (err) {}

try {
  db.prepare("ALTER TABLE productos ADD COLUMN stock_minimo REAL DEFAULT 10").run();
} catch (err) {}

try {
  db.prepare("ALTER TABLE productos ADD COLUMN uuid TEXT").run();
} catch (err) {}

try {
  db.prepare("ALTER TABLE productos ADD COLUMN proveedor_id INTEGER DEFAULT NULL").run();
} catch (err) {}


// Intento de migración: si la columna unidad no existe, la agregamos (si ya existe da error y lo ignoramos)
try {
  db.prepare("ALTER TABLE productos ADD COLUMN unidad TEXT DEFAULT 'un'").run();
} catch (err) {
  // Si falla porque ya existe, lo ignoramos
}

// (las otras tablas se mantienen igual)
db.prepare(`
  CREATE TABLE IF NOT EXISTS categorias (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT UNIQUE
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS ventas (
  
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    producto_id INTEGER,
    cantidad REAL,
    total REAL,
    cliente TEXT,
    metodo_pago TEXT,
    fecha TEXT DEFAULT (datetime('now', 'localtime'))
  )
`).run();
// Intentar agregar la columna metodo_pago si no existe
try {
  db.prepare("ALTER TABLE ventas ADD COLUMN metodo_pago TEXT").run();
  console.log("Columna 'metodo_pago' agregada a la tabla ventas.");
} catch (err) {
  // Si ya existe, ignoramos el error
}

// ─── Migraciones de Identidad UUID (Fase 1C.3 — POS) ─────────────────────
try { db.prepare("ALTER TABLE ventas ADD COLUMN uuid TEXT").run(); } catch (err) {}
try { db.prepare("ALTER TABLE ventas ADD COLUMN producto_uuid TEXT").run(); } catch (err) {}
try { db.prepare("ALTER TABLE ventas ADD COLUMN ticket_uuid TEXT").run(); } catch (err) {}
try { db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_ventas_uuid ON ventas(uuid)").run(); } catch (err) {}
try { db.prepare("CREATE INDEX IF NOT EXISTS idx_ventas_producto_uuid ON ventas(producto_uuid)").run(); } catch (err) {}
try { db.prepare("CREATE INDEX IF NOT EXISTS idx_ventas_ticket_uuid ON ventas(ticket_uuid)").run(); } catch (err) {}

try { db.prepare("ALTER TABLE tickets ADD COLUMN uuid TEXT").run(); } catch (err) {}
try { db.prepare("ALTER TABLE tickets ADD COLUMN cliente_uuid TEXT").run(); } catch (err) {}
try { db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_tickets_uuid ON tickets(uuid)").run(); } catch (err) {}
try { db.prepare("CREATE INDEX IF NOT EXISTS idx_tickets_cliente_uuid ON tickets(cliente_uuid)").run(); } catch (err) {}
db.prepare(`
  CREATE TABLE IF NOT EXISTS historial (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    accion TEXT,
    detalle TEXT,
    fecha TEXT DEFAULT (datetime('now', 'localtime'))
  )
`).run();

// Módulo de Ajustes de Caja
db.prepare(`
  CREATE TABLE IF NOT EXISTS ajustes_caja (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fecha TEXT,
    tipo TEXT,
    motivo TEXT,
    monto REAL,
    observacion TEXT
  )
`).run();
try {
  db.prepare("ALTER TABLE ajustes_caja ADD COLUMN venta_id INTEGER").run();
} catch (err) {}

// Módulo de Empleados - Tablas
db.prepare(`
  CREATE TABLE IF NOT EXISTS horarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    lunes TEXT DEFAULT 'Libre',
    martes TEXT DEFAULT 'Libre',
    miercoles TEXT DEFAULT 'Libre',
    jueves TEXT DEFAULT 'Libre',
    viernes TEXT DEFAULT 'Libre',
    sabado TEXT DEFAULT 'Libre',
    domingo TEXT DEFAULT 'Libre'
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS empleados (
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
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS asistencias (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    empleado_id INTEGER NOT NULL,
    fecha TEXT NOT NULL,
    hora_entrada TEXT,
    hora_salida TEXT,
    estado TEXT NOT NULL,
    observaciones TEXT,
    UNIQUE(empleado_id, fecha),
    FOREIGN KEY (empleado_id) REFERENCES empleados(id) ON DELETE CASCADE
  )
`).run();

// Insertar horario por defecto si no hay ninguno
try {
  const checkHorarios = db.prepare('SELECT COUNT(*) as count FROM horarios').get();
  if (checkHorarios && checkHorarios.count === 0) {
    db.prepare(`
      INSERT INTO horarios (nombre, lunes, martes, miercoles, jueves, viernes, sabado, domingo)
      VALUES ('Lunes a Viernes 08:00 - 17:00', '08:00 - 17:00', '08:00 - 17:00', '08:00 - 17:00', '08:00 - 17:00', '08:00 - 17:00', 'Libre', 'Libre')
    `).run();
  }
} catch (err) {
  console.error('Error insertando horario por defecto:', err);
}

// ─── Módulo de Clientes ───────────────────────────────────────────────────
db.prepare(`
  CREATE TABLE IF NOT EXISTS clientes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT UNIQUE,
    nombre TEXT NOT NULL,
    telefono TEXT,
    email TEXT,
    direccion TEXT,
    cuit TEXT,
    observaciones TEXT,
    estado TEXT DEFAULT 'Activo',
    created_at TEXT DEFAULT (datetime('now', 'localtime'))
  )
`).run();

try {
  db.prepare("ALTER TABLE clientes ADD COLUMN uuid TEXT").run();
} catch (err) {}

try {
  db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_clientes_uuid ON clientes(uuid)").run();
} catch (err) {}

db.prepare(`
  CREATE TABLE IF NOT EXISTS pagos_cliente (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cliente_id INTEGER NOT NULL,
    fecha TEXT NOT NULL,
    monto REAL DEFAULT 0,
    metodo_pago TEXT DEFAULT 'Efectivo',
    comprobante TEXT,
    observaciones TEXT,
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE
  )
`).run();

try { db.prepare("ALTER TABLE pagos_cliente ADD COLUMN uuid TEXT").run(); } catch (err) {}
try { db.prepare("ALTER TABLE pagos_cliente ADD COLUMN cliente_uuid TEXT").run(); } catch (err) {}
try { db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_pagos_cliente_uuid ON pagos_cliente(uuid)").run(); } catch (err) {}
try { db.prepare("CREATE INDEX IF NOT EXISTS idx_pagos_cliente_cliente_uuid ON pagos_cliente(cliente_uuid)").run(); } catch (err) {}

db.prepare(`
  CREATE TABLE IF NOT EXISTS cuenta_corriente_cliente (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cliente_id INTEGER NOT NULL,
    fecha TEXT NOT NULL,
    tipo TEXT NOT NULL,
    descripcion TEXT,
    debito REAL DEFAULT 0,
    credito REAL DEFAULT 0,
    referencia_id INTEGER,
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE
  )
`).run();

try { db.prepare("ALTER TABLE cuenta_corriente_cliente ADD COLUMN uuid TEXT").run(); } catch (err) {}
try { db.prepare("ALTER TABLE cuenta_corriente_cliente ADD COLUMN cliente_uuid TEXT").run(); } catch (err) {}
try { db.prepare("ALTER TABLE cuenta_corriente_cliente ADD COLUMN referencia_uuid TEXT").run(); } catch (err) {}
try { db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_cta_cte_cliente_uuid ON cuenta_corriente_cliente(uuid)").run(); } catch (err) {}
try { db.prepare("CREATE INDEX IF NOT EXISTS idx_cta_cte_cliente_cliente_uuid ON cuenta_corriente_cliente(cliente_uuid)").run(); } catch (err) {}
try { db.prepare("CREATE INDEX IF NOT EXISTS idx_cta_cte_cliente_ref_uuid ON cuenta_corriente_cliente(referencia_uuid)").run(); } catch (err) {}

db.prepare(`
  CREATE TABLE IF NOT EXISTS cliente_ventas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cliente_id INTEGER NOT NULL,
    fecha TEXT NOT NULL,
    fecha_estimada_cobro TEXT,
    comprobante TEXT,
    observaciones TEXT,
    total REAL DEFAULT 0,
    saldo_pendiente REAL DEFAULT 0,
    estado TEXT DEFAULT 'Pendiente',
    productos TEXT,
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE
  )
`).run();

try { db.prepare("ALTER TABLE cliente_ventas ADD COLUMN uuid TEXT").run(); } catch (err) {}
try { db.prepare("ALTER TABLE cliente_ventas ADD COLUMN cliente_uuid TEXT").run(); } catch (err) {}
try { db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_cliente_ventas_uuid ON cliente_ventas(uuid)").run(); } catch (err) {}
try { db.prepare("CREATE INDEX IF NOT EXISTS idx_cliente_ventas_cliente_uuid ON cliente_ventas(cliente_uuid)").run(); } catch (err) {}

// ─── Módulo de Proveedores ─────────────────────────────────────────────────
db.prepare(`
  CREATE TABLE IF NOT EXISTS proveedores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT UNIQUE,
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
  )
`).run();

try {
  db.prepare("ALTER TABLE proveedores ADD COLUMN uuid TEXT").run();
} catch (err) {}

try {
  db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_proveedores_uuid ON proveedores(uuid)").run();
} catch (err) {}

db.prepare(`
  CREATE TABLE IF NOT EXISTS compras_proveedor (
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
  )
`).run();

try { db.prepare("ALTER TABLE compras_proveedor ADD COLUMN uuid TEXT").run(); } catch (err) {}
try { db.prepare("ALTER TABLE compras_proveedor ADD COLUMN proveedor_uuid TEXT").run(); } catch (err) {}
try { db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_compras_proveedor_uuid ON compras_proveedor(uuid)").run(); } catch (err) {}
try { db.prepare("CREATE INDEX IF NOT EXISTS idx_compras_proveedor_proveedor_uuid ON compras_proveedor(proveedor_uuid)").run(); } catch (err) {}

db.prepare(`
  CREATE TABLE IF NOT EXISTS pagos_proveedor (
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
  )
`).run();

try { db.prepare("ALTER TABLE pagos_proveedor ADD COLUMN uuid TEXT").run(); } catch (err) {}
try { db.prepare("ALTER TABLE pagos_proveedor ADD COLUMN proveedor_uuid TEXT").run(); } catch (err) {}
try { db.prepare("ALTER TABLE pagos_proveedor ADD COLUMN compra_uuid TEXT").run(); } catch (err) {}
try { db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_pagos_proveedor_uuid ON pagos_proveedor(uuid)").run(); } catch (err) {}
try { db.prepare("CREATE INDEX IF NOT EXISTS idx_pagos_proveedor_proveedor_uuid ON pagos_proveedor(proveedor_uuid)").run(); } catch (err) {}
try { db.prepare("CREATE INDEX IF NOT EXISTS idx_pagos_proveedor_compra_uuid ON pagos_proveedor(compra_uuid)").run(); } catch (err) {}

db.prepare(`
  CREATE TABLE IF NOT EXISTS cuenta_corriente_proveedor (
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
  )
`).run();

try { db.prepare("ALTER TABLE cuenta_corriente_proveedor ADD COLUMN uuid TEXT").run(); } catch (err) {}
try { db.prepare("ALTER TABLE cuenta_corriente_proveedor ADD COLUMN proveedor_uuid TEXT").run(); } catch (err) {}
try { db.prepare("ALTER TABLE cuenta_corriente_proveedor ADD COLUMN referencia_uuid TEXT").run(); } catch (err) {}
try { db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_cta_cte_proveedor_uuid ON cuenta_corriente_proveedor(uuid)").run(); } catch (err) {}
try { db.prepare("CREATE INDEX IF NOT EXISTS idx_cta_cte_proveedor_proveedor_uuid ON cuenta_corriente_proveedor(proveedor_uuid)").run(); } catch (err) {}
try { db.prepare("CREATE INDEX IF NOT EXISTS idx_cta_cte_proveedor_ref_uuid ON cuenta_corriente_proveedor(referencia_uuid)").run(); } catch (err) {}


// ====================
// Tablas de Cuenta Corriente Municipio y Atmosférico
// ====================
db.prepare(`
  CREATE TABLE IF NOT EXISTS municipio_ordenes (
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
  )
`).run();

try {
  db.prepare("ALTER TABLE municipio_ordenes ADD COLUMN productos TEXT").run();
} catch (err) {}

db.prepare(`
  CREATE TABLE IF NOT EXISTS municipio_orden_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    orden_id INTEGER NOT NULL,
    producto_id INTEGER,
    codigo TEXT,
    nombre TEXT,
    precio REAL DEFAULT 0,
    cantidad INTEGER DEFAULT 0,
    FOREIGN KEY (orden_id) REFERENCES municipio_ordenes(id) ON DELETE CASCADE
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS municipio_pagos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    orden_id INTEGER NOT NULL,
    fecha TEXT NOT NULL,
    monto REAL DEFAULT 0,
    metodo_pago TEXT DEFAULT 'Transferencia',
    observaciones TEXT,
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (orden_id) REFERENCES municipio_ordenes(id) ON DELETE CASCADE
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS atmos_ordenes (
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
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS atmos_pagos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    orden_id INTEGER NOT NULL,
    fecha TEXT NOT NULL,
    monto REAL DEFAULT 0,
    metodo_pago TEXT DEFAULT 'Transferencia',
    observaciones TEXT,
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (orden_id) REFERENCES atmos_ordenes(id) ON DELETE CASCADE
  )
`).run();

// ====================
// Módulo Liquidación de Empleados - Tablas
// ====================
db.prepare(`
  CREATE TABLE IF NOT EXISTS empleado_liquidacion_config (
    empleado_id INTEGER PRIMARY KEY,
    valor_hora REAL DEFAULT 0,
    costo_mensual REAL,
    estado TEXT DEFAULT 'Activo',
    FOREIGN KEY (empleado_id) REFERENCES empleados(id) ON DELETE CASCADE
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS empleado_liquidaciones (
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
  )
`).run();


// ====================
// Función de registro de acciones
// ====================
function registrarAccion(accion, detalle = '') {
  try {
    db.prepare('INSERT INTO historial (accion, detalle) VALUES (?, ?)').run(accion, detalle);
  } catch (err) {
    console.error('Error registrando acción:', err);
  }
}

// Fase 0.2 — Sincronización (instanciación)
const syncStatus = createSyncStatus(db);
const offlineQueue = createOfflineQueue(db);
const syncManager = new SyncManager(db, syncStatus, offlineQueue);

// Fase 0.1 — Servicios (instanciados aquí para tener acceso a db, registrarAccion y syncManager para encolado offline)
const productService = createProductService(db, registrarAccion, syncManager);
const categoryService = createCategoryService(db, registrarAccion, syncManager);
const expenseService = createExpenseService(db, registrarAccion, syncManager);
const budgetService = createBudgetService(db, syncManager);
const remitoService = createRemitoService(db, syncManager);
const ticketService = createTicketService(db, syncManager);
const supplierService = createSupplierService(db, registrarAccion, syncManager);
const saleService = createSaleService(db, registrarAccion, syncManager, ticketService);
const clientService = createClientService(db, registrarAccion, syncManager);
const municipioService = createMunicipioService(db, registrarAccion, syncManager);
const machineService = createMachineService(db, registrarAccion, syncManager);
const employeeService = createEmployeeService(db, registrarAccion, syncManager);

// Inyectar referencias de servicios locales a SyncManager ANTES de inicializarlo para el proceso de Pull Sync
syncManager.setLocalServices({ productService, categoryService, supplierService, saleService, ticketService, clientService, expenseService, municipioService, machineService, employeeService, budgetService, remitoService });

console.log('[MAIN] Llamando a syncManager.initialize() con servicios locales inyectados');
syncManager.initialize();

// Función de utilidad Dual Write para IPC handlers directos en main.js
function handleDualWrite(promise, entity, action, payload) {
  promise
    .then(res => {
      if (!res || !res.success) {
        console.warn(`[Main] Dual Write hacia Supabase no exitoso (${action}). Registrando en offline_queue.`);
        if (syncManager) {
          syncManager.queueOperation({ entity, action, payload });
        }
      }
    })
    .catch(err => {
      console.error(`[Main] Error en Dual Write hacia Supabase (${action}):`, err.message || err);
      if (syncManager) {
        syncManager.queueOperation({ entity, action, payload });
      }
    });
}

// ====================
// Sistema de Notificaciones
// ====================
function triggerNotification(type, icon, title, description) {
  try {
    const info = db.prepare('INSERT INTO notificaciones (type, icon, title, description) VALUES (?, ?, ?, ?)').run(type, icon, title, description);
    
    if (Notification.isSupported()) {
      new Notification({
        title: title,
        body: description,
        icon: path.join(__dirname, 'assets', 'Logoapp2.ico')
      }).show();
    }

    const wins = BrowserWindow.getAllWindows();
    wins.forEach(win => {
      if (!win.isDestroyed()) {
        win.webContents.send('new-notification', {
          id: info.lastInsertRowid,
          type, icon, title, description,
          is_read: 0,
          created_at: new Date().toISOString()
        });
      }
    });
  } catch (err) {
    console.error('Error triggerNotification:', err);
  }
}

function checkStockOnBoot() {
  try {
    const faltantes = db.prepare("SELECT count(*) as count FROM productos WHERE stock <= 0").get().count;
    const bajos = db.prepare("SELECT count(*) as count FROM productos WHERE stock > 0 AND stock <= stock_minimo").get().count;
    
    if (faltantes > 0) {
      const existe = db.prepare("SELECT id FROM notificaciones WHERE type='stock_cero_agrupado' AND date(created_at) = date('now', 'localtime')").get();
      if (!existe) {
        const msg = faltantes === 1 ? "1 producto se encuentra sin stock." : `${faltantes} productos se encuentran sin stock.`;
        triggerNotification('stock_cero_agrupado', 'fas fa-exclamation-circle', 'Stock Agotado', msg);
      }
    }
    
    if (bajos > 0) {
      const existe = db.prepare("SELECT id FROM notificaciones WHERE type='stock_bajo_agrupado' AND date(created_at) = date('now', 'localtime')").get();
      if (!existe) {
        const msg = bajos === 1 ? "1 producto tiene stock bajo." : `${bajos} productos tienen stock bajo.`;
        triggerNotification('stock_bajo_agrupado', 'fas fa-exclamation-triangle', 'Stock Bajo', msg);
      }
    }
  } catch (err) {
    console.error('Error checkStockOnBoot:', err);
  }
}

// ====================
// Ventana principal
// ====================
function createWindow() {
    // 🟦 Ventana del splash
  const splash = new BrowserWindow({
    width: 500,
    height: 380,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    icon: path.join(__dirname, 'assets', 'Logoapp2.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  splash.loadFile('splash.html');

  // 🟦 Ventana principal (oculta inicialmente)
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    title: "La Perla Desarrolladora S.A. - App de Stock",
    icon: path.join(__dirname, 'assets', 'Logoapp2.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow.loadFile('index.html');

  // Inicializar Supabase Realtime y SyncManager window en el Main Process
  try {
    realtimeManager.setMainWindow(mainWindow);
    realtimeManager.setDatabase(db);
    realtimeManager.init();
    syncManager.setMainWindow(mainWindow);
  } catch (rtErr) {
    console.warn('[main] Error al inicializar realtimeManager / syncManager window:', rtErr.message);
  }

  // Control de cierre del splash con fade out desde el renderer
  let splashClosed = false;
  const showMain = () => {
    if (splashClosed) return;
    splashClosed = true;
    if (splash && !splash.isDestroyed()) splash.close();
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.show();
  };

  ipcMain.once('close-splash', showMain);

  // Fallback de seguridad por si falla el frontend del splash
  setTimeout(showMain, 5000);
}



app.whenReady().then(() => {
  createWindow();
  
  // Agregar tabla notificaciones si no existe (safeguard adicional porque ya se añadió abajo, pero mejor prevenir)
  db.prepare(`
    CREATE TABLE IF NOT EXISTS notificaciones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      icon TEXT,
      title TEXT NOT NULL,
      description TEXT,
      is_read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    )
  `).run();

  setTimeout(checkStockOnBoot, 3000); // Dar un respiro al arranque antes de checkear stock

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ====================
// IPC handlers
// ====================

// Supabase Auth Handlers
ipcMain.handle('auth-sign-in', async (event, credentials) => {
  console.log('[AUTH TRACE 5] main IPC auth-sign-in received email:', credentials?.email);
  const res = await authService.signIn(credentials);
  console.log('[AUTH TRACE 5] main IPC authService result:', res?.success ? 'SUCCESS' : `ERROR (${res?.message})`);
  return res;
});

ipcMain.handle('auth-sign-out', async () => {
  return authService.signOut();
});

ipcMain.handle('auth-get-session', async () => {
  return authService.getSession();
});

ipcMain.handle('auth-get-profile', async () => {
  const sessionData = await authService.getSession();
  return sessionData.profile;
});

ipcMain.handle('auth-update-profile', async (event, profileData) => {
  return authService.updateProfile(profileData);
});

ipcMain.handle('auth-get-company-users', async () => {
  return authService.getCompanyUsers();
});

ipcMain.handle('auth-start-presence', async () => {
  authService.startPresenceTracking((onlineUserIds) => {
    const windows = BrowserWindow.getAllWindows();
    windows.forEach(win => {
      if (!win.isDestroyed()) {
        win.webContents.send('presence-update', onlineUserIds);
      }
    });
  });
  return { success: true };
});

// Notificaciones
ipcMain.handle('get-notifications', () => {
  try {
    return db.prepare('SELECT * FROM notificaciones ORDER BY created_at DESC LIMIT 100').all();
  } catch (err) {
    console.error('Error get-notifications:', err);
    return [];
  }
});

ipcMain.handle('mark-notification-read', (event, id) => {
  try {
    db.prepare('UPDATE notificaciones SET is_read = 1 WHERE id = ?').run(id);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('mark-all-notifications-read', () => {
  try {
    db.prepare('UPDATE notificaciones SET is_read = 1').run();
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('delete-notification', (event, id) => {
  try {
    db.prepare('DELETE FROM notificaciones WHERE id = ?').run(id);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('delete-all-notifications', () => {
  try {
    db.prepare('DELETE FROM notificaciones').run();
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Importar Excel
ipcMain.handle('import-excel', async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const { canceled, filePaths } = await dialog.showOpenDialog(win, {
    filters: [{ name: 'Excel', extensions: ['xlsx', 'xls'] }],
    properties: ['openFile']
  });
  if (win) { win.focus(); win.webContents.focus(); }
  if (canceled || !filePaths || filePaths.length === 0) return [];
  try {
    const workbook = XLSX.readFile(filePaths[0]);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    console.log("HOJAS DEL EXCEL:", workbook.SheetNames);
console.log("PRIMERA FILA CRUDA:", XLSX.utils.sheet_to_json(sheet, { header: 1 })[0]);



const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true });

const headers = rows[0].map(h =>
  h?.toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "")
);

const json = [];

for (let i = 1; i < rows.length; i++) {
  const row = rows[i];
  if (!row || row.length === 0) continue;

  const obj = {};

  headers.forEach((header, colIndex) => {
    obj[header] = row[colIndex] ?? '';
  });

  json.push(obj);
}

console.log("HEADERS DETECTADOS:", headers);

    registrarAccion('Importar Excel', `Archivo: ${path.basename(filePaths[0])}, Filas: ${json.length}`);
    return json;
  } catch (err) {
    console.error('Error leyendo Excel:', err);
    return [];
  }
});


ipcMain.handle('export-excel', async (event) => {
  try {
    const products = db.prepare('SELECT * FROM productos ORDER BY nombre').all();

    if (!products.length) {
      return { success: false, error: 'No hay productos para exportar' };
    }

    // Strip proveedor_id to avoid changing the Excel columns structure
    products.forEach(p => {
      delete p.proveedor_id;
    });

    const win = BrowserWindow.fromWebContents(event.sender);
    const { canceled, filePath } = await dialog.showSaveDialog(win, {
      title: 'Guardar Excel',
      defaultPath: 'inventario.xlsx',
      filters: [{ name: 'Excel', extensions: ['xlsx'] }]
    });

    if (win) { win.focus(); win.webContents.focus(); }

    if (canceled || !filePath) return { success: false };

    const worksheet = XLSX.utils.json_to_sheet(products);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventario');

    XLSX.writeFile(workbook, filePath);

    registrarAccion('Exportar Excel', `Productos exportados: ${products.length}`);

    return { success: true };

  } catch (err) {
    console.error('Error exportando Excel:', err);
    return { success: false, error: err.message };
  }
});

// ====================
// Productos
// ====================
ipcMain.handle('get-products', async () => {
  try {
    return await productService.getProducts();
  } catch (err) {
    console.error('[IPC] Error en get-products:', err);
    return [];
  }
});

ipcMain.handle('add-product', (event, product) => {
  try {
    return productService.createProduct(product);
  } catch (error) {
    console.error('Error en add-product:', error);
    return { success: false, error: error.message };
  }
});


// ====================
// Tickets: guardar, obtener y limpieza automática
// ====================

// Crear tabla de tickets si no existe
db.prepare(`
  CREATE TABLE IF NOT EXISTS tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fecha TEXT DEFAULT (datetime('now', 'localtime')),
    metodo_pago TEXT,
    total REAL,
    productos TEXT,
    tipo TEXT,
    descuento REAL DEFAULT 0,
    subtotal REAL DEFAULT 0
  )
`).run();

// Intentar agregar columnas de descuento, subtotal y cliente si no existen
try {
  db.prepare("ALTER TABLE tickets ADD COLUMN descuento REAL DEFAULT 0").run();
} catch (err) {}
try {
  db.prepare("ALTER TABLE tickets ADD COLUMN subtotal REAL DEFAULT 0").run();
} catch (err) {}
try {
  db.prepare("ALTER TABLE tickets ADD COLUMN cliente TEXT").run();
} catch (err) {}

// Guardar ticket
ipcMain.handle('save-ticket', (event, data) => {
  try {
    return ticketService.saveTicket(data);
  } catch (err) {
    console.error('Error al guardar ticket:', err);
    return { success: false, error: err.message };
  }
});

// Obtener todos los tickets (sincronizando desde Supabase si se está ONLINE)
ipcMain.handle('get-tickets', async () => {
  console.log('[MAIN][GET-TICKETS] 📥 Handler "get-tickets" invocado desde el Renderer.');
  let remoteCount = 0;
  let successCount = 0;
  let errorCount = 0;

  try {
    if (supabaseTicketService && typeof supabaseTicketService.getAllTickets === 'function') {
      console.log('[MAIN][GET-TICKETS] 🌐 Solicitando tickets remotos a Supabase...');
      const remoteTickets = await supabaseTicketService.getAllTickets();
      remoteCount = Array.isArray(remoteTickets) ? remoteTickets.length : 0;
      console.log(`[MAIN][GET-TICKETS] 📦 Supabase devolvió ${remoteCount} tickets.`);

      if (Array.isArray(remoteTickets) && remoteTickets.length > 0) {
        for (const t of remoteTickets) {
          try {
            if (ticketService && typeof ticketService.upsertTicket === 'function') {
              const res = ticketService.upsertTicket(t);
              if (res && res.success) {
                successCount++;
              } else {
                errorCount++;
                console.warn(`[MAIN][GET-TICKETS] ⚠️ upsertTicket falló para ID ${t?.id}:`, res?.error || 'Sin respuesta de éxito');
              }
            } else {
              console.warn('[MAIN][GET-TICKETS] ⚠️ ticketService.upsertTicket no está disponible.');
            }
          } catch (upsertErr) {
            errorCount++;
            console.error(`[MAIN][GET-TICKETS] ❌ Excepción en upsertTicket para ID ${t?.id}:`, upsertErr.message || upsertErr);
          }
        }
        console.log(`[MAIN][GET-TICKETS] ✅ Resultado UPSERT: ${successCount} exitosos, ${errorCount} fallidos.`);
      }
    } else {
      console.warn('[MAIN][GET-TICKETS] ⚠️ supabaseTicketService.getAllTickets no está disponible.');
    }
  } catch (syncErr) {
    console.warn('[MAIN][GET-TICKETS] ⚠️ Error durante la sincronización desde Supabase:', syncErr.message || syncErr);
  }

  try {
    const finalTickets = ticketService.getTickets() || [];
    console.log(`[MAIN][GET-TICKETS] 🚀 Devolviendo ${finalTickets.length} tickets desde SQLite local al Renderer.`);
    if (finalTickets.length > 0) {
      const recent = finalTickets.slice(0, 5).map(t => ({ id: t.id, fecha: t.fecha, total: t.total, cliente: t.cliente }));
      console.log('[MAIN][GET-TICKETS] 📊 Muestra de últimos 5 tickets devueltos:', JSON.stringify(recent, null, 2));
    }
    return finalTickets;
  } catch (err) {
    console.error('[MAIN][GET-TICKETS] ❌ Error en ticketService.getTickets():', err);
    return [];
  }
});

// Ejecutar limpieza cada 12 horas
setInterval(() => {
  try {
    ticketService.limpiarTicketsViejos();
  } catch (err) {
    console.error('Error limpiando tickets viejos:', err);
  }
}, 12 * 60 * 60 * 1000);
try {
  ticketService.limpiarTicketsViejos();
} catch (err) {
  console.error('Error limpiando tickets viejos:', err);
}


// ====================
// Presupuestos: guardar y obtener (Fase 2)
// ====================

// Crear tabla de presupuestos si no existe
db.prepare(`
  CREATE TABLE IF NOT EXISTS presupuestos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fecha TEXT DEFAULT (datetime('now', 'localtime')),
    cliente TEXT,
    direccion TEXT,
    localidad TEXT,
    cuit TEXT,
    telefono TEXT,
    productos TEXT,
    total REAL
  )
`).run();

// Asegurar migración de todas las columnas requeridas para presupuestos
try {
  db.prepare("ALTER TABLE presupuestos ADD COLUMN fecha TEXT").run();
} catch (err) {}
try {
  db.prepare("ALTER TABLE presupuestos ADD COLUMN cliente TEXT").run();
} catch (err) {}
try {
  db.prepare("ALTER TABLE presupuestos ADD COLUMN direccion TEXT").run();
} catch (err) {}
try {
  db.prepare("ALTER TABLE presupuestos ADD COLUMN localidad TEXT").run();
} catch (err) {}
try {
  db.prepare("ALTER TABLE presupuestos ADD COLUMN cuit TEXT").run();
} catch (err) {}
try {
  db.prepare("ALTER TABLE presupuestos ADD COLUMN telefono TEXT").run();
} catch (err) {}
try {
  db.prepare("ALTER TABLE presupuestos ADD COLUMN productos TEXT").run();
} catch (err) {}
try {
  db.prepare("ALTER TABLE presupuestos ADD COLUMN total REAL").run();
} catch (err) {}

// Guardar presupuesto
ipcMain.handle('save-presupuesto', (event, data) => {
  try {
    return budgetService.saveBudget(data);
  } catch (err) {
    console.error('Error al guardar presupuesto:', err);
    return { success: false, error: err.message };
  }
});

// Obtener todos los presupuestos
ipcMain.handle('get-presupuestos', () => {
  try {
    return budgetService.getBudgets();
  } catch (err) {
    console.error('Error get-presupuestos:', err);
    return [];
  }
});

ipcMain.handle('delete-presupuesto', (event, id) => {
  try {
    return budgetService.deleteBudget(id);
  } catch (err) {
    console.error('Error delete-presupuesto:', err);
    return { success: false, error: err.message };
  }
});


// ====================
// Remitos: guardar y obtener (Fase 3)
// ====================

// Crear tabla de remitos si no existe
db.prepare(`
  CREATE TABLE IF NOT EXISTS remitos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fecha TEXT DEFAULT (datetime('now', 'localtime')),
    cliente TEXT,
    direccion TEXT,
    localidad TEXT,
    cuit TEXT,
    telefono TEXT,
    productos TEXT,
    total REAL
  )
`).run();

// Asegurar migración de todas las columnas requeridas para remitos
try {
  db.prepare("ALTER TABLE remitos ADD COLUMN numero_remito TEXT").run();
} catch (err) {}
try {
  db.prepare("ALTER TABLE remitos ADD COLUMN fecha TEXT").run();
} catch (err) {}
try {
  db.prepare("ALTER TABLE remitos ADD COLUMN cliente TEXT").run();
} catch (err) {}
try {
  db.prepare("ALTER TABLE remitos ADD COLUMN direccion TEXT").run();
} catch (err) {}
try {
  db.prepare("ALTER TABLE remitos ADD COLUMN localidad TEXT").run();
} catch (err) {}
try {
  db.prepare("ALTER TABLE remitos ADD COLUMN cuit TEXT").run();
} catch (err) {}
try {
  db.prepare("ALTER TABLE remitos ADD COLUMN telefono TEXT").run();
} catch (err) {}
try {
  db.prepare("ALTER TABLE remitos ADD COLUMN vendedor TEXT").run();
} catch (err) {}
try {
  db.prepare("ALTER TABLE remitos ADD COLUMN observaciones TEXT").run();
} catch (err) {}
try {
  db.prepare("ALTER TABLE remitos ADD COLUMN transporte TEXT").run();
} catch (err) {}
try {
  db.prepare("ALTER TABLE remitos ADD COLUMN productos TEXT").run();
} catch (err) {}
try {
  db.prepare("ALTER TABLE remitos ADD COLUMN total REAL").run();
} catch (err) {}

// Guardar remito
ipcMain.handle('save-remito', (event, data) => {
  try {
    return remitoService.saveRemito(data);
  } catch (err) {
    console.error('Error al guardar remito:', err);
    return { success: false, error: err.message };
  }
});

// Obtener todos los remitos
ipcMain.handle('get-remitos', () => {
  try {
    return remitoService.getRemitos();
  } catch (err) {
    console.error('Error get-remitos:', err);
    return [];
  }
});

ipcMain.handle('upsert-remito', (event, data) => {
  try {
    return remitoService.upsertRemito(data);
  } catch (err) {
    console.error('Error al actualizar remito:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('delete-remito', (event, id) => {
  try {
    return remitoService.deleteRemito(id);
  } catch (err) {
    console.error('Error delete-remito:', err);
    return { success: false, error: err.message };
  }
});

// ====================
// Módulo de Clientes (IPC)
// ====================
ipcMain.handle('get-clientes', () => {
  try {
    return clientService.getClients();
  } catch (err) {
    console.error('Error get-clientes:', err);
    return [];
  }
});

ipcMain.handle('add-cliente', (event, data) => {
  try {
    return clientService.createClient(data);
  } catch (err) {
    console.error('Error add-cliente:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('update-cliente', (event, data) => {
  try {
    return clientService.updateClient(data);
  } catch (err) {
    console.error('Error update-cliente:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('delete-cliente', (event, id) => {
  try {
    return clientService.deleteClient(id);
  } catch (err) {
    console.error('Error delete-cliente:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('get-pagos-cliente', (event, clienteId) => {
  try {
    return clientService.getPaymentsByClient(clienteId);
  } catch (err) {
    console.error('Error get-pagos-cliente:', err);
    return [];
  }
});

ipcMain.handle('add-pago-cliente', (event, data) => {
  try {
    return clientService.addPayment(data);
  } catch (err) {
    console.error('Error add-pago-cliente:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('delete-pago-cliente', (event, id) => {
  try {
    return clientService.deletePayment(id);
  } catch (err) {
    console.error('Error delete-pago-cliente:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('get-cta-cte-cliente', (event, clienteId) => {
  try {
    return clientService.getAccountMovements(clienteId);
  } catch (err) {
    console.error('Error get-cta-cte-cliente:', err);
    return [];
  }
});

ipcMain.handle('get-saldo-cliente', (event, clienteId) => {
  try {
    return clientService.getClientBalance(clienteId);
  } catch (err) {
    console.error('Error get-saldo-cliente:', err);
    return 0;
  }
});

// Ventas a Cuenta Corriente Clientes
ipcMain.handle('cliente-get-sales', () => {
  try {
    return clientService.getSales();
  } catch (err) {
    console.error('Error cliente-get-sales:', err);
    return [];
  }
});

ipcMain.handle('cliente-add-sale', (event, sale) => {
  try {
    return clientService.addSale(sale);
  } catch (err) {
    console.error('Error cliente-add-sale:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('cliente-delete-sale', (event, id) => {
  try {
    return clientService.deleteSale(id);
  } catch (err) {
    console.error('Error cliente-delete-sale:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('cliente-add-sale-payment', (event, pago) => {
  try {
    return clientService.addSalePayment(pago);
  } catch (err) {
    console.error('Error cliente-add-sale-payment:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('cliente-get-upcoming-collections', () => {
  try {
    return clientService.getUpcomingCollections();
  } catch (err) {
    console.error('Error cliente-get-upcoming-collections:', err);
    return [];
  }
});

ipcMain.handle('cliente-get-stats', () => {
  try {
    return clientService.getStats();
  } catch (err) {
    console.error('Error cliente-get-stats:', err);
    return {
      totalVendido: 0,
      totalPendiente: 0,
      totalCobrado: 0,
      cantVentas: 0,
      cantPendientes: 0,
      cantCobradas: 0,
      topDeudores: []
    };
  }
});


// ====================
// Gastos: guardar, obtener y eliminar
// ====================

// Crear tabla de gastos si no existe
db.prepare(`
  CREATE TABLE IF NOT EXISTS gastos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fecha TEXT,
    concepto TEXT,
    categoria TEXT,
    monto REAL,
    observacion TEXT,
    estado TEXT
  )
`).run();

// Guardar/Actualizar gasto
ipcMain.handle('save-gasto', (event, data) => {
  try {
    return expenseService.saveExpense(data);
  } catch (err) {
    console.error('Error saving gasto:', err);
    return { success: false, error: err.message };
  }
});

// Obtener todos los gastos
ipcMain.handle('get-gastos', () => {
  try {
    return expenseService.getExpenses();
  } catch (err) {
    console.error('Error get-gastos:', err);
    return [];
  }
});

// Eliminar un gasto
ipcMain.handle('delete-gasto', (event, id) => {
  try {
    return expenseService.deleteExpense(id);
  } catch (err) {
    console.error('Error delete-gasto:', err);
    return { success: false, error: err.message };
  }
});



ipcMain.handle('add-products-bulk', (event, products, opciones = {}) => {

  const selectStmt = db.prepare(`
    SELECT id, uuid FROM productos 
    WHERE codigo = ?
  `);

  const insertStmt = db.prepare(`
    INSERT INTO productos (
      uuid,
      codigo,
      nombre,
      categoria,
      stock,
      unidad,
      precio_costo,
      precio
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // 🔥 Construye UPDATE dinámico según lo marcado en el modal
  function buildUpdateQuery(op) {
    const fields = [];

  if (op.stock) fields.push("stock = stock + ?");  // ✅ SUMA (bien)
  if (op.precioCosto) fields.push("precio_costo = ?");  // ✅ REEMPLAZA
  if (op.precioVenta) fields.push("precio = ?");  // ✅ REEMPLAZA

    // Estos siempre se actualizan
    fields.push("categoria = ?");
    fields.push("unidad = ?");

    return {
      sql: `UPDATE productos SET ${fields.join(", ")} WHERE id = ?`,
      usesStock: op.stock,
      usesCosto: op.precioCosto,
      usesVenta: op.precioVenta
    };
  }

  const updateConfig = buildUpdateQuery(opciones);
  const updateStmt = db.prepare(updateConfig.sql);

  // 🧠 Busca columnas aunque estén mal escritas
  function getField(row, posibles) {
    for (const key of Object.keys(row)) {
      const normalizada = key
        .toString()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, "");

      for (const p of posibles) {
        if (normalizada.includes(p)) return row[key];
      }
    }
    return null;
  }

  // 💲 Convierte precios a número real
  function parsePrecio(valor) {
    if (valor === null || valor === undefined || valor === '') return 0;
    if (typeof valor === 'number') return valor;

    let limpio = valor.toString().trim();
    limpio = limpio.replace(/\$/g, '').replace(/\s/g, '');

    if (limpio.includes(',') && limpio.includes('.')) {
      limpio = limpio.replace(/\./g, '').replace(',', '.');
    } else if (limpio.includes(',')) {
      limpio = limpio.replace(',', '.');
    }

    const numero = parseFloat(limpio);
    return isNaN(numero) ? 0 : numero;
  }

  const dualWriteOps = [];

  const tx = db.transaction((items) => {
    for (const p of items) {

      const codigo = String(p.codigo || '').trim();
      const nombre = String(p.nombre || p.producto || '').trim();
      if (!codigo || !nombre) continue;

      const categoria = getField(p, ['categoria', 'rubro', 'tipo']) || '';
      const unidad = getField(p, ['unidad', 'unid', 'medida']) || 'un';

      const stock = Number(getField(p, ['stock', 'cantidad', 'existencia'])) || 0;

      const precioCosto = parsePrecio(getField(p, [
        'preciocosto', 'precio_costo', 'costo', 'pcosto'
      ]));

      let precioVenta = parsePrecio(getField(p, [
        'precio', 'precioventa', 'precio_venta', 'valorventa', 'pventa'
      ]));

      if (precioVenta === 0 && precioCosto > 0) {
        precioVenta = precioCosto;
      }

      const existente = selectStmt.get(codigo);

      if (existente) {
        let prodUuid = existente.uuid;
        if (!prodUuid) {
          prodUuid = crypto.randomUUID();
          db.prepare('UPDATE productos SET uuid = ? WHERE id = ?').run(prodUuid, existente.id);
        }

        const params = [];

        if (updateConfig.usesStock) params.push(stock);
        if (updateConfig.usesCosto) params.push(precioCosto);
        if (updateConfig.usesVenta) params.push(precioVenta);

        params.push(categoria);
        params.push(unidad);
        params.push(existente.id);

        updateStmt.run(...params);

        const target = db.prepare('SELECT * FROM productos WHERE id = ?').get(existente.id);
        if (target) {
          if (updateConfig.usesCosto || updateConfig.usesVenta) {
            dualWriteOps.push({
              type: 'UPDATE',
              payload: {
                id: target.id,
                uuid: prodUuid,
                codigo: target.codigo,
                nombre: target.nombre,
                categoria: target.categoria,
                stock: target.stock,
                precio: target.precio,
                precio_costo: target.precio_costo,
                unidad: target.unidad
              }
            });
          } else if (updateConfig.usesStock) {
            dualWriteOps.push({
              type: 'UPDATE_STOCK',
              payload: { id: target.id, uuid: prodUuid, stock: target.stock }
            });
          }
        }

      } else {
        const stockInicial = opciones.stock ? stock : 0;
        const costoInicial = opciones.precioCosto ? precioCosto : 0;
        const ventaInicial = opciones.precioVenta ? precioVenta : 0;
        const prodUuid = crypto.randomUUID();

        const info = insertStmt.run(
          prodUuid,
          codigo,
          nombre,
          categoria,
          stockInicial,
          unidad,
          costoInicial,
          ventaInicial
        );

        const newId = info.lastInsertRowid;

        dualWriteOps.push({
          type: 'INSERT',
          payload: {
            id: newId,
            uuid: prodUuid,
            codigo,
            nombre,
            categoria,
            stock: stockInicial,
            unidad,
            precio_costo: costoInicial,
            precio: ventaInicial
          }
        });
      }
    }
  });

  tx(products);

  // Disparar Dual Write asíncrono para cada producto procesado
  for (const op of dualWriteOps) {
    if (op.type === 'INSERT') {
      handleDualWrite(
        supabaseProductService.createProduct(op.payload),
        'productos',
        'INSERT',
        op.payload
      );
    } else if (op.type === 'UPDATE_STOCK') {
      handleDualWrite(
        supabaseProductService.updateStockByUuid(op.payload.uuid, op.payload.stock),
        'productos',
        'UPDATE_STOCK',
        op.payload
      );
    } else if (op.type === 'UPDATE') {
      handleDualWrite(
        supabaseProductService.updateProduct(op.payload),
        'productos',
        'UPDATE',
        op.payload
      );
    }
  }

  return { success: true };
});






ipcMain.handle('update-product', (event, product) => {
  try {
    return productService.updateProduct(product);
  } catch (err) {
    console.error('Error en update-product:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('delete-product', (event, id) => {
  try {
    return productService.deleteProduct(id);
  } catch (err) {
    console.error('Error delete-product:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('delete-all-products', () => {
  try {
    return productService.deleteAllProducts();
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ====================
// Categorías
// ====================
ipcMain.handle('get-categories', async () => {
  try {
    return await categoryService.getCategories();
  } catch (err) {
    console.error('Error get-categories:', err);
    return [];
  }
});

ipcMain.handle('add-category', (event, nombre) => {
  try {
    return categoryService.addCategory(nombre);
  } catch (err) {
    console.error('Error add-category:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('delete-category', (event, id) => {
  try {
    return categoryService.deleteCategory(id);
  } catch (err) {
    console.error('Error delete-category:', err);
    return { success: false, error: err.message };
  }
});

// ====================
// Actualizar precios
// ====================
ipcMain.handle('update-prices', (event, percent) => {
  try {
    return productService.updatePrices(percent);
  } catch (err) {
    console.error('Error update-prices:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('update-prices-advanced', (event, { percent, category, priceType = 'venta' }) => {
  try {
    return productService.updatePricesAdvanced({ percent, category, priceType });
  } catch (err) {
    console.error('Error update-prices-advanced:', err);
    return { success: false, error: err.message };
  }
});

// ====================
// Ventas y Finanzas
// ====================

// Registrar venta y restar stock
// ====================
// Registrar venta (individual o carrito)
// ====================
ipcMain.handle('sell-product', (event, { id, cantidad, metodo_pago = 'Efectivo', carritoCompleto = null, ajuste = null }) => {
  return saleService.sellProduct({ id, cantidad, metodo_pago, carritoCompleto, ajuste });
});

// Resumen de ventas (día / semana / mes / año)
ipcMain.handle('get-sales-summary', (event, { period }) => {
  let query = '';
  switch (period) {
    case 'day':
      query = "WHERE date(fecha) = date('now', 'localtime')";
      break;
    case 'week':
      query = "WHERE strftime('%Y-%W', fecha) = strftime('%Y-%W', 'now', 'localtime')";
      break;
    case 'month':
      query = "WHERE strftime('%Y-%m', fecha) = strftime('%Y-%m', 'now', 'localtime')";
      break;
    case 'year':
      query = "WHERE strftime('%Y', fecha) = strftime('%Y', 'now', 'localtime')";
      break;
  }
  const excludeAnnulledClause = "id NOT IN (SELECT venta_id FROM ajustes_caja WHERE venta_id IS NOT NULL AND tipo = 'Venta anulada')";
  const whereClause = query 
    ? `${query} AND (tipo IS NULL OR tipo = 'Venta') AND ${excludeAnnulledClause}`
    : `WHERE (tipo IS NULL OR tipo = 'Venta') AND ${excludeAnnulledClause}`;
  const row = db.prepare(`SELECT COALESCE(SUM(total), 0) AS total FROM tickets ${whereClause}`).get();
  return row?.total || 0;
});

// IPC handler unificado de Finanzas (P&L + Flujo de Caja Real + Métricas)
ipcMain.handle('get-finance-metrics', (event, { period = 'day', fecha = null }) => {
  if (!authService.isCurrentAdmin()) {
    console.warn('[SECURITY IPC] Intento no autorizado de acceder a get-finance-metrics');
    return { success: false, error: 'Acceso denegado. Se requieren permisos de administrador.' };
  }
  try {
    let whereClause = "";
    let params = [];

    if (fecha && fecha.trim()) {
      whereClause = "WHERE date(fecha) = date(?)";
      params = [fecha.trim()];
    } else {
      switch (period) {
        case 'day':
        case 'hoy':
          whereClause = "WHERE date(fecha) = date('now', 'localtime')";
          break;
        case 'week':
        case 'semana':
          whereClause = "WHERE date(fecha) >= date('now', 'localtime', '-6 days')";
          break;
        case 'month':
        case 'mes':
          whereClause = "WHERE strftime('%Y-%m', fecha) = strftime('%Y-%m', 'now', 'localtime')";
          break;
        case 'year':
        case 'año':
          whereClause = "WHERE strftime('%Y', fecha) = strftime('%Y', 'now', 'localtime')";
          break;
        default:
          whereClause = "WHERE date(fecha) = date('now', 'localtime')";
      }
    }

    const excludeAnnulledClause = "id NOT IN (SELECT venta_id FROM ajustes_caja WHERE venta_id IS NOT NULL AND tipo = 'Venta anulada')";

    const ticketsWhere = whereClause 
      ? `${whereClause} AND (tipo IS NULL OR tipo = 'Venta') AND ${excludeAnnulledClause}`
      : `WHERE (tipo IS NULL OR tipo = 'Venta') AND ${excludeAnnulledClause}`;

    const ventasContadoWhere = whereClause 
      ? `${whereClause} AND (metodo_pago IS NULL OR metodo_pago != 'Cuenta Corriente') AND (tipo IS NULL OR tipo = 'Venta') AND ${excludeAnnulledClause}`
      : `WHERE (metodo_pago IS NULL OR metodo_pago != 'Cuenta Corriente') AND (tipo IS NULL OR tipo = 'Venta') AND ${excludeAnnulledClause}`;

    // 1. RESULTADO OPERATIVO / P&L (Devengado)
    const ventasDev = db.prepare(`SELECT COALESCE(SUM(total), 0) AS val FROM tickets ${ticketsWhere}`).get(...params)?.val || 0;
    const muniDev = db.prepare(`SELECT COALESCE(SUM(total), 0) AS val FROM municipio_ordenes ${whereClause}`).get(...params)?.val || 0;
    const atmosDev = db.prepare(`SELECT COALESCE(SUM(monto), 0) AS val FROM atmos_ordenes ${whereClause}`).get(...params)?.val || 0;
    const ingresosDevengados = ventasDev + muniDev + atmosDev;

    const gastosDev = db.prepare(`SELECT COALESCE(SUM(monto), 0) AS val FROM gastos ${whereClause}`).get(...params)?.val || 0;

    let sueldosWhere = whereClause;
    if (whereClause.includes('fecha')) {
      sueldosWhere = whereClause.replace(/date\(fecha\)/g, "date(created_at)").replace(/strftime\('([^']+)', fecha\)/g, "strftime('$1', created_at)");
    }
    const sueldosDev = db.prepare(`SELECT COALESCE(SUM(total_liquidacion), 0) AS val FROM empleado_liquidaciones ${sueldosWhere}`).get(...params)?.val || 0;
    const comprasDev = db.prepare(`SELECT COALESCE(SUM(total), 0) AS val FROM compras_proveedor ${whereClause} ${whereClause ? 'AND' : 'WHERE'} estado = 'Completado'`).get(...params)?.val || 0;
    const egresosDevengados = gastosDev + sueldosDev + comprasDev;

    const resultadoOperativo = ingresosDevengados - egresosDevengados;

    // 2. FLUJO DE CAJA REAL (Efectivo Entrado / Salido)
    const ventasContado = db.prepare(`SELECT COALESCE(SUM(total), 0) AS val FROM tickets ${ventasContadoWhere}`).get(...params)?.val || 0;
    const cobrosCliente = db.prepare(`SELECT COALESCE(SUM(monto), 0) AS val FROM pagos_cliente ${whereClause}`).get(...params)?.val || 0;
    const cobrosMuni = db.prepare(`SELECT COALESCE(SUM(monto), 0) AS val FROM municipio_pagos ${whereClause}`).get(...params)?.val || 0;
    const cobrosAtmos = db.prepare(`SELECT COALESCE(SUM(monto), 0) AS val FROM atmos_pagos ${whereClause}`).get(...params)?.val || 0;
    const ingresosCaja = ventasContado + cobrosCliente + cobrosMuni + cobrosAtmos;

    const gastosPagadosWhere = whereClause ? `${whereClause} AND estado = 'Pagado'` : "WHERE estado = 'Pagado'";
    const gastosPagados = db.prepare(`SELECT COALESCE(SUM(monto), 0) AS val FROM gastos ${gastosPagadosWhere}`).get(...params)?.val || 0;
    const pagosProveedores = db.prepare(`SELECT COALESCE(SUM(monto), 0) AS val FROM pagos_proveedor ${whereClause}`).get(...params)?.val || 0;
    const egresosCaja = gastosPagados + pagosProveedores;

    const ajustesWhere = whereClause 
      ? `${whereClause} AND (tipo IS NULL OR tipo != 'Venta anulada' OR venta_id IS NULL)`
      : "WHERE (tipo IS NULL OR tipo != 'Venta anulada' OR venta_id IS NULL)";
    const ajustesRow = db.prepare(`SELECT COALESCE(SUM(monto), 0) AS val FROM ajustes_caja ${ajustesWhere}`).get(...params);
    const ajustesCaja = ajustesRow?.val || 0;

    const flujoCajaReal = ingresosCaja - egresosCaja + ajustesCaja;

    // 3. CANTIDAD DE COMPROBANTES Y LÍNEAS
    const cantComprobantes = db.prepare(`SELECT COUNT(*) AS val FROM tickets ${ticketsWhere}`).get(...params)?.val || 0;
    const cantVentasLineas = db.prepare(`SELECT COUNT(*) AS val FROM tickets ${ticketsWhere}`).get(...params)?.val || 0;

    return {
      success: true,
      period,
      pnl: {
        ventasDevengadas: ventasDev,
        municipioDevengado: muniDev,
        atmosDevengado: atmosDev,
        totalIngresosDevengados: ingresosDevengados,
        gastosDevengados: gastosDev,
        sueldosDevengados: sueldosDev,
        comprasDevengadas: comprasDev,
        totalEgresosDevengados: egresosDevengados,
        resultadoOperativo
      },
      cashFlow: {
        ventasContado,
        cobrosCliente,
        cobrosMunicipio: cobrosMuni,
        cobrosAtmos,
        totalIngresosCaja: ingresosCaja,
        gastosPagados,
        pagosProveedores,
        totalEgresosCaja: egresosCaja,
        ajustesCaja,
        flujoCajaReal
      },
      metrics: {
        cantComprobantes,
        cantVentasLineas
      }
    };
  } catch (err) {
    console.error('Error get-finance-metrics:', err);
    return { success: false, error: err.message };
  }
});

// Obtener ventas por día (para el gráfico del mes actual o uno seleccionado)
ipcMain.handle('get-sales-by-day', (event, yearMonth) => {
  let targetMonth = yearMonth;
  if (!targetMonth) {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    targetMonth = `${y}-${m}`;
  }
  const rows = db.prepare(`
    SELECT strftime('%d', fecha) AS dia, SUM(total) AS total
    FROM tickets
    WHERE strftime('%Y-%m', fecha) = ?
      AND (tipo IS NULL OR tipo = 'Venta')
      AND id NOT IN (SELECT venta_id FROM ajustes_caja WHERE venta_id IS NOT NULL AND tipo = 'Venta anulada')
    GROUP BY dia
    ORDER BY dia
  `).all(targetMonth);
  return rows;
});

// ====================
// Historial
// ====================
// Obtener total de ventas por fecha específica
ipcMain.handle('get-sales-by-date', (event, fecha) => {
  try {
    const row = db.prepare(`
      SELECT SUM(total) AS total
      FROM tickets
      WHERE date(fecha) = date(?)
        AND (tipo IS NULL OR tipo = 'Venta')
        AND id NOT IN (SELECT venta_id FROM ajustes_caja WHERE venta_id IS NOT NULL AND tipo = 'Venta anulada')
    `).get(fecha);
    return row?.total || 0;
  } catch (err) {
    console.error('Error get-sales-by-date:', err);
    return 0;
  }
});



ipcMain.handle('get-historial-by-date', (event, fecha) => {
  if (!authService.isCurrentAdmin()) {
    console.warn('[SECURITY IPC] Intento no autorizado de acceder a get-historial-by-date');
    return [];
  }
  try {
    const rows = db.prepare(`
      SELECT id, accion, detalle, fecha FROM historial
      WHERE date(fecha) = date(?)
      UNION ALL
      SELECT id, 'GASTO' AS accion, concepto || ';' || monto || ';' || estado AS detalle, fecha || ' 00:00:00' AS fecha FROM gastos
      WHERE date(fecha) = date(?)
      UNION ALL
      SELECT id, 'PRESUPUESTO' AS accion, cliente || ';' || total AS detalle, datetime(fecha, 'localtime') AS fecha FROM presupuestos
      WHERE date(datetime(fecha, 'localtime')) = date(?)
      UNION ALL
      SELECT id, 'REMITO' AS accion, cliente || ';' || total AS detalle, datetime(fecha, 'localtime') AS fecha FROM remitos
      WHERE date(datetime(fecha, 'localtime')) = date(?)
      UNION ALL
      SELECT id, 'AJUSTE' AS accion, tipo || ';' || monto || ';' || COALESCE(venta_id, '') AS detalle, CASE WHEN fecha LIKE '% %' THEN fecha ELSE fecha || ' 00:00:00' END AS fecha FROM ajustes_caja
      WHERE date(fecha) = date(?)
      ORDER BY fecha DESC
    `).all(fecha, fecha, fecha, fecha, fecha);
    return rows;
  } catch (err) {
    console.error('Error get-historial-by-date:', err);
    return [];
  }
});

// Ajustes de Caja: guardar, obtener y eliminar
ipcMain.handle('save-ajuste', (event, data) => {
  try {
    const { tipo, motivo, monto, fecha, observacion, venta_id } = data || {};

    if (tipo === 'Venta anulada' && venta_id) {
      const alreadyAnnulled = db.prepare(`
        SELECT COUNT(*) AS count FROM ajustes_caja WHERE venta_id = ? AND tipo = 'Venta anulada'
      `).get(venta_id);
      
      if (alreadyAnnulled && alreadyAnnulled.count > 0) {
        return { success: false, error: 'Esta venta ya se encuentra anulada.' };
      }

      const ticket = db.prepare('SELECT productos FROM tickets WHERE id = ?').get(venta_id);
      if (ticket) {
        const productos = JSON.parse(ticket.productos || '[]');
        const updateById   = db.prepare('UPDATE productos SET stock = stock + ? WHERE id = ?');
        const updateByNombre = db.prepare('UPDATE productos SET stock = stock + ? WHERE nombre = ?');
        productos.forEach(p => {
          let targetProd = null;
          if (p.id) {
            // Tickets nuevos: devolver stock por id (correcto)
            updateById.run(p.cantidad, p.id);
            targetProd = db.prepare('SELECT id, uuid, stock FROM productos WHERE id = ?').get(p.id);
          } else {
            // Tickets históricos sin id: fallback por nombre (compatibilidad)
            updateByNombre.run(p.cantidad, p.nombre);
            targetProd = db.prepare('SELECT id, uuid, stock FROM productos WHERE nombre = ?').get(p.nombre);
          }

          if (targetProd && targetProd.uuid) {
            // Dual Write asíncrono del stock restaurado hacia Supabase (no bloqueante)
            handleDualWrite(
              supabaseProductService.updateStockByUuid(targetProd.uuid, targetProd.stock),
              'productos',
              'UPDATE_STOCK',
              { uuid: targetProd.uuid, stock: targetProd.stock, id: targetProd.id }
            );
          }
        });
      }
    }

    const finalFecha = fecha || new Date().toISOString().split('T')[0];
    const finalTipo = tipo || '';
    const finalMotivo = motivo || '';
    const finalMonto = Number(monto) || 0;
    const finalObservacion = observacion || '';
    const finalVentaId = venta_id || null;

    const stmt = db.prepare(`
      INSERT INTO ajustes_caja (fecha, tipo, motivo, monto, observacion, venta_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(
      finalFecha,
      finalTipo,
      finalMotivo,
      finalMonto,
      finalObservacion,
      finalVentaId
    );

    const newId = info.lastInsertRowid;
    const payload = {
      id: newId,
      fecha: finalFecha,
      tipo: finalTipo,
      motivo: finalMotivo,
      monto: finalMonto,
      observacion: finalObservacion,
      venta_id: finalVentaId
    };

    handleDualWrite(
      supabaseAjusteService.addAjuste(payload),
      'ajustes_caja',
      'INSERT',
      payload
    );

    return { success: true, id: newId };
  } catch (err) {
    console.error('Error save-ajuste:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('get-ajustes', () => {
  try {
    return db.prepare('SELECT id, fecha, tipo, motivo, monto, observacion, venta_id FROM ajustes_caja ORDER BY datetime(fecha) DESC, id DESC').all();
  } catch (err) {
    console.error('Error get-ajustes:', err);
    return [];
  }
});

ipcMain.handle('delete-ajuste', (event, id) => {
  try {
    const idNum = Number(id);
    db.prepare('DELETE FROM ajustes_caja WHERE id = ?').run(idNum);

    handleDualWrite(
      supabaseAjusteService.deleteAjuste(idNum),
      'ajustes_caja',
      'DELETE',
      { id: idNum }
    );

    return { success: true };
  } catch (err) {
    console.error('Error delete-ajuste:', err);
    return { success: false, error: err.message };
  }
});




// ====================
// Obtener ruta de imágenes - VERSIÓN SIMPLIFICADA
// ====================
ipcMain.handle('get-image-path', (event, imageName) => {
  try {
    const isDev = !app.isPackaged;
    const fs = require('fs');
    
    if (isDev) {
      // En desarrollo: ruta directa
      const devPath = path.join(__dirname, 'img', imageName);
      console.log('Dev path:', devPath);
      return devPath;
    } else {
      // En producción: las imágenes pueden estar en varias ubicaciones
      
      // 1. Intentar en resources/app/img/
      let imgPath = path.join(process.resourcesPath, 'app', 'img', imageName);
      if (fs.existsSync(imgPath)) {
        console.log('✅ Logo encontrado en (app/img):', imgPath);
        return imgPath;
      }
      
      // 2. Intentar en resources/app.asar/img/
      imgPath = path.join(process.resourcesPath, 'app.asar', 'img', imageName);
      if (fs.existsSync(imgPath)) {
        console.log('✅ Logo encontrado en (app.asar/img):', imgPath);
        return imgPath;
      }
      
      // 3. Intentar en la carpeta de la app
      imgPath = path.join(__dirname, 'img', imageName);
      if (fs.existsSync(imgPath)) {
        console.log('✅ Logo encontrado en (__dirname/img):', imgPath);
        return imgPath;
      }
      
      // 4. Intentar en la carpeta de recursos directa
      imgPath = path.join(process.resourcesPath, 'img', imageName);
      if (fs.existsSync(imgPath)) {
        console.log('✅ Logo encontrado en (resources/img):', imgPath);
        return imgPath;
      }
      
      // Si no encuentra ninguna, mostrar error y devolver una ruta por defecto
      console.error('❌ No se encontró la imagen:', imageName);
      console.log('process.resourcesPath:', process.resourcesPath);
      console.log('__dirname:', __dirname);
      
      // Devolvemos la ruta más probable para que al menos intente cargar
      return path.join(process.resourcesPath, 'app.asar', 'img', imageName);
    }
  } catch (err) {
    console.error('Error en get-image-path:', err);
    return path.join(__dirname, 'img', imageName);
  }
});

ipcMain.handle('get-historial-by-range', (event, fechaInicio, fechaFin) => {
  if (!authService.isCurrentAdmin()) {
    console.warn('[SECURITY IPC] Intento no autorizado de acceder a get-historial-by-range');
    return [];
  }
  try {
    const rows = db.prepare(`
      SELECT id, accion, detalle, fecha FROM historial
      WHERE date(fecha) BETWEEN date(?) AND date(?)
      UNION ALL
      SELECT id, 'GASTO' AS accion, concepto || ';' || monto || ';' || estado AS detalle, fecha || ' 00:00:00' AS fecha FROM gastos
      WHERE date(fecha) BETWEEN date(?) AND date(?)
      UNION ALL
      SELECT id, 'PRESUPUESTO' AS accion, cliente || ';' || total AS detalle, datetime(fecha, 'localtime') AS fecha FROM presupuestos
      WHERE date(datetime(fecha, 'localtime')) BETWEEN date(?) AND date(?)
      UNION ALL
      SELECT id, 'REMITO' AS accion, cliente || ';' || total AS detalle, datetime(fecha, 'localtime') AS fecha FROM remitos
      WHERE date(datetime(fecha, 'localtime')) BETWEEN date(?) AND date(?)
      UNION ALL
      SELECT id, 'AJUSTE' AS accion, tipo || ';' || monto || ';' || COALESCE(venta_id, '') AS detalle, CASE WHEN fecha LIKE '% %' THEN fecha ELSE fecha || ' 00:00:00' END AS fecha FROM ajustes_caja
      WHERE date(fecha) BETWEEN date(?) AND date(?)
      ORDER BY fecha DESC
    `).all(fechaInicio, fechaFin, fechaInicio, fechaFin, fechaInicio, fechaFin, fechaInicio, fechaFin, fechaInicio, fechaFin);
    return rows;
  } catch (err) {
    console.error('Error get-historial-by-range:', err);
    return [];
  }
});

ipcMain.handle('create-backup', async (event, prefs = {}) => {
  try {
    const rootDir = app.isPackaged ? path.dirname(process.execPath) : app.getAppPath();
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const backupFile = path.join(rootDir, `backup_${stamp}.json`);

    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all();
    const dbData = {};
    for (const table of tables) {
      dbData[table.name] = db.prepare(`SELECT * FROM "${table.name}"`).all();
    }

    const payload = {
      createdAt: now.toISOString(),
      sourceDb: dbPath,
      prefs: prefs,
      data: dbData
    };

    fs.writeFileSync(backupFile, JSON.stringify(payload, null, 2), 'utf8');
    registrarAccion('Respaldo', `Archivo generado: ${path.basename(backupFile)}`);
    
    // Disparar Notificación de Backup Exitoso
    triggerNotification('backup_created', 'fas fa-save', 'Backup Completado', `Se ha generado el respaldo ${path.basename(backupFile)} correctamente.`);
    
    return { success: true, path: backupFile };
  } catch (err) {
    console.error('Error create-backup:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('get-backups', async () => {
  try {
    const rootDir = app.isPackaged ? path.dirname(process.execPath) : app.getAppPath();
    const files = fs.readdirSync(rootDir);
    const backups = files.filter(f => f.startsWith('backup_') && f.endsWith('.json')).map(f => {
      const fullPath = path.join(rootDir, f);
      const stat = fs.statSync(fullPath);
      return {
        name: f,
        path: fullPath,
        date: stat.mtime,
        size: stat.size
      };
    });
    backups.sort((a, b) => b.date - a.date);
    return { success: true, backups };
  } catch (err) {
    console.error('Error get-backups:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('restore-backup', async (event, backupPath) => {
  try {
    if (!fs.existsSync(backupPath)) throw new Error("El archivo de backup no existe.");
    const fileContent = fs.readFileSync(backupPath, 'utf8');
    const payload = JSON.parse(fileContent);

    if (!payload.data) throw new Error("El archivo de backup es inválido o está corrupto.");

    const restoreTransaction = db.transaction((data) => {
      db.pragma('foreign_keys = OFF');
      
      const tables = Object.keys(data);
      for (const table of tables) {
        db.prepare(`DELETE FROM "${table}"`).run();
        
        const rows = data[table];
        if (rows.length > 0) {
          const columns = Object.keys(rows[0]);
          const placeholders = columns.map(() => '?').join(',');
          const insertStmt = db.prepare(`INSERT INTO "${table}" (${columns.map(c => `"${c}"`).join(',')}) VALUES (${placeholders})`);
          for (const row of rows) {
            const values = columns.map(col => row[col]);
            insertStmt.run(...values);
          }
        }
      }

      db.pragma('foreign_keys = ON');
    });

    restoreTransaction(payload.data);
    registrarAccion('Restauración', `Backup restaurado: ${path.basename(backupPath)}`);
    
    // Disparar Notificación de Restauración Exitosa (se mostrará en la app tras recargar gracias a la DB, y nativamente)
    triggerNotification('backup_restored', 'fas fa-undo', 'Restauración Completada', `El sistema ha sido restaurado al estado del archivo ${path.basename(backupPath)}.`);
    
    return { success: true, prefs: payload.prefs || {} };
  } catch (err) {
    console.error('Error restore-backup:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('export-registros', async (event, filtros = {}) => {
  try {
    const { fechaInicio, fechaFin } = filtros || {};
    let rows = [];

    if (fechaInicio && fechaFin) {
      rows = db.prepare(`
        SELECT id, accion, detalle, fecha FROM historial
        WHERE date(fecha) BETWEEN date(?) AND date(?)
        UNION ALL
        SELECT id, 'GASTO' AS accion, concepto || ';' || monto || ';' || estado AS detalle, fecha || ' 00:00:00' AS fecha FROM gastos
        WHERE date(fecha) BETWEEN date(?) AND date(?)
        UNION ALL
        SELECT id, 'PRESUPUESTO' AS accion, cliente || ';' || total AS detalle, datetime(fecha, 'localtime') AS fecha FROM presupuestos
        WHERE date(datetime(fecha, 'localtime')) BETWEEN date(?) AND date(?)
        UNION ALL
        SELECT id, 'REMITO' AS accion, cliente || ';' || total AS detalle, datetime(fecha, 'localtime') AS fecha FROM remitos
        WHERE date(datetime(fecha, 'localtime')) BETWEEN date(?) AND date(?)
        UNION ALL
        SELECT id, 'AJUSTE' AS accion, tipo || ';' || monto || ';' || COALESCE(venta_id, '') AS detalle, CASE WHEN fecha LIKE '% %' THEN fecha ELSE fecha || ' 00:00:00' END AS fecha FROM ajustes_caja
        WHERE date(fecha) BETWEEN date(?) AND date(?)
        ORDER BY fecha DESC
      `).all(fechaInicio, fechaFin, fechaInicio, fechaFin, fechaInicio, fechaFin, fechaInicio, fechaFin, fechaInicio, fechaFin);
    } else {
      rows = db.prepare(`
        SELECT id, accion, detalle, fecha FROM historial
        UNION ALL
        SELECT id, 'GASTO' AS accion, concepto || ';' || monto || ';' || estado AS detalle, fecha || ' 00:00:00' AS fecha FROM gastos
        UNION ALL
        SELECT id, 'PRESUPUESTO' AS accion, cliente || ';' || total AS detalle, datetime(fecha, 'localtime') AS fecha FROM presupuestos
        UNION ALL
        SELECT id, 'REMITO' AS accion, cliente || ';' || total AS detalle, datetime(fecha, 'localtime') AS fecha FROM remitos
        UNION ALL
        SELECT id, 'AJUSTE' AS accion, tipo || ';' || monto || ';' || COALESCE(venta_id, '') AS detalle, CASE WHEN fecha LIKE '% %' THEN fecha ELSE fecha || ' 00:00:00' END AS fecha FROM ajustes_caja
        ORDER BY fecha DESC
      `).all();
    }

    const rootDir = app.isPackaged ? path.dirname(process.execPath) : app.getAppPath();
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const outFile = path.join(rootDir, `registros_${stamp}.json`);

    fs.writeFileSync(outFile, JSON.stringify({ generatedAt: now.toISOString(), total: rows.length, rows }, null, 2), 'utf8');
    registrarAccion('Exportar registros', `Archivo: ${path.basename(outFile)} (${rows.length} movimientos)`);
    return { success: true, path: outFile, total: rows.length };
  } catch (err) {
    console.error('Error export-registros:', err);
    return { success: false, error: err.message };
  }
});


// ==========================================
// IPC Handlers: Empleados, Horarios, Asistencias
// ==========================================

ipcMain.handle('get-employees', () => {
  try { return employeeService.getEmployees(); }
  catch (err) { console.error('Error en get-employees:', err); return []; }
});

ipcMain.handle('add-employee', (event, emp) => {
  try { return employeeService.addEmployee(emp); }
  catch (err) { console.error('Error en add-employee:', err); return { success: false, error: err.message }; }
});

ipcMain.handle('update-employee', (event, emp) => {
  try { return employeeService.updateEmployee(emp); }
  catch (err) { console.error('Error en update-employee:', err); return { success: false, error: err.message }; }
});

ipcMain.handle('delete-employee', (event, id) => {
  try { return employeeService.deleteEmployee(id); }
  catch (err) { console.error('Error en delete-employee:', err); return { success: false, error: err.message }; }
});

ipcMain.handle('get-schedules', () => {
  try {
    return db.prepare('SELECT * FROM horarios ORDER BY nombre ASC').all();
  } catch (err) {
    console.error('Error en get-schedules:', err);
    return [];
  }
});

ipcMain.handle('save-schedule', (event, sch) => {
  try {
    if (sch.id) {
      // Editar
      const stmt = db.prepare(`
        UPDATE horarios SET
          nombre = ?, lunes = ?, martes = ?, miercoles = ?, jueves = ?, viernes = ?, sabado = ?, domingo = ?
        WHERE id = ?
      `);
      const info = stmt.run(
        sch.nombre,
        sch.lunes || 'Libre',
        sch.martes || 'Libre',
        sch.miercoles || 'Libre',
        sch.jueves || 'Libre',
        sch.viernes || 'Libre',
        sch.sabado || 'Libre',
        sch.domingo || 'Libre',
        sch.id
      );
      registrarAccion('Editar horario', `Horario: ${sch.nombre}`);
      return { success: info.changes > 0, id: sch.id };
    } else {
      // Crear nuevo
      const stmt = db.prepare(`
        INSERT INTO horarios (
          nombre, lunes, martes, miercoles, jueves, viernes, sabado, domingo
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const info = stmt.run(
        sch.nombre,
        sch.lunes || 'Libre',
        sch.martes || 'Libre',
        sch.miercoles || 'Libre',
        sch.jueves || 'Libre',
        sch.viernes || 'Libre',
        sch.sabado || 'Libre',
        sch.domingo || 'Libre'
      );
      registrarAccion('Crear horario', `Horario: ${sch.nombre}`);
      return { success: info.changes > 0, id: info.lastInsertRowId };
    }
  } catch (err) {
    console.error('Error en save-schedule:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('delete-schedule', (event, id) => {
  try {
    const sch = db.prepare('SELECT nombre FROM horarios WHERE id = ?').get(id);
    const stmt = db.prepare('DELETE FROM horarios WHERE id = ?');
    const info = stmt.run(id);

    if (info.changes > 0) {
      registrarAccion('Eliminar horario', `Horario ID: ${id}, Nombre: ${sch?.nombre}`);
    }
    return { success: info.changes > 0 };
  } catch (err) {
    console.error('Error en delete-schedule:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('get-attendances', (event, filtros = {}) => {
  try { return employeeService.getAttendances(filtros); }
  catch (err) { console.error('Error en get-attendances:', err); return []; }
});

ipcMain.handle('save-attendance', (event, att) => {
  try { return employeeService.saveAttendance(att); }
  catch (err) { console.error('Error en save-attendance:', err); return { success: false, error: err.message }; }
});

ipcMain.handle('delete-attendance', (event, id) => {
  try { return employeeService.deleteAttendance(id); }
  catch (err) { console.error('Error en delete-attendance:', err); return { success: false, error: err.message }; }
});


// ══════════════════════════════════════════════════════════
// IPC Handlers: Proveedores, Compras, Pagos, Cuenta Corriente
// ══════════════════════════════════════════════════════════

// ── Proveedores ───────────────────────────────────────────
ipcMain.handle('get-suppliers', async () => {
  try {
    return await supplierService.getSuppliers();
  } catch (err) {
    console.error('Error en get-suppliers:', err);
    return [];
  }
});

ipcMain.handle('add-supplier', (event, prov) => {
  try {
    return supplierService.addSupplier(prov);
  } catch (err) {
    console.error('Error en add-supplier:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('update-supplier', (event, prov) => {
  try {
    return supplierService.updateSupplier(prov);
  } catch (err) {
    console.error('Error en update-supplier:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('delete-supplier', (event, id) => {
  try {
    return supplierService.deleteSupplier(id);
  } catch (err) {
    console.error('Error en delete-supplier:', err);
    return { success: false, error: err.message };
  }
});

// ── Compras ───────────────────────────────────────────────
ipcMain.handle('get-purchases-supplier', (event, proveedorId) => {
  try {
    return supplierService.getPurchases(proveedorId);
  } catch (err) {
    console.error('Error en get-purchases-supplier:', err);
    return [];
  }
});

ipcMain.handle('add-purchase-supplier', (event, compra) => {
  try {
    return supplierService.addPurchase(compra);
  } catch (err) {
    console.error('Error en add-purchase-supplier:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('delete-purchase-supplier', (event, id) => {
  try {
    return supplierService.deletePurchase(id);
  } catch (err) {
    console.error('Error en delete-purchase-supplier:', err);
    return { success: false, error: err.message };
  }
});

// ── Pagos ─────────────────────────────────────────────────
ipcMain.handle('get-payments-supplier', (event, proveedorId) => {
  try {
    return supplierService.getPayments(proveedorId);
  } catch (err) {
    console.error('Error en get-payments-supplier:', err);
    return [];
  }
});

ipcMain.handle('add-payment-supplier', (event, pago) => {
  try {
    return supplierService.addPayment(pago);
  } catch (err) {
    console.error('Error en add-payment-supplier:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('delete-payment-supplier', (event, id) => {
  try {
    return supplierService.deletePayment(id);
  } catch (err) {
    console.error('Error en delete-payment-supplier:', err);
    return { success: false, error: err.message };
  }
});

// ── Cuenta Corriente ──────────────────────────────────────
ipcMain.handle('get-current-account', (event, proveedorId) => {
  try {
    return supplierService.getCurrentAccount(proveedorId);
  } catch (err) {
    console.error('Error en get-current-account:', err);
    return [];
  }
});

ipcMain.handle('add-account-movement', (event, mov) => {
  try {
    return supplierService.addAccountMovement(mov);
  } catch (err) {
    console.error('Error en add-account-movement:', err);
    return { success: false, error: err.message };
  }
});

// ── Estadísticas ──────────────────────────────────────────
ipcMain.handle('get-supplier-stats', () => {
  try {
    return supplierService.getSupplierStats();
  } catch (err) {
    console.error('Error en get-supplier-stats:', err);
    return {};
  }
});

// ── Vencimientos ──────────────────────────────────────────
ipcMain.handle('get-upcoming-due-dates', () => {
  try {
    return supplierService.getUpcomingDueDates();
  } catch (err) {
    console.error('Error en get-upcoming-due-dates:', err);
    return [];
  }
});

// ── Deudas Pendientes por Proveedor ────────────────────────
ipcMain.handle('get-pending-debts', (event, proveedorId) => {
  try {
    return supplierService.getPendingDebts(proveedorId);
  } catch (err) {
    console.error('Error en get-pending-debts:', err);
    return [];
  }
});


// ====================================================================
// MÓDULO MÁQUINAS
// ====================================================================

// ── Crear tablas ─────────────────────────────────────────────────────
db.prepare(`
  CREATE TABLE IF NOT EXISTS maquinas (
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
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS trabajos_maquinas (
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
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS combustible_maquinas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    maquina_id INTEGER NOT NULL,
    fecha TEXT NOT NULL,
    litros REAL DEFAULT 0,
    precio_litro REAL DEFAULT 0,
    total REAL DEFAULT 0,
    observaciones TEXT,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (maquina_id) REFERENCES maquinas(id) ON DELETE CASCADE
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS mantenimiento_maquinas (
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
  )
`).run();


// ── IPC: Máquinas CRUD ───────────────────────────────────────────────

ipcMain.handle('maq-get-all', () => {
  try { return machineService.getMachines(); }
  catch (err) { console.error(err); return []; }
});

ipcMain.handle('maq-add', (event, m) => {
  try { return machineService.addMachine(m); }
  catch (err) { console.error(err); return { success: false, error: err.message }; }
});

ipcMain.handle('maq-update', (event, m) => {
  try { return machineService.updateMachine(m); }
  catch (err) { console.error(err); return { success: false, error: err.message }; }
});

ipcMain.handle('maq-delete', (event, id) => {
  try { return machineService.deleteMachine(id); }
  catch (err) { console.error(err); return { success: false, error: err.message }; }
});


// ── IPC: Trabajos ────────────────────────────────────────────────────

ipcMain.handle('maq-get-trabajos', (event, maquinaId) => {
  try { return machineService.getWorkLogs({ maquina_id: maquinaId }); }
  catch (err) { console.error(err); return []; }
});

ipcMain.handle('maq-add-trabajo', (event, t) => {
  try { return machineService.addWorkLog(t); }
  catch (err) { console.error(err); return { success: false, error: err.message }; }
});

ipcMain.handle('maq-delete-trabajo', (event, id) => {
  try { return machineService.deleteWorkLog(id); }
  catch (err) { console.error(err); return { success: false, error: err.message }; }
});


// ── IPC: Combustible ─────────────────────────────────────────────────

ipcMain.handle('maq-get-combustible', (event, maquinaId) => {
  try { return machineService.getFuelLogs({ maquina_id: maquinaId }); }
  catch (err) { console.error(err); return []; }
});

ipcMain.handle('maq-add-combustible', (event, c) => {
  try { return machineService.addFuelLog(c); }
  catch (err) { console.error(err); return { success: false, error: err.message }; }
});

ipcMain.handle('maq-delete-combustible', (event, id) => {
  try { return machineService.deleteFuelLog(id); }
  catch (err) { console.error(err); return { success: false, error: err.message }; }
});


// ── IPC: Mantenimiento ───────────────────────────────────────────────

ipcMain.handle('maq-get-mantenimiento', (event, maquinaId) => {
  try { return machineService.getMaintenanceLogs({ maquina_id: maquinaId }); }
  catch (err) { console.error(err); return []; }
});

ipcMain.handle('maq-add-mantenimiento', (event, mt) => {
  try { return machineService.addMaintenanceLog(mt); }
  catch (err) { console.error(err); return { success: false, error: err.message }; }
});

ipcMain.handle('maq-delete-mantenimiento', (event, id) => {
  try { return machineService.deleteMaintenanceLog(id); }
  catch (err) { console.error(err); return { success: false, error: err.message }; }
});


// ── IPC: Estadísticas ────────────────────────────────────────────────

ipcMain.handle('maq-get-stats', () => {
  try { return machineService.getStats(); }
  catch (err) { console.error('Error maq-get-stats:', err); return {}; }
});


// ── IPC: Rentabilidad ────────────────────────────────────────────────



// ====================
// Módulo Municipio - IPC Handlers
// ====================
ipcMain.handle('muni-get-orders', () => {
  try {
    return municipioService.getOrders();
  } catch (err) {
    console.error('Error en muni-get-orders:', err);
    return [];
  }
});

ipcMain.handle('muni-add-order', (event, order) => {
  try {
    return municipioService.addOrder(order);
  } catch (err) {
    console.error('Error en muni-add-order:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('muni-get-payments', (event, ordenId) => {
  try {
    return municipioService.getPayments(ordenId);
  } catch (err) {
    console.error('Error en muni-get-payments:', err);
    return [];
  }
});

ipcMain.handle('muni-add-payment', (event, pago) => {
  try {
    return municipioService.addPayment(pago);
  } catch (err) {
    console.error('Error en muni-add-payment:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('muni-get-upcoming-collections', () => {
  try {
    return municipioService.getUpcomingCollections();
  } catch (err) {
    console.error('Error en muni-get-upcoming-collections:', err);
    return [];
  }
});

ipcMain.handle('muni-get-stats', () => {
  try {
    return municipioService.getStats();
  } catch (err) {
    console.error('Error en muni-get-stats:', err);
    return {
      totalVendido: 0,
      totalPendiente: 0,
      totalCobrado: 0,
      cantOrdenes: 0,
      cantPendientes: 0,
      cantCobradas: 0
    };
  }
});

ipcMain.handle('muni-delete-order', (event, id) => {
  try {
    return municipioService.deleteOrder(id);
  } catch (err) {
    console.error('Error en muni-delete-order:', err);
    return { success: false, error: err.message };
  }
});

// ====================
// Módulo Atmosférico - IPC Handlers
// ====================
ipcMain.handle('atmos-get-orders', () => {
  try {
    return db.prepare('SELECT * FROM atmos_ordenes ORDER BY fecha DESC, created_at DESC').all();
  } catch (err) {
    console.error('Error en atmos-get-orders:', err);
    return [];
  }
});

ipcMain.handle('atmos-add-order', (event, order) => {
  try {
    const info = db.prepare(`
      INSERT INTO atmos_ordenes (fecha, cliente, direccion, telefono, tipo_servicio, descripcion, monto, saldo_pendiente, estado, observaciones, fecha_estimada_cobro)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      order.fecha,
      order.cliente,
      order.direccion,
      order.telefono || null,
      order.tipo_servicio,
      order.descripcion || null,
      parseFloat(order.monto) || 0,
      parseFloat(order.monto) || 0,
      'Pendiente',
      order.observaciones || null,
      order.fecha_estimada_cobro
    );

    const orderId = info.lastInsertRowid;
    registrarAccion('Venta Atmosférico', `Servicio #${orderId} registrado para ${order.cliente} por $${order.monto}.`);

    const payload = { ...order, id: orderId, saldo_pendiente: parseFloat(order.monto) || 0, estado: 'Pendiente' };
    handleDualWrite(
      supabaseAtmosfericoService.addOrder(payload),
      'atmos_ordenes',
      'INSERT',
      payload
    );

    return { success: true, id: orderId };
  } catch (err) {
    console.error('Error en atmos-add-order:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('atmos-get-payments', (event, ordenId) => {
  try {
    return db.prepare('SELECT * FROM atmos_pagos WHERE orden_id = ? ORDER BY fecha DESC, created_at DESC').all(ordenId);
  } catch (err) {
    console.error('Error en atmos-get-payments:', err);
    return [];
  }
});

ipcMain.handle('atmos-add-payment', (event, pago) => {
  let paymentId = null;
  const transaction = db.transaction(() => {
    const orden = db.prepare('SELECT monto, saldo_pendiente FROM atmos_ordenes WHERE id = ?').get(pago.orden_id);
    if (!orden) {
      throw new Error('Servicio no encontrado');
    }

    const info = db.prepare(`
      INSERT INTO atmos_pagos (orden_id, fecha, monto, metodo_pago, observaciones)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      pago.orden_id,
      pago.fecha,
      parseFloat(pago.monto) || 0,
      pago.metodo_pago || 'Transferencia',
      pago.observaciones || null
    );

    paymentId = info.lastInsertRowid;

    const nuevoSaldo = Math.max(0, orden.saldo_pendiente - pago.monto);
    let nuevoEstado = 'Pendiente';
    if (nuevoSaldo === 0) {
      nuevoEstado = 'Cobrado';
    } else if (nuevoSaldo < orden.monto) {
      nuevoEstado = 'Pago parcial';
    }

    db.prepare(`
      UPDATE atmos_ordenes
      SET saldo_pendiente = ?, estado = ?
      WHERE id = ?
    `).run(nuevoSaldo, nuevoEstado, pago.orden_id);

    registrarAccion(
      'Cobro Atmosférico', 
      `Cobro de $${pago.monto} registrado para el Servicio Atmosférico #${pago.orden_id}. Saldo restante: $${nuevoSaldo}`
    );

    return { success: true, id: paymentId };
  });

  try {
    const res = transaction();
    if (res.success && paymentId) {
      const payload = { ...pago, id: paymentId };
      handleDualWrite(
        supabaseAtmosfericoService.addPayment(payload),
        'atmos_pagos',
        'INSERT',
        payload
      );
    }
    return res;
  } catch (err) {
    console.error('Error en atmos-add-payment:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('atmos-get-upcoming-collections', () => {
  try {
    return db.prepare("SELECT * FROM atmos_ordenes WHERE saldo_pendiente > 0 ORDER BY fecha_estimada_cobro ASC").all();
  } catch (err) {
    console.error('Error en atmos-get-upcoming-collections:', err);
    return [];
  }
});

ipcMain.handle('atmos-get-stats', () => {
  try {
    const totalVendido = db.prepare("SELECT COALESCE(SUM(monto), 0) as n FROM atmos_ordenes").get().n;
    const totalPendiente = db.prepare("SELECT COALESCE(SUM(saldo_pendiente), 0) as n FROM atmos_ordenes").get().n;
    const totalCobrado = totalVendido - totalPendiente;
    
    const cantOrdenes = db.prepare("SELECT COUNT(*) as n FROM atmos_ordenes").get().n;
    const cantPendientes = db.prepare("SELECT COUNT(*) as n FROM atmos_ordenes WHERE estado != 'Cobrado'").get().n;
    const cantCobradas = db.prepare("SELECT COUNT(*) as n FROM atmos_ordenes WHERE estado = 'Cobrado'").get().n;

    return {
      totalVendido,
      totalPendiente,
      totalCobrado,
      cantOrdenes,
      cantPendientes,
      cantCobradas
    };
  } catch (err) {
    console.error('Error en atmos-get-stats:', err);
    return {
      totalVendido: 0,
      totalPendiente: 0,
      totalCobrado: 0,
      cantOrdenes: 0,
      cantPendientes: 0,
      cantCobradas: 0
    };
  }
});

ipcMain.handle('atmos-delete-order', (event, id) => {
  try {
    db.prepare('DELETE FROM atmos_ordenes WHERE id = ?').run(id);
    registrarAccion('Eliminación Orden Atmosférico', `Servicio #${id} eliminado.`);

    handleDualWrite(
      supabaseAtmosfericoService.deleteOrder(id),
      'atmos_ordenes',
      'DELETE',
      { id }
    );

    return { success: true };
  } catch (err) {
    console.error('Error en atmos-delete-order:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('muni-get-month-breakdown', (event, { month, year }) => {
  if (!authService.isCurrentAdmin()) {
    return { success: false, error: 'Acceso denegado.' };
  }
  try {
    const yearMonth = `${year}-${String(month).padStart(2, '0')}`;
    const excludeAnnulledClause = "id NOT IN (SELECT venta_id FROM ajustes_caja WHERE venta_id IS NOT NULL AND tipo = 'Venta anulada')";

    const normal = db.prepare(`
      SELECT SUM(total) as total, COUNT(*) as cant 
      FROM tickets 
      WHERE strftime('%Y-%m', fecha) = ?
        AND (tipo IS NULL OR tipo = 'Venta')
        AND ${excludeAnnulledClause}
    `).get(yearMonth);

    const muni = db.prepare(`
      SELECT 
        SUM(total) as total, 
        COUNT(*) as cant,
        SUM(saldo_pendiente) as pendiente,
        SUM(CASE WHEN saldo_pendiente > 0 THEN 1 ELSE 0 END) as cant_pendientes,
        SUM(CASE WHEN saldo_pendiente = 0 THEN 1 ELSE 0 END) as cant_cobradas
      FROM municipio_ordenes 
      WHERE strftime('%Y-%m', fecha) = ?
    `).get(yearMonth);

    const atmos = db.prepare(`
      SELECT 
        SUM(monto) as total, 
        COUNT(*) as cant,
        SUM(saldo_pendiente) as pendiente,
        SUM(CASE WHEN saldo_pendiente > 0 THEN 1 ELSE 0 END) as cant_pendientes,
        SUM(CASE WHEN saldo_pendiente = 0 THEN 1 ELSE 0 END) as cant_cobradas
      FROM atmos_ordenes 
      WHERE strftime('%Y-%m', fecha) = ?
    `).get(yearMonth);

    const normalSales = normal?.total || 0;
    const normalCount = normal?.cant || 0;
    
    const muniSales = muni?.total || 0;
    const muniCount = muni?.cant || 0;
    const muniPendiente = muni?.pendiente || 0;
    const muniCountPendientes = muni?.cant_pendientes || 0;
    const muniCountCobradas = muni?.cant_cobradas || 0;

    const atmosSales = atmos?.total || 0;
    const atmosCount = atmos?.cant || 0;
    const atmosPendiente = atmos?.pendiente || 0;
    const atmosCountPendientes = atmos?.cant_pendientes || 0;
    const atmosCountCobradas = atmos?.cant_cobradas || 0;

    // Obtener total de ajustes del mes (excluyendo 'Venta anulada' para evitar doble resta)
    const aj = db.prepare(`
      SELECT SUM(monto) as total
      FROM ajustes_caja 
      WHERE strftime('%Y-%m', fecha) = ?
        AND (tipo IS NULL OR tipo != 'Venta anulada' OR venta_id IS NULL)
    `).get(yearMonth);
    const totalAjustes = aj?.total || 0;

    return {
      success: true,
      totalVentas: normalSales + muniSales + atmosSales + totalAjustes,
      dineroIngresado: normalSales + (muniSales - muniPendiente) + (atmosSales - atmosPendiente) + totalAjustes,
      pendienteMunicipio: muniPendiente,
      pendienteAtmosferico: atmosPendiente,
      ventasNormales: normalSales,
      cantidadVentas: normalCount,
      cantidadOrdenesMunicipio: muniCount,
      cantidadPendientes: muniCountPendientes,
      cantidadCobradas: muniCountCobradas,
      cantidadAtmosferico: atmosCount,
      cantidadAtmosfericoPendientes: atmosCountPendientes,
      cantidadAtmosfericoCobradas: atmosCountCobradas
    };
  } catch (err) {
    console.error(err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('muni-get-day-breakdown', (event, { day, month, year }) => {
  if (!authService.isCurrentAdmin()) {
    return { success: false, error: 'Acceso denegado.' };
  }
  try {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const excludeAnnulledClause = "id NOT IN (SELECT venta_id FROM ajustes_caja WHERE venta_id IS NOT NULL AND tipo = 'Venta anulada')";

    const normal = db.prepare(`
      SELECT SUM(total) as total, COUNT(*) as cant 
      FROM tickets 
      WHERE date(fecha) = ?
        AND (tipo IS NULL OR tipo = 'Venta')
        AND ${excludeAnnulledClause}
    `).get(dateStr);

    const muni = db.prepare(`
      SELECT 
        SUM(total) as total, 
        COUNT(*) as cant,
        SUM(saldo_pendiente) as pendiente,
        SUM(CASE WHEN saldo_pendiente > 0 THEN 1 ELSE 0 END) as cant_pendientes,
        SUM(CASE WHEN saldo_pendiente = 0 THEN 1 ELSE 0 END) as cant_cobradas
      FROM municipio_ordenes 
      WHERE date(fecha) = ?
    `).get(dateStr);

    const atmos = db.prepare(`
      SELECT 
        SUM(monto) as total, 
        COUNT(*) as cant,
        SUM(saldo_pendiente) as pendiente,
        SUM(CASE WHEN saldo_pendiente > 0 THEN 1 ELSE 0 END) as cant_pendientes,
        SUM(CASE WHEN saldo_pendiente = 0 THEN 1 ELSE 0 END) as cant_cobradas
      FROM atmos_ordenes 
      WHERE date(fecha) = ?
    `).get(dateStr);

    const normalSales = normal?.total || 0;
    const normalCount = normal?.cant || 0;
    
    const muniSales = muni?.total || 0;
    const muniCount = muni?.cant || 0;
    const muniPendiente = muni?.pendiente || 0;
    const muniCountPendientes = muni?.cant_pendientes || 0;
    const muniCountCobradas = muni?.cant_cobradas || 0;

    const atmosSales = atmos?.total || 0;
    const atmosCount = atmos?.cant || 0;
    const atmosPendiente = atmos?.pendiente || 0;
    const atmosCountPendientes = atmos?.cant_pendientes || 0;
    const atmosCountCobradas = atmos?.cant_cobradas || 0;

    // Obtener total de ajustes del día (excluyendo 'Venta anulada' para evitar doble resta)
    const aj = db.prepare(`
      SELECT SUM(monto) as total
      FROM ajustes_caja 
      WHERE date(fecha) = ?
        AND (tipo IS NULL OR tipo != 'Venta anulada' OR venta_id IS NULL)
    `).get(dateStr);
    const totalAjustes = aj?.total || 0;

    return {
      success: true,
      totalVentas: normalSales + muniSales + atmosSales + totalAjustes,
      dineroIngresado: normalSales + (muniSales - muniPendiente) + (atmosSales - atmosPendiente) + totalAjustes,
      pendienteMunicipio: muniPendiente,
      pendienteAtmosferico: atmosPendiente,
      ventasNormales: normalSales,
      cantidadVentas: normalCount,
      cantidadOrdenesMunicipio: muniCount,
      cantidadPendientes: muniCountPendientes,
      cantidadCobradas: muniCountCobradas,
      cantidadAtmosferico: atmosCount,
      cantidadAtmosfericoPendientes: atmosCountPendientes,
      cantidadAtmosfericoCobradas: atmosCountCobradas
    };
  } catch (err) {
    console.error(err);
    return { success: false, error: err.message };
  }
});




// ── IPC: Rentabilidad ────────────────────────────────────────────────

ipcMain.handle('maq-get-rentabilidad', () => {
  try {
    const list = machineService.getRentabilidad();
    return list.map(r => ({ ...r, gastos: r.gasto_combustible + r.gasto_mantenimiento, ganancia: r.ingresos - r.gasto_combustible - r.gasto_mantenimiento }));
  } catch (err) { console.error('Error maq-get-rentabilidad:', err); return []; }
});


// =====================================================================
// MÓDULO LIQUIDACIÓN DE EMPLEADOS - IPC Handlers
// =====================================================================

ipcMain.handle('emp-liq-get-employees', (event, mes) => {
  if (!authService.isCurrentAdmin()) return [];
  try { return employeeService.getPayrollEmployees(mes); }
  catch (err) { console.error('Error en emp-liq-get-employees:', err); return []; }
});

ipcMain.handle('emp-liq-save-config', (event, config) => {
  if (!authService.isCurrentAdmin()) return { success: false, error: 'Acceso denegado.' };
  try { return employeeService.savePayrollConfig(config); }
  catch (err) { console.error('Error en emp-liq-save-config:', err); return { success: false, error: err.message }; }
});

ipcMain.handle('emp-liq-save-liquidation', (event, liq) => {
  if (!authService.isCurrentAdmin()) return { success: false, error: 'Acceso denegado.' };
  try { return employeeService.savePayroll(liq); }
  catch (err) { console.error('Error en emp-liq-save-liquidation:', err); return { success: false, error: err.message }; }
});

ipcMain.handle('emp-liq-get-stats', (event, mes) => {
  if (!authService.isCurrentAdmin()) {
    return { totalSueldos: 0, totalGenerado: 0, masRentable: 'Sin datos', masHoras: 'Sin datos', chartData: [] };
  }
  try {
    const saved = db.prepare(`
      SELECT l.*, e.nombre, e.apellido, c.costo_mensual
      FROM empleado_liquidaciones l
      JOIN empleados e ON l.empleado_id = e.id
      LEFT JOIN empleado_liquidacion_config c ON l.empleado_id = c.empleado_id
      WHERE l.mes = ?
    `).all(mes);

    if (saved.length === 0) {
      return {
        totalSueldos: 0,
        totalGenerado: 0,
        masRentable: 'Sin datos',
        masHoras: 'Sin datos',
        chartData: []
      };
    }

    let totalSueldos = 0;
    let totalGenerado = 0;
    let maxGanancia = -Infinity;
    let maxHoras = -1;
    let masRentable = 'Sin datos';
    let masHorasEmp = 'Sin datos';

    const chartData = [];

    for (const s of saved) {
      totalSueldos += s.total_liquidacion;
      totalGenerado += s.total_generado;

      const costo = (s.costo_mensual !== null) ? s.costo_mensual : s.total_liquidacion;
      const ganancia = s.total_generado - costo;

      const fullName = `${s.apellido}, ${s.nombre}`;

      if (ganancia > maxGanancia) {
        maxGanancia = ganancia;
        masRentable = fullName;
      }

      if (s.horas_trabajadas > maxHoras) {
        maxHoras = s.horas_trabajadas;
        masHorasEmp = fullName;
      }

      chartData.push({
        nombre: fullName,
        generado: s.total_generado,
        costo: costo
      });
    }

    return {
      totalSueldos,
      totalGenerado,
      masRentable,
      masHoras: masHorasEmp,
      chartData
    };
  } catch (err) {
    console.error('Error en emp-liq-get-stats:', err);
    return {
      totalSueldos: 0,
      totalGenerado: 0,
      masRentable: 'Sin datos',
      masHoras: 'Sin datos',
      chartData: []
    };
  }
});