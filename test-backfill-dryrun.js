// test-backfill-dryrun.js
//
// Pruebas Unitarias Automatizadas para la Herramienta de Planificación DRY RUN de Backfill Coordenado.

'use strict';

const Database = require('better-sqlite3');
const { generateCoordinatedBackfillPlan, printDryRunPlan } = require('./scripts/backfillDryRun');
const createEmployeeService = require('./services/employeeService');

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

function runBackfillDryRunTests() {
  console.log('====================================================');
  console.log('  EJECUTANDO TESTS DE PLANIFICACIÓN BACKFILL DRY RUN');
  console.log('====================================================\n');

  console.log('--- TEST 1: Empleado compartido sin UUID en ambas bases ---');
  {
    const sqliteEmps = [{ id: 1, nombre: 'Guadalupe', apellido: 'Lopez', dni: '46341784', uuid: null }];
    const supabaseEmps = [{ id: 2, nombre: 'Guadalupe', apellido: 'Lopez', dni: '46341784', uuid: null }];

    const plan = generateCoordinatedBackfillPlan(sqliteEmps, supabaseEmps);
    assert(plan.valid, 'El plan debe ser válido.');
    assert(plan.shared.length === 1, 'Debe haber 1 empleado compartido.');
    assert(plan.shared[0].action === 'GENERATE_NEW_SHARED_UUID', 'Acción debe ser GENERATE_NEW_SHARED_UUID.');
    assert(plan.shared[0].finalUuid && plan.shared[0].finalUuid.length === 36, 'Debe generarse un UUID v4 final.');
    console.log('  PASSED: UUID compartido único generado para ambos lados.\n');
  }

  console.log('--- TEST 2: Empleado compartido con el mismo UUID ---');
  {
    const sharedUuid = '550e8400-e29b-41d4-a716-446655440000';
    const sqliteEmps = [{ id: 1, nombre: 'Lautaro', apellido: 'Heredia', dni: '46089655', uuid: sharedUuid }];
    const supabaseEmps = [{ id: 3, nombre: 'Lautaro', apellido: 'Heredia', dni: '46089655', uuid: sharedUuid }];

    const plan = generateCoordinatedBackfillPlan(sqliteEmps, supabaseEmps);
    assert(plan.valid, 'El plan debe ser válido.');
    assert(plan.shared[0].action === 'KEEP_EXISTING_SHARED_UUID', 'Acción debe ser KEEP_EXISTING_SHARED_UUID.');
    assert(plan.shared[0].finalUuid === sharedUuid, 'Debe conservar el UUID existente.');
    console.log('  PASSED: UUID coincidente conservado intacto.\n');
  }

  console.log('--- TEST 3: Empleado compartido con UUIDs diferentes (Conflicto) ---');
  {
    const sqliteEmps = [{ id: 1, nombre: 'Luis', apellido: 'Gonzales', dni: '33601045', uuid: 'uuid-local-AAA' }];
    const supabaseEmps = [{ id: 4, nombre: 'Luis', apellido: 'Gonzales', dni: '33601045', uuid: 'uuid-remote-BBB' }];

    const plan = generateCoordinatedBackfillPlan(sqliteEmps, supabaseEmps);
    assert(!plan.valid, 'El plan debe ser INVALIDO debido al conflicto de UUID.');
    assert(plan.conflicts.length === 1, 'Debe detectarse 1 conflicto.');
    assert(plan.conflicts[0].type === 'UUID_MISMATCH', 'Tipo de conflicto debe ser UUID_MISMATCH.');
    console.log('  PASSED: Conflicto por discrepancia de UUID detectado y plan bloqueado.\n');
  }

  console.log('--- TEST 4: Empleado solamente en Supabase ---');
  {
    const sqliteEmps = [];
    const supabaseEmps = [{ id: 5, nombre: 'Juan', apellido: 'Tajan', dni: '46380472', uuid: 'uuid-tajan-55' }];

    const plan = generateCoordinatedBackfillPlan(sqliteEmps, supabaseEmps);
    assert(plan.valid, 'El plan debe ser válido.');
    assert(plan.supabaseOnly.length === 1, 'Debe haber 1 empleado solo en Supabase.');
    assert(plan.supabaseOnly[0].finalUuid === 'uuid-tajan-55', 'Debe conservar el UUID remoto.');
    console.log('  PASSED: Empleado solo Supabase conserva su UUID remoto.\n');
  }

  console.log('--- TEST 5: Empleado solamente en SQLite ---');
  {
    const sqliteEmps = [{ id: 10, nombre: 'Pedro', apellido: 'Solo', dni: '12121212', uuid: 'uuid-local-pedro' }];
    const supabaseEmps = [];

    const plan = generateCoordinatedBackfillPlan(sqliteEmps, supabaseEmps);
    assert(plan.valid, 'El plan debe ser válido.');
    assert(plan.sqliteOnly.length === 1, 'Debe haber 1 empleado solo en SQLite.');
    assert(plan.sqliteOnly[0].finalUuid === 'uuid-local-pedro', 'Debe conservar el UUID local.');
    console.log('  PASSED: Empleado solo SQLite conserva su UUID local.\n');
  }

  console.log('--- TEST 6: DNI Duplicado en SQLite o Supabase ---');
  {
    const sqliteEmps = [
      { id: 1, nombre: 'Carlos', apellido: 'Uno', dni: '99999999', uuid: null },
      { id: 2, nombre: 'Carlos', apellido: 'Dos', dni: '99999999', uuid: null }
    ];
    const supabaseEmps = [];

    const plan = generateCoordinatedBackfillPlan(sqliteEmps, supabaseEmps);
    assert(!plan.valid, 'El plan debe ser INVALIDO debido a DNI duplicado.');
    assert(plan.conflicts.some(c => c.type === 'DUPLICATE_DNI_SQLITE'), 'Debe reportar conflicto DUPLICATE_DNI_SQLITE.');
    console.log('  PASSED: DNI duplicado detectado correctamente y plan bloqueado.\n');
  }

  console.log('--- TEST 7 y 8: Asistencias Guadalupe (2 filas) vs Lautaro (1 fila) ---');
  {
    const db = new Database(':memory:');
    db.exec(`
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
        uuid TEXT
      );
      CREATE TABLE asistencias (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        empleado_id INTEGER NOT NULL,
        empleado_uuid TEXT,
        fecha TEXT NOT NULL,
        hora_entrada TEXT,
        hora_salida TEXT,
        estado TEXT NOT NULL,
        observaciones TEXT,
        uuid TEXT,
        UNIQUE(empleado_id, fecha)
      );
    `);

    const empService = createEmployeeService(db);

    // Reconciliar Guadalupe
    empService.upsertEmployee({ uuid: 'guada-shared-uuid', nombre: 'Guadalupe', apellido: 'Lopez', dni: '46341784' });
    empService.saveAttendance({ empleado_uuid: 'guada-shared-uuid', fecha: '2026-08-07', estado: 'Presente' });
    empService.upsertAttendance({ uuid: 'att-guada-1108', empleado_uuid: 'guada-shared-uuid', fecha: '2026-08-11', estado: 'Presente' });

    const guadaAtts = db.prepare("SELECT * FROM asistencias WHERE empleado_uuid = 'guada-shared-uuid' ORDER BY fecha ASC").all();
    assert(guadaAtts.length === 2, `Guadalupe debe conservar 2 filas de asistencia por fechas distintas (actual: ${guadaAtts.length}).`);
    assert(guadaAtts[0].fecha === '2026-08-07' && guadaAtts[1].fecha === '2026-08-11', 'Fechas de Guadalupe deben ser 07/08 y 11/08.');

    // Reconciliar Lautaro
    empService.upsertEmployee({ uuid: 'lautaro-shared-uuid', nombre: 'Lautaro', apellido: 'Heredia', dni: '46089655' });
    empService.saveAttendance({ uuid: 'att-lautaro-2508', empleado_uuid: 'lautaro-shared-uuid', fecha: '2026-08-25', estado: 'Presente' });
    empService.upsertAttendance({ uuid: 'att-lautaro-2508', empleado_uuid: 'lautaro-shared-uuid', fecha: '2026-08-25', estado: 'Presente' });

    const lautaroAtts = db.prepare("SELECT * FROM asistencias WHERE empleado_uuid = 'lautaro-shared-uuid'").all();
    assert(lautaroAtts.length === 1, `Lautaro debe tener exactamente 1 fila unificada por fecha coincidente (actual: ${lautaroAtts.length}).`);
    console.log('  PASSED: Asistencias históricas de Guadalupe (2 filas) y Lautaro (1 fila) verificadas sin merge erróneo.\n');
  }

  console.log('--- TEST 9: Simulación DRY RUN con Datos Reales Auditados ---');
  {
    const realSupabase = [
      { id: 2, nombre: 'Guadalupe', apellido: 'Lopez', dni: '46341784', uuid: null },
      { id: 3, nombre: 'Lautaro Fabricio', apellido: 'Heredia', dni: '46089655', uuid: null },
      { id: 4, nombre: 'Luis Alfredo', apellido: 'Gonzales', dni: '33601045', uuid: null },
      { id: 5, nombre: 'Juan Pablo', apellido: 'Tajan', dni: '46380472', uuid: null },
      { id: 6, nombre: 'Horacio Esteban', apellido: 'Rodriguez', dni: '31773542', uuid: null },
      { id: 7, nombre: 'Angel Oscar', apellido: 'Franco', dni: '27001621', uuid: null },
      { id: 8, nombre: 'Cristian', apellido: 'Cuenca', dni: '33513083', uuid: null }
    ];

    const realSqlite = [
      { id: 1, nombre: 'Guadalupe', apellido: 'Lopez', dni: '46341784', uuid: null },
      { id: 3, nombre: 'Lautaro Fabricio', apellido: 'Heredia', dni: '46089655', uuid: null },
      { id: 4, nombre: 'Luis Alfredo', apellido: 'Gonzales', dni: '33601045', uuid: null }
    ];

    const plan = generateCoordinatedBackfillPlan(realSqlite, realSupabase);
    printDryRunPlan(plan);
    assert(plan.valid, 'El plan para los datos reales debe ser válido sin conflictos.');
    assert(plan.shared.length === 3, 'Deben haber 3 empleados compartidos.');
    assert(plan.supabaseOnly.length === 4, 'Deben haber 4 empleados exclusivos de Supabase.');
    assert(plan.sqliteOnly.length === 0, 'Deben haber 0 empleados exclusivos de SQLite.');
  }

  console.log('🎉 TODOS LOS TESTS DE PLANIFICACIÓN BACKFILL DRY RUN PASARON EXITOSAMENTE!');
}

runBackfillDryRunTests();
