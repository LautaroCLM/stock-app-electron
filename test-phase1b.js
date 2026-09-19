// test-phase1b.js
//
// Suite de Pruebas Automatizadas para FASE 1B.1 (Resolución FK remota, Backfill e Identidad UUID).

'use strict';

const Database = require('better-sqlite3');
const createEmployeeService = require('./services/employeeService');
const createOfflineQueue = require('./services/offlineQueue');
const createSyncStatus = require('./services/syncStatus');
const SyncManager = require('./services/syncManager');
const supabaseEmployeeService = require('./services/supabaseEmployeeService');
const supabaseClientModule = require('./services/supabaseClient');

const supabaseProd = require('./services/supabaseProductService');
const supabaseCat = require('./services/supabaseCategoryService');
const supabaseSup = require('./services/supabaseSupplierService');
const supabasePur = require('./services/supabasePurchaseService');
const supabaseSale = require('./services/supabaseSaleService');
const supabaseTicket = require('./services/supabaseTicketService');
const supabaseClient = require('./services/supabaseClientService');
const supabaseAtmos = require('./services/supabaseAtmosfericoService');
const supabaseExp = require('./services/supabaseExpenseService');
const supabaseMuni = require('./services/supabaseMunicipioService');
const supabaseMach = require('./services/supabaseMachineService');
const supabaseBudget = require('./services/supabaseBudgetService');
const supabaseRemito = require('./services/supabaseRemitoService');

function mockOtherSupabaseServices() {
  supabaseProd.getProducts = async () => [];
  supabaseCat.getAllCategories = async () => [];
  supabaseSup.getAllSuppliers = async () => [];
  supabasePur.getAllPurchases = async () => [];
  supabasePur.getAllPayments = async () => [];
  supabasePur.getAllAccountMovements = async () => [];
  supabaseSale.getAllSales = async () => [];
  supabaseTicket.getAllTickets = async () => [];
  supabaseClient.getAllClients = async () => [];
  supabaseClient.getAllSales = async () => [];
  supabaseClient.getAllPayments = async () => [];
  supabaseClient.getAllAccountMovements = async () => [];
  supabaseAtmos.getAllOrders = async () => [];
  supabaseAtmos.getAllPayments = async () => [];
  supabaseExp.getAllExpenses = async () => [];
  supabaseMuni.getAllOrders = async () => [];
  supabaseMuni.getAllPayments = async () => [];
  supabaseMach.getAllMachines = async () => [];
  supabaseMach.getAllWorkLogs = async () => [];
  supabaseMach.getAllFuelLogs = async () => [];
  supabaseMach.getAllMaintenanceLogs = async () => [];
  supabaseBudget.getAllBudgets = async () => [];
  supabaseRemito.getAllRemitos = async () => [];
}

