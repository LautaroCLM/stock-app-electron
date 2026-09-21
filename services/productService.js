// services/productService.js
//
// Fase 2.3.1 (Paso 3) — Capa Híbrida de servicio para el módulo de Productos.
// Centraliza el acceso a datos de la tabla `productos`.
//
// - Si CONFIG.APP_MODE === 'LOCAL': Lee directamente desde la base SQLite local.
// - Si CONFIG.APP_MODE === 'ONLINE': Lee desde Supabase utilizando supabaseProductService.

'use strict';

const crypto = require('crypto');
const CONFIG = require('./config');
const supabaseProductService = require('./supabaseProductService');

/**
 * Fábrica del servicio de Productos.
 * @param {import('better-sqlite3').Database} db - Instancia de la base de datos.
 * @param {function(string, string): void} registrarAccion - Función de auditoría de main.js.
 * @param {object} [syncManager=null] - Instancia de SyncManager para encolado offline.
 * @returns {object} Objeto con los métodos del servicio.
 */
function createProductService(db, registrarAccion, syncManager = null) {

  function handleDualWrite(promise, entity, action, payload) {
    promise
      .then(res => {
        if (!res || !res.success) {
          console.warn(`[ProductService] Dual Write hacia Supabase no exitoso (${action}). Registrando en offline_queue.`);
          if (syncManager) {
            syncManager.queueOperation({ entity, action, payload });
          }
        }
      })
      .catch(err => {
        console.error(`[ProductService] Error en Dual Write hacia Supabase (${action}):`, err.message || err);
        if (syncManager) {
          syncManager.queueOperation({ entity, action, payload });
        }
      });
  }

  // ── getProducts ───────────────────────────────────────────────────────────
  /**
   * Devuelve todos los productos ordenados por id descendente.
   * @returns {Promise<Array>} Lista de productos.
   */
  async function getProducts() {
    if (CONFIG.APP_MODE === 'ONLINE') {
      console.log('[ProductService] Modo ONLINE configurado: consultando productos desde Supabase...');
      try {
        const products = await supabaseProductService.getProducts();
        if (Array.isArray(products) && products.length > 0) {
          // Mantener SQLite sincronizado localmente (sin dual write ni loop)
          for (const p of products) {
            upsertProduct(p);
          }
          return products;
        }
      } catch (err) {
        console.warn('[ProductService] Supabase no disponible (offline), recurriendo a SQLite local:', err.message);
      }
    }

    console.log('[ProductService] Obteniendo productos desde SQLite local.');
    const products = db.prepare('SELECT * FROM productos ORDER BY id DESC').all();
    console.log(`[ProductService] getProducts: ${products.length} productos.`);
    return products;
  }

  // ── getProductById ────────────────────────────────────────────────────────
  /**
   * Obtiene un producto por su id.
   * @param {number|string} id - Id del producto.
   * @returns {Promise<object|null>} Producto encontrado o null.
   */
  async function getProductById(id) {
    if (CONFIG.APP_MODE === 'ONLINE') {
      console.log(`[ProductService] Modo ONLINE activo: obteniendo producto ID ${id} desde Supabase.`);
      return await supabaseProductService.getProductById(id);
    }

    if (!id) return null;
    return db.prepare('SELECT * FROM productos WHERE id = ?').get(id) || null;
  }

  // ── getProductByCode ──────────────────────────────────────────────────────
  /**
   * Obtiene un producto por su código.
   * @param {string} code - Código del producto.
   * @returns {Promise<object|null>} Producto encontrado o null.
   */
  async function getProductByCode(code) {
    if (CONFIG.APP_MODE === 'ONLINE') {
      console.log(`[ProductService] Modo ONLINE activo: obteniendo producto con código "${code}" desde Supabase.`);
      return await supabaseProductService.getProductByCode(code);
    }

    if (!code) return null;
    return db.prepare('SELECT * FROM productos WHERE codigo = ?').get(code) || null;
  }

  // ── searchProducts ────────────────────────────────────────────────────────
  /**
   * Busca productos por coincidencia parcial en nombre, código o categoría.
   * @param {string} query - Término de búsqueda.
   * @returns {Promise<Array>} Productos coincidentes.
   */
  async function searchProducts(query) {
    if (CONFIG.APP_MODE === 'ONLINE') {
      console.log(`[ProductService] Modo ONLINE activo: buscando productos con término "${query}" desde Supabase.`);
      return await supabaseProductService.searchProducts(query);
    }

    if (!query || typeof query !== 'string' || !query.trim()) {
      return getProducts();
    }

    const q = `%${query.trim()}%`;
    return db.prepare(`
      SELECT * FROM productos 
      WHERE nombre LIKE ? OR codigo LIKE ? OR categoria LIKE ?
      ORDER BY id DESC
    `).all(q, q, q);
  }

  // ── createProduct (LOCAL SQLITE + DUAL WRITE SUPABASE) ───────────────────
  /**
   * Inserta un nuevo producto en la base de datos local SQLite y replica a Supabase.
   * @param {object} product - Datos del producto a insertar.
   * @returns {{ success: boolean, id?: number, uuid?: string, error?: string }}
   */
  function createProduct(product) {
    const uuid = product.uuid || crypto.randomUUID();
    const stmt = db.prepare(`
      INSERT INTO productos (uuid, codigo, nombre, categoria, stock, precio, precio_costo, unidad, proveedor_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(
      uuid,
      product.codigo || '',
      product.nombre || '',
      product.categoria || '',
      product.stock || 0,
      product.precio || 0,
      product.precio_costo || 0,
      product.unidad || 'un',
      (product.proveedor_id !== undefined && product.proveedor_id !== null && product.proveedor_id !== '')
        ? Number(product.proveedor_id)
        : null
    );

    const newId = info.lastInsertRowid;
    const fullProduct = { ...product, id: newId, uuid };

    if (typeof registrarAccion === 'function') {
      registrarAccion(
        'Agregar producto',
        `Producto: ${product.nombre} (${product.codigo}) - Stock: ${product.stock} ${product.unidad}`
      );
    }

    // Dual Write asíncrono a Supabase (no bloqueante)
    handleDualWrite(
      supabaseProductService.createProduct(fullProduct),
      'productos',
      'INSERT',
      fullProduct
    );

    return { success: true, id: newId, uuid };
  }

  // ── updateProduct (LOCAL SQLITE + DUAL WRITE SUPABASE) ───────────────────
  /**
   * Actualiza un producto existente por su id o uuid en SQLite y replica a Supabase.
   * @param {object} product - Datos del producto (debe incluir `id` o `uuid`).
   * @returns {{ success: boolean, uuid?: string, error?: string }}
   */
  function updateProduct(product) {
    let uuid = product.uuid;
    if (!uuid && product.id) {
      const existing = db.prepare('SELECT uuid FROM productos WHERE id = ?').get(product.id);
      uuid = existing?.uuid;
    }
    if (!uuid) {
      uuid = crypto.randomUUID();
    }

    const stmt = db.prepare(`
      UPDATE productos
      SET uuid = ?, codigo = ?, nombre = ?, categoria = ?, stock = ?, precio = ?, precio_costo = ?, unidad = ?, proveedor_id = ?
      WHERE id = ? OR (uuid IS NOT NULL AND uuid = ?)
    `);

    const info = stmt.run(
      uuid,
      product.codigo || '',
      product.nombre || '',
      product.categoria || '',
      product.stock || 0,
      product.precio || 0,
      product.precio_costo || 0,
      product.unidad || 'un',
      (product.proveedor_id !== undefined && product.proveedor_id !== null && product.proveedor_id !== '')
        ? Number(product.proveedor_id)
        : null,
      product.id || null,
      uuid
    );

    const fullProduct = { ...product, uuid };

    if (info.changes === 0) {
      upsertProduct(fullProduct);
    }

    if (typeof registrarAccion === 'function') {
      registrarAccion(
        'Editar producto',
        `Producto: ${product.nombre} (${product.codigo}) - Precio venta: $${product.precio}, Precio costo: $${product.precio_costo}`
      );
    }

    handleDualWrite(
      supabaseProductService.updateProduct(fullProduct),
      'productos',
      'UPDATE',
      fullProduct
    );

    return { success: true, uuid };
  }

  // ── deleteProduct (LOCAL SQLITE + DUAL WRITE SUPABASE) ───────────────────
  /**
   * Elimina un producto por su id o uuid en SQLite y replica a Supabase.
   * @param {number|string} id - Id o UUID del producto a eliminar.
   * @returns {{ success: boolean, error?: string }}
   */
  function deleteProduct(id) {
    let prodId = null;
    let prodUuid = null;
    let producto = null;

    if (typeof id === 'string' && id.includes('-')) {
      prodUuid = id;
      producto = db.prepare('SELECT id, uuid, nombre FROM productos WHERE uuid = ?').get(prodUuid);
      if (producto) prodId = producto.id;
    } else {
      prodId = Number(id);
      producto = db.prepare('SELECT id, uuid, nombre FROM productos WHERE id = ?').get(prodId);
      prodUuid = producto?.uuid;
    }

    let info = { changes: 0 };
    if (prodId) {
      const stmt = db.prepare('DELETE FROM productos WHERE id = ?');
      info = stmt.run(prodId);
    } else if (prodUuid) {
      const stmt = db.prepare('DELETE FROM productos WHERE uuid = ?');
      info = stmt.run(prodUuid);
    }

    console.log(`[ProductService] DELETE ejecutado en SQLite local para ID ${prodId} / UUID ${prodUuid}. Filas afectadas: ${info.changes}`);

    if (info.changes > 0 && typeof registrarAccion === 'function') {
      registrarAccion(
        'Eliminar producto',
        `ID: ${prodId}, UUID: ${prodUuid}, Nombre: ${producto?.nombre || 'Desconocido'}`
      );
    }

    if (CONFIG.APP_MODE === 'ONLINE' || info.changes > 0) {
      handleDualWrite(
        supabaseProductService.deleteProduct(prodUuid || prodId),
        'productos',
        'DELETE',
        { id: prodId, uuid: prodUuid }
      );
      return { success: true };
    }

    return { success: info.changes > 0 };
  }

  // ── upsertProduct (LOCAL SQLITE PURA SIN DUAL WRITE NI ENCOLADO) ─────────
  /**
   * Inserta o actualiza (UPSERT) un producto en SQLite local basándose en su UUID (o id/clave natural en transición).
   * Preserva SIEMPRE el ID físico local de SQLite.
   * 
   * @param {object} product - Objeto con datos del producto.
   * @returns {{ success: boolean, id?: number, uuid?: string, error?: string }}
   */
  function upsertProduct(product) {
    if (!product) {
      return { success: false, error: 'Datos de producto requeridos para UPSERT.' };
    }

    const prodUuid = product.uuid ? String(product.uuid).trim() : null;
    const codigo = product.codigo ? String(product.codigo).trim() : '';
    const nombre = product.nombre ? String(product.nombre).trim() : '';

    try {
      let existingLocal = null;

      if (prodUuid) {
        existingLocal = db.prepare('SELECT id, uuid FROM productos WHERE uuid = ?').get(prodUuid);
      }

      if (!existingLocal && codigo && nombre) {
        existingLocal = db.prepare('SELECT id, uuid FROM productos WHERE codigo = ? AND nombre = ?').get(codigo, nombre);
      }

      if (existingLocal) {
        const localId = Number(existingLocal.id);
        const updateUuid = prodUuid || existingLocal.uuid || crypto.randomUUID();

        const stmt = db.prepare(`
          UPDATE productos SET
            uuid = ?,
            codigo = ?,
            nombre = ?,
            categoria = ?,
            stock = ?,
            unidad = ?,
            precio_costo = ?,
            precio = ?,
            stock_minimo = ?,
            proveedor_id = ?
          WHERE id = ?
        `);
        stmt.run(
          updateUuid,
          codigo,
          nombre,
          product.categoria || '',
          product.stock !== undefined ? Number(product.stock) : 0,
          product.unidad || 'un',
          product.precio_costo !== undefined ? Number(product.precio_costo) : 0,
          product.precio !== undefined ? Number(product.precio) : 0,
          product.stock_minimo !== undefined ? Number(product.stock_minimo) : 10,
          (product.proveedor_id !== undefined && product.proveedor_id !== null && product.proveedor_id !== '')
            ? Number(product.proveedor_id)
            : null,
          localId
        );
        return { success: true, id: localId, uuid: updateUuid };
      } else {
        const newUuid = prodUuid || crypto.randomUUID();
        const stmt = db.prepare(`
          INSERT INTO productos (uuid, codigo, nombre, categoria, stock, unidad, precio_costo, precio, stock_minimo, proveedor_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        const info = stmt.run(
          newUuid,
          codigo,
          nombre,
          product.categoria || '',
          product.stock !== undefined ? Number(product.stock) : 0,
          product.unidad || 'un',
          product.precio_costo !== undefined ? Number(product.precio_costo) : 0,
          product.precio !== undefined ? Number(product.precio) : 0,
          product.stock_minimo !== undefined ? Number(product.stock_minimo) : 10,
          (product.proveedor_id !== undefined && product.proveedor_id !== null && product.proveedor_id !== '')
            ? Number(product.proveedor_id)
            : null
        );
        return { success: true, id: info.lastInsertRowid, uuid: newUuid };
      }
    } catch (err) {
      console.warn(`[ProductService] Error en upsertProduct (UUID ${prodUuid}):`, err.message);
      return { success: false, error: err.message };
    }
  }

  // ── deleteAllProducts (LOCAL SQLITE + DUAL WRITE SUPABASE) ─────────────
  function deleteAllProducts() {
    // 1. Obtener la lista de IDs primitivos ANTES de ejecutar la eliminación local
    const productIds = db.prepare('SELECT id FROM productos').all().map(p => Number(p.id));

    if (productIds.length === 0) {
      return { success: true, count: 0 };
    }

    // 2. Ejecutar la eliminación física en SQLite local
    db.prepare('DELETE FROM productos').run();

    if (typeof registrarAccion === 'function') {
      registrarAccion('Eliminar todos los productos', `Total eliminados: ${productIds.length}`);
    }

    // 3. Encolar/disparar Dual Write en Supabase para cada ID previamente capturado
    for (const id of productIds) {
      handleDualWrite(
        supabaseProductService.deleteProduct(id),
        'productos',
        'DELETE',
        { id }
      );
    }

    return { success: true, count: productIds.length };
  }

  // ── updatePrices (LOCAL SQLITE + DUAL WRITE SUPABASE) ───────────────────
  function updatePrices(percent) {
    const stmt = db.prepare('UPDATE productos SET precio = ROUND(precio * (1 + ? / 100.0), 2)');
    const info = stmt.run(percent);

    if (typeof registrarAccion === 'function') {
      registrarAccion('Actualizar precios', `Porcentaje: ${percent}%`);
    }

    const updatedProds = db.prepare('SELECT * FROM productos').all();
    for (const p of updatedProds) {
      handleDualWrite(
        supabaseProductService.updateProduct(p),
        'productos',
        'UPDATE',
        p
      );
    }

    return { success: true, changes: info.changes };
  }

  // ── updatePricesAdvanced (LOCAL SQLITE + DUAL WRITE SUPABASE) ───────────
  function updatePricesAdvanced({ percent, category, priceType = 'venta' }) {
    const priceField = priceType === 'venta' ? 'precio' : 'precio_costo';
    let info;

    if (category && category !== '__all__') {
      const stmt = db.prepare(`UPDATE productos SET ${priceField} = ROUND(${priceField} * (1 + ? / 100.0), 2) WHERE categoria = ?`);
      info = stmt.run(percent, category);
    } else {
      const stmt = db.prepare(`UPDATE productos SET ${priceField} = ROUND(${priceField} * (1 + ? / 100.0), 2)`);
      info = stmt.run(percent);
    }

    const priceTypeName = priceType === 'venta' ? 'Precios de venta' : 'Precios de costo';
    if (typeof registrarAccion === 'function') {
      registrarAccion('Actualizar precios avanzados', `${priceTypeName}: ${percent}%, Categoría: ${category || 'Todas'}`);
    }

    const updatedProds = db.prepare('SELECT * FROM productos').all();
    for (const p of updatedProds) {
      handleDualWrite(
        supabaseProductService.updateProduct(p),
        'productos',
        'UPDATE',
        p
      );
    }

    return { success: true, changes: info.changes };
  }

  // ── API pública del servicio ───────────────────────────────────────────────
  return {
    getProducts,
    getProductById,
    getProductByCode,
    searchProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    upsertProduct,
    deleteAllProducts,
    updatePrices,
    updatePricesAdvanced
  };
}

module.exports = createProductService;
