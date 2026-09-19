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
   * Crea la tabla offline_queue si no existe en la base de datos local
   * y aplica migración segura para agregar columnas si la tabla ya existía.
   */
  initializeTable() {
    // 1. Crear tabla con todas las columnas si no existe
    this.db.prepare(`
      CREATE TABLE IF NOT EXISTS offline_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entity TEXT,
        action TEXT,
        payload TEXT,
        created_at TEXT DEFAULT (datetime('now', 'localtime')),
        processed INTEGER DEFAULT 0,
        processed_at TEXT,
        retry_count INTEGER DEFAULT 0,
        last_error TEXT,
        last_retry_at TEXT,
        next_retry_at TEXT,
        status TEXT DEFAULT 'PENDING'
      )
    `).run();

    // 2. Migración segura para bases de datos SQLite existentes:
    // detecta columnas ya presentes y añade únicamente las que falten sin alterar datos
    try {
      const existingCols = new Set(
        this.db.prepare("PRAGMA table_info(offline_queue)").all().map(c => c.name)
      );

      const columnsToAdd = [
        { name: 'retry_count', def: 'INTEGER DEFAULT 0' },
        { name: 'last_error', def: 'TEXT' },
        { name: 'last_retry_at', def: 'TEXT' },
        { name: 'next_retry_at', def: 'TEXT' },
        { name: 'status', def: "TEXT DEFAULT 'PENDING'" }
      ];

      for (const col of columnsToAdd) {
        if (!existingCols.has(col.name)) {
          try {
            this.db.prepare(`ALTER TABLE offline_queue ADD COLUMN ${col.name} ${col.def}`).run();
            console.log(`[OfflineQueue] Columna agregada a offline_queue en migración local: ${col.name}`);
          } catch (alterErr) {
            console.warn(`[OfflineQueue] No se pudo agregar columna ${col.name}:`, alterErr.message);
          }
        }
      }
    } catch (migErr) {
      console.warn('[OfflineQueue] Error verificando esquema de offline_queue:', migErr.message);
    }
  }

  /**
   * Agrega una operación a la cola local diferida persistente.
   * @param {object} operation - Operación a realizar (entity/table, action, data/payload).
   * @returns {object} Operación enriquecida con el ID generado.
   */
  addOperation(operation) {
    const entity = operation.entity || operation.table || 'unknown';
    const action = operation.action || 'INSERT';
    const payloadObj = operation.payload || operation.data || {};
    const payload = JSON.stringify(payloadObj);
    const createdAt = operation.timestamp || new Date().toISOString();

    // Deduplicación para operaciones UPDATE/UPDATE_STOCK en entidades (excepto ventas_cart)
    if ((action === 'UPDATE' || action === 'UPDATE_STOCK') && entity !== 'ventas_cart' && payloadObj.id) {
      try {
        const pendingOps = this.db.prepare(`
          SELECT id, payload FROM offline_queue
          WHERE entity = ? AND (action = 'UPDATE' OR action = 'UPDATE_STOCK') AND (status IS NULL OR status = 'PENDING') AND (processed = 0 OR processed IS NULL)
        `).all(entity);

        for (const op of pendingOps) {
          try {
            const p = JSON.parse(op.payload || '{}');
            if (String(p.id) === String(payloadObj.id)) {
              console.log(`[OfflineQueue] 🔄 Reemplazando actualización pendiente duplicada para ${entity} ID ${p.id} (Fila ID offline_queue: ${op.id})`);
              this.db.prepare(`
                UPDATE offline_queue
                SET payload = ?, created_at = ?
                WHERE id = ?
              `).run(payload, createdAt, op.id);

              return {
                id: op.id,
                entity,
                action,
                payload: payloadObj,
                created_at: createdAt,
                processed: 0,
                retry_count: 0,
                status: 'PENDING'
              };
            }
          } catch (e) {}
        }
      } catch (dedupErr) {
        console.warn('[OfflineQueue] Error comprobando deduplicación de UPDATE:', dedupErr.message);
      }
    }

    const stmt = this.db.prepare(`
      INSERT INTO offline_queue (entity, action, payload, created_at, processed, retry_count, status)
      VALUES (?, ?, ?, ?, 0, 0, 'PENDING')
    `);
    const info = stmt.run(entity, action, payload, createdAt);

    const enrichedOperation = {
      id: info.lastInsertRowid,
      entity,
      action,
      payload: payloadObj,
      created_at: createdAt,
      processed: 0,
      retry_count: 0,
      status: 'PENDING'
    };

    console.log('[OfflineQueue] Operación persistida en SQLite:', enrichedOperation);
    return enrichedOperation;
  }

  /**
   * Elimina una operación de la cola por su ID único (usado tras sincronización exitosa).
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
   * Registra un reintento y programa la próxima ejecución con backoff.
   * @param {number|string} operationId - ID de la operación.
   * @param {string} errorMsg - Mensaje de error registrado.
   * @param {string|null} nextRetryAt - Timestamp ISO para la próxima ejecución.
   */
  recordRetry(operationId, errorMsg, nextRetryAt = null) {
    try {
      const stmt = this.db.prepare(`
        UPDATE offline_queue
        SET retry_count = COALESCE(retry_count, 0) + 1,
            last_error = ?,
            last_retry_at = datetime('now', 'localtime'),
            next_retry_at = ?
        WHERE id = ?
      `);
      stmt.run(String(errorMsg || ''), nextRetryAt, Number(operationId));
    } catch (err) {
      console.error(`[OfflineQueue] Error al registrar reintento para ID ${operationId}:`, err.message);
    }
  }

  /**
   * Marca una operación como FALLIDA / CUARENTENA para no bloquear operaciones posteriores.
   * @param {number|string} operationId - ID de la operación.
   * @param {string} errorMsg - Causa del fallo permanente.
   * @returns {boolean} True si fue actualizada.
   */
  markFailed(operationId, errorMsg) {
    try {
      const stmt = this.db.prepare(`
        UPDATE offline_queue
        SET status = 'FAILED',
            processed = 2,
            last_error = ?,
            processed_at = datetime('now', 'localtime')
        WHERE id = ?
      `);
      const info = stmt.run(String(errorMsg || ''), Number(operationId));
      console.warn(`[OfflineQueue] Operación ID ${operationId} marcada como FALLIDA/CUARENTENA en SQLite.`);
      return info.changes > 0;
    } catch (err) {
      console.error(`[OfflineQueue] Error al marcar como fallida ID ${operationId}:`, err.message);
      return false;
    }
  }

  /**
   * Lista operaciones de la cola.
   * Por defecto sólo retorna operaciones pendientes activas (status != 'FAILED' y processed = 0).
   * @param {boolean} [includeFailed=false] - Si es true, incluye operaciones en cuarentena/fallidas.
   * @returns {Array} Lista de operaciones.
   */
  getOperations(includeFailed = false) {
    const sql = includeFailed
      ? `SELECT id, entity, action, payload, created_at, processed, processed_at, retry_count, last_error, last_retry_at, next_retry_at, status
         FROM offline_queue
         ORDER BY id ASC`
      : `SELECT id, entity, action, payload, created_at, processed, processed_at, retry_count, last_error, last_retry_at, next_retry_at, status
         FROM offline_queue
         WHERE (status IS NULL OR status != 'FAILED') AND (processed = 0 OR processed IS NULL)
         ORDER BY id ASC`;

    const rows = this.db.prepare(sql).all();

    return rows.map(r => ({
      id: r.id,
      entity: r.entity,
      action: r.action,
      payload: JSON.parse(r.payload || '{}'),
      created_at: r.created_at,
      processed: r.processed,
      processed_at: r.processed_at,
      retry_count: r.retry_count || 0,
      last_error: r.last_error || null,
      last_retry_at: r.last_retry_at || null,
      next_retry_at: r.next_retry_at || null,
      status: r.status || (r.processed === 2 ? 'FAILED' : 'PENDING')
    }));
  }

  /**
   * Obtiene todas las operaciones que se encuentran en estado FALLIDA / CUARENTENA.
   * @returns {Array}
   */
  getFailedOperations() {
    const rows = this.db.prepare(`
      SELECT id, entity, action, payload, created_at, processed, processed_at, retry_count, last_error, last_retry_at, next_retry_at, status
      FROM offline_queue
      WHERE status = 'FAILED' OR processed = 2
      ORDER BY id ASC
    `).all();

    return rows.map(r => ({
      id: r.id,
      entity: r.entity,
      action: r.action,
      payload: JSON.parse(r.payload || '{}'),
      created_at: r.created_at,
      processed: r.processed,
      processed_at: r.processed_at,
      retry_count: r.retry_count || 0,
      last_error: r.last_error || null,
      last_retry_at: r.last_retry_at || null,
      next_retry_at: r.next_retry_at || null,
      status: 'FAILED'
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
