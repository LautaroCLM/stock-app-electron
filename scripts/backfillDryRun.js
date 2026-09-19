// scripts/backfillDryRun.js
//
// Herramienta de Auditoría y Planificación de Backfill Coordenado (DRY RUN).
// Compara empleados y asistencias entre SQLite y Supabase sin modificar datos.

'use strict';

const crypto = require('crypto');

/**
 * Normaliza cualquier formato de fecha (TIMESTAMPTZ, ISO, Date, YYYY-MM-DD) a 'YYYY-MM-DD'.
 * @param {string|Date} fechaVal
 * @returns {string} Fecha normalizada YYYY-MM-DD.
 */
function normalizeDate(fechaVal) {
  if (!fechaVal) return '';
  if (typeof fechaVal === 'string') {
    return fechaVal.split('T')[0].split(' ')[0].trim();
  }
  if (fechaVal instanceof Date) {
    return fechaVal.toISOString().split('T')[0];
  }
  return String(fechaVal).trim();
}

/**
 * Analiza los datos de empleados entre SQLite y Supabase y genera un plan de backfill coordinado.
 * @param {Array<object>} sqliteEmployees - Empleados de SQLite local [{ id, nombre, apellido, dni, uuid }]
 * @param {Array<object>} supabaseEmployees - Empleados de Supabase [{ id, nombre, apellido, dni, uuid }]
 * @returns {object} Plan de backfill estructurado con acciones, asignaciones y conflictos.
 */
function generateCoordinatedBackfillPlan(sqliteEmployees = [], supabaseEmployees = []) {
  const plan = {
    shared: [],
    supabaseOnly: [],
    sqliteOnly: [],
    conflicts: [],
    valid: true
  };

  // 1. Detectar DNIs duplicados dentro de SQLite o dentro de Supabase
  const sqliteDniCounts = {};
  for (const emp of sqliteEmployees) {
    if (emp.dni) {
      const dni = String(emp.dni).trim();
      sqliteDniCounts[dni] = (sqliteDniCounts[dni] || 0) + 1;
    }
  }

  const supabaseDniCounts = {};
  for (const emp of supabaseEmployees) {
    if (emp.dni) {
      const dni = String(emp.dni).trim();
      supabaseDniCounts[dni] = (supabaseDniCounts[dni] || 0) + 1;
    }
  }

  for (const [dni, count] of Object.entries(sqliteDniCounts)) {
    if (count > 1) {
      plan.conflicts.push({
        type: 'DUPLICATE_DNI_SQLITE',
        dni,
        detail: `DNI ${dni} aparece ${count} veces en SQLite.`
      });
      plan.valid = false;
    }
  }

  for (const [dni, count] of Object.entries(supabaseDniCounts)) {
    if (count > 1) {
      plan.conflicts.push({
        type: 'DUPLICATE_DNI_SUPABASE',
        dni,
        detail: `DNI ${dni} aparece ${count} veces en Supabase.`
      });
      plan.valid = false;
    }
  }

  const sqliteMapByDni = new Map();
  for (const emp of sqliteEmployees) {
    if (emp.dni) sqliteMapByDni.set(String(emp.dni).trim(), emp);
  }

  const supabaseMapByDni = new Map();
  for (const emp of supabaseEmployees) {
    if (emp.dni) supabaseMapByDni.set(String(emp.dni).trim(), emp);
  }

  const processedDnis = new Set();

  for (const [dni, sqliteEmp] of sqliteMapByDni.entries()) {
    processedDnis.add(dni);
    const supabaseEmp = supabaseMapByDni.get(dni);

    if (supabaseEmp) {
      const localUuid = sqliteEmp.uuid || null;
      const remoteUuid = supabaseEmp.uuid || null;

      let finalUuid = null;
      let action = 'ASSIGN_SHARED_UUID';

      if (!localUuid && !remoteUuid) {
        finalUuid = crypto.randomUUID();
        action = 'GENERATE_NEW_SHARED_UUID';
      } else if (localUuid && !remoteUuid) {
        finalUuid = localUuid;
        action = 'COPY_LOCAL_TO_REMOTE';
      } else if (!localUuid && remoteUuid) {
        finalUuid = remoteUuid;
        action = 'COPY_REMOTE_TO_LOCAL';
      } else if (localUuid === remoteUuid) {
        finalUuid = localUuid;
        action = 'KEEP_EXISTING_SHARED_UUID';
      } else {
        action = 'CONFLICT_UUID_MISMATCH';
        plan.conflicts.push({
          type: 'UUID_MISMATCH',
          dni,
          sqliteId: sqliteEmp.id,
          sqliteUuid: localUuid,
          supabaseId: supabaseEmp.id,
          supabaseUuid: remoteUuid,
          detail: `DNI ${dni} posee UUID local (${localUuid}) diferente al UUID remoto (${remoteUuid}).`
        });
        plan.valid = false;
      }

      plan.shared.push({
        dni,
        nombre: `${sqliteEmp.apellido || ''}, ${sqliteEmp.nombre || ''}`,
        sqliteId: sqliteEmp.id,
        sqliteUuid: localUuid || 'NULL',
        supabaseId: supabaseEmp.id,
        supabaseUuid: remoteUuid || 'NULL',
        finalUuid: finalUuid || 'CONFLICT',
        action
      });
    } else {
      const finalUuid = sqliteEmp.uuid || crypto.randomUUID();
      plan.sqliteOnly.push({
        dni,
        nombre: `${sqliteEmp.apellido || ''}, ${sqliteEmp.nombre || ''}`,
        sqliteId: sqliteEmp.id,
        sqliteUuid: sqliteEmp.uuid || 'NULL',
        finalUuid,
        action: sqliteEmp.uuid ? 'KEEP_LOCAL_UUID' : 'GENERATE_LOCAL_UUID'
      });
    }
  }

  for (const [dni, supabaseEmp] of supabaseMapByDni.entries()) {
    if (!processedDnis.has(dni)) {
      const finalUuid = supabaseEmp.uuid || crypto.randomUUID();
      plan.supabaseOnly.push({
        dni,
        nombre: `${supabaseEmp.apellido || ''}, ${supabaseEmp.nombre || ''}`,
        supabaseId: supabaseEmp.id,
        supabaseUuid: supabaseEmp.uuid || 'NULL',
        finalUuid,
        action: supabaseEmp.uuid ? 'KEEP_REMOTE_UUID' : 'GENERATE_REMOTE_UUID'
      });
    }
  }

  return plan;
}

