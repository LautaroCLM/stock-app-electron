// services/remitoService.js
//
// Capa de servicio para el módulo de Remitos.
// Centraliza el acceso a datos de la tabla `remitos` en SQLite local e integra Dual Write a Supabase.

'use strict';

const crypto = require('crypto');
const supabaseRemitoService = require('./supabaseRemitoService');

/**
 * Fábrica del servicio de Remitos.
 * @param {import('better-sqlite3').Database} db - Instancia de la base de datos.
 * @param {object} [syncManager=null] - Instancia de SyncManager para encolado offline.
 * @returns {object} Objeto con los métodos del servicio.
 */
function createRemitoService(db, syncManager = null) {
  if (!db) {
    throw new Error('[RemitoService] Instancia de base de datos requerida.');
  }

  function handleDualWrite(promise, entity, action, payload) {
    promise
      .then(res => {
        if (!res || !res.success) {
          console.warn(`[RemitoService] Dual Write hacia Supabase no exitoso (${action}). Registrando en offline_queue.`);
          if (syncManager) {
            syncManager.queueOperation({ entity, action, payload });
          }
        }
      })
      .catch(err => {
        console.error(`[RemitoService] Error en Dual Write hacia Supabase (${action}):`, err.message || err);
        if (syncManager) {
          syncManager.queueOperation({ entity, action, payload });
        }
      });
  }

  // ── getRemitos ────────────────────────────────────────────────────────────
  function getRemitos() {
    const rows = db.prepare(`
      SELECT id, uuid, numero_remito, fecha, cliente, direccion, localidad, cuit, telefono, vendedor, observaciones, transporte, productos, total
      FROM remitos
      ORDER BY datetime(fecha) DESC
    `).all();

    return rows.map(r => ({
      ...r,
      productos: JSON.parse(r.productos || '[]')
    }));
  }

  // ── saveRemito ────────────────────────────────────────────────────────────
  function saveRemito(data) {
    const prodsArr = Array.isArray(data.productos) ? data.productos : [];
    const prodsStr = JSON.stringify(prodsArr);
    const fecha = data.fecha || new Date().toISOString();
    const uuid = data.uuid || crypto.randomUUID();

    const stmt = db.prepare(`
      INSERT INTO remitos (uuid, numero_remito, fecha, cliente, direccion, localidad, cuit, telefono, vendedor, observaciones, transporte, productos, total)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const info = stmt.run(
      uuid,
      data.numero_remito || '',
      fecha,
      data.cliente || '',
      data.direccion || '',
      data.localidad || '',
      data.cuit || '',
      data.telefono || '',
      data.vendedor || '',
      data.observaciones || '',
      data.transporte || '',
      prodsStr,
      data.total || 0
    );

    const remitoId = info.lastInsertRowid;

    const payload = {
      id: remitoId,
      uuid,
      numero_remito: data.numero_remito || '',
      fecha,
      cliente: data.cliente || '',
      direccion: data.direccion || '',
      localidad: data.localidad || '',
      cuit: data.cuit || '',
      telefono: data.telefono || '',
      vendedor: data.vendedor || '',
      observaciones: data.observaciones || '',
      transporte: data.transporte || '',
      productos: prodsArr,
      total: Number(data.total || 0)
    };

    handleDualWrite(
      supabaseRemitoService.addRemito(payload),
      'remitos',
      'INSERT',
      payload
    );

    return { success: true, id: remitoId, uuid };
  }

  // ── deleteRemito ──────────────────────────────────────────────────────────
  function deleteRemito(id) {
    if (!id) return { success: false, error: 'ID de remito requerido.' };

    const existing = db.prepare('SELECT uuid FROM remitos WHERE id = ?').get(id);
    db.prepare('DELETE FROM remitos WHERE id = ?').run(id);

    const payload = { id: Number(id) };
    if (existing && existing.uuid) payload.uuid = existing.uuid;

    handleDualWrite(
      supabaseRemitoService.deleteRemito(id, existing ? existing.uuid : null),
      'remitos',
      'DELETE',
      payload
    );

    return { success: true };
  }

  // ── upsertRemito ──────────────────────────────────────────────────────────
  function upsertRemito(remito) {
    if (!remito || (!remito.id && !remito.uuid)) return { success: false, error: 'ID o UUID de remito requerido.' };

    let existing = null;
    if (remito.uuid) {
      existing = db.prepare('SELECT id, uuid FROM remitos WHERE uuid = ?').get(remito.uuid);
    }
    if (!existing && remito.id) {
      existing = db.prepare('SELECT id, uuid FROM remitos WHERE id = ?').get(Number(remito.id));
    }

    const uuid = remito.uuid || (existing ? existing.uuid : null) || crypto.randomUUID();

    let prodsStr = '[]';
    if (typeof remito.productos === 'string') {
      prodsStr = remito.productos;
    } else if (Array.isArray(remito.productos) || typeof remito.productos === 'object') {
      prodsStr = JSON.stringify(remito.productos || []);
    }

    if (existing) {
      const stmt = db.prepare(`
        UPDATE remitos SET
          uuid = ?,
          numero_remito = ?,
          fecha = ?,
          cliente = ?,
          direccion = ?,
          localidad = ?,
          cuit = ?,
          telefono = ?,
          vendedor = ?,
          observaciones = ?,
          transporte = ?,
          productos = ?,
          total = ?
        WHERE id = ?
      `);

      stmt.run(
        uuid,
        remito.numero_remito || '',
        remito.fecha || new Date().toISOString(),
        remito.cliente || '',
        remito.direccion || '',
        remito.localidad || '',
        remito.cuit || '',
        remito.telefono || '',
        remito.vendedor || '',
        remito.observaciones || '',
        remito.transporte || '',
        prodsStr,
        remito.total !== undefined ? Number(remito.total) : 0,
        existing.id
      );

      return { success: true, id: existing.id, uuid };
    } else {
      const stmt = db.prepare(`
        INSERT INTO remitos (id, uuid, numero_remito, fecha, cliente, direccion, localidad, cuit, telefono, vendedor, observaciones, transporte, productos, total)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const info = stmt.run(
        remito.id ? Number(remito.id) : null,
        uuid,
        remito.numero_remito || '',
        remito.fecha || new Date().toISOString(),
        remito.cliente || '',
        remito.direccion || '',
        remito.localidad || '',
        remito.cuit || '',
        remito.telefono || '',
        remito.vendedor || '',
        remito.observaciones || '',
        remito.transporte || '',
        prodsStr,
        remito.total !== undefined ? Number(remito.total) : 0
      );

      return { success: true, id: info.lastInsertRowid, uuid };
    }
  }

  // ── API pública del servicio ───────────────────────────────────────────────
  return {
    getRemitos,
    saveRemito,
    deleteRemito,
    upsertRemito
  };
}

module.exports = createRemitoService;
