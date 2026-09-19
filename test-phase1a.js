// test-phase1a.js
// Unit tests for SyncManager Phase 1A: Dependency barriers and PARTIAL_ERROR status handling.

'use strict';

const Database = require('better-sqlite3');
const createSyncStatus = require('./services/syncStatus');
const SyncManager = require('./services/syncManager');
const assert = require('assert');

function setupTestDb() {
  const db = new Database(':memory:');
  db.prepare(`
    CREATE TABLE IF NOT EXISTS productos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      codigo TEXT,
      nombre TEXT
    )
  `).run();
  db.prepare(`
    CREATE TABLE IF NOT EXISTS empleados (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dni TEXT UNIQUE
    )
  `).run();
  db.prepare(`
    CREATE TABLE IF NOT EXISTS asistencias (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      empleado_id INTEGER
    )
  `).run();
  return db;
}

async function runTests() {
  console.log('🧪 Running SyncManager Phase 1A Unit Tests...\n');

  // Preserve original service methods
  const supabaseEmp = require('./services/supabaseEmployeeService');
  const supabaseProd = require('./services/supabaseProductService');
  const origGetEmployees = supabaseEmp.getAllEmployees;
  const origGetAttendances = supabaseEmp.getAllAttendances;
  const origGetPayrollConfigs = supabaseEmp.getAllPayrollConfigs;
  const origGetPayrolls = supabaseEmp.getAllPayrolls;
  const origGetProducts = supabaseProd.getProducts;

  // Mock all other Supabase services to return empty arrays so they don't throw SQL errors on missing memory tables
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

  // 1. Test A & E: Full success -> status is ONLINE, asistencias executed, result success = true
  {
    console.log('Test 1: Full success -> asistencias executed, status ONLINE');
    const db = setupTestDb();
    const syncStatus = createSyncStatus(db);
    const syncManager = new SyncManager(db, syncStatus, null);

    let empleadosExecuted = false;
    let asistenciasExecuted = false;
    let productosExecuted = false;

    syncManager.employeeService = {
      upsertEmployee: (emp) => { empleadosExecuted = true; },
      upsertAttendance: (att) => { asistenciasExecuted = true; }
    };
    syncManager.productService = {
      upsertProduct: (p) => { productosExecuted = true; }
    };

    supabaseEmp.getAllEmployees = async () => [{ id: 1, dni: '100' }];
    supabaseEmp.getAllAttendances = async () => [{ id: 1, empleado_id: 1 }];
    supabaseEmp.getAllPayrollConfigs = async () => [];
    supabaseEmp.getAllPayrolls = async () => [];
    supabaseProd.getProducts = async () => [{ id: 1, nombre: 'P1' }];

    try {
      const res = await syncManager.pullChanges();
      assert.strictEqual(res.success, true, 'Result should be success = true');
      assert.strictEqual(syncStatus.getStatus().status, 'ONLINE', 'Status should be ONLINE');
      assert.strictEqual(empleadosExecuted, true, 'Empleados should be executed');
      assert.strictEqual(asistenciasExecuted, true, 'Asistencias should be executed');
      assert.strictEqual(productosExecuted, true, 'Productos should be executed');
      console.log('  PASSED: Full success behavior preserved.\n');
    } finally {
      db.close();
    }
  }

  // 2. Test B, C, D: Empleados failure -> asistencias skipped, independent entities (productos) continue, status PARTIAL_ERROR
  {
    console.log('Test 2: Empleados failure -> asistencias skipped, productos continues, status PARTIAL_ERROR');
    const db = setupTestDb();
    const syncStatus = createSyncStatus(db);
    const syncManager = new SyncManager(db, syncStatus, null);

    let asistenciasExecuted = false;
    let productosExecuted = false;

    syncManager.employeeService = {
      upsertEmployee: (emp) => {
        throw new Error('UNIQUE constraint failed: empleados.dni');
      },
      upsertAttendance: (att) => { asistenciasExecuted = true; }
    };
    syncManager.productService = {
      upsertProduct: (p) => { productosExecuted = true; }
    };

    supabaseEmp.getAllEmployees = async () => [{ id: 1, dni: '100' }];
    supabaseEmp.getAllAttendances = async () => [{ id: 1, empleado_id: 1 }];
    supabaseEmp.getAllPayrollConfigs = async () => [];
    supabaseEmp.getAllPayrolls = async () => [];
    supabaseProd.getProducts = async () => [{ id: 1, nombre: 'P1' }];

    try {
      const res = await syncManager.pullChanges();
      assert.strictEqual(res.success, false, 'Result success should be false on partial error');
      assert.strictEqual(res.partial, true, 'Result partial should be true');
      assert.strictEqual(syncStatus.getStatus().status, 'PARTIAL_ERROR', 'Status should be PARTIAL_ERROR');
      assert.ok(res.failedEntities.includes('empleados'), 'failedEntities should contain empleados');
      assert.ok(res.skippedEntities.some(s => s.entity === 'asistencias'), 'skippedEntities should contain asistencias');
      assert.strictEqual(asistenciasExecuted, false, 'Asistencias should be SKIPPED due to dependency barrier');
      assert.strictEqual(productosExecuted, true, 'Independent entity productos should STILL continue and execute');
      console.log('  PASSED: Dependency barrier and PARTIAL_ERROR verified.\n');
    } finally {
      db.close();
    }
  }

  // Restore original functions
  supabaseEmp.getAllEmployees = origGetEmployees;
  supabaseEmp.getAllAttendances = origGetAttendances;
  supabaseEmp.getAllPayrollConfigs = origGetPayrollConfigs;
  supabaseEmp.getAllPayrolls = origGetPayrolls;
  supabaseProd.getProducts = origGetProducts;

  console.log('🎉 ALL PHASE 1A UNIT TESTS PASSED SUCCESSFULLY!');
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
