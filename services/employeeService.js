// services/employeeService.js
//
// Servicio para el módulo de Empleados, Horarios, Asistencias y Liquidaciones.
// Encapsula las operaciones de datos en SQLite local e integra Dual Write a Supabase.
// Fase 1B.1 — Identidad lógica UUID desacoplada, detección explícita de conflictos y migración ordenada.

'use strict';

const crypto = require('crypto');
const supabaseEmployeeService = require('./supabaseEmployeeService');

/**
 * Fábrica del servicio de Empleados.
 * @param {import('better-sqlite3').Database} db - Instancia de SQLite local.
 * @param {function(string, string): void} [registrarAccion] - Función opcional de auditoría de main.js.
 * @param {object} [syncManager=null] - Instancia de SyncManager para encolado offline.
 * @returns {object} Objeto con la API pública del servicio.
 */
function createEmployeeService(db, registrarAccion, syncManager = null) {
  if (!db) {
    throw new Error('[EmployeeService] Instancia de base de datos requerida.');
  }

  // ── MIGRACION Y BACKFILL DE UUID EN SQLITE LOCAL ──────────────────────────
  // Orden seguro de migración: 1) Agregar columnas -> 2) Backfill -> 3) Crear Índices UNIQUE
  try {
    const empCols = new Set(db.prepare("PRAGMA table_info(empleados)").all().map(c => c.name));
    if (!empCols.has('uuid')) {
      db.prepare("ALTER TABLE empleados ADD COLUMN uuid TEXT").run();
      console.log('[EmployeeService] Columna uuid agregada a empleados en SQLite.');
    }

    const attCols = new Set(db.prepare("PRAGMA table_info(asistencias)").all().map(c => c.name));
    if (!attCols.has('uuid')) {
      db.prepare("ALTER TABLE asistencias ADD COLUMN uuid TEXT").run();
      console.log('[EmployeeService] Columna uuid agregada a asistencias en SQLite.');
    }
    if (!attCols.has('empleado_uuid')) {
      db.prepare("ALTER TABLE asistencias ADD COLUMN empleado_uuid TEXT").run();
      console.log('[EmployeeService] Columna empleado_uuid agregada a asistencias en SQLite.');
    }

    // 2) Backfill de UUIDs en empleados sin UUID
    const unbackfilledEmps = db.prepare("SELECT id FROM empleados WHERE uuid IS NULL OR uuid = ''").all();
    if (unbackfilledEmps.length > 0) {
      const updateEmpStmt = db.prepare("UPDATE empleados SET uuid = ? WHERE id = ?");
      for (const row of unbackfilledEmps) {
        updateEmpStmt.run(crypto.randomUUID(), row.id);
      }
      console.log(`[EmployeeService] Backfill UUID completado para ${unbackfilledEmps.length} empleados.`);
    }

    // Backfill de UUIDs en asistencias sin UUID
    const unbackfilledAtts = db.prepare("SELECT id FROM asistencias WHERE uuid IS NULL OR uuid = ''").all();
    if (unbackfilledAtts.length > 0) {
      const updateAttStmt = db.prepare("UPDATE asistencias SET uuid = ? WHERE id = ?");
      for (const row of unbackfilledAtts) {
        updateAttStmt.run(crypto.randomUUID(), row.id);
      }
      console.log(`[EmployeeService] Backfill UUID completado para ${unbackfilledAtts.length} asistencias.`);
    }

    // Backfill de empleado_uuid en asistencias
    db.prepare(`
      UPDATE asistencias
      SET empleado_uuid = (SELECT uuid FROM empleados WHERE id = asistencias.empleado_id)
      WHERE empleado_uuid IS NULL OR empleado_uuid = ''
    `).run();

    // 3) Crear índices UNIQUE e índices de búsqueda una vez completado el backfill
    db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_empleados_uuid ON empleados(uuid)").run();
    db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_asistencias_uuid ON asistencias(uuid)").run();
    db.prepare("CREATE INDEX IF NOT EXISTS idx_asistencias_empleado_uuid ON asistencias(empleado_uuid)").run();

  } catch (migErr) {
    console.warn('[EmployeeService] Error en verificación de esquema / backfill UUID:', migErr.message);
  }

  function handleDualWrite(promise, entity, action, payload) {
    promise
      .then(res => {
        if (!res || !res.success) {
          console.warn(`[EmployeeService] Dual Write hacia Supabase no exitoso (${action}). Registrando en offline_queue.`);
          if (syncManager) {
            syncManager.queueOperation({ entity, action, payload });
          }
        }
      })
      .catch(err => {
        console.error(`[EmployeeService] Error en Dual Write hacia Supabase (${action}):`, err.message || err);
        if (syncManager) {
          syncManager.queueOperation({ entity, action, payload });
        }
      });
  }

  // ── EMPLEADOS ──────────────────────────────────────────────────────────────
  function getEmployees() {
    return db.prepare(`
      SELECT e.*, c.valor_hora, c.costo_mensual
      FROM empleados e
      LEFT JOIN empleado_liquidacion_config c ON e.id = c.empleado_id
      ORDER BY e.apellido ASC, e.nombre ASC
    `).all();
  }

  function addEmployee(emp) {
    if (!emp || !emp.nombre || !emp.apellido || !emp.dni) {
      return { success: false, error: 'Nombre, apellido y DNI son obligatorios.' };
    }

    const dniClean = emp.dni.trim();
    const exists = db.prepare('SELECT id FROM empleados WHERE dni = ?').get(dniClean);
    if (exists) {
      return { success: false, error: 'Ya existe un empleado registrado con ese DNI.' };
    }

    const empUuid = emp.uuid || crypto.randomUUID();

    const stmt = db.prepare(`
      INSERT INTO empleados (
        uuid, nombre, apellido, dni, telefono, email, direccion,
        fecha_nacimiento, cargo, fecha_ingreso, estado, observaciones
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const info = stmt.run(
      empUuid,
      emp.nombre.trim(),
      emp.apellido.trim(),
      dniClean,
      emp.telefono || '',
      emp.email || '',
      emp.direccion || '',
      emp.fecha_nacimiento || null,
      emp.cargo || 'Empleado',
      emp.fecha_ingreso || null,
      emp.estado || 'Activo',
      emp.observaciones || ''
    );

    const empId = info.lastInsertRowid;

    if (typeof registrarAccion === 'function') {
      registrarAccion('Agregar empleado', `Empleado: ${emp.nombre} ${emp.apellido} (DNI: ${emp.dni})`);
    }

    const payload = {
      id: empId,
      uuid: empUuid,
      nombre: emp.nombre.trim(),
      apellido: emp.apellido.trim(),
      dni: dniClean,
      telefono: emp.telefono || '',
      email: emp.email || '',
      direccion: emp.direccion || '',
      fecha_nacimiento: emp.fecha_nacimiento || null,
      cargo: emp.cargo || 'Empleado',
      fecha_ingreso: emp.fecha_ingreso || null,
      estado: emp.estado || 'Activo',
      observaciones: emp.observaciones || ''
    };

    handleDualWrite(
      supabaseEmployeeService.addEmployee(payload),
      'empleados',
      'INSERT',
      payload
    );

    return { success: true, id: empId, uuid: empUuid };
  }

  function updateEmployee(emp) {
    if (!emp || (!emp.id && !emp.uuid)) return { success: false, error: 'ID o UUID de empleado requerido.' };

    const existing = db.prepare('SELECT id, uuid FROM empleados WHERE id = ? OR uuid = ?').get(emp.id, emp.uuid);
    if (!existing) {
      return { success: false, error: 'Empleado no encontrado para actualizar.' };
    }

    const empId = existing.id;
    const empUuid = emp.uuid || existing.uuid || crypto.randomUUID();
    const dniClean = emp.dni ? emp.dni.trim() : '';

    const dniExists = db.prepare('SELECT id FROM empleados WHERE dni = ? AND id != ?').get(dniClean, empId);
    if (dniExists) {
      return { success: false, error: 'El DNI ingresado ya está asignado a otro empleado.' };
    }

    const stmt = db.prepare(`
      UPDATE empleados SET
        uuid = ?, nombre = ?, apellido = ?, dni = ?, telefono = ?, email = ?,
        direccion = ?, fecha_nacimiento = ?, cargo = ?, fecha_ingreso = ?,
        estado = ?, observaciones = ?
      WHERE id = ?
    `);

    stmt.run(
      empUuid,
      emp.nombre ? emp.nombre.trim() : '',
      emp.apellido ? emp.apellido.trim() : '',
      dniClean,
      emp.telefono || '',
      emp.email || '',
      emp.direccion || '',
      emp.fecha_nacimiento || null,
      emp.cargo || 'Empleado',
      emp.fecha_ingreso || null,
      emp.estado || 'Activo',
      emp.observaciones || '',
      empId
    );

    if (typeof registrarAccion === 'function') {
      registrarAccion('Editar empleado', `Empleado ID: ${empId}, Nombre: ${emp.nombre} ${emp.apellido}`);
    }

    const payload = {
      id: Number(empId),
      uuid: empUuid,
      nombre: emp.nombre ? emp.nombre.trim() : '',
      apellido: emp.apellido ? emp.apellido.trim() : '',
      dni: dniClean,
      telefono: emp.telefono || '',
      email: emp.email || '',
      direccion: emp.direccion || '',
      fecha_nacimiento: emp.fecha_nacimiento || null,
      cargo: emp.cargo || 'Empleado',
      fecha_ingreso: emp.fecha_ingreso || null,
      estado: emp.estado || 'Activo',
      observaciones: emp.observaciones || ''
    };

    handleDualWrite(
      supabaseEmployeeService.updateEmployee(payload),
      'empleados',
      'UPDATE',
      payload
    );

    return { success: true, id: empId, uuid: empUuid };
  }

  function deleteEmployee(idOrUuid) {
    if (!idOrUuid) return { success: false, error: 'ID o UUID de empleado requerido.' };

    const emp = db.prepare('SELECT id, uuid, nombre, apellido FROM empleados WHERE id = ? OR uuid = ?').get(idOrUuid, idOrUuid);
    if (!emp) return { success: false, error: 'Empleado no encontrado.' };

    db.prepare('DELETE FROM empleados WHERE id = ?').run(emp.id);

    if (typeof registrarAccion === 'function') {
      registrarAccion('Eliminar empleado', `Empleado ID: ${emp.id}, Nombre: ${emp.nombre} ${emp.apellido}`);
    }

    handleDualWrite(
      supabaseEmployeeService.deleteEmployee(emp.uuid || emp.id),
      'empleados',
      'DELETE',
      { id: Number(emp.id), uuid: emp.uuid }
    );

    return { success: true };
  }

  function upsertEmployee(emp) {
    if (!emp || (!emp.id && !emp.uuid && !emp.dni)) {
      return { success: false, error: 'Identificador de empleado requerido.' };
    }

    const empUuid = emp.uuid || null;
    const dniClean = emp.dni ? String(emp.dni).trim() : null;

    // Estrategia de Reconciliación con Detección Explícita de Conflictos:
    // 1. Buscar coincidencia exacta por UUID
    // 2. Buscar coincidencia por DNI
    let existingByUuid = null;
    if (empUuid) {
      existingByUuid = db.prepare('SELECT id, uuid, dni FROM empleados WHERE uuid = ?').get(empUuid);
    }

    let existingByDni = null;
    if (dniClean) {
      existingByDni = db.prepare('SELECT id, uuid, dni FROM empleados WHERE dni = ?').get(dniClean);
    }

    // DETECCION EXPLICITA DE CONFLICTO:
    // Si coincide por DNI pero el empleado local YA tiene un UUID asignado diferente al UUID remoto proporcionado,
    // NO resolver silenciosamente -> reportar conflicto explícito y lanzar excepción para detener sincronización de esta fila.
    if (existingByDni && empUuid && existingByDni.uuid && existingByDni.uuid !== empUuid) {
      const msg = `[ConflictDetected] Conflicto explícito de identidad UUID para DNI ${dniClean}: local (${existingByDni.uuid}) vs remoto (${empUuid})`;
      console.error(msg);
      throw new Error(msg);
    }

    const existing = existingByUuid || existingByDni || (emp.id ? db.prepare('SELECT id, uuid, dni FROM empleados WHERE id = ?').get(Number(emp.id)) : null);
    const finalUuid = empUuid || existing?.uuid || crypto.randomUUID();

    if (existing) {
      // Actualizar registro local manteniendo su PK física (id) intacta
      const stmt = db.prepare(`
        UPDATE empleados SET
          uuid = ?,
          nombre = ?,
          apellido = ?,
          dni = ?,
          telefono = ?,
          email = ?,
          direccion = ?,
          fecha_nacimiento = ?,
          cargo = ?,
          fecha_ingreso = ?,
          estado = ?,
          observaciones = ?
        WHERE id = ?
      `);

      stmt.run(
        finalUuid,
        emp.nombre || '',
        emp.apellido || '',
        dniClean || '',
        emp.telefono || '',
        emp.email || '',
        emp.direccion || '',
        emp.fecha_nacimiento || null,
        emp.cargo || 'Empleado',
        emp.fecha_ingreso || null,
        emp.estado || 'Activo',
        emp.observaciones || '',
        existing.id
      );

      return { success: true, id: existing.id, uuid: finalUuid };
    } else {
      // Insertar nuevo empleado localmente
      const stmt = db.prepare(`
        INSERT INTO empleados (
          uuid, nombre, apellido, dni, telefono, email, direccion,
          fecha_nacimiento, cargo, fecha_ingreso, estado, observaciones
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const info = stmt.run(
        finalUuid,
        emp.nombre || '',
        emp.apellido || '',
        dniClean || '',
        emp.telefono || '',
        emp.email || '',
        emp.direccion || '',
        emp.fecha_nacimiento || null,
        emp.cargo || 'Empleado',
        emp.fecha_ingreso || null,
        emp.estado || 'Activo',
        emp.observaciones || ''
      );

      return { success: true, id: info.lastInsertRowid, uuid: finalUuid };
    }
  }

  // ── ASISTENCIAS ────────────────────────────────────────────────────────────
  function getAttendances(filtros = {}) {
    let sql = `
      SELECT a.*, e.nombre as empleado_nombre, e.apellido as empleado_apellido, e.cargo as empleado_cargo
      FROM asistencias a
      JOIN empleados e ON a.empleado_id = e.id
      WHERE 1=1
    `;
    const params = [];

    if (filtros.fechaInicio) {
      sql += ' AND a.fecha >= ?';
      params.push(filtros.fechaInicio);
    }
    if (filtros.fechaFin) {
      sql += ' AND a.fecha <= ?';
      params.push(filtros.fechaFin);
    }
    if (filtros.empleadoId) {
      sql += ' AND a.empleado_id = ?';
      params.push(filtros.empleadoId);
    }

    sql += ' ORDER BY a.fecha DESC, e.apellido ASC';
    return db.prepare(sql).all(...params);
  }

  function saveAttendance(att) {
    if (!att || (!att.empleado_id && !att.empleado_uuid) || !att.fecha) {
      return { success: false, error: 'Empleado y fecha son obligatorios.' };
    }

    let emp = null;
    if (att.empleado_id) {
      emp = db.prepare('SELECT id, uuid FROM empleados WHERE id = ?').get(Number(att.empleado_id));
    }
    if (!emp && att.empleado_uuid) {
      emp = db.prepare('SELECT id, uuid FROM empleados WHERE uuid = ?').get(att.empleado_uuid);
    }

    if (!emp) {
      return { success: false, error: 'Empleado no encontrado para registrar asistencia.' };
    }

    const localEmpId = emp.id;
    const empUuid = emp.uuid;
    const attUuid = att.uuid || crypto.randomUUID();

    let existingAtt = db.prepare('SELECT id FROM asistencias WHERE uuid = ?').get(attUuid);
    if (!existingAtt) {
      existingAtt = db.prepare('SELECT id FROM asistencias WHERE empleado_id = ? AND fecha = ?').get(localEmpId, att.fecha);
    }

    let attId = null;

    if (existingAtt) {
      attId = existingAtt.id;
      db.prepare(`
        UPDATE asistencias SET
          uuid = ?,
          empleado_uuid = ?,
          hora_entrada = ?,
          hora_salida = ?,
          estado = ?,
          observaciones = ?
        WHERE id = ?
      `).run(
        attUuid,
        empUuid,
        att.hora_entrada || null,
        att.hora_salida || null,
        att.estado || 'Presente',
        att.observaciones || '',
        attId
      );
    } else {
      const stmt = db.prepare(`
        INSERT INTO asistencias (
          uuid, empleado_id, empleado_uuid, fecha, hora_entrada, hora_salida, estado, observaciones
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const info = stmt.run(
        attUuid,
        localEmpId,
        empUuid,
        att.fecha,
        att.hora_entrada || null,
        att.hora_salida || null,
        att.estado || 'Presente',
        att.observaciones || ''
      );
      attId = info.lastInsertRowid;
    }

    if (typeof registrarAccion === 'function') {
      registrarAccion('Registrar asistencia', `Empleado ID: ${localEmpId}, Fecha: ${att.fecha}, Estado: ${att.estado}`);
    }

    const payload = {
      id: attId,
      uuid: attUuid,
      empleado_id: Number(localEmpId),
      empleado_uuid: empUuid,
      fecha: att.fecha,
      hora_entrada: att.hora_entrada || null,
      hora_salida: att.hora_salida || null,
      estado: att.estado || 'Presente',
      observaciones: att.observaciones || ''
    };

    handleDualWrite(
      supabaseEmployeeService.addAttendance(payload),
      'asistencias',
      'INSERT',
      payload
    );

    return { success: true, id: attId, uuid: attUuid };
  }

  function deleteAttendance(idOrUuid) {
    if (!idOrUuid) return { success: false, error: 'ID o UUID de asistencia requerido.' };

    const att = db.prepare('SELECT id, uuid FROM asistencias WHERE id = ? OR uuid = ?').get(idOrUuid, idOrUuid);
    if (!att) return { success: false, error: 'Asistencia no encontrada.' };

    db.prepare('DELETE FROM asistencias WHERE id = ?').run(att.id);

    handleDualWrite(
      supabaseEmployeeService.deleteAttendance(att.uuid || att.id),
      'asistencias',
      'DELETE',
      { id: Number(att.id), uuid: att.uuid }
    );

    return { success: true };
  }

  function upsertAttendance(att) {
    if (!att || (!att.id && !att.uuid)) {
      return { success: false, error: 'ID o UUID de asistencia requerido.' };
    }

    const attUuid = att.uuid || crypto.randomUUID();

    // Resolver empleado local
    let emp = null;
    if (att.empleado_uuid) {
      emp = db.prepare('SELECT id, uuid FROM empleados WHERE uuid = ?').get(att.empleado_uuid);
    }
    if (!emp && att.empleado_id) {
      emp = db.prepare('SELECT id, uuid FROM empleados WHERE id = ?').get(Number(att.empleado_id));
    }

    if (!emp) {
      console.warn(`[EmployeeService] Omitiendo upsert de asistencia: empleado no encontrado para UUID ${att.empleado_uuid} / ID ${att.empleado_id}`);
      throw new Error(`Empleado no encontrado localmente para asistencia (UUID: ${att.empleado_uuid || 'N/A'}).`);
    }

    const localEmpId = emp.id;
    const empUuid = emp.uuid;

    // Identidad lógica de la asistencia: empleado_uuid + fecha
    let existingAtt = db.prepare('SELECT id FROM asistencias WHERE uuid = ?').get(attUuid);
    if (!existingAtt && att.fecha) {
      existingAtt = db.prepare('SELECT id FROM asistencias WHERE empleado_id = ? AND fecha = ?').get(localEmpId, att.fecha);
    }

    if (existingAtt) {
      db.prepare(`
        UPDATE asistencias SET
          uuid = ?,
          empleado_uuid = ?,
          hora_entrada = ?,
          hora_salida = ?,
          estado = ?,
          observaciones = ?
        WHERE id = ?
      `).run(
        attUuid,
        empUuid,
        att.hora_entrada || null,
        att.hora_salida || null,
        att.estado || 'Presente',
        att.observaciones || '',
        existingAtt.id
      );

      return { success: true, id: existingAtt.id, uuid: attUuid };
    } else {
      const stmt = db.prepare(`
        INSERT INTO asistencias (
          uuid, empleado_id, empleado_uuid, fecha, hora_entrada, hora_salida, estado, observaciones
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const info = stmt.run(
        attUuid,
        localEmpId,
        empUuid,
        att.fecha,
        att.hora_entrada || null,
        att.hora_salida || null,
        att.estado || 'Presente',
        att.observaciones || ''
      );

      return { success: true, id: info.lastInsertRowid, uuid: attUuid };
    }
  }

  // ── CONFIGURACION LIQUIDACION ──────────────────────────────────────────────
  function savePayrollConfig(config) {
    if (!config || !config.empleado_id) return { success: false, error: 'ID de empleado requerido.' };

    db.prepare(`
      INSERT OR REPLACE INTO empleado_liquidacion_config (empleado_id, valor_hora, costo_mensual, estado)
      VALUES (?, ?, ?, ?)
    `).run(config.empleado_id, config.valor_hora || 0, config.costo_mensual || 0, config.estado || 'Activo');

    if (typeof registrarAccion === 'function') {
      registrarAccion('Configuración Liquidación Empleado', `ID Empleado: ${config.empleado_id}`);
    }

    const payload = {
      empleado_id: Number(config.empleado_id),
      valor_hora: Number(config.valor_hora || 0),
      costo_mensual: Number(config.costo_mensual || 0),
      estado: config.estado || 'Activo'
    };

    handleDualWrite(
      supabaseEmployeeService.addPayrollConfig(payload),
      'empleado_liquidacion_config',
      'INSERT',
      payload
    );

    return { success: true };
  }

  function upsertPayrollConfig(config) {
    if (!config || !config.empleado_id) return { success: false, error: 'ID de empleado requerido.' };

    db.prepare(`
      INSERT INTO empleado_liquidacion_config (empleado_id, valor_hora, costo_mensual, estado)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(empleado_id) DO UPDATE SET
        valor_hora = excluded.valor_hora,
        costo_mensual = excluded.costo_mensual,
        estado = excluded.estado
    `).run(
      Number(config.empleado_id),
      Number(config.valor_hora || 0),
      Number(config.costo_mensual || 0),
      config.estado || 'Activo'
    );

    return { success: true };
  }

  function calcAttHoras(entrada, salida) {
    if (!entrada || !salida) return 0;
    const parts1 = String(entrada).split(':').map(Number);
    const parts2 = String(salida).split(':').map(Number);
    if (parts1.length < 2 || parts2.length < 2 || isNaN(parts1[0]) || isNaN(parts1[1]) || isNaN(parts2[0]) || isNaN(parts2[1])) {
      return 0;
    }
    let mins = (parts2[0] * 60 + parts2[1]) - (parts1[0] * 60 + parts1[1]);
    if (mins < 0) {
      mins += 24 * 60; // Cruce de medianoche (ej: 22:00 a 06:00)
    }
    return mins / 60;
  }

  function getPayrollEmployees(mes) {
    const employees = db.prepare(`
      SELECT e.id, e.uuid, e.nombre, e.apellido, e.dni, e.cargo, e.estado,
             COALESCE(c.valor_hora, 0) as valor_hora,
             COALESCE(c.costo_mensual, 0) as costo_mensual
      FROM empleados e
      LEFT JOIN empleado_liquidacion_config c ON e.id = c.empleado_id
      ORDER BY e.apellido ASC, e.nombre ASC
    `).all();

    return employees.map(emp => {
      const asistenciasMes = db.prepare(`
        SELECT hora_entrada, hora_salida, estado
        FROM asistencias
        WHERE empleado_id = ? AND strftime('%Y-%m', fecha) = ? AND estado IN ('Presente', 'Tarde')
      `).all(emp.id, mes);

      const attCount = asistenciasMes.length;

      let totalHoras = 0;
      for (const att of asistenciasMes) {
        totalHoras += calcAttHoras(att.hora_entrada, att.hora_salida);
      }

      const horasTrabajadas = parseFloat(totalHoras.toFixed(2));

      const liqExistente = db.prepare(`
        SELECT * FROM empleado_liquidaciones 
        WHERE empleado_id = ? AND mes = ?
      `).get(emp.id, mes);

      return {
        ...emp,
        mes,
        horas_trabajadas: liqExistente ? liqExistente.horas_trabajadas : horasTrabajadas,
        dias_trabajados: attCount,
        liquidacion: liqExistente || null
      };
    });
  }

  function savePayroll(liq) {
    if (!liq || !liq.empleado_id || !liq.mes) {
      return { success: false, error: 'Empleado y mes son obligatorios.' };
    }

    const stmt = db.prepare(`
      INSERT INTO empleado_liquidaciones (
        empleado_id, mes, horas_trabajadas, valor_hora, adicionales, descuentos, total_generado, total_liquidacion
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(empleado_id, mes) DO UPDATE SET
        horas_trabajadas = excluded.horas_trabajadas,
        valor_hora = excluded.valor_hora,
        adicionales = excluded.adicionales,
        descuentos = excluded.descuentos,
        total_generado = excluded.total_generado,
        total_liquidacion = excluded.total_liquidacion
    `);

    const info = stmt.run(
      liq.empleado_id,
      liq.mes,
      liq.horas_trabajadas || 0,
      liq.valor_hora || 0,
      liq.adicionales || 0,
      liq.descuentos || 0,
      liq.total_generado || 0,
      liq.total_liquidacion || 0
    );

    const liqId = info.lastInsertRowid || db.prepare('SELECT id FROM empleado_liquidaciones WHERE empleado_id = ? AND mes = ?').get(liq.empleado_id, liq.mes)?.id;

    if (typeof registrarAccion === 'function') {
      const emp = db.prepare('SELECT nombre, apellido FROM empleados WHERE id = ?').get(liq.empleado_id);
      const empName = emp ? `${emp.apellido}, ${emp.nombre}` : `ID ${liq.empleado_id}`;
      registrarAccion('Guardar Liquidación Empleado', `Liquidación de ${empName} para el mes ${liq.mes}. Total: $${liq.total_liquidacion}`);
    }

    const payload = {
      id: liqId,
      empleado_id: Number(liq.empleado_id),
      mes: liq.mes,
      horas_trabajadas: Number(liq.horas_trabajadas || 0),
      valor_hora: Number(liq.valor_hora || 0),
      adicionales: Number(liq.adicionales || 0),
      descuentos: Number(liq.descuentos || 0),
      total_generado: Number(liq.total_generado || 0),
      total_liquidacion: Number(liq.total_liquidacion || 0)
    };

    handleDualWrite(
      supabaseEmployeeService.addPayroll(payload),
      'empleado_liquidaciones',
      'INSERT',
      payload
    );

    return { success: true, id: liqId };
  }

  function deletePayroll(id) {
    if (!id) return { success: false, error: 'ID de liquidación requerido.' };

    db.prepare('DELETE FROM empleado_liquidaciones WHERE id = ?').run(id);

    handleDualWrite(
      supabaseEmployeeService.deletePayroll(id),
      'empleado_liquidaciones',
      'DELETE',
      { id: Number(id) }
    );

    return { success: true };
  }

  function upsertPayroll(liq) {
    if (!liq || !liq.id) return { success: false, error: 'ID de liquidación requerido.' };

    const stmt = db.prepare(`
      INSERT INTO empleado_liquidaciones (id, empleado_id, mes, horas_trabajadas, valor_hora, adicionales, descuentos, total_generado, total_liquidacion)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        empleado_id = excluded.empleado_id,
        mes = excluded.mes,
        horas_trabajadas = excluded.horas_trabajadas,
        valor_hora = excluded.valor_hora,
        adicionales = excluded.adicionales,
        descuentos = excluded.descuentos,
        total_generado = excluded.total_generado,
        total_liquidacion = excluded.total_liquidacion
    `);

    stmt.run(
      Number(liq.id),
      Number(liq.empleado_id),
      liq.mes,
      liq.horas_trabajadas !== undefined ? Number(liq.horas_trabajadas) : 0,
      liq.valor_hora !== undefined ? Number(liq.valor_hora) : 0,
      liq.adicionales !== undefined ? Number(liq.adicionales) : 0,
      liq.descuentos !== undefined ? Number(liq.descuentos) : 0,
      liq.total_generado !== undefined ? Number(liq.total_generado) : 0,
      liq.total_liquidacion !== undefined ? Number(liq.total_liquidacion) : 0
    );

    return { success: true, id: Number(liq.id) };
  }

  // ── HORARIOS ───────────────────────────────────────────────────────────────
  function getSchedules() {
    return db.prepare('SELECT * FROM horarios ORDER BY id ASC').all();
  }

  function saveSchedules(schedules) {
    const transaction = db.transaction(() => {
      const stmt = db.prepare(`
        UPDATE horarios SET hora_apertura = ?, hora_cierre = ?, estado = ? WHERE id = ?
      `);
      for (const s of schedules) {
        stmt.run(s.hora_apertura, s.hora_cierre, s.estado, s.id);
      }
      if (typeof registrarAccion === 'function') {
        registrarAccion('Editar horarios', 'Horarios de atención actualizados');
      }
      return { success: true };
    });
    return transaction();
  }

  // ── API pública del servicio ───────────────────────────────────────────────
  return {
    getEmployees,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    upsertEmployee,
    getAttendances,
    saveAttendance,
    deleteAttendance,
    upsertAttendance,
    savePayrollConfig,
    upsertPayrollConfig,
    getPayrollEmployees,
    savePayroll,
    deletePayroll,
    upsertPayroll,
    getSchedules,
    saveSchedules
  };
}

module.exports = createEmployeeService;
