// services/machineService.js
//
// Servicio para el módulo de Máquinas y Equipos.
// Encapsula las operaciones de datos en SQLite local e integra Dual Write a Supabase.

'use strict';

const crypto = require('crypto');
const supabaseMachineService = require('./supabaseMachineService');

/**
 * Fábrica del servicio de Máquinas.
 * @param {import('better-sqlite3').Database} db - Instancia de SQLite local.
 * @param {function(string, string): void} [registrarAccion] - Función opcional de auditoría de main.js.
 * @param {object} [syncManager=null] - Instancia de SyncManager para encolado offline.
 * @returns {object} Objeto con la API pública del servicio.
 */
function createMachineService(db, registrarAccion, syncManager = null) {
  if (!db) {
    throw new Error('[MachineService] Instancia de base de datos requerida.');
  }

  function handleDualWrite(promise, entity, action, payload) {
    promise
      .then(res => {
        if (!res || !res.success) {
          console.warn(`[MachineService] Dual Write hacia Supabase no exitoso (${action}). Registrando en offline_queue.`);
          if (syncManager) {
            syncManager.queueOperation({ entity, action, payload });
          }
        }
      })
      .catch(err => {
        console.error(`[MachineService] Error en Dual Write hacia Supabase (${action}):`, err.message || err);
        if (syncManager) {
          syncManager.queueOperation({ entity, action, payload });
        }
      });
  }

  // ── MAQUINAS ───────────────────────────────────────────────────────────────
  function getMachines() {
    return db.prepare('SELECT * FROM maquinas ORDER BY nombre ASC').all();
  }

  function addMachine(data) {
    const uuid = data.uuid || crypto.randomUUID();
    const stmt = db.prepare(`
      INSERT INTO maquinas (uuid, nombre, tipo, marca, modelo, anio, numero_serie, valor_hora, horas_totales, estado, observaciones)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const info = stmt.run(
      uuid,
      data.nombre || '',
      data.tipo || '',
      data.marca || '',
      data.modelo || '',
      data.anio ? Number(data.anio) : null,
      data.numero_serie || '',
      parseFloat(data.valor_hora) || 0,
      parseFloat(data.horas_totales) || 0,
      data.estado || 'Disponible',
      data.observaciones || ''
    );

    const machineId = info.lastInsertRowid;

    if (typeof registrarAccion === 'function') {
      registrarAccion('Alta Máquina', `Máquina ${data.nombre} (ID: ${machineId})`);
    }

    const payload = {
      id: machineId,
      uuid,
      nombre: data.nombre || '',
      tipo: data.tipo || '',
      marca: data.marca || '',
      modelo: data.modelo || '',
      anio: data.anio ? Number(data.anio) : null,
      numero_serie: data.numero_serie || '',
      valor_hora: parseFloat(data.valor_hora) || 0,
      horas_totales: parseFloat(data.horas_totales) || 0,
      ultimo_servicio: null,
      estado: data.estado || 'Disponible',
      observaciones: data.observaciones || ''
    };

    handleDualWrite(
      supabaseMachineService.addMachine(payload),
      'maquinas',
      'INSERT',
      payload
    );

    return { success: true, id: machineId, uuid };
  }

  function updateMachine(data) {
    if (!data || (!data.id && !data.uuid)) return { success: false, error: 'ID o UUID de máquina requerido.' };

    let existing = null;
    if (data.uuid) {
      existing = db.prepare('SELECT id, uuid FROM maquinas WHERE uuid = ?').get(data.uuid);
    }
    if (!existing && data.id) {
      existing = db.prepare('SELECT id, uuid FROM maquinas WHERE id = ?').get(Number(data.id));
    }

    const uuid = data.uuid || (existing ? existing.uuid : null) || crypto.randomUUID();
    const targetId = existing ? existing.id : Number(data.id);

    const stmt = db.prepare(`
      UPDATE maquinas SET uuid=?, nombre=?, tipo=?, marca=?, modelo=?, anio=?, numero_serie=?, valor_hora=?, estado=?, observaciones=? WHERE id=?
    `);

    stmt.run(
      uuid,
      data.nombre || '',
      data.tipo || '',
      data.marca || '',
      data.modelo || '',
      data.anio ? Number(data.anio) : null,
      data.numero_serie || '',
      parseFloat(data.valor_hora) || 0,
      data.estado || 'Disponible',
      data.observaciones || '',
      targetId
    );

    if (typeof registrarAccion === 'function') {
      registrarAccion('Edición Máquina', `Máquina ID ${targetId} actualizada.`);
    }

    const updatedMachine = db.prepare('SELECT * FROM maquinas WHERE id = ?').get(targetId);
    if (updatedMachine) {
      handleDualWrite(
        supabaseMachineService.updateMachine(updatedMachine),
        'maquinas',
        'UPDATE',
        updatedMachine
      );
    }

    return { success: true, id: targetId, uuid };
  }

  function deleteMachine(id) {
    if (!id) return { success: false, error: 'ID de máquina requerido.' };

    const existing = db.prepare('SELECT uuid FROM maquinas WHERE id=?').get(id);
    db.prepare('DELETE FROM maquinas WHERE id=?').run(id);

    if (typeof registrarAccion === 'function') {
      registrarAccion('Eliminación Máquina', `Máquina ID ${id} eliminada.`);
    }

    const payload = { id: Number(id) };
    if (existing && existing.uuid) payload.uuid = existing.uuid;

    handleDualWrite(
      supabaseMachineService.deleteMachine(id, existing ? existing.uuid : null),
      'maquinas',
      'DELETE',
      payload
    );

    return { success: true };
  }

  function upsertMachine(maquina) {
    if (!maquina || (!maquina.id && !maquina.uuid)) return { success: false, error: 'ID o UUID de máquina requerido.' };

    let existing = null;
    if (maquina.uuid) {
      existing = db.prepare('SELECT id, uuid FROM maquinas WHERE uuid = ?').get(maquina.uuid);
    }
    if (!existing && maquina.id) {
      existing = db.prepare('SELECT id, uuid FROM maquinas WHERE id = ?').get(Number(maquina.id));
    }

    const uuid = maquina.uuid || (existing ? existing.uuid : null) || crypto.randomUUID();

    if (existing) {
      const stmt = db.prepare(`
        UPDATE maquinas SET
          uuid = ?,
          nombre = ?,
          tipo = ?,
          marca = ?,
          modelo = ?,
          anio = ?,
          numero_serie = ?,
          valor_hora = ?,
          horas_totales = ?,
          ultimo_servicio = ?,
          estado = ?,
          observaciones = ?
        WHERE id = ?
      `);

      stmt.run(
        uuid,
        maquina.nombre || '',
        maquina.tipo || '',
        maquina.marca || '',
        maquina.modelo || '',
        maquina.anio ? Number(maquina.anio) : null,
        maquina.numero_serie || '',
        maquina.valor_hora !== undefined ? Number(maquina.valor_hora) : 0,
        maquina.horas_totales !== undefined ? Number(maquina.horas_totales) : 0,
        maquina.ultimo_servicio || null,
        maquina.estado || 'Disponible',
        maquina.observaciones || '',
        existing.id
      );

      return { success: true, id: existing.id, uuid };
    } else {
      const stmt = db.prepare(`
        INSERT INTO maquinas (id, uuid, nombre, tipo, marca, modelo, anio, numero_serie, valor_hora, horas_totales, ultimo_servicio, estado, observaciones)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const info = stmt.run(
        maquina.id ? Number(maquina.id) : null,
        uuid,
        maquina.nombre || '',
        maquina.tipo || '',
        maquina.marca || '',
        maquina.modelo || '',
        maquina.anio ? Number(maquina.anio) : null,
        maquina.numero_serie || '',
        maquina.valor_hora !== undefined ? Number(maquina.valor_hora) : 0,
        maquina.horas_totales !== undefined ? Number(maquina.horas_totales) : 0,
        maquina.ultimo_servicio || null,
        maquina.estado || 'Disponible',
        maquina.observaciones || ''
      );

      return { success: true, id: info.lastInsertRowid, uuid };
    }
  }

  // ── TRABAJOS MAQUINAS ──────────────────────────────────────────────────────
  function getWorkLogs(filter = {}) {
    let base = `SELECT t.*, m.nombre as maquina_nombre FROM trabajos_maquinas t JOIN maquinas m ON t.maquina_id=m.id`;
    let params = [];
    if (filter && filter.maquina_id) {
      base += ` WHERE t.maquina_id=?`;
      params.push(filter.maquina_id);
    }
    base += ` ORDER BY t.fecha DESC, t.created_at DESC`;
    return db.prepare(base).all(...params);
  }

  function addWorkLog(t) {
    const transaction = db.transaction(() => {
      let maquina = null;
      if (t.maquina_uuid) {
        maquina = db.prepare('SELECT id, uuid FROM maquinas WHERE uuid = ?').get(t.maquina_uuid);
      }
      if (!maquina && t.maquina_id) {
        maquina = db.prepare('SELECT id, uuid FROM maquinas WHERE id = ?').get(t.maquina_id);
      }

      const maquinaId = maquina ? maquina.id : Number(t.maquina_id);
      const maquinaUuid = maquina ? maquina.uuid : (t.maquina_uuid || null);

      const horas = parseFloat(t.horas) || 0;
      const precioHora = parseFloat(t.precio_hora) || 0;
      const total = parseFloat(t.total) || (horas * precioHora);
      const uuid = t.uuid || crypto.randomUUID();

      const info = db.prepare(`
        INSERT INTO trabajos_maquinas (uuid, maquina_id, maquina_uuid, fecha, cliente, operador, horas, precio_hora, total, observaciones)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        uuid,
        maquinaId,
        maquinaUuid,
        t.fecha || new Date().toISOString().split('T')[0],
        t.cliente || '',
        t.operador || '',
        horas,
        precioHora,
        total,
        t.observaciones || ''
      );

      const workId = info.lastInsertRowid;

      if (maquinaId) {
        db.prepare('UPDATE maquinas SET horas_totales=horas_totales+? WHERE id=?').run(horas, maquinaId);
      }

      if (typeof registrarAccion === 'function') {
        registrarAccion('Trabajo Máquina', `Trabajo de ${horas}hs en Máquina ID ${maquinaId}`);
      }

      const payload = {
        id: workId,
        uuid,
        maquina_id: maquinaId,
        maquina_uuid: maquinaUuid,
        fecha: t.fecha || new Date().toISOString().split('T')[0],
        cliente: t.cliente || '',
        operador: t.operador || '',
        horas,
        precio_hora: precioHora,
        total,
        observaciones: t.observaciones || ''
      };

      handleDualWrite(
        supabaseMachineService.addWorkLog(payload),
        'trabajos_maquinas',
        'INSERT',
        payload
      );

      // Replicar actualización de horas_totales de la máquina
      if (maquinaId) {
        const updatedMachine = db.prepare('SELECT * FROM maquinas WHERE id = ?').get(maquinaId);
        if (updatedMachine) {
          handleDualWrite(
            supabaseMachineService.updateMachine(updatedMachine),
            'maquinas',
            'UPDATE',
            updatedMachine
          );
        }
      }

      return { success: true, id: workId, uuid };
    });

    return transaction();
  }

  function deleteWorkLog(id) {
    if (!id) return { success: false, error: 'ID de trabajo requerido.' };

    const transaction = db.transaction(() => {
      const tr = db.prepare('SELECT uuid, maquina_id, horas FROM trabajos_maquinas WHERE id=?').get(id);
      db.prepare('DELETE FROM trabajos_maquinas WHERE id=?').run(id);
      if (tr) {
        db.prepare('UPDATE maquinas SET horas_totales=MAX(0, horas_totales-?) WHERE id=?').run(tr.horas, tr.maquina_id);
        const updatedMachine = db.prepare('SELECT * FROM maquinas WHERE id = ?').get(tr.maquina_id);
        if (updatedMachine) {
          handleDualWrite(
            supabaseMachineService.updateMachine(updatedMachine),
            'maquinas',
            'UPDATE',
            updatedMachine
          );
        }
      }

      const payload = { id: Number(id) };
      if (tr && tr.uuid) payload.uuid = tr.uuid;

      handleDualWrite(
        supabaseMachineService.deleteWorkLog(id, tr ? tr.uuid : null),
        'trabajos_maquinas',
        'DELETE',
        payload
      );

      return { success: true };
    });

    return transaction();
  }

  function upsertWorkLog(trabajo) {
    if (!trabajo || (!trabajo.id && !trabajo.uuid)) return { success: false, error: 'ID o UUID de trabajo requerido.' };

    let existing = null;
    if (trabajo.uuid) {
      existing = db.prepare('SELECT id, uuid FROM trabajos_maquinas WHERE uuid = ?').get(trabajo.uuid);
    }
    if (!existing && trabajo.id) {
      existing = db.prepare('SELECT id, uuid FROM trabajos_maquinas WHERE id = ?').get(Number(trabajo.id));
    }

    const uuid = trabajo.uuid || (existing ? existing.uuid : null) || crypto.randomUUID();

    let localMaquinaId = trabajo.maquina_id ? Number(trabajo.maquina_id) : null;
    let maquinaUuid = trabajo.maquina_uuid || null;

    if (!localMaquinaId && maquinaUuid) {
      const parentM = db.prepare('SELECT id FROM maquinas WHERE uuid = ?').get(maquinaUuid);
      if (parentM) localMaquinaId = parentM.id;
    }
    if (!maquinaUuid && localMaquinaId) {
      const parentM = db.prepare('SELECT uuid FROM maquinas WHERE id = ?').get(localMaquinaId);
      if (parentM) maquinaUuid = parentM.uuid;
    }

    if (existing) {
      const stmt = db.prepare(`
        UPDATE trabajos_maquinas SET
          uuid = ?,
          maquina_id = ?,
          maquina_uuid = ?,
          fecha = ?,
          cliente = ?,
          operador = ?,
          horas = ?,
          precio_hora = ?,
          total = ?,
          observaciones = ?
        WHERE id = ?
      `);

      stmt.run(
        uuid,
        localMaquinaId,
        maquinaUuid,
        trabajo.fecha || new Date().toISOString().split('T')[0],
        trabajo.cliente || '',
        trabajo.operador || '',
        trabajo.horas !== undefined ? Number(trabajo.horas) : 0,
        trabajo.precio_hora !== undefined ? Number(trabajo.precio_hora) : 0,
        trabajo.total !== undefined ? Number(trabajo.total) : 0,
        trabajo.observaciones || '',
        existing.id
      );

      return { success: true, id: existing.id, uuid };
    } else {
      const stmt = db.prepare(`
        INSERT INTO trabajos_maquinas (id, uuid, maquina_id, maquina_uuid, fecha, cliente, operador, horas, precio_hora, total, observaciones)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const info = stmt.run(
        trabajo.id ? Number(trabajo.id) : null,
        uuid,
        localMaquinaId,
        maquinaUuid,
        trabajo.fecha || new Date().toISOString().split('T')[0],
        trabajo.cliente || '',
        trabajo.operador || '',
        trabajo.horas !== undefined ? Number(trabajo.horas) : 0,
        trabajo.precio_hora !== undefined ? Number(trabajo.precio_hora) : 0,
        trabajo.total !== undefined ? Number(trabajo.total) : 0,
        trabajo.observaciones || ''
      );

      return { success: true, id: info.lastInsertRowid, uuid };
    }
  }

  // ── COMBUSTIBLE MAQUINAS ───────────────────────────────────────────────────
  function getFuelLogs(filter = {}) {
    let base = `SELECT c.*, m.nombre as maquina_nombre FROM combustible_maquinas c JOIN maquinas m ON c.maquina_id=m.id`;
    let params = [];
    if (filter && filter.maquina_id) {
      base += ` WHERE c.maquina_id=?`;
      params.push(filter.maquina_id);
    }
    base += ` ORDER BY c.fecha DESC, c.created_at DESC`;
    return db.prepare(base).all(...params);
  }

  function addFuelLog(c) {
    let maquina = null;
    if (c.maquina_uuid) {
      maquina = db.prepare('SELECT id, uuid FROM maquinas WHERE uuid = ?').get(c.maquina_uuid);
    }
    if (!maquina && c.maquina_id) {
      maquina = db.prepare('SELECT id, uuid FROM maquinas WHERE id = ?').get(c.maquina_id);
    }

    const maquinaId = maquina ? maquina.id : Number(c.maquina_id);
    const maquinaUuid = maquina ? maquina.uuid : (c.maquina_uuid || null);

    const litros = parseFloat(c.litros) || 0;
    const precioLitro = parseFloat(c.precio_litro) || 0;
    const total = parseFloat(c.total) || (litros * precioLitro);
    const uuid = c.uuid || crypto.randomUUID();

    const stmt = db.prepare(`
      INSERT INTO combustible_maquinas (uuid, maquina_id, maquina_uuid, fecha, litros, precio_litro, total, observaciones)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const info = stmt.run(
      uuid,
      maquinaId,
      maquinaUuid,
      c.fecha || new Date().toISOString().split('T')[0],
      litros,
      precioLitro,
      total,
      c.observaciones || ''
    );

    const fuelId = info.lastInsertRowid;

    if (typeof registrarAccion === 'function') {
      registrarAccion('Combustible Máquina', `Carga de ${litros}L en Máquina ID ${maquinaId}`);
    }

    const payload = {
      id: fuelId,
      uuid,
      maquina_id: maquinaId,
      maquina_uuid: maquinaUuid,
      fecha: c.fecha || new Date().toISOString().split('T')[0],
      litros,
      precio_litro: precioLitro,
      total,
      observaciones: c.observaciones || ''
    };

    handleDualWrite(
      supabaseMachineService.addFuelLog(payload),
      'combustible_maquinas',
      'INSERT',
      payload
    );

    return { success: true, id: fuelId, uuid };
  }

  function deleteFuelLog(id) {
    if (!id) return { success: false, error: 'ID de combustible requerido.' };

    const existing = db.prepare('SELECT uuid FROM combustible_maquinas WHERE id=?').get(id);
    db.prepare('DELETE FROM combustible_maquinas WHERE id=?').run(id);

    const payload = { id: Number(id) };
    if (existing && existing.uuid) payload.uuid = existing.uuid;

    handleDualWrite(
      supabaseMachineService.deleteFuelLog(id, existing ? existing.uuid : null),
      'combustible_maquinas',
      'DELETE',
      payload
    );

    return { success: true };
  }

  function upsertFuelLog(combustible) {
    if (!combustible || (!combustible.id && !combustible.uuid)) return { success: false, error: 'ID o UUID de combustible requerido.' };

    let existing = null;
    if (combustible.uuid) {
      existing = db.prepare('SELECT id, uuid FROM combustible_maquinas WHERE uuid = ?').get(combustible.uuid);
    }
    if (!existing && combustible.id) {
      existing = db.prepare('SELECT id, uuid FROM combustible_maquinas WHERE id = ?').get(Number(combustible.id));
    }

    const uuid = combustible.uuid || (existing ? existing.uuid : null) || crypto.randomUUID();

    let localMaquinaId = combustible.maquina_id ? Number(combustible.maquina_id) : null;
    let maquinaUuid = combustible.maquina_uuid || null;

    if (!localMaquinaId && maquinaUuid) {
      const parentM = db.prepare('SELECT id FROM maquinas WHERE uuid = ?').get(maquinaUuid);
      if (parentM) localMaquinaId = parentM.id;
    }
    if (!maquinaUuid && localMaquinaId) {
      const parentM = db.prepare('SELECT uuid FROM maquinas WHERE id = ?').get(localMaquinaId);
      if (parentM) maquinaUuid = parentM.uuid;
    }

    if (existing) {
      const stmt = db.prepare(`
        UPDATE combustible_maquinas SET
          uuid = ?,
          maquina_id = ?,
          maquina_uuid = ?,
          fecha = ?,
          litros = ?,
          precio_litro = ?,
          total = ?,
          observaciones = ?
        WHERE id = ?
      `);

      stmt.run(
        uuid,
        localMaquinaId,
        maquinaUuid,
        combustible.fecha || new Date().toISOString().split('T')[0],
        combustible.litros !== undefined ? Number(combustible.litros) : 0,
        combustible.precio_litro !== undefined ? Number(combustible.precio_litro) : 0,
        combustible.total !== undefined ? Number(combustible.total) : 0,
        combustible.observaciones || '',
        existing.id
      );

      return { success: true, id: existing.id, uuid };
    } else {
      const stmt = db.prepare(`
        INSERT INTO combustible_maquinas (id, uuid, maquina_id, maquina_uuid, fecha, litros, precio_litro, total, observaciones)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const info = stmt.run(
        combustible.id ? Number(combustible.id) : null,
        uuid,
        localMaquinaId,
        maquinaUuid,
        combustible.fecha || new Date().toISOString().split('T')[0],
        combustible.litros !== undefined ? Number(combustible.litros) : 0,
        combustible.precio_litro !== undefined ? Number(combustible.precio_litro) : 0,
        combustible.total !== undefined ? Number(combustible.total) : 0,
        combustible.observaciones || ''
      );

      return { success: true, id: info.lastInsertRowid, uuid };
    }
  }

  // ── MANTENIMIENTO MAQUINAS ─────────────────────────────────────────────────
  function getMaintenanceLogs(filter = {}) {
    let base = `SELECT mt.*, m.nombre as maquina_nombre FROM mantenimiento_maquinas mt JOIN maquinas m ON mt.maquina_id=m.id`;
    let params = [];
    if (filter && filter.maquina_id) {
      base += ` WHERE mt.maquina_id=?`;
      params.push(filter.maquina_id);
    }
    base += ` ORDER BY mt.fecha DESC, mt.created_at DESC`;
    return db.prepare(base).all(...params);
  }

  function addMaintenanceLog(mt) {
    const transaction = db.transaction(() => {
      let maquina = null;
      if (mt.maquina_uuid) {
        maquina = db.prepare('SELECT id, uuid FROM maquinas WHERE uuid = ?').get(mt.maquina_uuid);
      }
      if (!maquina && mt.maquina_id) {
        maquina = db.prepare('SELECT id, uuid FROM maquinas WHERE id = ?').get(mt.maquina_id);
      }

      const maquinaId = maquina ? maquina.id : Number(mt.maquina_id);
      const maquinaUuid = maquina ? maquina.uuid : (mt.maquina_uuid || null);

      const costo = parseFloat(mt.costo) || 0;
      const uuid = mt.uuid || crypto.randomUUID();

      const info = db.prepare(`
        INSERT INTO mantenimiento_maquinas (uuid, maquina_id, maquina_uuid, fecha, tipo, descripcion, costo, taller, estado)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        uuid,
        maquinaId,
        maquinaUuid,
        mt.fecha || new Date().toISOString().split('T')[0],
        mt.tipo || 'Preventivo',
        mt.descripcion || '',
        costo,
        mt.taller || '',
        mt.estado || 'Realizado'
      );

      const mantId = info.lastInsertRowid;

      if (maquinaId) {
        db.prepare('UPDATE maquinas SET ultimo_servicio=? WHERE id=?').run(mt.fecha, maquinaId);
      }

      if (typeof registrarAccion === 'function') {
        registrarAccion('Mantenimiento Máquina', `Mantenimiento en Máquina ID ${maquinaId}`);
      }

      const payload = {
        id: mantId,
        uuid,
        maquina_id: maquinaId,
        maquina_uuid: maquinaUuid,
        fecha: mt.fecha || new Date().toISOString().split('T')[0],
        tipo: mt.tipo || 'Preventivo',
        descripcion: mt.descripcion || '',
        costo,
        taller: mt.taller || '',
        estado: mt.estado || 'Realizado'
      };

      handleDualWrite(
        supabaseMachineService.addMaintenanceLog(payload),
        'mantenimiento_maquinas',
        'INSERT',
        payload
      );

      if (maquinaId) {
        const updatedMachine = db.prepare('SELECT * FROM maquinas WHERE id = ?').get(maquinaId);
        if (updatedMachine) {
          handleDualWrite(
            supabaseMachineService.updateMachine(updatedMachine),
            'maquinas',
            'UPDATE',
            updatedMachine
          );
        }
      }

      return { success: true, id: mantId, uuid };
    });

    return transaction();
  }

  function deleteMaintenanceLog(id) {
    if (!id) return { success: false, error: 'ID de mantenimiento requerido.' };

    const existing = db.prepare('SELECT uuid FROM mantenimiento_maquinas WHERE id=?').get(id);
    db.prepare('DELETE FROM mantenimiento_maquinas WHERE id=?').run(id);

    const payload = { id: Number(id) };
    if (existing && existing.uuid) payload.uuid = existing.uuid;

    handleDualWrite(
      supabaseMachineService.deleteMaintenanceLog(id, existing ? existing.uuid : null),
      'mantenimiento_maquinas',
      'DELETE',
      payload
    );

    return { success: true };
  }

  function upsertMaintenanceLog(mantenimiento) {
    if (!mantenimiento || (!mantenimiento.id && !mantenimiento.uuid)) return { success: false, error: 'ID o UUID de mantenimiento requerido.' };

    let existing = null;
    if (mantenimiento.uuid) {
      existing = db.prepare('SELECT id, uuid FROM mantenimiento_maquinas WHERE uuid = ?').get(mantenimiento.uuid);
    }
    if (!existing && mantenimiento.id) {
      existing = db.prepare('SELECT id, uuid FROM mantenimiento_maquinas WHERE id = ?').get(Number(mantenimiento.id));
    }

    const uuid = mantenimiento.uuid || (existing ? existing.uuid : null) || crypto.randomUUID();

    let localMaquinaId = mantenimiento.maquina_id ? Number(mantenimiento.maquina_id) : null;
    let maquinaUuid = mantenimiento.maquina_uuid || null;

    if (!localMaquinaId && maquinaUuid) {
      const parentM = db.prepare('SELECT id FROM maquinas WHERE uuid = ?').get(maquinaUuid);
      if (parentM) localMaquinaId = parentM.id;
    }
    if (!maquinaUuid && localMaquinaId) {
      const parentM = db.prepare('SELECT uuid FROM maquinas WHERE id = ?').get(localMaquinaId);
      if (parentM) maquinaUuid = parentM.uuid;
    }

    if (existing) {
      const stmt = db.prepare(`
        UPDATE mantenimiento_maquinas SET
          uuid = ?,
          maquina_id = ?,
          maquina_uuid = ?,
          fecha = ?,
          tipo = ?,
          descripcion = ?,
          costo = ?,
          taller = ?,
          estado = ?
        WHERE id = ?
      `);

      stmt.run(
        uuid,
        localMaquinaId,
        maquinaUuid,
        mantenimiento.fecha || new Date().toISOString().split('T')[0],
        mantenimiento.tipo || 'Preventivo',
        mantenimiento.descripcion || '',
        mantenimiento.costo !== undefined ? Number(mantenimiento.costo) : 0,
        mantenimiento.taller || '',
        mantenimiento.estado || 'Realizado',
        existing.id
      );

      return { success: true, id: existing.id, uuid };
    } else {
      const stmt = db.prepare(`
        INSERT INTO mantenimiento_maquinas (id, uuid, maquina_id, maquina_uuid, fecha, tipo, descripcion, costo, taller, estado)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const info = stmt.run(
        mantenimiento.id ? Number(mantenimiento.id) : null,
        uuid,
        localMaquinaId,
        maquinaUuid,
        mantenimiento.fecha || new Date().toISOString().split('T')[0],
        mantenimiento.tipo || 'Preventivo',
        mantenimiento.descripcion || '',
        mantenimiento.costo !== undefined ? Number(mantenimiento.costo) : 0,
        mantenimiento.taller || '',
        mantenimiento.estado || 'Realizado'
      );

      return { success: true, id: info.lastInsertRowid, uuid };
    }
  }

  // ── METRICAS Y RENTABILIDAD ────────────────────────────────────────────────
  function getStats() {
    const mes = new Date().toISOString().slice(0, 7) + '-01';
    const totalMaquinas = db.prepare('SELECT COUNT(*) as n FROM maquinas').get().n;
    const disponibles = db.prepare("SELECT COUNT(*) as n FROM maquinas WHERE estado='Disponible'").get().n;
    const enUso = db.prepare("SELECT COUNT(*) as n FROM maquinas WHERE estado='En uso'").get().n;
    const horasMes = db.prepare('SELECT COALESCE(SUM(horas),0) as n FROM trabajos_maquinas WHERE fecha>=?').get(mes).n;
    const ingresosMes = db.prepare('SELECT COALESCE(SUM(total),0) as n FROM trabajos_maquinas WHERE fecha>=?').get(mes).n;
    const gastoComb = db.prepare('SELECT COALESCE(SUM(total),0) as n FROM combustible_maquinas WHERE fecha>=?').get(mes).n;
    const gastoMant = db.prepare("SELECT COALESCE(SUM(costo),0) as n FROM mantenimiento_maquinas WHERE fecha>=? AND estado='Realizado'").get(mes).n;
    const masUtilizada = db.prepare(`SELECT m.nombre, SUM(t.horas) as total_horas FROM trabajos_maquinas t JOIN maquinas m ON t.maquina_id=m.id WHERE t.fecha>=? GROUP BY t.maquina_id ORDER BY total_horas DESC LIMIT 1`).get(mes);
    const masRentable = db.prepare(`SELECT m.nombre, COALESCE(SUM(t.total),0) as ingresos FROM maquinas m LEFT JOIN trabajos_maquinas t ON t.maquina_id=m.id AND t.fecha>=? GROUP BY m.id ORDER BY ingresos DESC LIMIT 1`).get(mes);
    const ingresosPorMaquina = db.prepare(`SELECT m.nombre, COALESCE(SUM(t.total),0) as total FROM maquinas m LEFT JOIN trabajos_maquinas t ON t.maquina_id=m.id GROUP BY m.id ORDER BY total DESC LIMIT 6`).all();
    const horasPorMes = db.prepare(`SELECT strftime('%Y-%m',fecha) as mes, SUM(horas) as total FROM trabajos_maquinas WHERE fecha>=date('now','-6 months') GROUP BY mes ORDER BY mes ASC`).all();

    return { totalMaquinas, disponibles, enUso, horasMes, ingresosMes, gastoComb, gastoMant, masUtilizada, masRentable, ingresosPorMaquina, horasPorMes };
  }

  function getRentabilidad() {
    return db.prepare(`
      SELECT 
        m.id, m.nombre, m.tipo, m.horas_totales,
        COALESCE((SELECT SUM(t.total) FROM trabajos_maquinas t WHERE t.maquina_id=m.id),0) as ingresos,
        COALESCE((SELECT SUM(c.total) FROM combustible_maquinas c WHERE c.maquina_id=m.id),0) as gasto_combustible,
        COALESCE((SELECT SUM(mt.costo) FROM mantenimiento_maquinas mt WHERE mt.maquina_id=m.id AND mt.estado='Realizado'),0) as gasto_mantenimiento
      FROM maquinas m ORDER BY m.nombre ASC
    `).all();
  }

  // ── API pública del servicio ───────────────────────────────────────────────
  return {
    getMachines,
    addMachine,
    updateMachine,
    deleteMachine,
    upsertMachine,
    getWorkLogs,
    addWorkLog,
    deleteWorkLog,
    upsertWorkLog,
    getFuelLogs,
    addFuelLog,
    deleteFuelLog,
    upsertFuelLog,
    getMaintenanceLogs,
    addMaintenanceLog,
    deleteMaintenanceLog,
    upsertMaintenanceLog,
    getStats,
    getRentabilidad
  };
}

module.exports = createMachineService;
