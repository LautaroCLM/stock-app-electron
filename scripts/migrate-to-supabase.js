// scripts/migrate-to-supabase.js
//
// Fase 2.4.4 — Herramienta de Migración SQLite ➔ Supabase con Compatibilidad de Columnas IDENTITY.
// Preserva los IDs originales de SQLite mediante el manejo de OVERRIDING SYSTEM VALUE / GENERATED ALWAYS AS IDENTITY.
//
// Uso desde la terminal:
//   node scripts/migrate-to-supabase.js --categorias
//   node scripts/migrate-to-supabase.js --proveedores
//   node scripts/migrate-to-supabase.js --productos
//   node scripts/migrate-to-supabase.js --all

'use strict';

const path = require('path');
const fs = require('fs');
const CONFIG = require('../services/config');
const { getSupabaseClient, isSupabaseConfigured } = require('../services/supabaseClient');

/**
 * Busca e identifica la ruta del archivo SQLite data.db
 * @returns {string} Ruta absoluta al archivo data.db
 */
function getDatabasePath() {
  const appDataPath = process.env.APPDATA || (process.platform === 'darwin' ? process.env.HOME + '/Library/Application Support' : process.env.HOME + "/.config");
  
  const candidates = [
    path.join(appDataPath, 'inventario-baupi', 'data.db'),
    path.join(appDataPath, 'Inventario stockapp', 'data.db'),
    path.join(appDataPath, 'Electron', 'data.db'),
    path.join(__dirname, '../data.db')
  ];

  for (const p of candidates) {
    if (fs.existsSync(p)) {
      return p;
    }
  }
  return candidates[0];
}

/**
 * Intenta abrir la conexión a SQLite en modo lectura.
 * @returns {object|null} Instancia de better-sqlite3 o null si no está disponible directamente.
 */
function openSQLiteDatabase() {
  const dbPath = getDatabasePath();
  console.log(`[SQLite] Buscando archivo data.db en: ${dbPath}`);

  if (!fs.existsSync(dbPath)) {
    console.warn(`⚠️ [SQLite] No se encontró el archivo de base de datos en: ${dbPath}`);
    return null;
  }

  try {
    const Database = require('better-sqlite3');
    const db = new Database(dbPath, { readonly: true });
    console.log(`✅ [SQLite] Conexión establecida a SQLite (Lectura)`);
    return db;
  } catch (err) {
    console.warn(`⚠️ [SQLite] Conexión directa better-sqlite3 nativa no disponible en entorno CLI (${err.message}). Usando conector de respaldo.`);
    return null;
  }
}

/**
 * Lee registros desde una tabla de SQLite usando better-sqlite3 o conector Python de respaldo.
 * @param {object|null} db Instancia de better-sqlite3
 * @param {string} tableName Nombre de la tabla SQLite
 * @param {string[]} columns Lista de columnas a seleccionar
 * @returns {Array<object>} Lista de registros
 */
function readSQLiteTable(db, tableName, columns) {
  const colsSelect = columns.join(', ');
  if (db && typeof db.prepare === 'function') {
    try {
      return db.prepare(`SELECT ${colsSelect} FROM ${tableName} ORDER BY id ASC`).all();
    } catch (err) {
      console.warn(`⚠️ [SQLite] Error al consultar tabla ${tableName} con better-sqlite3: ${err.message}`);
    }
  }

  const dbPath = getDatabasePath();
  if (fs.existsSync(dbPath)) {
    try {
      const { execSync } = require('child_process');
      const pyScript = `import sqlite3, json; conn = sqlite3.connect(r'${dbPath}'); conn.row_factory = sqlite3.Row; cur = conn.execute('SELECT ${colsSelect} FROM ${tableName} ORDER BY id ASC'); print(json.dumps([dict(r) for r in cur.fetchall()]))`;
      const pyCmd = `python -c "${pyScript}"`;
      const pyOut = execSync(pyCmd, { encoding: 'utf8' });
      return JSON.parse(pyOut.trim());
    } catch (pyErr) {
      console.error(`❌ [SQLite] Error en conector de respaldo Python para ${tableName}:`, pyErr.message);
    }
  }

  return [];
}

