// scripts/backfill_proveedores_clientes_uuid.js
//
// Script de Backfill para la Fase 1C.2A — Identidad Lógica por UUID en Clientes y Proveedores.
// Garantiza que todos los registros de 'clientes' y 'proveedores' en SQLite y Supabase
// coincidan por claves naturales (CUIT / Nombre / Razón Social) y compartan el MISMO UUID v4.

'use strict';

const Database = require('better-sqlite3');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const { getSupabaseClient, isSupabaseConfigured } = require('../services/supabaseClient');

/**
 * Normaliza cadenas para comparaciones de clave natural (cuit o nombre/razón social).
 */
function normalizeKey(val) {
  if (!val) return '';
  return String(val).trim().toLowerCase().replace(/[\s\-\.]+/g, '');
}

function resolveDbPath() {
  const candidates = [];
  try {
    const { app } = require('electron');
    if (app && typeof app.getPath === 'function') {
      try { if (app.setName) app.setName('inventario-baupi'); } catch (e) {}
      const userPath = app.getPath('userData');
      if (userPath) candidates.push(path.join(userPath, 'data.db'));
    }
  } catch (e) {}

  const baseAppData = process.env.APPDATA || (process.platform === 'darwin' ? path.join(process.env.HOME || '', 'Library', 'Preferences') : path.join(process.env.HOME || '', '.config'));
  if (baseAppData) {
    candidates.push(path.join(baseAppData, 'inventario-baupi', 'data.db'));
    candidates.push(path.join(baseAppData, 'mi-app', 'data.db'));
    candidates.push(path.join(baseAppData, 'Electron', 'data.db'));
  }
  candidates.push(path.join(__dirname, '..', 'data.db'));

  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return candidates[0];
}

