// services/remitoService.js
//
// Capa de servicio para el módulo de Remitos.
// Centraliza el acceso a datos de la tabla `remitos` en SQLite local e integra Dual Write a Supabase.

'use strict';

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
      SELECT id, numero_remito, fecha, cliente, direccion, localidad, cuit, telefono, vendedor, observaciones, transporte, productos, total
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

    const stmt = db.prepare(`
      INSERT INTO remitos (numero_remito, fecha, cliente, direccion, localidad, cuit, telefono, vendedor, observaciones, transporte, productos, total)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const info = stmt.run(
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

    return { success: true, id: remitoId };
  }

  // ── deleteRemito ──────────────────────────────────────────────────────────
  function deleteRemito(id) {
    if (!id) return { success: false, error: 'ID de remito requerido.' };

    db.prepare('DELETE FROM remitos WHERE id = ?').run(id);

    handleDualWrite(
      supabaseRemitoService.deleteRemito(id),
      'remitos',
      'DELETE',
      { id: Number(id) }
    );

    return { success: true };
  }

  // ── upsertRemito ──────────────────────────────────────────────────────────
  function upsertRemito(remito) {
    if (!remito || !remito.id) return { success: false, error: 'ID de remito requerido.' };

    let prodsStr = '[]';
    if (typeof remito.productos === 'string') {
      prodsStr = remito.productos;
    } else if (Array.isArray(remito.productos) || typeof remito.productos === 'object') {
      prodsStr = JSON.stringify(remito.productos || []);
    }

    const stmt = db.prepare(`
      INSERT INTO remitos (id, numero_remito, fecha, cliente, direccion, localidad, cuit, telefono, vendedor, observaciones, transporte, productos, total)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        numero_remito = excluded.numero_remito,
        fecha = excluded.fecha,
        cliente = excluded.cliente,
        direccion = excluded.direccion,
        localidad = excluded.localidad,
        cuit = excluded.cuit,
        telefono = excluded.telefono,
        vendedor = excluded.vendedor,
        observaciones = excluded.observaciones,
        transporte = excluded.transporte,
        productos = excluded.productos,
        total = excluded.total
    `);

    stmt.run(
      Number(remito.id),
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

    return { success: true, id: Number(remito.id) };
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
