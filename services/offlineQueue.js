// services/offlineQueue.js
//
// Fase 0.2.1 — Estructura de Cola Local Diferida Persistente en SQLite.
// Representa la cola de operaciones offline utilizando una tabla en SQLite.
//
// Asegura que las operaciones diferidas no se pierdan si se cierra la aplicación
// o se reinicia el sistema operativo.

'use strict';

class OfflineQueue {
  /**
   * Constructor de OfflineQueue.
   * @param {import('better-sqlite3').Database} db - Instancia de la base de datos local SQLite.
   */
  constructor(db) {
    this.db = db;
    this.initializeTable();
  }

  /**
   * Crea la tabla offline_queue si no existe en la base de datos local.
   */
  initializeTable() {
    this.db.prepare(`
      CREATE TABLE IF NOT EXISTS offline_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entity TEXT,
        action TEXT,
        payload TEXT,
        created_at TEXT DEFAULT (datetime('now', 'localtime')),
        processed INTEGER DEFAULT 0,
        processed_at TEXT
      )
    `).run();
  }

  /**
   * Agrega una operación a la cola local diferida persistente.
   * @param {object} operation - Operación a realizar (entity/table, action, data/payload).
   * @returns {object} Operación enriquecida con el ID generado.
   */
  addOperation(operation) {
    const entity = operation.entity || operation.table || 'unknown';
    const action = operation.action || 'INSERT';
    const payload = JSON.stringify(operation.payload || operation.data || {});
    const createdAt = operation.timestamp || new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO offline_queue (entity, action, payload, created_at, processed)
      VALUES (?, ?, ?, ?, 0)
    `);
    const info = stmt.run(entity, action, payload, createdAt);

    const enrichedOperation = {
      id: info.lastInsertRowid,
      entity,
      action,
      payload: JSON.parse(payload),
      created_at: createdAt,
      processed: 0
    };

    console.log('[OfflineQueue] Operación persistida en SQLite:', enrichedOperation);
    return enrichedOperation;
  }

  /**
   * Elimina una operación de la cola por su ID único.
   * @param {number|string} operationId - ID del registro en la tabla.
   * @returns {boolean} True si fue eliminada, false en caso contrario.
   */
  removeOperation(operationId) {
    const stmt = this.db.prepare('DELETE FROM offline_queue WHERE id = ?');
    const info = stmt.run(operationId);
    const removed = info.changes > 0;
    if (removed) {
      console.log(`[OfflineQueue] Operación con ID ${operationId} eliminada de SQLite.`);
    }
    return removed;
  }

  /**
   * Lista todas las operaciones activas (no procesadas) de la cola.
   * @returns {Array} Lista de operaciones no procesadas.
   */
  getOperations() {
    const rows = this.db.prepare(`
      SELECT id, entity, action, payload, created_at, processed, processed_at
      FROM offline_queue
      WHERE processed = 0
      ORDER BY id ASC
    `).all();

    return rows.map(r => ({
      id: r.id,
      entity: r.entity,
      action: r.action,
      payload: JSON.parse(r.payload || '{}'),
      created_at: r.created_at,
      processed: r.processed,
      processed_at: r.processed_at
    }));
  }

  /**
   * Limpia y vacía por completo la cola de operaciones en SQLite.
   */
  clearQueue() {
    this.db.prepare('DELETE FROM offline_queue').run();
    console.log('[OfflineQueue] Cola de operaciones vaciada por completo en SQLite.');
  }
}

module.exports = (db) => new OfflineQueue(db);