async function runBackfill(isExecute = false) {
  console.log('====================================================');
  console.log(`   BACKFILL FASE 1C.2A (CLIENTES & PROVEEDORES UUID) [${isExecute ? 'EXECUTE' : 'DRY-RUN'}]`);
  console.log('====================================================\n');

  const dbPath = resolveDbPath();
  console.log(`[SQLite] Conectando a base de datos en: ${dbPath}`);
  const db = new Database(dbPath);
  const supabase = isSupabaseConfigured() ? getSupabaseClient() : null;

  // Garantizar tablas SQLite si se ejecuta sobre BD limpia
  db.exec(`
    CREATE TABLE IF NOT EXISTS clientes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uuid TEXT UNIQUE,
      nombre TEXT NOT NULL,
      telefono TEXT,
      email TEXT,
      direccion TEXT,
      cuit TEXT,
      observaciones TEXT,
      estado TEXT DEFAULT 'Activo',
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS proveedores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uuid TEXT UNIQUE,
      razon_social TEXT NOT NULL,
      contacto TEXT,
      telefono TEXT,
      email TEXT,
      direccion TEXT,
      ciudad TEXT,
      provincia TEXT,
      cuit TEXT,
      observaciones TEXT,
      estado TEXT DEFAULT 'Activo',
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );
  `);
  try { db.prepare("ALTER TABLE clientes ADD COLUMN uuid TEXT").run(); } catch (e) {}
  try { db.prepare("ALTER TABLE proveedores ADD COLUMN uuid TEXT").run(); } catch (e) {}

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. CLIENTES
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n--- [1/2] PROCESANDO CLIENTES ---');
  const localClients = db.prepare('SELECT id, uuid, nombre, cuit FROM clientes').all();
  let remoteClients = [];
  if (supabase) {
    try {
      const { data, error } = await supabase.from('clientes').select('id, uuid, nombre, cuit');
      if (!error && Array.isArray(data)) {
        remoteClients = data;
      } else if (error) {
        console.warn('⚠️ No se pudo obtener clientes remotos de Supabase:', error.message);
      }
    } catch (e) {
      console.warn('⚠️ Excepción al consultar clientes en Supabase:', e.message);
    }
  }

  const clientMetrics = {
    localTotal: localClients.length,
    remoteTotal: remoteClients.length,
    matches: 0,
    localOnly: 0,
    remoteOnly: 0,
    conflicts: 0,
    duplicates: 0,
    nullUuidsLocal: 0,
    nullUuidsRemote: 0,
    sharedUuidsAssigned: 0,
    errors: 0
  };

  const clientUpdatesLocal = []; // { id, uuid }
  const clientUpdatesRemote = []; // { id, uuid }

  const remoteClientMapByCuit = new Map();
  const remoteClientMapByName = new Map();

  for (const rc of remoteClients) {
    if (!rc.uuid) clientMetrics.nullUuidsRemote++;
    const normCuit = normalizeKey(rc.cuit);
    const normName = normalizeKey(rc.nombre);

    if (normCuit) {
      if (remoteClientMapByCuit.has(normCuit)) clientMetrics.duplicates++;
      remoteClientMapByCuit.set(normCuit, rc);
    }
    if (normName) {
      if (remoteClientMapByName.has(normName)) clientMetrics.duplicates++;
      remoteClientMapByName.set(normName, rc);
    }
  }

  const matchedRemoteClientIds = new Set();

  for (const lc of localClients) {
    if (!lc.uuid) clientMetrics.nullUuidsLocal++;
    const normCuit = normalizeKey(lc.cuit);
    const normName = normalizeKey(lc.nombre);

    const rcMatch = (normCuit && remoteClientMapByCuit.get(normCuit)) || (normName && remoteClientMapByName.get(normName));

    if (rcMatch) {
      matchedRemoteClientIds.add(rcMatch.id);
      clientMetrics.matches++;

      let targetUuid;
      if (lc.uuid && rcMatch.uuid) {
        if (lc.uuid === rcMatch.uuid) {
          targetUuid = lc.uuid;
        } else {
          clientMetrics.conflicts++;
          console.warn(`  ⚠️ Conflicto UUID en cliente "${lc.nombre}": local=${lc.uuid}, remoto=${rcMatch.uuid}. Se armonizará a local.`);
          targetUuid = lc.uuid;
          clientUpdatesRemote.push({ id: rcMatch.id, uuid: targetUuid });
        }
      } else if (lc.uuid && !rcMatch.uuid) {
        targetUuid = lc.uuid;
        clientUpdatesRemote.push({ id: rcMatch.id, uuid: targetUuid });
      } else if (!lc.uuid && rcMatch.uuid) {
        targetUuid = rcMatch.uuid;
        clientUpdatesLocal.push({ id: lc.id, uuid: targetUuid });
      } else {
        targetUuid = crypto.randomUUID();
        clientUpdatesLocal.push({ id: lc.id, uuid: targetUuid });
        clientUpdatesRemote.push({ id: rcMatch.id, uuid: targetUuid });
      }
      clientMetrics.sharedUuidsAssigned++;
    } else {
      clientMetrics.localOnly++;
      if (!lc.uuid) {
        const newUuid = crypto.randomUUID();
        clientUpdatesLocal.push({ id: lc.id, uuid: newUuid });
      }
    }
  }

  for (const rc of remoteClients) {
    if (!matchedRemoteClientIds.has(rc.id)) {
      clientMetrics.remoteOnly++;
      if (!rc.uuid) {
        const newUuid = crypto.randomUUID();
        clientUpdatesRemote.push({ id: rc.id, uuid: newUuid });
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. PROVEEDORES
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n--- [2/2] PROCESANDO PROVEEDORES ---');
  const localSuppliers = db.prepare('SELECT id, uuid, razon_social, cuit FROM proveedores').all();
  let remoteSuppliers = [];
  if (supabase) {
    try {
      const { data, error } = await supabase.from('proveedores').select('id, uuid, razon_social, cuit');
      if (!error && Array.isArray(data)) {
        remoteSuppliers = data;
      } else if (error) {
        console.warn('⚠️ No se pudo obtener proveedores remotos de Supabase:', error.message);
      }
    } catch (e) {
      console.warn('⚠️ Excepción al consultar proveedores en Supabase:', e.message);
    }
  }

  const supplierMetrics = {
    localTotal: localSuppliers.length,
    remoteTotal: remoteSuppliers.length,
    matches: 0,
    localOnly: 0,
    remoteOnly: 0,
    conflicts: 0,
    duplicates: 0,
    nullUuidsLocal: 0,
    nullUuidsRemote: 0,
    sharedUuidsAssigned: 0,
    errors: 0
  };

  const supplierUpdatesLocal = []; // { id, uuid }
  const supplierUpdatesRemote = []; // { id, uuid }

  const remoteSupplierMapByCuit = new Map();
  const remoteSupplierMapByName = new Map();

  for (const rp of remoteSuppliers) {
    if (!rp.uuid) supplierMetrics.nullUuidsRemote++;
    const normCuit = normalizeKey(rp.cuit);
    const normName = normalizeKey(rp.razon_social);

    if (normCuit) {
      if (remoteSupplierMapByCuit.has(normCuit)) supplierMetrics.duplicates++;
      remoteSupplierMapByCuit.set(normCuit, rp);
    }
    if (normName) {
      if (remoteSupplierMapByName.has(normName)) supplierMetrics.duplicates++;
      remoteSupplierMapByName.set(normName, rp);
    }
  }

  const matchedRemoteSupplierIds = new Set();

  for (const lp of localSuppliers) {
    if (!lp.uuid) supplierMetrics.nullUuidsLocal++;
    const normCuit = normalizeKey(lp.cuit);
    const normName = normalizeKey(lp.razon_social);

    const rpMatch = (normCuit && remoteSupplierMapByCuit.get(normCuit)) || (normName && remoteSupplierMapByName.get(normName));

    if (rpMatch) {
      matchedRemoteSupplierIds.add(rpMatch.id);
      supplierMetrics.matches++;

      let targetUuid;
      if (lp.uuid && rpMatch.uuid) {
        if (lp.uuid === rpMatch.uuid) {
          targetUuid = lp.uuid;
        } else {
          supplierMetrics.conflicts++;
          console.warn(`  ⚠️ Conflicto UUID en proveedor "${lp.razon_social}": local=${lp.uuid}, remoto=${rpMatch.uuid}. Se armonizará a local.`);
          targetUuid = lp.uuid;
          supplierUpdatesRemote.push({ id: rpMatch.id, uuid: targetUuid });
        }
      } else if (lp.uuid && !rpMatch.uuid) {
        targetUuid = lp.uuid;
        supplierUpdatesRemote.push({ id: rpMatch.id, uuid: targetUuid });
      } else if (!lp.uuid && rpMatch.uuid) {
        targetUuid = rpMatch.uuid;
        supplierUpdatesLocal.push({ id: lp.id, uuid: targetUuid });
      } else {
        targetUuid = crypto.randomUUID();
        supplierUpdatesLocal.push({ id: lp.id, uuid: targetUuid });
        supplierUpdatesRemote.push({ id: rpMatch.id, uuid: targetUuid });
      }
      supplierMetrics.sharedUuidsAssigned++;
    } else {
      supplierMetrics.localOnly++;
      if (!lp.uuid) {
        const newUuid = crypto.randomUUID();
        supplierUpdatesLocal.push({ id: lp.id, uuid: newUuid });
      }
    }
  }

  for (const rp of remoteSuppliers) {
    if (!matchedRemoteSupplierIds.has(rp.id)) {
      supplierMetrics.remoteOnly++;
      if (!rp.uuid) {
        const newUuid = crypto.randomUUID();
        supplierUpdatesRemote.push({ id: rp.id, uuid: newUuid });
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. EJECUCIÓN DE CAMBIOS (si corresponde)
  // ─────────────────────────────────────────────────────────────────────────────
  if (isExecute) {
    console.log('\n⚙️ Aplicando cambios en SQLite local...');
    const updateClientStmt = db.prepare('UPDATE clientes SET uuid = ? WHERE id = ?');
    const updateSupplierStmt = db.prepare('UPDATE proveedores SET uuid = ? WHERE id = ?');

    const tx = db.transaction(() => {
      for (const cu of clientUpdatesLocal) updateClientStmt.run(cu.uuid, cu.id);
      for (const su of supplierUpdatesLocal) updateSupplierStmt.run(su.uuid, su.id);
    });
    tx();
    console.log(`  ✅ SQLite actualizado: ${clientUpdatesLocal.length} clientes, ${supplierUpdatesLocal.length} proveedores.`);

    if (supabase) {
      console.log('⚙️ Aplicando cambios en Supabase remoto...');
      for (const cu of clientUpdatesRemote) {
        const { error } = await supabase.from('clientes').update({ uuid: cu.uuid }).eq('id', cu.id);
        if (error) {
          console.error(`  ❌ Error actualizando cliente remoto ID ${cu.id}:`, error.message);
          clientMetrics.errors++;
        }
      }
      for (const su of supplierUpdatesRemote) {
        const { error } = await supabase.from('proveedores').update({ uuid: su.uuid }).eq('id', su.id);
        if (error) {
          console.error(`  ❌ Error actualizando proveedor remoto ID ${su.id}:`, error.message);
          supplierMetrics.errors++;
        }
      }
      console.log(`  ✅ Supabase actualizado: ${clientUpdatesRemote.length} clientes, ${supplierUpdatesRemote.length} proveedores.`);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. RESUMEN Y MÉTRICAS
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n====================================================');
  console.log('                 MÉTRICAS DE BACKFILL');
  console.log('====================================================');
  console.log('CLIENTES:');
  console.log(`  • Registros Locales:           ${clientMetrics.localTotal}`);
  console.log(`  • Registros Remotos:           ${clientMetrics.remoteTotal}`);
  console.log(`  • Coincidencias (Matches):     ${clientMetrics.matches}`);
  console.log(`  • Solo Locales:                ${clientMetrics.localOnly}`);
  console.log(`  • Solo Remotos:                ${clientMetrics.remoteOnly}`);
  console.log(`  • Conflictos de UUID:          ${clientMetrics.conflicts}`);
  console.log(`  • Duplicados por clave natural:${clientMetrics.duplicates}`);
  console.log(`  • UUIDs Nulos Locales:         ${clientMetrics.nullUuidsLocal}`);
  console.log(`  • UUIDs Nulos Remotos:         ${clientMetrics.nullUuidsRemote}`);
  console.log(`  • UUIDs compartidos/asignados: ${clientMetrics.sharedUuidsAssigned}`);
  console.log(`  • Cambios pendientes Local:    ${clientUpdatesLocal.length}`);
  console.log(`  • Cambios pendientes Remoto:   ${clientUpdatesRemote.length}`);

  console.log('\nPROVEEDORES:');
  console.log(`  • Registros Locales:           ${supplierMetrics.localTotal}`);
  console.log(`  • Registros Remotos:           ${supplierMetrics.remoteTotal}`);
  console.log(`  • Coincidencias (Matches):     ${supplierMetrics.matches}`);
  console.log(`  • Solo Locales:                ${supplierMetrics.localOnly}`);
  console.log(`  • Solo Remotos:                ${supplierMetrics.remoteOnly}`);
  console.log(`  • Conflictos de UUID:          ${supplierMetrics.conflicts}`);
  console.log(`  • Duplicados por clave natural:${supplierMetrics.duplicates}`);
  console.log(`  • UUIDs Nulos Locales:         ${supplierMetrics.nullUuidsLocal}`);
  console.log(`  • UUIDs Nulos Remotos:         ${supplierMetrics.nullUuidsRemote}`);
  console.log(`  • UUIDs compartidos/asignados: ${supplierMetrics.sharedUuidsAssigned}`);
  console.log(`  • Cambios pendientes Local:    ${supplierUpdatesLocal.length}`);
  console.log(`  • Cambios pendientes Remoto:   ${supplierUpdatesRemote.length}`);

  console.log('\n====================================================');
  console.log(`   BACKFILL FASE 1C.2A FINALIZADO (${isExecute ? 'MODO EXECUTE — CAMBIOS APLICADOS' : 'MODO DRY-RUN — SOLO LECTURA'})`);
  console.log('====================================================\n');
}

const args = process.argv.slice(2);
const isExecute = args.includes('--execute');
runBackfill(isExecute).catch(err => {
  console.error('Error en script de backfill:', err);
  process.exit(1);
});