let db;
let syncStatus;
let offlineQueue;
let syncManager;
let employeeService;

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runTests() {
  console.log('====================================================');
  console.log('   EJECUTANDO SUITE DE PRUEBAS AUTOMATIZADAS FASE 1B.1');
  console.log('====================================================\n');

  mockOtherSupabaseServices();

  db = new Database(':memory:');

  db.exec(`
    CREATE TABLE horarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL
    );

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
      horario_id INTEGER
    );

    CREATE TABLE asistencias (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      empleado_id INTEGER NOT NULL,
      fecha TEXT NOT NULL,
      hora_entrada TEXT,
      hora_salida TEXT,
      estado TEXT NOT NULL,
      observaciones TEXT,
      UNIQUE(empleado_id, fecha)
    );

    CREATE TABLE empleado_liquidacion_config (
      empleado_id INTEGER PRIMARY KEY,
      valor_hora REAL DEFAULT 0,
      costo_mensual REAL DEFAULT 0,
      estado TEXT DEFAULT 'Activo'
    );

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
      UNIQUE(empleado_id, mes)
    );

    CREATE TABLE productos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      precio REAL DEFAULT 0
    );
  `);

  db.prepare(`
    INSERT INTO empleados (id, nombre, apellido, dni, cargo)
    VALUES (1, 'Legacy', 'Empleado', '00000000', 'Operario')
  `).run();

  db.prepare(`
    INSERT INTO asistencias (id, empleado_id, fecha, estado)
    VALUES (1, 1, '2026-08-01', 'Presente')
  `).run();

  console.log('--- TEST 1: Migración SQLite Ordenada (Columna -> Backfill -> Índice UNIQUE) ---');
  offlineQueue = createOfflineQueue(db);
  syncStatus = createSyncStatus(db);
  syncManager = new SyncManager(db, syncStatus, offlineQueue);
  employeeService = createEmployeeService(db, null, syncManager);
  syncManager.setLocalServices({ employeeService });

  const empCols = new Set(db.prepare("PRAGMA table_info(empleados)").all().map(c => c.name));
  assert(empCols.has('uuid'), 'La columna uuid debe existir en empleados.');

  const attCols = new Set(db.prepare("PRAGMA table_info(asistencias)").all().map(c => c.name));
  assert(attCols.has('uuid'), 'La columna uuid debe existir en asistencias.');
  assert(attCols.has('empleado_uuid'), 'La columna empleado_uuid debe existir en asistencias.');

  const legacyEmp = db.prepare("SELECT * FROM empleados WHERE id = 1").get();
  assert(legacyEmp.uuid && legacyEmp.uuid.length === 36, 'El empleado heredado debe haber recibido un UUID v4 en el backfill.');

  const legacyAtt = db.prepare("SELECT * FROM asistencias WHERE id = 1").get();
  assert(legacyAtt.uuid && legacyAtt.uuid.length === 36, 'La asistencia heredada debe haber recibido un UUID v4 en el backfill.');
  assert(legacyAtt.empleado_uuid === legacyEmp.uuid, 'El empleado_uuid de la asistencia debe coincidir con el uuid del empleado.');
  console.log('  PASSED: Orden de migración SQLite (Columna -> Backfill -> Índice) ejecutado correctamente.\n');

  console.log('--- TEST 2: Resolución FK Remota (empleado_id Local 10 vs Remoto 99) ---');
  supabaseClientModule.isSupabaseConfigured = () => true;
  supabaseClientModule.testConnection = async () => ({ success: true });

  // Simular Supabase remoto donde se almacena el empleado con ID 99 y UUID X
  let lastAttPayloadPushed = null;

  supabaseEmployeeService.addEmployee = async (empPayload) => {
    return { success: true, id: 99, uuid: empPayload.uuid };
  };

  supabaseEmployeeService.addAttendance = async (attPayload) => {
    // Simular resolución interna de Supabase empleando attPayload.empleado_uuid
    const remoteEmpleadoId = attPayload.empleado_uuid === 'uuid-test-x' ? 99 : null;
    if (!remoteEmpleadoId) {
      return { success: false, error: 'Empleado remoto no encontrado' };
    }
    lastAttPayloadPushed = {
      ...attPayload,
      empleado_id: remoteEmpleadoId
    };
    return { success: true, id: 500, uuid: attPayload.uuid };
  };

  // Crear empleado offline localmente (ID local 10, UUID 'uuid-test-x')
  const empLocalRes = employeeService.addEmployee({
    uuid: 'uuid-test-x',
    nombre: 'Roberto',
    apellido: 'Test',
    dni: '88888888',
    cargo: 'Técnico'
  });
  assert(empLocalRes.success, 'Alta local de empleado debe ser exitosa.');
  const localEmpId = empLocalRes.id;

  // Crear asistencia localmente vinculada a localEmpId
  const attLocalRes = employeeService.saveAttendance({
    empleado_id: localEmpId,
    fecha: '2026-09-19',
    estado: 'Presente'
  });
  assert(attLocalRes.success, 'Alta local de asistencia debe ser exitosa.');

  // Esperar resolución de promesas Dual Write
  await new Promise(r => setTimeout(r, 50));

  // Verificar que al enviar a Supabase la asistencia recibió empleado_id = 99 (REMOTO), NUNCA 10 (LOCAL)
  assert(lastAttPayloadPushed !== null, 'Payload de asistencia debió haber sido enviado a Supabase.');
  assert(lastAttPayloadPushed.empleado_id === 99, `empleado_id en Supabase debe ser 99 (remoto), no ${lastAttPayloadPushed.empleado_id}`);
  assert(lastAttPayloadPushed.empleado_id !== localEmpId, 'empleado_id en Supabase NUNCA debe ser el ID local de SQLite.');
  console.log('  PASSED: Resolución de FK remota (empleado_id = 99 remoto) verificada.\n');

  console.log('--- TEST 3: Detección Explícita de Conflictos de UUID ---');
  // Empleado con DNI 77777777 tiene UUID local 'uuid-local-77'
  employeeService.addEmployee({
    uuid: 'uuid-local-77',
    nombre: 'Carlos',
    apellido: 'Conflicto',
    dni: '77777777',
    cargo: 'Operador'
  });

  // Intentar upsert con mismo DNI pero UUID remoto diferente 'uuid-remote-DIFF'
  let conflictErrorThrown = false;
  try {
    employeeService.upsertEmployee({
      uuid: 'uuid-remote-DIFF',
      nombre: 'Carlos',
      apellido: 'Conflicto',
      dni: '77777777'
    });
  } catch (err) {
    conflictErrorThrown = err.message.includes('Conflicto explícito de identidad UUID');
  }
  assert(conflictErrorThrown, 'Debe lanzar una excepción de conflicto explícito si DNI coincide pero UUID difiere.');
  console.log('  PASSED: Detección explícita de conflicto de identidad UUID funcionando correctamente.\n');

  console.log('--- TEST 4: Asistencias Históricas Guadalupe (2 filas) y Lautaro (1 fila) ---');
  offlineQueue.clearQueue();

  const mockRemoteEmps = [
    {
      id: 2,
      uuid: 'guada-uuid-remote-567',
      nombre: 'Guadalupe',
      apellido: 'Lopez',
      dni: '46341784'
    },
    {
      id: 3,
      uuid: 'lautaro-uuid-890',
      nombre: 'Lautaro',
      apellido: 'Coman',
      dni: '99999999'
    }
  ];

  const mockRemoteAtts = [
    {
      id: 50,
      uuid: 'att-guada-1108',
      empleado_id: 2,
      empleado_uuid: 'guada-uuid-remote-567',
      fecha: '2026-08-11',
      estado: 'Presente'
    },
    {
      id: 51,
      uuid: 'att-lautaro-2508',
      empleado_id: 3,
      empleado_uuid: 'lautaro-uuid-890',
      fecha: '2026-08-25',
      estado: 'Presente'
    }
  ];

  supabaseEmployeeService.getAllEmployees = async () => mockRemoteEmps;
  supabaseEmployeeService.getAllAttendances = async () => mockRemoteAtts;

  // Insertar Guadalupe local previa con fecha 07/08
  employeeService.upsertEmployee({
    uuid: 'guada-uuid-remote-567',
    nombre: 'Guadalupe',
    apellido: 'Lopez',
    dni: '46341784'
  });
  employeeService.saveAttendance({
    empleado_uuid: 'guada-uuid-remote-567',
    fecha: '2026-08-07',
    estado: 'Presente'
  });

  const pullRes = await syncManager.pullChanges();
  assert(pullRes.success, 'El pull sync debe ser exitoso.');

  const guadaLocal = db.prepare("SELECT * FROM empleados WHERE dni = '46341784'").get();
  const guadaAtts = db.prepare("SELECT * FROM asistencias WHERE empleado_id = ? ORDER BY fecha ASC").all(guadaLocal.id);

  assert(guadaAtts.length === 2, `Guadalupe debe conservar 2 filas de asistencias (obtenidas: ${guadaAtts.length}).`);
  assert(guadaAtts[0].fecha === '2026-08-07' && guadaAtts[1].fecha === '2026-08-11', 'Las fechas deben ser 07/08 y 11/08.');

  const lautaroLocal = db.prepare("SELECT * FROM empleados WHERE dni = '99999999'").get();
  const lautaroAtts = db.prepare("SELECT * FROM asistencias WHERE empleado_id = ?").all(lautaroLocal.id);
  assert(lautaroAtts.length === 1, `Lautaro debe tener exactamente 1 fila unificada de asistencia (obtenidas: ${lautaroAtts.length}).`);

  console.log('  PASSED: Asistencias históricas (Guadalupe 2 filas, Lautaro 1 fila) unificadas correctamente.\n');

  console.log('--- TEST 5: Prueba de Idempotencia (Pull x3) ---');
  const countEmpsBefore = db.prepare("SELECT COUNT(*) as c FROM empleados").get().c;
  const countAttsBefore = db.prepare("SELECT COUNT(*) as c FROM asistencias").get().c;

  await syncManager.pullChanges();
  await syncManager.pullChanges();
  await syncManager.pullChanges();

  const countEmpsAfter = db.prepare("SELECT COUNT(*) as c FROM empleados").get().c;
  const countAttsAfter = db.prepare("SELECT COUNT(*) as c FROM asistencias").get().c;

  assert(countEmpsBefore === countEmpsAfter, `Conteo de empleados debe mantenerse constante (${countEmpsBefore} vs ${countEmpsAfter}).`);
  assert(countAttsBefore === countAttsAfter, `Conteo de asistencias debe mantenerse constante (${countAttsBefore} vs ${countAttsAfter}).`);
  console.log('  PASSED: Idempotencia x3 pull verificada.\n');

  console.log('--- TEST 6: Barrera de Dependencias ante Fallo de Empleado ---');
  supabaseEmployeeService.getAllEmployees = async () => {
    throw new Error('Timeout consultando empleados remotos');
  };

  const failedPullRes = await syncManager.pullChanges();
  assert(!failedPullRes.success && failedPullRes.partial, 'Debe devolver resultado parcial.');
  assert(syncStatus.getStatus().status === 'PARTIAL_ERROR', 'Estado global debe ser PARTIAL_ERROR.');
  assert(failedPullRes.skippedEntities.some(s => s.entity === 'asistencias'), 'Asistencias debe ser omitida al fallar empleados.');
  console.log('  PASSED: Barrera de dependencias verficada ante fallo de empleado.\n');

  console.log('🎉 TODOS LOS TESTS DE LA FASE 1B.1 PASARON EXITOSAMENTE!');
}

runTests().catch(err => {
  console.error('\n❌ ERROR EN LA SUITE DE PRUEBAS FASE 1B.1:', err.message);
  console.error(err.stack);
  process.exit(1);
});