/**
 * Inserta o actualiza un registro en Supabase manejando compatibilidad con columnas GENERATED ALWAYS AS IDENTITY.
 * 
 * Si PostgreSQL rechaza la inserción manual de 'id' (Error 428C9: GENERATED ALWAYS),
 * intenta métodos de fallback (RPC OVERRIDING SYSTEM VALUE) o reporta la causa exacta.
 * 
 * @param {object} supabase Cliente de Supabase
 * @param {string} table Nombre de la tabla
 * @param {object} payload Datos a insertar/upsert
 * @param {string} onConflict Campo de conflicto (por defecto 'id')
 * @returns {Promise<{ success: boolean, identityOverrideUsed: boolean, error: any }>}
 */
async function upsertRecordWithIdentity(supabase, table, payload, onConflict = 'id') {
  // 1. Intento principal: Upsert mediante Supabase JS client
  const { data, error } = await supabase
    .from(table)
    .upsert(payload, { onConflict });

  if (!error) {
    return { success: true, identityOverrideUsed: false, error: null };
  }

  // 2. Verificar si el error se debe a columnas IDENTITY (Error PostgreSQL 428C9)
  const isIdentityError = error.code === '428C9' ||
    (error.message && error.message.includes('cannot insert a non-DEFAULT value into column "id"')) ||
    (error.details && error.details.includes('GENERATED ALWAYS'));

  if (isIdentityError) {
    // 3. Fallback: Intentar RPC ejecutor con cláusula OVERRIDING SYSTEM VALUE
    try {
      const keys = Object.keys(payload);
      const cols = keys.join(', ');
      const valPlaceholders = keys.map(k => {
        const v = payload[k];
        if (v === null || v === undefined) return 'NULL';
        if (typeof v === 'number') return v;
        if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
        if (typeof v === 'object') return `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`;
        return `'${String(v).replace(/'/g, "''")}'`;
      }).join(', ');

      const updateSet = keys.filter(k => k !== onConflict).map(k => `${k} = EXCLUDED.${k}`).join(', ');

      const sqlQuery = `INSERT INTO ${table} (${cols}) OVERRIDING SYSTEM VALUE VALUES (${valPlaceholders}) ON CONFLICT (${onConflict}) DO UPDATE SET ${updateSet};`;

      // Intentar ejecutar mediante función RPC si existe en Supabase
      const { data: rpcData, error: rpcError } = await supabase.rpc('exec_sql', { sql_query: sqlQuery });
      if (!rpcError) {
        return { success: true, identityOverrideUsed: true, error: null };
      }

      // Intentar RPC específico por tabla
      const { data: rpcTblData, error: rpcTblError } = await supabase.rpc(`upsert_${table}_override`, payload);
      if (!rpcTblError) {
        return { success: true, identityOverrideUsed: true, error: null };
      }
    } catch (fallbackErr) {
      // Ignorar excepciones secundarias
    }
  }

  return { success: false, identityOverrideUsed: isIdentityError, error };
}

/**
 * Migra las categorías desde SQLite a Supabase utilizando upsert e id explícito.
 * 
 * @param {object|null} db - Instancia de SQLite.
 * @param {object|null} supabase - Instancia del cliente de Supabase.
 * @returns {Promise<object>} Auditoría de migración de categorías
 */