/**
 * Analiza los datos de asistencias entre SQLite y Supabase y genera un plan de backfill coordinado para asistencias.uuid.
 * @param {Array<object>} sqliteAttendances - [{ id, empleado_id, empleado_uuid, fecha, uuid }]
 * @param {Array<object>} supabaseAttendances - [{ id, empleado_id, empleado_uuid, fecha, uuid }]
 * @param {object} employeeMap - Mapa empleado_id -> empleado_uuid si hiciera falta resolverlo
 * @returns {object} Plan de backfill coordinado de asistencias.
 */
function generateCoordinatedAttendanceBackfillPlan(sqliteAttendances = [], supabaseAttendances = [], employeeMap = {}) {
  const plan = {
    shared: [],
    supabaseOnly: [],
    sqliteOnly: [],
    conflicts: [],
    valid: true
  };

  function buildLogicalKey(att) {
    const empUuid = att.empleado_uuid || employeeMap[att.empleado_id] || null;
    const normDate = normalizeDate(att.fecha);
    if (!empUuid || !normDate) return null;
    return `${empUuid}::${normDate}`;
  }

  const sqliteKeyCounts = {};
  for (const att of sqliteAttendances) {
    const key = buildLogicalKey(att);
    if (key) {
      sqliteKeyCounts[key] = (sqliteKeyCounts[key] || 0) + 1;
    }
  }

  const supabaseKeyCounts = {};
  for (const att of supabaseAttendances) {
    const key = buildLogicalKey(att);
    if (key) {
      supabaseKeyCounts[key] = (supabaseKeyCounts[key] || 0) + 1;
    }
  }

  for (const [key, count] of Object.entries(sqliteKeyCounts)) {
    if (count > 1) {
      plan.conflicts.push({
        type: 'DUPLICATE_ATTENDANCE_SQLITE',
        key,
        detail: `Asistencia clave (${key}) aparece ${count} veces en SQLite.`
      });
      plan.valid = false;
    }
  }

  for (const [key, count] of Object.entries(supabaseKeyCounts)) {
    if (count > 1) {
      plan.conflicts.push({
        type: 'DUPLICATE_ATTENDANCE_SUPABASE',
        key,
        detail: `Asistencia clave (${key}) aparece ${count} veces en Supabase.`
      });
      plan.valid = false;
    }
  }

  const sqliteMapByKey = new Map();
  for (const att of sqliteAttendances) {
    const key = buildLogicalKey(att);
    if (key) sqliteMapByKey.set(key, att);
  }

  const supabaseMapByKey = new Map();
  for (const att of supabaseAttendances) {
    const key = buildLogicalKey(att);
    if (key) supabaseMapByKey.set(key, att);
  }

  const processedKeys = new Set();

  for (const [key, sqliteAtt] of sqliteMapByKey.entries()) {
    processedKeys.add(key);
    const supabaseAtt = supabaseMapByKey.get(key);

    const localAttUuid = sqliteAtt.uuid || null;
    const normDate = normalizeDate(sqliteAtt.fecha);
    const empUuid = sqliteAtt.empleado_uuid || employeeMap[sqliteAtt.empleado_id] || 'DESCONOCIDO';

    if (supabaseAtt) {
      const remoteAttUuid = supabaseAtt.uuid || null;
      let finalUuid = null;
      let action = 'ASSIGN_SHARED_ATTENDANCE_UUID';

      if (!localAttUuid && !remoteAttUuid) {
        finalUuid = crypto.randomUUID();
        action = 'GENERATE_NEW_SHARED_ATTENDANCE_UUID';
      } else if (localAttUuid && !remoteAttUuid) {
        finalUuid = localAttUuid;
        action = 'COPY_LOCAL_ATTENDANCE_UUID_TO_REMOTE';
      } else if (!localAttUuid && remoteAttUuid) {
        finalUuid = remoteAttUuid;
        action = 'COPY_REMOTE_ATTENDANCE_UUID_TO_LOCAL';
      } else if (localAttUuid === remoteAttUuid) {
        finalUuid = localAttUuid;
        action = 'KEEP_EXISTING_SHARED_ATTENDANCE_UUID';
      } else {
        action = 'CONFLICT_ATTENDANCE_UUID_MISMATCH';
        plan.conflicts.push({
          type: 'ATTENDANCE_UUID_MISMATCH',
          key,
          sqliteId: sqliteAtt.id,
          sqliteUuid: localAttUuid,
          supabaseId: supabaseAtt.id,
          supabaseUuid: remoteAttUuid,
          detail: `Asistencia ${key} posee UUID local (${localAttUuid}) diferente a UUID remoto (${remoteAttUuid}).`
        });
        plan.valid = false;
      }

      plan.shared.push({
        key,
        empleadoUuid: empUuid,
        fecha: normDate,
        sqliteId: sqliteAtt.id,
        sqliteUuid: localAttUuid || 'NULL',
        supabaseId: supabaseAtt.id,
        supabaseUuid: remoteAttUuid || 'NULL',
        finalUuid: finalUuid || 'CONFLICT',
        action
      });
    } else {
      const finalUuid = localAttUuid || crypto.randomUUID();
      plan.sqliteOnly.push({
        key,
        empleadoUuid: empUuid,
        fecha: normDate,
        sqliteId: sqliteAtt.id,
        sqliteUuid: localAttUuid || 'NULL',
        finalUuid,
        action: localAttUuid ? 'KEEP_LOCAL_ATTENDANCE_UUID' : 'GENERATE_LOCAL_ATTENDANCE_UUID'
      });
    }
  }

  for (const [key, supabaseAtt] of supabaseMapByKey.entries()) {
    if (!processedKeys.has(key)) {
      const remoteAttUuid = supabaseAtt.uuid || null;
      const normDate = normalizeDate(supabaseAtt.fecha);
      const empUuid = supabaseAtt.empleado_uuid || employeeMap[supabaseAtt.empleado_id] || 'DESCONOCIDO';
      const finalUuid = remoteAttUuid || crypto.randomUUID();

      plan.supabaseOnly.push({
        key,
        empleadoUuid: empUuid,
        fecha: normDate,
        supabaseId: supabaseAtt.id,
        supabaseUuid: remoteAttUuid || 'NULL',
        finalUuid,
        action: remoteAttUuid ? 'KEEP_REMOTE_ATTENDANCE_UUID' : 'GENERATE_REMOTE_ATTENDANCE_UUID'
      });
    }
  }

  return plan;
}

