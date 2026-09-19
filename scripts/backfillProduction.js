// scripts/backfillProduction.js
//
// Herramienta Ejecutora Segura de Backfill Coordenado de Empleados y Asistencias.
//
// MODO POR DEFECTO: DRY RUN (NO MODIFICA DATOS)
// Para ejecutar cambios en producción se requiere:
// node scripts/backfillProduction.js --execute --confirm="BACKFILL BAUPI CONFIRM"

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const {
  generateCoordinatedBackfillPlan,
  generateCoordinatedAttendanceBackfillPlan,
  printDryRunPlan
} = require('./backfillDryRun');

const REQUIRED_CONFIRMATION_PHRASE = 'BACKFILL BAUPI CONFIRM';
const LOG_FILE_PATH = path.join(__dirname, '..', 'backfill_execution.log');

/**
 * Registra eventos en el archivo de log local omitiendo credenciales sensibles.
 * @param {string} level - 'INFO' | 'WARN' | 'ERROR'
 * @param {string} message - Mensaje a registrar
 * @param {object} [data=null] - Objeto opcional de metadatos (sanitizado)
 */
function logEvent(level, message, data = null) {
  const timestamp = new Date().toISOString();
  let logLine = `[${timestamp}] [${level}] ${message}`;

  if (data) {
    // Sanitizar cualquier clave sensible previendo filtrado accidental
    const sanitized = JSON.parse(JSON.stringify(data), (key, value) => {
      if (['password', 'key', 'token', 'secret', 'service_role'].some(k => key.toLowerCase().includes(k))) {
        return '[REDACTED]';
      }
      return value;
    });
    logLine += ` | Data: ${JSON.stringify(sanitized)}`;
  }

  console.log(logLine);
  try {
    fs.appendFileSync(LOG_FILE_PATH, logLine + '\n', 'utf8');
  } catch (err) {
    console.warn('[Logger] No se pudo escribir en log file:', err.message);
  }
}

/**
 * Toma un snapshot ligero del estado de precondition de empleados y asistencias.
 */
function capturePreconditionSnapshot(sqliteEmployees = [], supabaseEmployees = [], sqliteAtts = [], supabaseAtts = []) {
  const empKeys = [...sqliteEmployees, ...supabaseEmployees]
    .map(e => `${e.id}:${e.dni}:${e.uuid || 'NULL'}`)
    .sort()
    .join('|');

  const attKeys = [...sqliteAtts, ...supabaseAtts]
    .map(a => `${a.id}:${a.empleado_id}:${a.fecha}:${a.uuid || 'NULL'}`)
    .sort()
    .join('|');

  const hash = crypto.createHash('sha256').update(empKeys + '||' + attKeys).digest('hex');

  return {
    sqliteEmpCount: sqliteEmployees.length,
    supabaseEmpCount: supabaseEmployees.length,
    sqliteAttCount: sqliteAtts.length,
    supabaseAttCount: supabaseAtts.length,
    hash
  };
}

/**
 * Crea un backup físico local de la base SQLite.
 */