async function migrateCategorias(db, supabase) {
  console.log('\n====================================================');
  console.log('📌 INICIANDO MIGRACIÓN DE CATEGORÍAS');
  console.log('====================================================');

  const audit = { tabla: 'categorias', encontradas: 0, migradas: 0, omitidas: 0, errores: 0, identityErrors: 0 };

  if (!supabase) {
    console.error('❌ Supabase no está configurado en .env / config.js. Abortando migración de categorías.');
    return audit;
  }

  const columns = ['id', 'nombre'];
  const categorias = readSQLiteTable(db, 'categorias', columns);
  audit.encontradas = categorias.length;

  console.log(`\n📋 Categorías encontradas en SQLite: ${audit.encontradas}`);

  for (const cat of categorias) {
    try {
      if (!cat || cat.id === undefined || cat.id === null || !cat.nombre) {
        console.warn(`⚠️ Registro omitido por datos incompletos:`, cat);
        audit.omitidas++;
        continue;
      }

      const payload = {
        id: Number(cat.id),
        nombre: String(cat.nombre).trim()
      };

      const result = await upsertRecordWithIdentity(supabase, 'categorias', payload, 'id');

      if (result.success) {
        const flagOverride = result.identityOverrideUsed ? ' (OVERRIDING SYSTEM VALUE)' : '';
        console.log(`  ✅ Categoría ID ${cat.id} ("${cat.nombre}") migrada correctamente.${flagOverride}`);
        audit.migradas++;
      } else {
        if (result.identityOverrideUsed) audit.identityErrors++;
        console.error(`❌ Error migrando categoría ID ${cat.id} ("${cat.nombre}"): ${result.error?.message || result.error}`);
        audit.errores++;
      }
    } catch (itemErr) {
      console.error(`❌ Excepción procesando categoría ID ${cat?.id}:`, itemErr.message);
      audit.errores++;
    }
  }

  console.log('\n-----------------------------------');
  console.log(`Categorías encontradas: ${audit.encontradas}`);
  console.log(`Categorías migradas:    ${audit.migradas}`);
  console.log(`Categorías omitidas:    ${audit.omitidas}`);
  console.log(`Errores:                ${audit.errores}`);
  if (audit.identityErrors > 0) {
    console.log(`⚠️ Advertencias IDENTITY (GENERATED ALWAYS): ${audit.identityErrors}`);
    console.log(`   Sugerencia: Para permitir inserciones con ID explícito en PostgreSQL, configure`);
    console.log(`   'ALTER TABLE categorias ALTER COLUMN id SET GENERATED BY DEFAULT;' en Supabase.`);
  }
  console.log('-----------------------------------\n');

  return audit;
}

/**
 * Migra los proveedores desde SQLite a Supabase utilizando upsert e id explícito.
 * 
 * @param {object|null} db - Instancia de SQLite.
 * @param {object|null} supabase - Instancia del cliente de Supabase.
 * @returns {Promise<object>} Auditoría de migración de proveedores
 */
async function migrateProveedores(db, supabase) {
  console.log('\n====================================================');
  console.log('📌 INICIANDO MIGRACIÓN DE PROVEEDORES');
  console.log('====================================================');

  const audit = { tabla: 'proveedores', encontradas: 0, migradas: 0, omitidas: 0, errores: 0, identityErrors: 0 };

  if (!supabase) {
    console.error('❌ Supabase no está configurado en .env / config.js. Abortando migración de proveedores.');
    return audit;
  }

  const columns = ['id', 'razon_social', 'contacto', 'telefono', 'email', 'direccion', 'ciudad', 'provincia', 'cuit', 'observaciones', 'estado', 'created_at'];
  const proveedores = readSQLiteTable(db, 'proveedores', columns);
  audit.encontradas = proveedores.length;

  console.log(`\n📋 Proveedores encontrados en SQLite: ${audit.encontradas}`);

  for (const prov of proveedores) {
    try {
      if (!prov || prov.id === undefined || prov.id === null || !prov.razon_social) {
        console.warn(`⚠️ Registro omitido por datos incompletos:`, prov);
        audit.omitidas++;
        continue;
      }

      const payload = {
        id: Number(prov.id),
        razon_social: String(prov.razon_social).trim(),
        contacto: prov.contacto ? String(prov.contacto).trim() : null,
        telefono: prov.telefono ? String(prov.telefono).trim() : null,
        email: prov.email ? String(prov.email).trim() : null,
        direccion: prov.direccion ? String(prov.direccion).trim() : null,
        ciudad: prov.ciudad ? String(prov.ciudad).trim() : null,
        provincia: prov.provincia ? String(prov.provincia).trim() : null,
        cuit: prov.cuit ? String(prov.cuit).trim() : null,
        observaciones: prov.observaciones ? String(prov.observaciones).trim() : null,
        estado: prov.estado ? String(prov.estado).trim() : 'Activo'
      };

      if (prov.created_at) {
        payload.created_at = prov.created_at;
      }

      const result = await upsertRecordWithIdentity(supabase, 'proveedores', payload, 'id');

      if (result.success) {
        const flagOverride = result.identityOverrideUsed ? ' (OVERRIDING SYSTEM VALUE)' : '';
        console.log(`  ✅ Proveedor ID ${prov.id} ("${prov.razon_social}") migrado correctamente.${flagOverride}`);
        audit.migradas++;
      } else {
        if (result.identityOverrideUsed) audit.identityErrors++;
        console.error(`❌ Error migrando proveedor ID ${prov.id} ("${prov.razon_social}"): ${result.error?.message || result.error}`);
        audit.errores++;
      }
    } catch (itemErr) {
      console.error(`❌ Excepción procesando proveedor ID ${prov?.id}:`, itemErr.message);
      audit.errores++;
    }
  }

  console.log('\n-----------------------------------');
  console.log(`Proveedores encontrados: ${audit.encontradas}`);
  console.log(`Proveedores migrados:    ${audit.migradas}`);
  console.log(`Proveedores omitidos:    ${audit.omitidas}`);
  console.log(`Errores:                 ${audit.errores}`);
  if (audit.identityErrors > 0) {
    console.log(`⚠️ Advertencias IDENTITY (GENERATED ALWAYS): ${audit.identityErrors}`);
    console.log(`   Sugerencia: Para permitir inserciones con ID explícito en PostgreSQL, configure`);
    console.log(`   'ALTER TABLE proveedores ALTER COLUMN id SET GENERATED BY DEFAULT;' en Supabase.`);
  }
  console.log('-----------------------------------\n');

  return audit;
}

