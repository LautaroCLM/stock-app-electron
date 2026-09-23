// services/expenseService.js
//
// Fase 0.1 / Fase 6 — Servicio para el módulo de Gastos.
// Encapsula las operaciones de gastos locales en SQLite e integra Dual Write a Supabase.

'use strict';

const supabaseExpenseService = require('./supabaseExpenseService');

/**
 * Fábrica del servicio de Gastos.
 * @param {import('better-sqlite3').Database} db - Instancia de la base de datos local SQLite.
 * @param {function(string, string): void} [registrarAccion] - Función opcional de auditoría de main.js.
 * @param {object} [syncManager=null] - Instancia de SyncManager para encolado offline.
 * @returns {object} Objeto con los métodos del servicio.
 */
function createExpenseService(db, registrarAccion, syncManager = null) {
  if (!db) {
    throw new Error('[ExpenseService] Instancia de base de datos requerida.');
  }

  function handleDualWrite(promise, entity, action, payload) {
    promise
      .then(res => {
        if (!res || !res.success) {
          console.warn(`[ExpenseService] Dual Write hacia Supabase no exitoso (${action}). Registrando en offline_queue.`);
          if (syncManager) {
            syncManager.queueOperation({ entity, action, payload });
          }
        }
      })
      .catch(err => {
        console.error(`[ExpenseService] Error en Dual Write hacia Supabase (${action}):`, err.message || err);
        if (syncManager) {
          syncManager.queueOperation({ entity, action, payload });
        }
      });
  }

  // ── getExpenses ───────────────────────────────────────────────────────────
  /**
   * Devuelve todos los gastos ordenados por fecha y ID de manera descendente desde SQLite local.
   * @returns {Array} Lista de gastos.
   */
  // ── getExpenses ───────────────────────────────────────────────────────────
  /**
   * Devuelve todos los gastos ordenados por fecha y ID de manera descendente desde SQLite local.
   * @returns {Array} Lista de gastos.
   */
  function getExpenses() {
    return db.prepare('SELECT id, uuid, fecha, concepto, categoria, monto, observacion, estado FROM gastos ORDER BY datetime(fecha) DESC, id DESC').all();
  }

  // ── saveExpense ───────────────────────────────────────────────────────────
  /**
   * Guarda o actualiza un gasto en SQLite local y dispara Dual Write hacia Supabase.
   * @param {object} data - Datos del gasto.
   * @returns {{ success: boolean, id?: number, uuid?: string, error?: string }}
   */
  function saveExpense(data) {
    const fecha = data.fecha || new Date().toISOString().split('T')[0];
    const concepto = data.concepto || '';
    const categoria = data.categoria || '';
    const monto = Number(data.monto) || 0;
    const observacion = data.observacion || '';
    const estado = data.estado || 'Pendiente';

    if (data.id) {
      const existing = db.prepare('SELECT uuid FROM gastos WHERE id = ?').get(data.id);
      const uuid = data.uuid || (existing ? existing.uuid : null) || crypto.randomUUID();

      const stmt = db.prepare(`
        UPDATE gastos
        SET uuid = ?, fecha = ?, concepto = ?, categoria = ?, monto = ?, observacion = ?, estado = ?
        WHERE id = ?
      `);
      stmt.run(
        uuid,
        fecha,
        concepto,
        categoria,
        monto,
        observacion,
        estado,
        data.id
      );

      if (typeof registrarAccion === 'function') {
        registrarAccion('Edición Gasto', `Gasto ID ${data.id}: ${concepto} por $${monto}`);
      }

      const payload = {
        id: Number(data.id),
        uuid,
        fecha,
        concepto,
        categoria,
        monto,
        observacion,
        estado
      };

      handleDualWrite(
        supabaseExpenseService.addExpense(payload),
        'gastos',
        'UPDATE',
        payload
      );

      return { success: true, id: data.id, uuid };

    } else {
      const uuid = data.uuid || crypto.randomUUID();
      const stmt = db.prepare(`
        INSERT INTO gastos (uuid, fecha, concepto, categoria, monto, observacion, estado)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      const info = stmt.run(
        uuid,
        fecha,
        concepto,
        categoria,
        monto,
        observacion,
        estado
      );

      const expenseId = info.lastInsertRowid;

      if (typeof registrarAccion === 'function') {
        registrarAccion('Alta Gasto', `Gasto: ${concepto} por $${monto} (ID: ${expenseId})`);
      }

      const payload = {
        id: expenseId,
        uuid,
        fecha,
        concepto,
        categoria,
        monto,
        observacion,
        estado
      };

      handleDualWrite(
        supabaseExpenseService.addExpense(payload),
        'gastos',
        'INSERT',
        payload
      );

      return { success: true, id: expenseId, uuid };
    }
  }

  // ── deleteExpense ─────────────────────────────────────────────────────────
  /**
   * Elimina un gasto por su ID en SQLite local y liquida el registro en Supabase.
   * @param {number} id - ID del gasto a eliminar.
   * @returns {{ success: boolean }}
   */
  function deleteExpense(id) {
    if (!id) return { success: false, error: 'ID de gasto requerido.' };

    const existing = db.prepare('SELECT uuid FROM gastos WHERE id = ?').get(id);
    db.prepare('DELETE FROM gastos WHERE id = ?').run(id);

    if (typeof registrarAccion === 'function') {
      registrarAccion('Eliminación Gasto', `Gasto ID ${id} eliminado.`);
    }

    const payload = { id: Number(id) };
    if (existing && existing.uuid) payload.uuid = existing.uuid;

    handleDualWrite(
      supabaseExpenseService.deleteExpense(id, existing ? existing.uuid : null),
      'gastos',
      'DELETE',
      payload
    );

    return { success: true };
  }

  // ── upsertExpense (LOCAL SQLITE PURA SIN DUAL WRITE NI ENCOLADO) ──────────
  /**
   * Inserta o actualiza (UPSERT) un gasto en SQLite local basándose en su UUID o ID.
   * Utilizado para sincronización entrante desde Supabase hacia la base de datos local.
   * 
   * @param {object} gasto - Objeto con datos del gasto.
   * @returns {{ success: boolean, id?: number, error?: string }}
   */
  function upsertExpense(gasto) {
    if (!gasto || (!gasto.id && !gasto.uuid)) {
      return { success: false, error: 'ID o UUID de gasto requerido para UPSERT.' };
    }

    let existing = null;
    if (gasto.uuid) {
      existing = db.prepare('SELECT id FROM gastos WHERE uuid = ?').get(gasto.uuid);
    }
    if (!existing && gasto.id) {
      existing = db.prepare('SELECT id FROM gastos WHERE id = ?').get(gasto.id);
    }

    const uuid = gasto.uuid || (existing ? existing.uuid : null) || crypto.randomUUID();

    if (existing) {
      const stmt = db.prepare(`
        UPDATE gastos SET
          uuid = ?,
          fecha = ?,
          concepto = ?,
          categoria = ?,
          monto = ?,
          observacion = ?,
          estado = ?
        WHERE id = ?
      `);
      stmt.run(
        uuid,
        gasto.fecha || new Date().toISOString().split('T')[0],
        gasto.concepto || '',
        gasto.categoria || '',
        gasto.monto !== undefined ? Number(gasto.monto) : 0,
        gasto.observacion || '',
        gasto.estado || 'Pendiente',
        existing.id
      );
      return { success: true, id: existing.id, uuid };
    } else {
      const stmt = db.prepare(`
        INSERT INTO gastos (id, uuid, fecha, concepto, categoria, monto, observacion, estado)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const info = stmt.run(
        gasto.id ? Number(gasto.id) : null,
        uuid,
        gasto.fecha || new Date().toISOString().split('T')[0],
        gasto.concepto || '',
        gasto.categoria || '',
        gasto.monto !== undefined ? Number(gasto.monto) : 0,
        gasto.observacion || '',
        gasto.estado || 'Pendiente'
      );
      return { success: true, id: info.lastInsertRowid, uuid };
    }
  }

  // ── API pública del servicio ───────────────────────────────────────────────
  return {
    getExpenses,
    saveExpense,
    deleteExpense,
    upsertExpense
  };
}

module.exports = createExpenseService;
