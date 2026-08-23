// services/employeeService.js
//
// Servicio para el módulo de Empleados, Horarios, Asistencias y Liquidaciones.
// Encapsula las operaciones de datos en SQLite local e integra Dual Write a Supabase.

'use strict';

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

    const exists = db.prepare('SELECT id FROM empleados WHERE dni = ?').get(emp.dni);
    if (exists) {
      return { success: false, error: 'Ya existe un empleado registrado con ese DNI.' };
    }

    const stmt = db.prepare(`
      INSERT INTO empleados (
        nombre, apellido, dni, telefono, email, direccion,
        fecha_nacimiento, cargo, fecha_ingreso, estado, observaciones
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const info = stmt.run(
      emp.nombre.trim(),
      emp.apellido.trim(),
      emp.dni.trim(),
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
      nombre: emp.nombre.trim(),
      apellido: emp.apellido.trim(),
      dni: emp.dni.trim(),
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

    return { success: true, id: empId };
  }

  function updateEmployee(emp) {
    if (!emp || !emp.id) return { success: false, error: 'ID de empleado requerido.' };

    const exists = db.prepare('SELECT id FROM empleados WHERE dni = ? AND id != ?').get(emp.dni, emp.id);
    if (exists) {
      return { success: false, error: 'El DNI ingresado ya está asignado a otro empleado.' };
    }

    const stmt = db.prepare(`
      UPDATE empleados SET
        nombre = ?, apellido = ?, dni = ?, telefono = ?, email = ?,
        direccion = ?, fecha_nacimiento = ?, cargo = ?, fecha_ingreso = ?,
        estado = ?, observaciones = ?
      WHERE id = ?
    `);

    stmt.run(
      emp.nombre.trim(),
      emp.apellido.trim(),
      emp.dni.trim(),
      emp.telefono || '',
      emp.email || '',
      emp.direccion || '',
      emp.fecha_nacimiento || null,
      emp.cargo || 'Empleado',
      emp.fecha_ingreso || null,
      emp.estado || 'Activo',
      emp.observaciones || '',
      emp.id
    );

    if (typeof registrarAccion === 'function') {
      registrarAccion('Editar empleado', `Empleado ID: ${emp.id}, Nombre: ${emp.nombre} ${emp.apellido}`);
    }

    const payload = {
      id: Number(emp.id),
      nombre: emp.nombre.trim(),
      apellido: emp.apellido.trim(),
      dni: emp.dni.trim(),
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

    return { success: true };
  }

  function deleteEmployee(id) {
    if (!id) return { success: false, error: 'ID de empleado requerido.' };

    const emp = db.prepare('SELECT nombre, apellido FROM empleados WHERE id = ?').get(id);
    db.prepare('DELETE FROM empleados WHERE id = ?').run(id);

    if (typeof registrarAccion === 'function' && emp) {
      registrarAccion('Eliminar empleado', `Empleado ID: ${id}, Nombre: ${emp.nombre} ${emp.apellido}`);
    }

    handleDualWrite(
      supabaseEmployeeService.deleteEmployee(id),
      'empleados',
      'DELETE',
      { id: Number(id) }
    );

    return { success: true };
  }

  function upsertEmployee(emp) {
    if (!emp || !emp.id) return { success: false, error: 'ID de empleado requerido.' };

    const stmt = db.prepare(`
      INSERT INTO empleados (id, nombre, apellido, dni, telefono, email, direccion, fecha_nacimiento, cargo, fecha_ingreso, estado, observaciones)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        nombre = excluded.nombre,
        apellido = excluded.apellido,
        dni = excluded.dni,
        telefono = excluded.telefono,
        email = excluded.email,
        direccion = excluded.direccion,
        fecha_nacimiento = excluded.fecha_nacimiento,
        cargo = excluded.cargo,
        fecha_ingreso = excluded.fecha_ingreso,
        estado = excluded.estado,
        observaciones = excluded.observaciones
    `);

    stmt.run(
      Number(emp.id),
      emp.nombre || '',
      emp.apellido || '',
      emp.dni || '',
      emp.telefono || '',
      emp.email || '',
      emp.direccion || '',
      emp.fecha_nacimiento || null,
      emp.cargo || 'Empleado',
      emp.fecha_ingreso || null,
      emp.estado || 'Activo',
      emp.observaciones || ''
    );

    return { success: true, id: Number(emp.id) };
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
    if (!att || !att.empleado_id || !att.fecha) {
      return { success: false, error: 'Empleado y fecha son obligatorios.' };
    }

    const stmt = db.prepare(`
      INSERT INTO asistencias (
        empleado_id, fecha, hora_entrada, hora_salida, estado, observaciones
      ) VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(empleado_id, fecha) DO UPDATE SET
        hora_entrada = excluded.hora_entrada,
        hora_salida = excluded.hora_salida,
        estado = excluded.estado,
        observaciones = excluded.observaciones
    `);

    const info = stmt.run(
      att.empleado_id,
      att.fecha,
      att.hora_entrada || null,
      att.hora_salida || null,
      att.estado || 'Presente',
      att.observaciones || ''
    );

    const attId = info.lastInsertRowid || db.prepare('SELECT id FROM asistencias WHERE empleado_id = ? AND fecha = ?').get(att.empleado_id, att.fecha)?.id;

    if (typeof registrarAccion === 'function') {
      registrarAccion('Registrar asistencia', `Empleado ID: ${att.empleado_id}, Fecha: ${att.fecha}, Estado: ${att.estado}`);
    }

    const payload = {
      id: attId,
      empleado_id: Number(att.empleado_id),
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

    return { success: true, id: attId };
  }

  function deleteAttendance(id) {
    if (!id) return { success: false, error: 'ID de asistencia requerido.' };

    db.prepare('DELETE FROM asistencias WHERE id = ?').run(id);

    handleDualWrite(
      supabaseEmployeeService.deleteAttendance(id),
      'asistencias',
      'DELETE',
      { id: Number(id) }
    );

    return { success: true };
  }

  function upsertAttendance(att) {
    if (!att || !att.id) return { success: false, error: 'ID de asistencia requerido.' };

    const stmt = db.prepare(`
      INSERT INTO asistencias (id, empleado_id, fecha, hora_entrada, hora_salida, estado, observaciones)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        empleado_id = excluded.empleado_id,
        fecha = excluded.fecha,
        hora_entrada = excluded.hora_entrada,
        hora_salida = excluded.hora_salida,
        estado = excluded.estado,
        observaciones = excluded.observaciones
    `);

    stmt.run(
      Number(att.id),
      Number(att.empleado_id),
      att.fecha,
      att.hora_entrada || null,
      att.hora_salida || null,
      att.estado || 'Presente',
      att.observaciones || ''
    );

    return { success: true, id: Number(att.id) };
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
      SELECT e.id, e.nombre, e.apellido, e.dni, e.cargo, e.estado,
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