/**
 * Migra los productos desde SQLite a Supabase utilizando upsert e id explícito.
 * 
 * @param {object|null} db - Instancia de SQLite.
 * @param {object|null} supabase - Instancia del cliente de Supabase.
 * @returns {Promise<object>} Auditoría de migración de productos
 */
async function migrateProductos(db, supabase) {
  console.log('\n====================================================');
  console.log('📌 INICIANDO MIGRACIÓN DE PRODUCTOS');
  console.log('====================================================');

  const audit = { tabla: 'productos', encontradas: 0, migradas: 0, omitidas: 0, errores: 0, identityErrors: 0 };

  if (!supabase) {
    console.error('❌ Supabase no está configurado en .env / config.js. Abortando migración de productos.');
    return audit;
  }

  const columns = ['id', 'codigo', 'nombre', 'categoria', 'stock', 'unidad', 'precio_costo', 'precio', 'stock_minimo', 'proveedor_id'];
  const productos = readSQLiteTable(db, 'productos', columns);
  audit.encontradas = productos.length;

  console.log(`\n📋 Productos encontrados en SQLite: ${audit.encontradas}`);

  for (const prod of productos) {
    try {
      if (!prod || prod.id === undefined || prod.id === null || !prod.codigo || !prod.nombre) {
        console.warn(`⚠️ Registro omitido por datos incompletos:`, prod);
        audit.omitidas++;
        continue;
      }

      const payload = {
        id: Number(prod.id),
        codigo: String(prod.codigo).trim(),
        nombre: String(prod.nombre).trim(),
        categoria: prod.categoria ? String(prod.categoria).trim() : null,
        stock: Number(prod.stock || 0),
        unidad: prod.unidad ? String(prod.unidad).trim() : 'un',
        precio_costo: Number(prod.precio_costo || 0),
        precio: Number(prod.precio || 0),
        stock_minimo: Number(prod.stock_minimo || 0),
        proveedor_id: (prod.proveedor_id !== undefined && prod.proveedor_id !== null && prod.proveedor_id !== '') ? Number(prod.proveedor_id) : null
      };

      const result = await upsertRecordWithIdentity(supabase, 'productos', payload, 'id');

      if (result.success) {
        const flagOverride = result.identityOverrideUsed ? ' (OVERRIDING SYSTEM VALUE)' : '';
        console.log(`  ✅ Producto ID ${prod.id} [${prod.codigo}] "${prod.nombre}" migrado correctamente.${flagOverride}`);
        audit.migradas++;
      } else {
        if (result.identityOverrideUsed) audit.identityErrors++;
        console.error(`❌ Error migrando producto ID ${prod.id} [${prod.codigo}] "${prod.nombre}": ${result.error?.message || result.error}`);
        audit.errores++;
      }
    } catch (itemErr) {
      console.error(`❌ Excepción procesando producto ID ${prod?.id}:`, itemErr.message);
      audit.errores++;
    }
  }

  console.log('\n-----------------------------------');
  console.log(`Productos encontrados: ${audit.encontradas}`);
  console.log(`Productos migrados:    ${audit.migradas}`);
  console.log(`Productos omitidos:    ${audit.omitidas}`);
  console.log(`Errores:               ${audit.errores}`);
  if (audit.identityErrors > 0) {
    console.log(`⚠️ Advertencias IDENTITY (GENERATED ALWAYS): ${audit.identityErrors}`);
    console.log(`   Sugerencia: Para permitir inserciones con ID explícito en PostgreSQL, configure`);
    console.log(`   'ALTER TABLE productos ALTER COLUMN id SET GENERATED BY DEFAULT;' en Supabase.`);
  }
  console.log('-----------------------------------\n');

  return audit;
}

