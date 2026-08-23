// services/syncStatus.js
//
// Fase 0.2.2 — Servicio de Estado de Sincronización Persistente.
// Encapsula y persiste el estado actual de la sincronización remota en SQLite.
//
// Estados posibles: 'OFFLINE', 'ONLINE', 'SYNCING', 'ERROR'
//
// Almacena y persiste en SQLite:
//   - status
//   - lastSync
//   - lastPush
//   - lastPull

'use strict';

const VALID_STATUSES = ['OFFLINE', 'ONLINE', 'SYNCING', 'ERROR'];

class SyncStatus {
  /**
   * Constructor del servicio SyncStatus.
   * @param {import('better-sqlite3').Database} db - Instancia de la base de datos local SQLite.
   */
  constructor(db) {
    this.db = db;
    this.initializeTable();
  }

  /**
   * Crea la tabla `sync_status` e inserta la fila inicial de control si no existe.
   */
  initializeTable() {
    this.db.prepare(`
      CREATE TABLE IF NOT EXISTS sync_status (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        status TEXT DEFAULT 'OFFLINE',
        last_sync TEXT,
        last_push TEXT,
        last_pull TEXT
      )
    `).run();

    this.db.prepare(`
      INSERT OR IGNORE INTO sync_status (id, status, last_sync, last_push, last_pull)
      VALUES (1, 'OFFLINE', NULL, NULL, NULL)
    `).run();
  }

  /**
   * Obtiene el estado completo de la sincronización desde SQLite.
   * @returns {{ status: string, lastSync: string|null, lastPush: string|null, lastPull: string|null }}
   */
  getStatus() {
    const row = this.db.prepare('SELECT status, last_sync, last_push, last_pull FROM sync_status WHERE id = 1').get();
    return {
      status: row ? row.status : 'OFFLINE',
      lastSync: row ? row.last_sync : null,
      lastPush: row ? row.last_push : null,
      lastPull: row ? row.last_pull : null
    };
  }

  /**
   * Establece el estado global de la sincronización ('OFFLINE', 'ONLINE', 'SYNCING', 'ERROR').
   * @param {string} newStatus - Nuevo estado deseado.
   * @returns {boolean} True si se actualizó con éxito.
   */
  setStatus(newStatus) {
    const upperStatus = String(newStatus).toUpperCase();
    if (!VALID_STATUSES.includes(upperStatus)) {
      console.error(`[SyncStatus] Estado inválido: ${newStatus}. Debe ser uno de: ${VALID_STATUSES.join(', ')}`);
      return false;
    }

    const info = this.db.prepare('UPDATE sync_status SET status = ? WHERE id = 1').run(upperStatus);
    console.log(`[SyncStatus] Estado actualizado a: ${upperStatus}`);
    return info.changes > 0;
  }

  /**
   * Actualiza la marca de tiempo de la última sincronización completa.
   * @param {string|Date} [timestamp] - Fecha u hora opcional (por defecto usa el tiempo actual).
   * @returns {boolean}
   */
  updateLastSync(timestamp = new Date().toISOString()) {
    const dateStr = typeof timestamp === 'string' ? timestamp : timestamp.toISOString();
    const info = this.db.prepare('UPDATE sync_status SET last_sync = ? WHERE id = 1').run(dateStr);
    console.log(`[SyncStatus] lastSync actualizado a: ${dateStr}`);
    return info.changes > 0;
  }

  /**
   * Actualiza la marca de tiempo de la última subida de datos (push).
   * @param {string|Date} [timestamp] - Fecha u hora opcional.
   * @returns {boolean}
   */
  updateLastPush(timestamp = new Date().toISOString()) {
    const dateStr = typeof timestamp === 'string' ? timestamp : timestamp.toISOString();
    const info = this.db.prepare('UPDATE sync_status SET last_push = ? WHERE id = 1').run(dateStr);
    console.log(`[SyncStatus] lastPush actualizado a: ${dateStr}`);
    return info.changes > 0;
  }

  /**
   * Actualiza la marca de tiempo de la última bajada de datos (pull).
   * @param {string|Date} [timestamp] - Fecha u hora opcional.
   * @returns {boolean}
   */
  updateLastPull(timestamp = new Date().toISOString()) {
    const dateStr = typeof timestamp === 'string' ? timestamp : timestamp.toISOString();
    const info = this.db.prepare('UPDATE sync_status SET last_pull = ? WHERE id = 1').run(dateStr);
    console.log(`[SyncStatus] lastPull actualizado a: ${dateStr}`);
    return info.changes > 0;
  }
}

module.exports = (db) => new SyncStatus(db);
