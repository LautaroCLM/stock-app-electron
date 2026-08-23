// services/budgetService.js
//
// Capa de servicio para el módulo de Presupuestos.
// Centraliza el acceso a datos de la tabla `presupuestos` en SQLite local e integra Dual Write a Supabase.

'use strict';

const supabaseBudgetService = require('./supabaseBudgetService');

/**
 * Fábrica del servicio de Presupuestos.
 * @param {import('better-sqlite3').Database} db - Instancia de la base de datos.
 * @param {object} [syncManager=null] - Instancia de SyncManager para encolado offline.
 * @returns {object} Objeto con los métodos del servicio.
 */
function createBudgetService(db, syncManager = null) {
  if (!db) {
    throw new Error('[BudgetService] Instancia de base de datos requerida.');
  }

  function handleDualWrite(promise, entity, action, payload) {
    promise
      .then(res => {
        if (!res || !res.success) {
          console.warn(`[BudgetService] Dual Write hacia Supabase no exitoso (${action}). Registrando en offline_queue.`);
          if (syncManager) {
            syncManager.queueOperation({ entity, action, payload });
          }
        }
      })
      .catch(err => {
        console.error(`[BudgetService] Error en Dual Write hacia Supabase (${action}):`, err.message || err);
        if (syncManager) {
          syncManager.queueOperation({ entity, action, payload });
        }
      });
  }

  // ── getBudgets ────────────────────────────────────────────────────────────
  function getBudgets() {
    const rows = db.prepare(`
      SELECT id, fecha, cliente, direccion, localidad, cuit, telefono, productos, total
      FROM presupuestos
      ORDER BY datetime(fecha) DESC
    `).all();

    return rows.map(p => ({
      ...p,
      productos: JSON.parse(p.productos || '[]')
    }));
  }

  // ── saveBudget ────────────────────────────────────────────────────────────
  function saveBudget(data) {
    const prodsArr = Array.isArray(data.productos) ? data.productos : [];
    const prodsStr = JSON.stringify(prodsArr);
    const fecha = data.fecha || new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO presupuestos (fecha, cliente, direccion, localidad, cuit, telefono, productos, total)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const info = stmt.run(
      fecha,
      data.cliente || '',
      data.direccion || '',
      data.localidad || '',
      data.cuit || '',
      data.telefono || '',
      prodsStr,
      data.total || 0
    );

    const budgetId = info.lastInsertRowid;

    const payload = {
      id: budgetId,
      fecha,
      cliente: data.cliente || '',
      direccion: data.direccion || '',
      localidad: data.localidad || '',
      cuit: data.cuit || '',
      telefono: data.telefono || '',
      productos: prodsArr,
      total: Number(data.total || 0)
    };

    handleDualWrite(
      supabaseBudgetService.addBudget(payload),
      'presupuestos',
      'INSERT',
      payload
    );

    return { success: true, id: budgetId };
  }

  // ── deleteBudget ──────────────────────────────────────────────────────────
  function deleteBudget(id) {
    if (!id) return { success: false, error: 'ID de presupuesto requerido.' };

    db.prepare('DELETE FROM presupuestos WHERE id = ?').run(id);

    handleDualWrite(
      supabaseBudgetService.deleteBudget(id),
      'presupuestos',
      'DELETE',
      { id: Number(id) }
    );

    return { success: true };
  }

  // ── upsertBudget ──────────────────────────────────────────────────────────
  function upsertBudget(budget) {
    if (!budget || !budget.id) return { success: false, error: 'ID de presupuesto requerido.' };

    let prodsStr = '[]';
    if (typeof budget.productos === 'string') {
      prodsStr = budget.productos;
    } else if (Array.isArray(budget.productos) || typeof budget.productos === 'object') {
      prodsStr = JSON.stringify(budget.productos || []);
    }

    const stmt = db.prepare(`
      INSERT INTO presupuestos (id, fecha, cliente, direccion, localidad, cuit, telefono, productos, total)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        fecha = excluded.fecha,
        cliente = excluded.cliente,
        direccion = excluded.direccion,
        localidad = excluded.localidad,
        cuit = excluded.cuit,
        telefono = excluded.telefono,
        productos = excluded.productos,
        total = excluded.total
    `);

    stmt.run(
      Number(budget.id),
      budget.fecha || new Date().toISOString(),
      budget.cliente || '',
      budget.direccion || '',
      budget.localidad || '',
      budget.cuit || '',
      budget.telefono || '',
      prodsStr,
      budget.total !== undefined ? Number(budget.total) : 0
    );

    return { success: true, id: Number(budget.id) };
  }

  // ── API pública del servicio ───────────────────────────────────────────────
  return {
    getBudgets,
    saveBudget,
    deleteBudget,
    upsertBudget
  };
}

module.exports = createBudgetService;