/**
 * Formatea e imprime el plan DRY RUN en consola.
 */
function printDryRunPlan(plan) {
  console.log('===================================================================================');
  console.log('                 PLAN DE BACKFILL COORDINADO DE EMPLEADOS (DRY RUN)');
  console.log('===================================================================================\n');

  console.log('--- 1. EMPLEADOS COMPARTIDOS (POR DNI) ---');
  if (plan.shared.length === 0) {
    console.log('  (Ningún empleado compartido)');
  } else {
    console.table(plan.shared);
  }

  console.log('\n--- 2. EMPLEADOS SOLO EN SUPABASE ---');
  if (plan.supabaseOnly.length === 0) {
    console.log('  (Ningún empleado exclusivo de Supabase)');
  } else {
    console.table(plan.supabaseOnly);
  }

  console.log('\n--- 3. EMPLEADOS SOLO EN SQLITE ---');
  if (plan.sqliteOnly.length === 0) {
    console.log('  (Ningún empleado exclusivo de SQLite)');
  } else {
    console.table(plan.sqliteOnly);
  }

  console.log('\n--- 4. DETECCIÓN DE CONFLICTOS ---');
  if (plan.conflicts.length === 0) {
    console.log('  ✅ NINGÚN CONFLICTO DETECTADO. PLAN VÁLIDO PARA EJECUCIÓN.');
  } else {
    console.log(`  ❌ SE DETECTARON ${plan.conflicts.length} CONFLICTOS CRÍTICOS:` + '\n');
    console.table(plan.conflicts);
  }

  console.log('\n===================================================================================');
  console.log(` RESULTADO DRY RUN: ${plan.valid ? 'PLAN VÁLIDO Y SEGURO (READY)' : 'BLOQUEADO POR CONFLICTOS'}`);
  console.log('===================================================================================\n');
}

module.exports = {
  normalizeDate,
  generateCoordinatedBackfillPlan,
  generateCoordinatedAttendanceBackfillPlan,
  printDryRunPlan
};
