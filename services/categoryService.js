// services/categoryService.js
//
// Fase 2.1 (Paso 1) — Servicio Híbrido de Categorías.
// Provee una interfaz unificada para la lectura de categorías.
//
// - Si CONFIG.APP_MODE === 'LOCAL': Lee directamente desde la base SQLite local.
// - Si CONFIG.APP_MODE === 'ONLINE': Lee desde Supabase utilizando supabaseCategoryService.

'use strict';

const CONFIG = require('./config');
const supabaseCategoryService = require('./supabaseCategoryService');

/**
 * Crea el servicio híbrido de categorías.
 * @param {import('better-sqlite3').Database} db - Instancia de la base de datos local SQLite.
 * @param {function(string, string): void} [registrarAccion] - Función opcional de auditoría.
 * @param {object} [syncManager=null] - Instancia de SyncManager para encolado offline.
 */
function createCategoryService(db, registrarAccion, syncManager = null) {
  if (!db) {
    throw new Error('[CategoryService] Instancia de base de datos requerida.');
  }

  function handleDualWrite(promise, entity, action, payload) {
    promise
      .then(res => {
        if (!res || !res.success) {
          console.warn(`[CategoryService] Dual Write hacia Supabase no exitoso (${action}). Registrando en offline_queue.`);
          if (syncManager) {
            syncManager.queueOperation({ entity, action, payload });
          }
        }
      })
      .catch(err => {
        console.error(`[CategoryService] Error en Dual Write hacia Supabase (${action}):`, err.message || err);
        if (syncManager) {
          syncManager.queueOperation({ entity, action, payload });
        }
      });
  }

  return {
    /**
     * Obtiene la lista completa de categorías en formato [{ id, nombre }, ...].
     * Determina la fuente de datos (SQLite o Supabase) dinámicamente según CONFIG.APP_MODE.
     * 
     * @returns {Promise<Array<{id: number, nombre: string}>>}
     */
    async getCategories() {
      if (CONFIG.APP_MODE === 'ONLINE') {
        console.log('[CategoryService] Modo ONLINE activo: obteniendo categorías desde Supabase.');
        return await supabaseCategoryService.getAllCategories();
      }

      console.log('[CategoryService] Modo LOCAL activo: obteniendo categorías desde SQLite.');
      return db.prepare('SELECT * FROM categorias ORDER BY nombre ASC').all();
    },

    /**
     * Agrega una nueva categoría en SQLite y dispara Dual Write asíncrono a Supabase.
     * @param {string} nombre - Nombre de la categoría.
     * @returns {{ success: boolean, id?: number, error?: string }}
     */
    addCategory(nombre) {
      if (!nombre || !nombre.trim()) {
        return { success: false, error: 'Nombre de categoría requerido.' };
      }

      const stmt = db.prepare('INSERT INTO categorias (nombre) VALUES (?)');
      const info = stmt.run(nombre.trim());

      if (typeof registrarAccion === 'function') {
        registrarAccion('Agregar categoría', `Nombre: ${nombre.trim()}`);
      }

      const newId = info.lastInsertRowid;

      // Dual Write asíncrono a Supabase (no bloqueante)
      handleDualWrite(
        supabaseCategoryService.createCategory({ id: newId, nombre: nombre.trim() }),
        'categorias',
        'INSERT',
        { id: newId, nombre: nombre.trim() }
      );

      return { success: true, id: newId };
    },

    /**
     * Elimina una categoría por ID en SQLite y dispara Dual Write asíncrono a Supabase.
     * @param {number|string} id - ID de la categoría a eliminar.
     * @returns {{ success: boolean, error?: string }}
     */
    deleteCategory(id) {
      const categoria = db.prepare('SELECT nombre FROM categorias WHERE id = ?').get(id);
      const stmt = db.prepare('DELETE FROM categorias WHERE id = ?');
      const info = stmt.run(id);

      if (info.changes > 0) {
        if (typeof registrarAccion === 'function') {
          registrarAccion('Eliminar categoría', `ID: ${id}, Nombre: ${categoria?.nombre || 'Desconocida'}`);
        }

        // Dual Write asíncrono a Supabase (no bloqueante)
        handleDualWrite(
          supabaseCategoryService.deleteCategory(id, categoria?.nombre),
          'categorias',
          'DELETE',
          { id, nombre: categoria?.nombre }
        );
      }

      return { success: info.changes > 0 };
    },

    /**
     * Inserta o actualiza (UPSERT) una categoría en SQLite local basándose en su ID.
     * Utilizado para sincronización entrante desde Supabase hacia la base de datos local.
     * 
     * @param {object} category - Objeto con datos de categoría (debe contener id y nombre).
     * @returns {{ success: boolean, id?: number, error?: string }}
     */
    upsertCategory(category) {
      if (!category || !category.id || !category.nombre || !category.nombre.trim()) {
        return { success: false, error: 'ID y Nombre de categoría requeridos para UPSERT.' };
      }

      const stmt = db.prepare(`
        INSERT INTO categorias (id, nombre)
        VALUES (?, ?)
        ON CONFLICT(id) DO UPDATE SET
          nombre = excluded.nombre
      `);

      stmt.run(Number(category.id), category.nombre.trim());

      return { success: true, id: Number(category.id) };
    }
  };
}

module.exports = createCategoryService;

