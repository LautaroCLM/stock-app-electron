// test-backfill-interruption.js
//
// Suite de Pruebas Automatizadas de Seguridad para Interrupciones, Reanudación e Idempotencia del Backfill.

'use strict';

const Database = require('better-sqlite3');
const { generateCoordinatedBackfillPlan } = require('./scripts/backfillDryRun');
const createEmployeeService = require('./services/employeeService');

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

function runInterruptionTests() {
  console.log('====================================================');
  console.log('  TESTS DE INTERRUPCIÓN, IDEMPOTENCIA Y SEGURIDAD');
  console.log('====================================================\n');

  console.log('--- CASO 1: Interrupción — Supabase actualizado (UUID-S) y SQLite sin actualizar ---');
  {
    const remoteUuid = '660e8400-e29b-41d4-a716-446655440001';
    const sqliteEmps = [{ id: 1, dni: '46341784', uuid: null }];
    const supabaseEmps = [{ id: 2, dni: '46341784', uuid: remoteUuid }];

    const plan = generateCoordinatedBackfillPlan(sqliteEmps, supabaseEmps);
    assert(plan.valid, 'El plan debe ser válido.');
    assert(plan.shared[0].action === 'COPY_REMOTE_TO_LOCAL', 'Debe detectar y copiar el UUID remoto existente.');
    assert(plan.shared[0].finalUuid === remoteUuid, `Debe reutilizar ${remoteUuid} sin generar uno nuevo.`);
    console.log('  PASSED: Reanudación tras falla en SQLite reutiliza el UUID de Supabase.\n');
  }

  console.log('--- CASO 2: Interrupción — SQLite actualizado (UUID-L) y Supabase sin actualizar ---');
  {
    const localUuid = '770e8400-e29b-41d4-a716-446655440002';
    const sqliteEmps = [{ id: 1, dni: '46089655', uuid: localUuid }];
    const supabaseEmps = [{ id: 3, dni: '46089655', uuid: null }];

    const plan = generateCoordinatedBackfillPlan(sqliteEmps, supabaseEmps);
    assert(plan.valid, 'El plan debe ser válido.');
    assert(plan.shared[0].action === 'COPY_LOCAL_TO_REMOTE', 'Debe detectar y copiar el UUID local existente.');
    assert(plan.shared[0].finalUuid === localUuid, `Debe reutilizar ${localUuid} sin generar uno nuevo.`);
    console.log('  PASSED: Reanudación tras falla en Supabase reutiliza el UUID de SQLite.\n');
  }

  console.log('--- CASO 3: Idempotencia — Segunda ejecución sobre ambas bases ya actualizadas ---');
  {
    const sharedUuid = '880e8400-e29b-41d4-a716-446655440003';
    const sqliteEmps = [{ id: 1, dni: '33601045', uuid: sharedUuid }];
    const supabaseEmps = [{ id: 4, dni: '33601045', uuid: sharedUuid }];

    const plan1 = generateCoordinatedBackfillPlan(sqliteEmps, supabaseEmps);
    assert(plan1.shared[0].action === 'KEEP_EXISTING_SHARED_UUID', 'Primera re-ejecución debe mantener el UUID.');

    const plan2 = generateCoordinatedBackfillPlan(sqliteEmps, supabaseEmps);
    assert(plan2.shared[0].action === 'KEEP_EXISTING_SHARED_UUID', 'Segunda re-ejecución debe mantener el UUID.');
    assert(plan2.shared[0].finalUuid === sharedUuid, 'UUID debe permanecer idéntico.');
    console.log('  PASSED: Ejecuciones repetidas son 100% idempotentes (0 UUIDs nuevos creados).\n');
  }

  console.log('--- CASO 4: Fallo a mitad del proceso de empleados y reanudación segura ---');
  {
    // Supóngase que Guadalupe y Lautaro se actualizaron con UUID-G y UUID-L, pero Luis falló antes de actualizarse
    const uuidG = '990e8400-e29b-41d4-a716-446655440004';
    const uuidL = 'aa0e8400-e29b-41d4-a716-446655440005';

    const sqliteEmps = [
      { id: 1, dni: '46341784', uuid: uuidG },
      { id: 3, dni: '46089655', uuid: uuidL },
      { id: 4, dni: '33601045', uuid: null }
    ];
    const supabaseEmps = [
      { id: 2, dni: '46341784', uuid: uuidG },
      { id: 3, dni: '46089655', uuid: uuidL },
      { id: 4, dni: '33601045', uuid: null }
    ];

    const planResumed = generateCoordinatedBackfillPlan(sqliteEmps, supabaseEmps);
    assert(planResumed.valid, 'El plan reanudado debe ser válido.');

    const gAction = planResumed.shared.find(s => s.dni === '46341784');
    const lAction = planResumed.shared.find(s => s.dni === '46089655');
    const luisAction = planResumed.shared.find(s => s.dni === '33601045');

    assert(gAction.action === 'KEEP_EXISTING_SHARED_UUID' && gAction.finalUuid === uuidG, 'Guadalupe debe conservar su UUID previo.');
    assert(lAction.action === 'KEEP_EXISTING_SHARED_UUID' && lAction.finalUuid === uuidL, 'Lautaro debe conservar su UUID previo.');
    assert(luisAction.action === 'GENERATE_NEW_SHARED_UUID', 'Luis debe recibir su nuevo UUID pendiente.');

    console.log('  PASSED: Reanudación tras falla parcial procesa únicamente los registros pendientes.\n');
  }

  console.log('--- CASO 5: Conflicto de UUIDs — Bloqueo inmediato antes de modificar ---');
  {
    const sqliteEmps = [{ id: 1, dni: '46341784', uuid: 'uuid-local-conflicto' }];
    const supabaseEmps = [{ id: 2, dni: '46341784', uuid: 'uuid-remote-conflicto' }];

    const plan = generateCoordinatedBackfillPlan(sqliteEmps, supabaseEmps);
    assert(!plan.valid, 'El plan debe marcarse como INVÁLIDO.');
    assert(plan.conflicts.length === 1, 'Debe registrar 1 conflicto crítico.');
    assert(plan.shared[0].finalUuid === 'CONFLICT', 'UUID final debe ser CONFLICT.');

    console.log('  PASSED: Conflicto de UUID causa el bloqueo inmediato del plan sin aplicar cambios.\n');
  }

  console.log('🎉 TODOS LOS TESTS DE INTERRUPCIÓN Y SEGURIDAD PASARON EXITOSAMENTE!');
}

runInterruptionTests();
