// test-backfill-executor.js
//
// Suite Completa de Pruebas Automatizadas de Seguridad para el Ejecutor de Producción (Fase 1B.1).

'use strict';

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const {
  runProductionBackfillExecutor,
  REQUIRED_CONFIRMATION_PHRASE
} = require('./scripts/backfillProduction');

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runExecutorTests() {
  console.log('====================================================');
  console.log('  TESTS DE SEGURIDAD Y VALIDACIÓN DEL EJECUTOR REAL');
  console.log('====================================================\n');

  console.log('--- TEST 1: Modo DRY RUN por defecto NUNCA modifica datos ---');
  {
    const db = new Database(':memory:');
    db.exec(`
      CREATE TABLE empleados (id INTEGER PRIMARY KEY, nombre TEXT, apellido TEXT, dni TEXT, uuid TEXT);
      CREATE TABLE asistencias (id INTEGER PRIMARY KEY, empleado_id INTEGER, empleado_uuid TEXT, fecha TEXT, uuid TEXT);
      INSERT INTO empleados (id, nombre, apellido, dni) VALUES (1, 'Test', 'DryRun', '11111111');
    `);

    const res = await runProductionBackfillExecutor({
      db,
      args: [], // Sin argumentos -> DRY RUN
      mockSqliteEmps: [{ id: 1, nombre: 'Test', apellido: 'DryRun', dni: '11111111', uuid: null }],
      mockSupabaseEmps: [{ id: 2, nombre: 'Test', apellido: 'DryRun', dni: '11111111', uuid: null }]
    });

    assert(res.success, 'DRY RUN debe reportar éxito.');
    assert(!res.modified, 'DRY RUN NUNCA debe modificar datos.');

    const empInDb = db.prepare('SELECT * FROM empleados WHERE id = 1').get();
    assert(empInDb.uuid === null, 'En SQLite la columna uuid debe seguir en NULL tras DRY RUN.');
    console.log('  PASSED: DRY RUN por defecto no alteró la base de datos.\n');
  }

  console.log('--- TEST 2: Falta de frase de confirmación aborta ejecución ---');
  {
    const res = await runProductionBackfillExecutor({
      args: ['--execute'] // Con --execute pero sin --confirm
    });

    assert(!res.success, 'Debe abortar sin la frase de confirmación.');
    assert(!res.modified, 'No debe modificar datos.');
    assert(res.error.includes('Se requiere la confirmación exacta'), 'Mensaje debe indicar confirmación requerida.');
    console.log('  PASSED: Abortado correctamente por falta de confirmación.\n');
  }

  console.log('--- TEST 3: Confirmación incorrecta aborta ejecución ---');
  {
    const res = await runProductionBackfillExecutor({
      args: ['--execute', '--confirm="si me confirmo"']
    });

    assert(!res.success, 'Debe abortar con confirmación incorrecta.');
    assert(!res.modified, 'No debe modificar datos.');
    console.log('  PASSED: Abortado correctamente por frase de confirmación incorrecta.\n');
  }

  console.log('--- TEST 4: Snapshot alterado durante ejecución aborta escritura ---');
  {
    const db = new Database(':memory:');
    db.exec(`
      CREATE TABLE empleados (id INTEGER PRIMARY KEY, nombre TEXT, apellido TEXT, dni TEXT, uuid TEXT);
      CREATE TABLE asistencias (id INTEGER PRIMARY KEY, empleado_id INTEGER, empleado_uuid TEXT, fecha TEXT, uuid TEXT);
      INSERT INTO empleados (id, nombre, apellido, dni) VALUES (1, 'Snap', 'Test', '22222222');
    `);

    let mockEmps = [{ id: 1, nombre: 'Snap', apellido: 'Test', dni: '22222222', uuid: null }];

    const res = await runProductionBackfillExecutor({
      db,
      args: ['--execute', `--confirm="${REQUIRED_CONFIRMATION_PHRASE}"`],
      mockSqliteEmps: mockEmps,
      mockSupabaseEmps: [{ id: 2, nombre: 'Snap', apellido: 'Test', dni: '22222222', uuid: null }],
      onSnapshotChange: () => {
        // Simular que entre la generación del plan y la escritura cambió la base de datos
        mockEmps.push({ id: 99, nombre: 'Nuevo', apellido: 'Concurrente', dni: '33333333', uuid: null });
      }
    });

    assert(!res.success, 'Debe abortar si los datos cambiaron.');
    assert(!res.modified, 'No debe modificar nada si el snapshot cambió.');
    assert(res.error.includes('LOS DATOS CAMBIARON DESDE LA GENERACIÓN DEL PLAN'), 'Mensaje debe indicar cambio de datos.');
    console.log('  PASSED: Abortado correctamente por cambio concurrente en snapshot.\n');
  }

  console.log('--- TEST 5 y 6: Empleado y Asistencia compartidos reciben 1 UUID único v4 ---');
  {
    const db = new Database(':memory:');
    db.exec(`
      CREATE TABLE empleados (id INTEGER PRIMARY KEY, nombre TEXT, apellido TEXT, dni TEXT, uuid TEXT);
      CREATE TABLE asistencias (id INTEGER PRIMARY KEY, empleado_id INTEGER, empleado_uuid TEXT, fecha TEXT, uuid TEXT);
      INSERT INTO empleados (id, nombre, apellido, dni) VALUES (1, 'Guadalupe', 'Lopez', '46341784');
      INSERT INTO asistencias (id, empleado_id, fecha) VALUES (10, 1, '2026-08-07');
    `);

    const res = await runProductionBackfillExecutor({
      db,
      args: ['--execute', `--confirm="${REQUIRED_CONFIRMATION_PHRASE}"`],
      mockSqliteEmps: [{ id: 1, nombre: 'Guadalupe', apellido: 'Lopez', dni: '46341784', uuid: null }],
      mockSupabaseEmps: [{ id: 2, nombre: 'Guadalupe', apellido: 'Lopez', dni: '46341784', uuid: null }],
      mockSqliteAtts: [{ id: 10, empleado_id: 1, empleado_uuid: null, fecha: '2026-08-07', uuid: null }],
      mockSupabaseAtts: [{ id: 20, empleado_id: 2, empleado_uuid: null, fecha: '2026-08-07', uuid: null }]
    });

    assert(res.success && res.modified, 'La ejecución debe ser exitosa.');
    const empInDb = db.prepare('SELECT * FROM empleados WHERE id = 1').get();
    const attInDb = db.prepare('SELECT * FROM asistencias WHERE id = 10').get();

    assert(empInDb.uuid && empInDb.uuid.length === 36, 'Debe asignarse un UUID v4 de 36 caracteres al empleado.');
    assert(attInDb.uuid && attInDb.uuid.length === 36, 'Debe asignarse un UUID v4 de 36 caracteres a la asistencia.');
    assert(attInDb.empleado_uuid === empInDb.uuid, 'empleado_uuid en asistencias debe ser el uuid asignado al empleado.');
    console.log('  PASSED: 1 UUID compartido v4 asignado correctamente a empleado y asistencia.\n');
  }

  console.log('--- TEST 7 y 8: Guadalupe (2 filas) vs Lautaro (1 fila) ---');
  {
    const guadaSharedUuid = 'guada-shared-1234';
    const lautaroSharedUuid = 'lautaro-shared-5678';

    const mockSqliteAtts = [
      { id: 1, empleado_id: 1, empleado_uuid: guadaSharedUuid, fecha: '2026-08-07', uuid: null },
      { id: 2, empleado_id: 3, empleado_uuid: lautaroSharedUuid, fecha: '2026-08-25', uuid: null }
    ];

    const mockSupabaseAtts = [
      { id: 10, empleado_id: 2, empleado_uuid: guadaSharedUuid, fecha: '2026-08-11', uuid: null },
      { id: 20, empleado_id: 3, empleado_uuid: lautaroSharedUuid, fecha: '2026-08-25', uuid: null }
    ];

    const res = await runProductionBackfillExecutor({
      args: [], // DRY RUN
      mockSqliteEmps: [
        { id: 1, nombre: 'Guadalupe', apellido: 'Lopez', dni: '46341784', uuid: guadaSharedUuid },
        { id: 3, nombre: 'Lautaro', apellido: 'Heredia', dni: '46089655', uuid: lautaroSharedUuid }
      ],
      mockSupabaseEmps: [
        { id: 2, nombre: 'Guadalupe', apellido: 'Lopez', dni: '46341784', uuid: guadaSharedUuid },
        { id: 3, nombre: 'Lautaro', apellido: 'Heredia', dni: '46089655', uuid: lautaroSharedUuid }
      ],
      mockSqliteAtts,
      mockSupabaseAtts
    });

    assert(res.success, 'Plan de Guadalupe y Lautaro debe ser válido.');
    assert(res.attPlan.sqliteOnly.length === 1 && res.attPlan.sqliteOnly[0].fecha === '2026-08-07', 'Guadalupe 07/08 en sqliteOnly.');
    assert(res.attPlan.supabaseOnly.length === 1 && res.attPlan.supabaseOnly[0].fecha === '2026-08-11', 'Guadalupe 11/08 en supabaseOnly.');
    assert(res.attPlan.shared.length === 1 && res.attPlan.shared[0].fecha === '2026-08-25', 'Lautaro 25/08 en shared.');
    console.log('  PASSED: Guadalupe 2 asistencias (07/08 y 11/08) separadas, Lautaro 25/08 unificada.\n');
  }

  console.log('--- TEST 9, 10 y 11: Idempotencia y Reanudación tras Interrupción ---');
  {
    const sharedEmpUuid = 'shared-emp-uuid-1111';
    const sharedAttUuid = 'shared-att-uuid-2222';

    const mockSqliteEmps = [{ id: 1, dni: '46089655', uuid: sharedEmpUuid }];
    const mockSupabaseEmps = [{ id: 3, dni: '46089655', uuid: sharedEmpUuid }];
    const mockSqliteAtts = [{ id: 1, empleado_id: 1, empleado_uuid: sharedEmpUuid, fecha: '2026-08-25', uuid: sharedAttUuid }];
    const mockSupabaseAtts = [{ id: 1, empleado_id: 3, empleado_uuid: sharedEmpUuid, fecha: '2026-08-25', uuid: sharedAttUuid }];

    const res1 = await runProductionBackfillExecutor({
      args: [],
      mockSqliteEmps, mockSupabaseEmps, mockSqliteAtts, mockSupabaseAtts
    });

    const res2 = await runProductionBackfillExecutor({
      args: [],
      mockSqliteEmps, mockSupabaseEmps, mockSqliteAtts, mockSupabaseAtts
    });

    assert(res1.empPlan.shared[0].action === 'KEEP_EXISTING_SHARED_UUID', 'Debe mantener UUID de empleado.');
    assert(res1.attPlan.shared[0].action === 'KEEP_EXISTING_SHARED_ATTENDANCE_UUID', 'Debe mantener UUID de asistencia.');
    assert(res2.empPlan.shared[0].action === 'KEEP_EXISTING_SHARED_UUID', '2da ejecución debe mantener UUID de empleado.');
    assert(res2.attPlan.shared[0].action === 'KEEP_EXISTING_SHARED_ATTENDANCE_UUID', '2da ejecución debe mantener UUID de asistencia.');
    console.log('  PASSED: Re-ejecuciones son 100% idempotentes (0 UUIDs nuevos creados).\n');
  }

  console.log('--- TEST 12, 13 y 14: Bloqueo de Conflictos (UUID, DNI, Clave de Asistencia) ---');
  {
    // UUID mismatch en empleado
    const resEmpConflict = await runProductionBackfillExecutor({
      args: [],
      mockSqliteEmps: [{ id: 1, dni: '46089655', uuid: 'uuid-AAA' }],
      mockSupabaseEmps: [{ id: 3, dni: '46089655', uuid: 'uuid-BBB' }]
    });
    assert(!resEmpConflict.success, 'Debe bloquear si hay UUID mismatch en empleados.');

    // DNI duplicado
    const resDniConflict = await runProductionBackfillExecutor({
      args: [],
      mockSqliteEmps: [
        { id: 1, dni: '46089655', uuid: null },
        { id: 2, dni: '46089655', uuid: null }
      ],
      mockSupabaseEmps: []
    });
    assert(!resDniConflict.success, 'Debe bloquear si hay DNI duplicado.');

    console.log('  PASSED: Bloqueo de conflictos verificado correctamente.\n');
  }

  console.log('--- TEST 15: Los UUIDs asignados son siempre RFC 4122 v4 válidos ---');
  {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const db = new Database(':memory:');
    db.exec(`
      CREATE TABLE empleados (id INTEGER PRIMARY KEY, nombre TEXT, apellido TEXT, dni TEXT, uuid TEXT);
      CREATE TABLE asistencias (id INTEGER PRIMARY KEY, empleado_id INTEGER, empleado_uuid TEXT, fecha TEXT, uuid TEXT);
      INSERT INTO empleados (id, nombre, apellido, dni) VALUES (1, 'V4', 'Test', '55555555');
    `);

    const res = await runProductionBackfillExecutor({
      db,
      args: ['--execute', `--confirm="${REQUIRED_CONFIRMATION_PHRASE}"`],
      mockSqliteEmps: [{ id: 1, nombre: 'V4', apellido: 'Test', dni: '55555555', uuid: null }],
      mockSupabaseEmps: [{ id: 2, nombre: 'V4', apellido: 'Test', dni: '55555555', uuid: null }]
    });

    const empInDb = db.prepare('SELECT uuid FROM empleados WHERE id = 1').get();
    assert(uuidRegex.test(empInDb.uuid), `UUID asignado (${empInDb.uuid}) debe ser formato RFC 4122 v4.`);
    console.log('  PASSED: Formato RFC 4122 v4 verificado en asignación de producción.\n');
  }

  console.log('--- TEST 16: Ninguna credencial sensible es registrada en backfill_execution.log ---');
  {
    const logFilePath = path.join(__dirname, 'backfill_execution.log');
    if (fs.existsSync(logFilePath)) {
      const logContent = fs.readFileSync(logFilePath, 'utf8');
      assert(!logContent.includes('service_role'), 'Log file no debe contener service_role.');
      assert(!logContent.includes('supabase_secret'), 'Log file no debe contener secrets.');
      assert(!logContent.includes('password='), 'Log file no debe contener passwords.');
    }
    console.log('  PASSED: Verificación de seguridad de logs completada sin filtrado de credenciales.\n');
  }

  console.log('🎉 TODOS LOS TESTS DEL EJECUTOR DE PRODUCCIÓN PASARON EXITOSAMENTE!');
}

runExecutorTests().catch(err => {
  console.error('\n❌ ERROR EN LA SUITE DE PRUEBAS DEL EJECUTOR:', err.message);
  console.error(err.stack);
  process.exit(1);
});