/**
 * Muestra un informe consolidado de auditoría de migración.
 * @param {Array<object>} audits Resultados de auditoría por tabla
 */
function displayAuditSummary(audits) {
  console.log('====================================================');
  console.log('📊 AUDITORÍA GENERAL DE MIGRACIÓN SQLITE ➔ SUPABASE');
  console.log('====================================================');
  console.table(audits.map(a => ({
    Tabla: a.tabla,
    Encontrados: a.encontradas,
    Migrados: a.migradas,
    Omitidos: a.omitidas,
    Errores: a.errores,
    Identity_Errors: a.identityErrors
  })));
  console.log('====================================================\n');
}

async function main() {
  console.log('====================================================');
  console.log('  HERRAMIENTA DE MIGRACIÓN SQLITE ➔ SUPABASE');
  console.log('====================================================\n');

  const args = process.argv.slice(2);

  const runCategorias = args.includes('--categorias') || args.includes('--all');
  const runProveedores = args.includes('--proveedores') || args.includes('--all');
  const runProductos = args.includes('--productos') || args.includes('--all');

  if (!runCategorias && !runProveedores && !runProductos) {
    console.log('⚠️ Argumento no reconocido o no especificado.\n');
    console.log('Uso disponible:');
    console.log('  node scripts/migrate-to-supabase.js --categorias');
    console.log('  node scripts/migrate-to-supabase.js --proveedores');
    console.log('  node scripts/migrate-to-supabase.js --productos');
    console.log('  node scripts/migrate-to-supabase.js --all\n');
    process.exit(0);
  }

  // 1. Conexión a SQLite
  const db = openSQLiteDatabase();

  // 2. Conexión a Supabase
  let supabase = null;
  if (isSupabaseConfigured()) {
    supabase = getSupabaseClient();
    console.log('✅ [Supabase] Conexión cliente configurada.');
  } else {
    console.log('ℹ️ [Supabase] Supabase no está configurado en .env / config.js.');
  }

  console.log('\n[Modo Ejecución CLI - Migración]');

  const auditResults = [];

  if (runCategorias) {
    const resCat = await migrateCategorias(db, supabase);
    auditResults.push(resCat);
  }

  if (runProveedores) {
    const resProv = await migrateProveedores(db, supabase);
    auditResults.push(resProv);
  }

  if (runProductos) {
    const resProd = await migrateProductos(db, supabase);
    auditResults.push(resProd);
  }

  if (auditResults.length > 0) {
    displayAuditSummary(auditResults);
  }

  console.log('====================================================');
  console.log('  EJECUCIÓN DE MIGRACIÓN FINALIZADA');
  console.log('====================================================\n');
}

main().catch(err => {
  console.error('❌ Error crítico en el script de migración:', err);
  process.exit(1);
});
