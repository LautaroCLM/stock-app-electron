// test-backfill-attendance.js
//
// Suite de Pruebas Automatizadas de Seguridad para Coordinación de UUIDs de Asistencias (Fase 1B.1).

'use strict';

const Database = require('better-sqlite3');
const {
  normalizeDate,
  generateCoordinatedBackfillPlan,
  generateCoordinatedAttendanceBackfillPlan
} = require('./scripts/backfillDryRun');

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

function runAttendanceBackfillTests() {
  console.log('====================================================');
  console.log('  TESTS DE COORDINACIÓN DE UUIDs DE ASISTENCIAS');
  console.log('====================================================\n');

  console.log('--- TEST 1: Normalización de Fechas (TEXT vs TIMESTAMPTZ) ---');
  {
    const d1 = normalizeDate('2026-08-25');
    const d2 = normalizeDate('2026-08-25T03:00:00+00:00');
    const d3 = normalizeDate('2026-08-25 00:00:00+00');
    const d4 = normalizeDate(new Date('2026-08-25T12:00:00Z'));

    assert(d1 === '2026-08-25', 'd1 debe ser 2026-08-25');
    assert(d2 === '2026-08-25', 'd2 debe ser 2026-08-25');
    assert(d3 === '2026-08-25', 'd3 debe ser 2026-08-25');
    assert(d4 === '2026-08-25', 'd4 debe ser 2026-08-25');
    console.log('  PASSED: Normalización de fechas TIMESTAMPTZ e ISO a YYYY-MM-DD verificada.\n');
  }

  console.log('--- TEST 2: Coordinación de Asistencias Reales (Guadalupe & Lautaro) ---');
  {
    const guadaUuid = 'guada-shared-uuid';
    const lautaroUuid = 'lautaro-shared-uuid';

    // Guadalupe: 07/08 en SQLite, 11/08 en Supabase
    // Lautaro: 25/08 en SQLite (TEXT) y 25/08 en Supabase (TIMESTAMPTZ)
    const sqliteAtts = [
      { id: 101, empleado_id: 1, empleado_uuid: guadaUuid, fecha: '2026-08-07', uuid: null },
      { id: 102, empleado_id: 3, empleado_uuid: lautaroUuid, fecha: '2026-08-25', uuid: null }
    ];

    const supabaseAtts = [
      { id: 201, empleado_id: 2, empleado_uuid: guadaUuid, fecha: '2026-08-11T00:00:00+00:00', uuid: null },
      { id: 202, empleado_id: 3, empleado_uuid: lautaroUuid, fecha: '2026-08-25T03:00:00+00:00', uuid: null }
    ];

    const attPlan = generateCoordinatedAttendanceBackfillPlan(sqliteAtts, supabaseAtts);
    assert(attPlan.valid, 'El plan de asistencias debe ser válido.');

    // Verificar Lautaro (Asistencia Compartida en ambas bases)
    assert(attPlan.shared.length === 1, 'Debe haber 1 asistencia compartida (Lautaro 25/08).');
    const lautaroPlan = attPlan.shared[0];
    assert(lautaroPlan.fecha === '2026-08-25', 'Fecha compartida debe ser 2026-08-25.');
    assert(lautaroPlan.action === 'GENERATE_NEW_SHARED_ATTENDANCE_UUID', 'Debe generar UN SOLO UUID compartido para Lautaro.');
    const lautaroSharedAttUuid = lautaroPlan.finalUuid;
    assert(lautaroSharedAttUuid && lautaroSharedAttUuid.length === 36, 'Debe asignarse un UUID v4 final.');

    // Verificar Guadalupe (2 asistencias separadas)
    assert(attPlan.sqliteOnly.length === 1, 'Guadalupe 07/08 debe estar en sqliteOnly.');
    assert(attPlan.supabaseOnly.length === 1, 'Guadalupe 11/08 debe estar en supabaseOnly.');

    const guada0708Uuid = attPlan.sqliteOnly[0].finalUuid;
    const guada1108Uuid = attPlan.supabaseOnly[0].finalUuid;

    assert(guada0708Uuid !== guada1108Uuid, 'UUID 07/08 y UUID 11/08 deben ser distintos.');
    assert(guada0708Uuid !== lautaroSharedAttUuid, 'UUID Guadalupe 07/08 no debe ser igual al de Lautaro.');
    assert(guada1108Uuid !== lautaroSharedAttUuid, 'UUID Guadalupe 11/08 no debe ser igual al de Lautaro.');

    console.log('  PASSED: Lautaro 25/08 comparte exacto UUID C. Guadalupe 07/08 (A) y 11/08 (B) permanecen separadas (A !== B !== C).\n');
  }

  console.log('--- TEST 3: Idempotencia y Reanudación tras Interrupción ---');
  {
    const lautaroUuid = 'lautaro-shared-uuid';
    const existingAttUuid = 'att-lautaro-2508-shared';

    // CASO A: SQLite ya tenía el UUID, Supabase aún no
    const sqliteAttsA = [{ id: 102, empleado_id: 3, empleado_uuid: lautaroUuid, fecha: '2026-08-25', uuid: existingAttUuid }];
    const supabaseAttsA = [{ id: 202, empleado_id: 3, empleado_uuid: lautaroUuid, fecha: '2026-08-25', uuid: null }];

    const planA = generateCoordinatedAttendanceBackfillPlan(sqliteAttsA, supabaseAttsA);
    assert(planA.shared[0].action === 'COPY_LOCAL_ATTENDANCE_UUID_TO_REMOTE', 'Debe copiar UUID local a remoto.');
    assert(planA.shared[0].finalUuid === existingAttUuid, `Debe reutilizar ${existingAttUuid}`);

    // CASO B: Supabase ya tenía el UUID, SQLite aún no
    const sqliteAttsB = [{ id: 102, empleado_id: 3, empleado_uuid: lautaroUuid, fecha: '2026-08-25', uuid: null }];
    const supabaseAttsB = [{ id: 202, empleado_id: 3, empleado_uuid: lautaroUuid, fecha: '2026-08-25', uuid: existingAttUuid }];

    const planB = generateCoordinatedAttendanceBackfillPlan(sqliteAttsB, supabaseAttsB);
    assert(planB.shared[0].action === 'COPY_REMOTE_ATTENDANCE_UUID_TO_LOCAL', 'Debe copiar UUID remoto a local.');
    assert(planB.shared[0].finalUuid === existingAttUuid, `Debe reutilizar ${existingAttUuid}`);

    // CASO C: Ambos ya tienen el mismo UUID (Re-ejecución)
    const sqliteAttsC = [{ id: 102, empleado_id: 3, empleado_uuid: lautaroUuid, fecha: '2026-08-25', uuid: existingAttUuid }];
    const supabaseAttsC = [{ id: 202, empleado_id: 3, empleado_uuid: lautaroUuid, fecha: '2026-08-25', uuid: existingAttUuid }];

    const planC = generateCoordinatedAttendanceBackfillPlan(sqliteAttsC, supabaseAttsC);
    assert(planC.shared[0].action === 'KEEP_EXISTING_SHARED_ATTENDANCE_UUID', 'Debe conservar el UUID existente.');
    assert(planC.shared[0].finalUuid === existingAttUuid, '0 UUIDs nuevos generados.');

    console.log('  PASSED: Idempotencia y reanudación tras interrupción de asistencias 100% verificadas.\n');
  }

  console.log('--- TEST 4: Detección de Conflicto de UUIDs en Asistencias ---');
  {
    const lautaroUuid = 'lautaro-shared-uuid';
    const sqliteAtts = [{ id: 102, empleado_id: 3, empleado_uuid: lautaroUuid, fecha: '2026-08-25', uuid: 'att-uuid-AAA' }];
    const supabaseAtts = [{ id: 202, empleado_id: 3, empleado_uuid: lautaroUuid, fecha: '2026-08-25', uuid: 'att-uuid-BBB' }];

    const plan = generateCoordinatedAttendanceBackfillPlan(sqliteAtts, supabaseAtts);
    assert(!plan.valid, 'Plan de asistencias debe ser INVÁLIDO.');
    assert(plan.conflicts.length === 1, 'Debe registrar 1 conflicto de asistencias.');
    assert(plan.conflicts[0].type === 'ATTENDANCE_UUID_MISMATCH', 'Tipo de conflicto debe ser ATTENDANCE_UUID_MISMATCH.');
    console.log('  PASSED: Discrepancia de UUIDs en asistencia causa bloqueo inmediato del plan.\n');
  }

  console.log('🎉 TODOS LOS TESTS DE COORDINACIÓN DE ASISTENCIAS PASARON EXITOSAMENTE!');
}

runAttendanceBackfillTests();
