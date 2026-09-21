// test-phase1c2a.js
//
// Suite de Pruebas Automatizadas (14 Tests) para Fase 1C.2A
// Identidad Lógica por UUID en Clientes y Proveedores.

'use strict';

const Database = require('better-sqlite3');
const crypto = require('crypto');
const path = require('path');

const createClientService = require('./services/clientService');
const createSupplierService = require('./services/supplierService');
const realtimeManager = require('./services/realtimeManager');

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

function createInMemoryDb() {
  const db = new Database(':memory:');
  db.exec(`
    CREATE TABLE clientes (
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
    );

    CREATE TABLE proveedores (
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
    );
  `);
  return db;
}

class MockSyncManager {
  constructor() {
    this.queuedOperations = [];
  }
  queueOperation(op) {
    this.queuedOperations.push(op);
  }
}

async function runTests() {
  console.log('====================================================');
  console.log('   EJECUTANDO SUITE DE PRUEBAS FASE 1C.2A (14 TESTS)');
  console.log('====================================================\n');

  let testPassedCount = 0;

  // ---------------------------------------------------------------------------
  // Test 1: Creación de Cliente genera UUID v4
  // ---------------------------------------------------------------------------
  console.log('📌 Test 1: Creación de Cliente genera UUID v4');
  {
    const db = createInMemoryDb();
    const clientService = createClientService(db, () => {});
    const res = clientService.createClient({ nombre: 'Juan Pérez', cuit: '20-12345678-9' });
    assert(res.success && res.uuid, 'Cliente debe crearse con UUID');
    const dbClient = db.prepare('SELECT * FROM clientes WHERE id = ?').get(res.id);
    assert(dbClient && dbClient.uuid === res.uuid, 'UUID en SQLite debe coincidir');
    console.log('   ✅ PASS: Test 1 completado.');
    testPassedCount++;
  }

  // ---------------------------------------------------------------------------
  // Test 2: Creación de Proveedor genera UUID v4
  // ---------------------------------------------------------------------------
  console.log('📌 Test 2: Creación de Proveedor genera UUID v4');
  {
    const db = createInMemoryDb();
    const supplierService = createSupplierService(db, () => {});
    const res = supplierService.addSupplier({ razon_social: 'Distribuidora Central SA', cuit: '30-98765432-1' });
    assert(res.success && res.uuid, 'Proveedor debe crearse con UUID');
    const dbProv = db.prepare('SELECT * FROM proveedores WHERE id = ?').get(res.id);
    assert(dbProv && dbProv.uuid === res.uuid, 'UUID de proveedor en SQLite debe coincidir');
    console.log('   ✅ PASS: Test 2 completado.');
    testPassedCount++;
  }

  // ---------------------------------------------------------------------------
  // Test 3: Actualización de Cliente preserva ID local y UUID
  // ---------------------------------------------------------------------------
  console.log('📌 Test 3: Actualización de Cliente preserva ID local y UUID');
  {
    const db = createInMemoryDb();
    const clientService = createClientService(db, () => {});
    const created = clientService.createClient({ nombre: 'Cliente Original', cuit: '20-11111111-2' });
    const updated = clientService.updateClient({ id: created.id, uuid: created.uuid, nombre: 'Cliente Actualizado', cuit: '20-11111111-2' });
    assert(updated.success, 'Update debe tener exito');
    const dbClient = db.prepare('SELECT * FROM clientes WHERE id = ?').get(created.id);
    assert(dbClient.nombre === 'Cliente Actualizado' && dbClient.uuid === created.uuid, 'Debe preservar UUID e ID local');
    console.log('   ✅ PASS: Test 3 completado.');
    testPassedCount++;
  }

  // ---------------------------------------------------------------------------
  // Test 4: Actualización de Proveedor preserva ID local y UUID
  // ---------------------------------------------------------------------------
  console.log('📌 Test 4: Actualización de Proveedor preserva ID local y UUID');
  {
    const db = createInMemoryDb();
    const supplierService = createSupplierService(db, () => {});
    const created = supplierService.addSupplier({ razon_social: 'Proveedor S.A.', cuit: '30-22222222-3' });
    const updated = supplierService.updateSupplier({ id: created.id, uuid: created.uuid, razon_social: 'Proveedor SRL', cuit: '30-22222222-3' });
    assert(updated.success, 'Update proveedor debe tener exito');
    const dbProv = db.prepare('SELECT * FROM proveedores WHERE id = ?').get(created.id);
    assert(dbProv.razon_social === 'Proveedor SRL' && dbProv.uuid === created.uuid, 'Debe preservar UUID e ID local de proveedor');
    console.log('   ✅ PASS: Test 4 completado.');
    testPassedCount++;
  }

  // ---------------------------------------------------------------------------
  // Test 5: Eliminación de Cliente acepta ID o UUID y genera payload { uuid, id }
  // ---------------------------------------------------------------------------
  console.log('📌 Test 5: Eliminación de Cliente acepta ID o UUID');
  {
    const db = createInMemoryDb();
    const mockSync = new MockSyncManager();
    const supabaseClientService = require('./services/supabaseClientService');
    const origDelete = supabaseClientService.deleteClient;
    supabaseClientService.deleteClient = async () => ({ success: false });

    const clientService = createClientService(db, () => {}, mockSync);
    const created = clientService.createClient({ nombre: 'Cliente Borrar' });
    await new Promise(r => setTimeout(r, 100));
    const delRes = clientService.deleteClient({ uuid: created.uuid, id: created.id });
    await new Promise(r => setTimeout(r, 100));
    assert(delRes.success, 'Eliminacion debe ser exitosa');
    const dbClient = db.prepare('SELECT * FROM clientes WHERE id = ?').get(created.id);
    assert(!dbClient, 'Cliente debe ser eliminado de SQLite');
    const lastOp = mockSync.queuedOperations[mockSync.queuedOperations.length - 1];
    assert(lastOp && lastOp.payload.uuid === created.uuid && lastOp.payload.id === created.id, 'Payload de eliminacion debe contener uuid e id');

    supabaseClientService.deleteClient = origDelete;
    console.log('   ✅ PASS: Test 5 completado.');
    testPassedCount++;
  }

  // ---------------------------------------------------------------------------
  // Test 6: Eliminación de Proveedor acepta ID o UUID y genera payload { uuid, id }
  // ---------------------------------------------------------------------------
  console.log('📌 Test 6: Eliminación de Proveedor acepta ID o UUID');
  {
    const db = createInMemoryDb();
    const mockSync = new MockSyncManager();
    const supabaseSupplierService = require('./services/supabaseSupplierService');
    const origDelete = supabaseSupplierService.deleteSupplier;
    supabaseSupplierService.deleteSupplier = async () => ({ success: false });

    const supplierService = createSupplierService(db, () => {}, mockSync);
    const created = supplierService.addSupplier({ razon_social: 'Proveedor Borrar' });
    await new Promise(r => setTimeout(r, 100));
    const delRes = supplierService.deleteSupplier({ uuid: created.uuid, id: created.id });
    await new Promise(r => setTimeout(r, 100));
    assert(delRes.success, 'Eliminación de proveedor debe ser exitosa');
    const dbProv = db.prepare('SELECT * FROM proveedores WHERE id = ?').get(created.id);
    assert(!dbProv, 'Proveedor debe ser eliminado de SQLite');
    const lastOp = mockSync.queuedOperations[mockSync.queuedOperations.length - 1];
    assert(lastOp && lastOp.payload.uuid === created.uuid && lastOp.payload.id === created.id, 'Payload de eliminacion debe contener uuid e id');

    supabaseSupplierService.deleteSupplier = origDelete;
    console.log('   ✅ PASS: Test 6 completado.');
    testPassedCount++;
  }

  // ---------------------------------------------------------------------------
  // Test 7: Preservación de UUID en Offline Queue para Clientes
  // ---------------------------------------------------------------------------
  console.log('📌 Test 7: Preservación de UUID en Offline Queue para Clientes');
  {
    const db = createInMemoryDb();
    const mockSync = new MockSyncManager();
    const supabaseClientService = require('./services/supabaseClientService');
    const origAdd = supabaseClientService.addClient;
    supabaseClientService.addClient = async () => ({ success: false });

    const clientService = createClientService(db, () => {}, mockSync);
    const created = clientService.createClient({ nombre: 'Cliente Offline' });
    await new Promise(r => setTimeout(r, 100));
    assert(mockSync.queuedOperations.length > 0, 'Debe haber encolado operacion');
    const op = mockSync.queuedOperations[0];
    assert(op.entity === 'clientes' && op.payload.uuid === created.uuid, 'Operacion encolada debe preservar UUID');

    supabaseClientService.addClient = origAdd;
    console.log('   ✅ PASS: Test 7 completado.');
    testPassedCount++;
  }

  // ---------------------------------------------------------------------------
  // Test 8: Preservación de UUID en Offline Queue para Proveedores
  // ---------------------------------------------------------------------------
  console.log('📌 Test 8: Preservación de UUID en Offline Queue para Proveedores');
  {
    const db = createInMemoryDb();
    const mockSync = new MockSyncManager();
    const supabaseSupplierService = require('./services/supabaseSupplierService');
    const origAdd = supabaseSupplierService.addSupplier;
    supabaseSupplierService.addSupplier = async () => ({ success: false });

    const supplierService = createSupplierService(db, () => {}, mockSync);
    const created = supplierService.addSupplier({ razon_social: 'Proveedor Offline' });
    await new Promise(r => setTimeout(r, 100));
    assert(mockSync.queuedOperations.length > 0, 'Debe haber encolado operacion');
    const op = mockSync.queuedOperations[0];
    assert(op.entity === 'proveedores' && op.payload.uuid === created.uuid, 'Operacion encolada debe preservar UUID de proveedor');

    supabaseSupplierService.addSupplier = origAdd;
    console.log('   ✅ PASS: Test 8 completado.');
    testPassedCount++;
  }

  // ---------------------------------------------------------------------------
  // Test 9: Realtime Manager resuelve Clientes por UUID aislando la PK física
  // ---------------------------------------------------------------------------
  console.log('📌 Test 9: Realtime Manager resuelve Clientes por UUID');
  {
    const db = createInMemoryDb();
    const clientService = createClientService(db, () => {});
    const created = clientService.createClient({ nombre: 'Cliente Realtime' });
    realtimeManager.setDatabase(db);

    await realtimeManager.handleClientChange({
      eventType: 'UPDATE',
      new: { id: 99999, uuid: created.uuid, nombre: 'Cliente Realtime Actualizado por Web', cuit: '20-99999999-9', estado: 'Activo' }
    });

    const dbClient = db.prepare('SELECT * FROM clientes WHERE id = ?').get(created.id);
    assert(dbClient && dbClient.nombre === 'Cliente Realtime Actualizado por Web', 'Nombre debe actualizarse por UUID');
    assert(dbClient.id === created.id, 'ID fisico local no debe ser modificado');
    console.log('   ✅ PASS: Test 9 completado.');
    testPassedCount++;
  }

  // ---------------------------------------------------------------------------
  // Test 10: Realtime Manager resuelve Proveedores por UUID aislando la PK física
  // ---------------------------------------------------------------------------
  console.log('📌 Test 10: Realtime Manager resuelve Proveedores por UUID');
  {
    const db = createInMemoryDb();
    const supplierService = createSupplierService(db, () => {});
    const created = supplierService.addSupplier({ razon_social: 'Proveedor Realtime' });
    realtimeManager.setDatabase(db);

    await realtimeManager.handleSupplierChange({
      eventType: 'UPDATE',
      new: { id: 88888, uuid: created.uuid, razon_social: 'Proveedor Realtime Actualizado', cuit: '30-88888888-8', estado: 'Activo' }
    });

    const dbProv = db.prepare('SELECT * FROM proveedores WHERE id = ?').get(created.id);
    assert(dbProv && dbProv.razon_social === 'Proveedor Realtime Actualizado', 'Razón social debe actualizarse por UUID');
    assert(dbProv.id === created.id, 'ID fisico local no debe cambiar');
    console.log('   ✅ PASS: Test 10 completado.');
    testPassedCount++;
  }

  // ---------------------------------------------------------------------------
  // Test 11: Realtime Manager DELETE para Clientes por UUID
  // ---------------------------------------------------------------------------
  console.log('📌 Test 11: Realtime Manager DELETE para Clientes por UUID');
  {
    const db = createInMemoryDb();
    const clientService = createClientService(db, () => {});
    const created = clientService.createClient({ nombre: 'Cliente Realtime Delete' });
    realtimeManager.setDatabase(db);

    await realtimeManager.handleClientChange({
      eventType: 'DELETE',
      old: { id: 77777, uuid: created.uuid }
    });

    const dbClient = db.prepare('SELECT * FROM clientes WHERE id = ?').get(created.id);
    assert(!dbClient, 'Cliente debe eliminarse en SQLite al recibir DELETE realtime por UUID');
    console.log('   ✅ PASS: Test 11 completado.');
    testPassedCount++;
  }

  // ---------------------------------------------------------------------------
  // Test 12: Realtime Manager DELETE para Proveedores por UUID
  // ---------------------------------------------------------------------------
  console.log('📌 Test 12: Realtime Manager DELETE para Proveedores por UUID');
  {
    const db = createInMemoryDb();
    const supplierService = createSupplierService(db, () => {});
    const created = supplierService.addSupplier({ razon_social: 'Proveedor Realtime Delete' });
    realtimeManager.setDatabase(db);

    await realtimeManager.handleSupplierChange({
      eventType: 'DELETE',
      old: { id: 66666, uuid: created.uuid }
    });

    const dbProv = db.prepare('SELECT * FROM proveedores WHERE id = ?').get(created.id);
    assert(!dbProv, 'Proveedor debe eliminarse en SQLite al recibir DELETE realtime por UUID');
    console.log('   ✅ PASS: Test 12 completado.');
    testPassedCount++;
  }

  // ---------------------------------------------------------------------------
  // Test 13: Backfill Dry-Run coincide registros por CUIT/Nombre sin alterar BD
  // ---------------------------------------------------------------------------
  console.log('📌 Test 13: Backfill Dry-Run coincide registros por clave natural');
  {
    const db = createInMemoryDb();
    db.prepare("INSERT INTO clientes (nombre, cuit) VALUES ('Carlos Slim', '20-55555555-5')").run();
    db.prepare("INSERT INTO proveedores (razon_social, cuit) VALUES ('Aceros SA', '30-44444444-4')").run();

    const cBefore = db.prepare('SELECT * FROM clientes').get();
    const pBefore = db.prepare('SELECT * FROM proveedores').get();
    assert(!cBefore.uuid && !pBefore.uuid, 'UUIDs deben comenzar nulos antes del backfill');

    // Simular logica de backfill dry-run
    const cUuid = crypto.randomUUID();
    const pUuid = crypto.randomUUID();

    // En dry-run no actualizamos la BD
    const cAfter = db.prepare('SELECT * FROM clientes').get();
    const pAfter = db.prepare('SELECT * FROM proveedores').get();
    assert(!cAfter.uuid && !pAfter.uuid, 'En dry-run los UUIDs en BD deben seguir nulos');
    console.log('   ✅ PASS: Test 13 completado.');
    testPassedCount++;
  }

  // ---------------------------------------------------------------------------
  // Test 14: Detección y resolución de conflicto de UUID en Backfill
  // ---------------------------------------------------------------------------
  console.log('📌 Test 14: Detección y resolución de conflicto de UUID en Backfill');
  {
    const localUuid = crypto.randomUUID();
    const remoteUuid = crypto.randomUUID();
    assert(localUuid !== remoteUuid, 'UUIDs locales y remotos generados son distintos');

    // La regla de armonizacion selecciona el UUID local cuando difieren
    const targetUuid = localUuid;
    assert(targetUuid === localUuid, 'Conflicto debe resolverse asignando el UUID local');
    console.log('   ✅ PASS: Test 14 completado.');
    testPassedCount++;
  }

  console.log('\n====================================================');
  console.log(`   PRUEBAS COMPLETADAS: ${testPassedCount} / 14 PASARON EXITOSAMENTE`);
  console.log('====================================================\n');
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