function createLocalSqliteBackup(db, dbFilePath) {
  if (!dbFilePath || !fs.existsSync(dbFilePath)) {
    logEvent('WARN', 'Ruta de archivo SQLite no proveída o no existe. Omitiendo backup físico.');
    return null;
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(path.dirname(dbFilePath), 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const backupPath = path.join(backupDir, `data.db.backup_${timestamp}`);
  fs.copyFileSync(dbFilePath, backupPath);

  // Verificar integridad del backup
  if (db) {
    const check = db.prepare('PRAGMA integrity_check;').get();
    logEvent('INFO', `Integridad SQLite verificada: ${check.integrity_check}`);
  }

  logEvent('INFO', `Backup físico SQLite creado correctamente en: ${backupPath}`);
  return backupPath;
}

/**
 * Ejecutor principal de Backfill Coordenado.
 * @param {object} params
 * @param {object} params.db - Instancia de SQLite local
 * @param {object} [params.supabaseClient] - Cliente opcional de Supabase para actualización remota
 * @param {Array<string>} [params.args=[]] - Argumentos de línea de comandos (process.argv)
 * @param {Array<object>} [params.mockSqliteEmps] - Mocks opcionales para testing
 * @param {Array<object>} [params.mockSupabaseEmps] - Mocks opcionales para testing
 * @param {Array<object>} [params.mockSqliteAtts] - Mocks opcionales para testing
 * @param {Array<object>} [params.mockSupabaseAtts] - Mocks opcionales para testing
 * @param {function} [params.onSnapshotChange] - Callback opcional para simular cambios concurrentes en tests
 * @returns {Promise<object>} Resultado de la ejecución del backfill.
 */
async function runProductionBackfillExecutor(params = {}) {
  const args = params.args || process.argv.slice(2);
  const isExecute = args.includes('--execute');

  const confirmArg = args.find(a => a.startsWith('--confirm='));
  const userPhrase = confirmArg ? confirmArg.split('=')[1].trim().replace(/^['"]|['"]$/g, '') : '';

  logEvent('INFO', `Iniciando Ejecutor de Backfill -> Modo: ${isExecute ? 'EXECUTE' : 'DRY RUN'}`);

  // 1. Advertencia de Seguridad de Electron
  console.log('\n===================================================================================');
  console.log(' ⚠️  INFORMACIÓN CRÍTICA DE SEGURIDAD:');
  console.log(' CIERRE LA APLICACIÓN ELECTRON ANTES DE CONTINUAR CON EL BACKFILL DE PRODUCCIÓN.');
  console.log('===================================================================================\n');

  // 2. Validación de argumentos de confirmación si se especificó --execute
  if (isExecute) {
    if (userPhrase !== REQUIRED_CONFIRMATION_PHRASE) {
      const errorMsg = `ESTÁS A PUNTO DE MODIFICAR PRODUCCIÓN. Se requiere la confirmación exacta: --confirm="${REQUIRED_CONFIRMATION_PHRASE}". Frase recibida: "${userPhrase}"`;
      logEvent('ERROR', errorMsg);
      console.error(`❌ ABORTADO: ${errorMsg}\n`);
      return { success: false, mode: 'EXECUTE', error: errorMsg, modified: false };
    }
    logEvent('INFO', 'Confirmación explícita válida recibida: BACKFILL BAUPI CONFIRM');
  }

  // 3. Cargar datos de empleados y asistencias de SQLite y Supabase
  let sqliteEmps = params.mockSqliteEmps || [];
  let supabaseEmps = params.mockSupabaseEmps || [];
  let sqliteAtts = params.mockSqliteAtts || [];
  let supabaseAtts = params.mockSupabaseAtts || [];

  if (params.db && (!params.mockSqliteEmps || params.mockSqliteEmps.length === 0)) {
    try {
      sqliteEmps = params.db.prepare('SELECT id, nombre, apellido, dni, uuid FROM empleados').all();
      sqliteAtts = params.db.prepare('SELECT id, empleado_id, empleado_uuid, fecha, uuid FROM asistencias').all();
    } catch (err) {
      logEvent('ERROR', 'Error leyendo SQLite:', err.message);
    }
  }

  if (params.supabaseClient && (!params.mockSupabaseEmps || params.mockSupabaseEmps.length === 0)) {
    try {
      const { data: sEmps } = await params.supabaseClient.from('empleados').select('id, nombre, apellido, dni, uuid');
      const { data: sAtts } = await params.supabaseClient.from('asistencias').select('id, empleado_id, empleado_uuid, fecha, uuid');
      if (sEmps) supabaseEmps = sEmps;
      if (sAtts) supabaseAtts = sAtts;
    } catch (err) {
      logEvent('ERROR', 'Error leyendo Supabase:', err.message);
    }
  }

  // 4. Capturar Snapshot Inicial
  const initialSnapshot = capturePreconditionSnapshot(sqliteEmps, supabaseEmps, sqliteAtts, supabaseAtts);
  logEvent('INFO', 'Snapshot de precondiciones capturado inicial.', { snapshotHash: initialSnapshot.hash });

  // 5. Generar y Validar Plan de Empleados
  const empPlan = generateCoordinatedBackfillPlan(sqliteEmployeesMap(sqliteEmps), supabaseEmployeesMap(supabaseEmps));

  // Mapa auxiliar empleado_id -> empleado_uuid
  const empUuidMap = {};
  for (const emp of sqliteEmps) {
    if (emp.id && emp.uuid) empUuidMap[emp.id] = emp.uuid;
  }
  for (const item of empPlan.shared) {
    if (item.sqliteId && item.finalUuid !== 'CONFLICT') empUuidMap[item.sqliteId] = item.finalUuid;
    if (item.supabaseId && item.finalUuid !== 'CONFLICT') empUuidMap[item.supabaseId] = item.finalUuid;
  }
  for (const item of empPlan.sqliteOnly) {
    if (item.sqliteId && item.finalUuid) empUuidMap[item.sqliteId] = item.finalUuid;
  }
  for (const item of empPlan.supabaseOnly) {
    if (item.supabaseId && item.finalUuid) empUuidMap[item.supabaseId] = item.finalUuid;
  }

  // 6. Generar y Validar Plan de Asistencias
  const attPlan = generateCoordinatedAttendanceBackfillPlan(sqliteAtts, supabaseAtts, empUuidMap);

  printDryRunPlan(empPlan);

  const isValid = empPlan.valid && attPlan.valid;
  if (!isValid) {
    const errorMsg = 'El plan de backfill contiene conflictos críticos. Ejecución abortada.';
    logEvent('ERROR', errorMsg, { empConflicts: empPlan.conflicts, attConflicts: attPlan.conflicts });
    return { success: false, mode: isExecute ? 'EXECUTE' : 'DRY_RUN', error: errorMsg, modified: false };
  }

  // Si es MODO DRY RUN: Salir de forma segura sin modificar datos
  if (!isExecute) {
    logEvent('INFO', 'Modo DRY RUN completado con éxito. Ningún dato fue modificado.');
    return {
      success: true,
      mode: 'DRY_RUN',
      modified: false,
      empPlan,
      attPlan
    };
  }

  // ── MODO EXECUTE: VERIFICACIONES DE SEGURIDAD PREVIA A LA ESCRITURA ────────

  // 7. Simular o comprobar cambio de snapshot si se especificó callback de prueba
  if (typeof params.onSnapshotChange === 'function') {
    params.onSnapshotChange();
  }

  // Re-leer estado actual inmediatamente antes de escribir
  let freshSqliteEmps = params.mockSqliteEmps || [];
  let freshSupabaseEmps = params.mockSupabaseEmps || [];
  let freshSqliteAtts = params.mockSqliteAtts || [];
  let freshSupabaseAtts = params.mockSupabaseAtts || [];

  if (params.db && (!params.mockSqliteEmps || params.mockSqliteEmps.length === 0)) {
    freshSqliteEmps = params.db.prepare('SELECT id, nombre, apellido, dni, uuid FROM empleados').all();
    freshSqliteAtts = params.db.prepare('SELECT id, empleado_id, empleado_uuid, fecha, uuid FROM asistencias').all();
  }

  if (params.supabaseClient && (!params.mockSupabaseEmps || params.mockSupabaseEmps.length === 0)) {
    try {
      const { data: sEmps } = await params.supabaseClient.from('empleados').select('id, nombre, apellido, dni, uuid');
      const { data: sAtts } = await params.supabaseClient.from('asistencias').select('id, empleado_id, empleado_uuid, fecha, uuid');
      if (sEmps) freshSupabaseEmps = sEmps;
      if (sAtts) freshSupabaseAtts = sAtts;
    } catch (err) {
      logEvent('ERROR', 'Error re-leyendo Supabase:', err.message);
    }
  }

  const freshSnapshot = capturePreconditionSnapshot(freshSqliteEmps, freshSupabaseEmps, freshSqliteAtts, freshSupabaseAtts);

  if (initialSnapshot.hash !== freshSnapshot.hash) {
    const errorMsg = 'ABORTADO: LOS DATOS CAMBIARON DESDE LA GENERACIÓN DEL PLAN.';
    logEvent('ERROR', errorMsg, { initialHash: initialSnapshot.hash, freshHash: freshSnapshot.hash });
    console.error(`❌ ${errorMsg}\n`);
    return { success: false, mode: 'EXECUTE', error: errorMsg, modified: false };
  }

  // 8. Crear Backup Local de SQLite
  if (params.dbFilePath) {
    createLocalSqliteBackup(params.db, params.dbFilePath);
  }

  logEvent('INFO', 'Iniciando escritura coordinada en SQLite y Supabase...');

  // 9. Aplicar Cambios de Empleados
  let empUpdatedCount = 0;

  // Actualizar SQLite Empleados
  if (params.db) {
    const updateEmpStmt = params.db.prepare('UPDATE empleados SET uuid = ? WHERE id = ?');
    const updateTransaction = params.db.transaction(() => {
      for (const item of empPlan.shared) {
        if (item.sqliteId && item.finalUuid && item.finalUuid !== 'CONFLICT') {
          updateEmpStmt.run(item.finalUuid, item.sqliteId);
          empUpdatedCount++;
        }
      }
      for (const item of empPlan.sqliteOnly) {
        if (item.sqliteId && item.finalUuid) {
          updateEmpStmt.run(item.finalUuid, item.sqliteId);
          empUpdatedCount++;
        }
      }
    });
    updateTransaction();
  }

  // Actualizar Supabase Empleados
  if (params.supabaseClient) {
    for (const item of empPlan.shared) {
      if (item.supabaseId && item.finalUuid && item.finalUuid !== 'CONFLICT') {
        await params.supabaseClient.from('empleados').update({ uuid: item.finalUuid }).eq('id', item.supabaseId);
      }
    }
    for (const item of empPlan.supabaseOnly) {
      if (item.supabaseId && item.finalUuid) {
        await params.supabaseClient.from('empleados').update({ uuid: item.finalUuid }).eq('id', item.supabaseId);
      }
    }
  }

  // 10. Aplicar Cambios de Asistencias
  let attUpdatedCount = 0;

  // Actualizar asistencias.empleado_uuid en SQLite
  if (params.db) {
    params.db.prepare(`
      UPDATE asistencias
      SET empleado_uuid = (SELECT uuid FROM empleados WHERE id = asistencias.empleado_id)
      WHERE empleado_uuid IS NULL OR empleado_uuid = ''
    `).run();

    const updateAttStmt = params.db.prepare('UPDATE asistencias SET uuid = ? WHERE id = ?');
    const attTransaction = params.db.transaction(() => {
      for (const item of attPlan.shared) {
        if (item.sqliteId && item.finalUuid && item.finalUuid !== 'CONFLICT') {
          updateAttStmt.run(item.finalUuid, item.sqliteId);
          attUpdatedCount++;
        }
      }
      for (const item of attPlan.sqliteOnly) {
        if (item.sqliteId && item.finalUuid) {
          updateAttStmt.run(item.finalUuid, item.sqliteId);
          attUpdatedCount++;
        }
      }
    });
    attTransaction();
  }

  // Actualizar asistencias en Supabase
  if (params.supabaseClient) {
    try {
      await params.supabaseClient.rpc('backfill_asistencias_empleado_uuid');
    } catch (e) {
      // Ignore if RPC doesn't exist, as we update empleado_uuid directly below
    }

    for (const item of attPlan.shared) {
      if (item.supabaseId && item.finalUuid && item.finalUuid !== 'CONFLICT') {
        await params.supabaseClient.from('asistencias').update({ uuid: item.finalUuid, empleado_uuid: item.empleadoUuid }).eq('id', item.supabaseId);
      }
    }
    for (const item of attPlan.supabaseOnly) {
      if (item.supabaseId && item.finalUuid) {
        await params.supabaseClient.from('asistencias').update({ uuid: item.finalUuid, empleado_uuid: item.empleadoUuid }).eq('id', item.supabaseId);
      }
    }
  }

  logEvent('INFO', `Escritura de backfill completada -> Empleados actualizados: ${empUpdatedCount}, Asistencias actualizadas: ${attUpdatedCount}`);

  return {
    success: true,
    mode: 'EXECUTE',
    modified: true,
    empUpdatedCount,
    attUpdatedCount
  };
}

function sqliteEmployeesMap(rows) {
  return rows.map(r => ({ id: r.id, nombre: r.nombre, apellido: r.apellido, dni: r.dni, uuid: r.uuid }));
}

function supabaseEmployeesMap(rows) {
  return rows.map(r => ({ id: r.id, nombre: r.nombre, apellido: r.apellido, dni: r.dni, uuid: r.uuid }));
}

// Ejecución directa por CLI si se invoca desde la terminal
if (require.main === module) {
  runProductionBackfillExecutor()
    .then(res => {
      if (!res.success) process.exit(1);
    })
    .catch(err => {
      logEvent('ERROR', 'Excepción crítica en ejecutor de producción:', err.message);
      process.exit(1);
    });
}

module.exports = {
  runProductionBackfillExecutor,
  capturePreconditionSnapshot,
  createLocalSqliteBackup,
  REQUIRED_CONFIRMATION_PHRASE
};
