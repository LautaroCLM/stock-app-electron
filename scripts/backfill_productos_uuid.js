// scripts/backfill_productos_uuid.js
//
// Script de Infraestructura de Backfill para la entidad `productos` (Fase 1C.1).
// Vincula SQLite local ↔ Supabase remoto mediante clave natural (codigo + nombre).
//
// USO:
//   npx electron scripts/backfill_productos_uuid.js            (Modo DRY-RUN / Auditoría previa)
//   npx electron scripts/backfill_productos_uuid.js --execute  (Ejecución real)

'use strict';

const path = require('path');
const Database = require('better-sqlite3');
const crypto = require('crypto');
require('dotenv').config();

const { getSupabaseClient, isSupabaseConfigured } = require('../services/supabaseClient');

function makeNaturalKey(codigo, nombre) {
  return `${String(codigo || '').trim().toLowerCase()}|${String(nombre || '').trim().toLowerCase()}`;
}

function computeBackfillPlan(localProducts, remoteProducts) {
  const localGroup = new Map();
  for (const l of localProducts) {
    const key = makeNaturalKey(l.codigo, l.nombre);
    if (!localGroup.has(key)) localGroup.set(key, []);
    localGroup.get(key).push(l);
  }

  const remoteGroup = new Map();
  for (const r of remoteProducts) {
    const key = makeNaturalKey(r.codigo, r.nombre);
    if (!remoteGroup.has(key)) remoteGroup.set(key, []);
    remoteGroup.get(key).push(r);
  }

  // CASO D: Duplicados check
  const duplicatesLocal = [];
  for (const [key, items] of localGroup.entries()) {
    if (items.length > 1) {
      duplicatesLocal.push({ key, count: items.length, items });
    }
  }

  const duplicatesRemote = [];
  for (const [key, items] of remoteGroup.entries()) {
    if (items.length > 1) {
      duplicatesRemote.push({ key, count: items.length, items });
    }
  }

  if (duplicatesLocal.length > 0 || duplicatesRemote.length > 0) {
    return {
      success: false,
      errorType: 'DUPLICATES_DETECTED',
      duplicatesLocal,
      duplicatesRemote
    };
  }

  const allKeys = new Set([...localGroup.keys(), ...remoteGroup.keys()]);

  const matches = [];
  const soloLocal = [];
  const soloRemoto = [];
  const conflicts = [];
  const planItems = [];

  for (const key of allKeys) {
    const lList = localGroup.get(key) || [];
    const rList = remoteGroup.get(key) || [];

    const l = lList[0] || null;
    const r = rList[0] || null;

    if (l && r) {
      // CASO A: Local + Remoto
      if (l.uuid && r.uuid && l.uuid !== r.uuid) {
        // CASO E: UUID Mismatch
        conflicts.push({
          key,
          localId: l.id,
          localUuid: l.uuid,
          remoteId: r.id,
          remoteUuid: r.uuid,
          codigo: l.codigo,
          nombre: l.nombre
        });
      } else {
        const sharedUuid = l.uuid || r.uuid || crypto.randomUUID();
        const itemPlan = {
          type: 'MATCH',
          key,
          localId: l.id,
          remoteId: r.id,
          uuid: sharedUuid,
          needsLocalUpdate: l.uuid !== sharedUuid,
          needsRemoteUpdate: r.uuid !== sharedUuid,
          codigo: l.codigo,
          nombre: l.nombre
        };
        matches.push(itemPlan);
        planItems.push(itemPlan);
      }
    } else if (l && !r) {
      // CASO C: Solo Local
      const itemPlan = {
        type: 'SOLO_LOCAL',
        key,
        localId: l.id,
        remoteId: null,
        uuid: l.uuid || null,
        needsLocalUpdate: false,
        needsRemoteUpdate: false,
        codigo: l.codigo,
        nombre: l.nombre
      };
      soloLocal.push(itemPlan);
      planItems.push(itemPlan);
    } else if (!l && r) {
      // CASO B: Solo Remoto
      const assignedUuid = r.uuid || crypto.randomUUID();
      const itemPlan = {
        type: 'SOLO_REMOTO',
        key,
        localId: null,
        remoteId: r.id,
        uuid: assignedUuid,
        needsLocalUpdate: false,
        needsRemoteUpdate: r.uuid !== assignedUuid,
        codigo: r.codigo,
        nombre: r.nombre
      };
      soloRemoto.push(itemPlan);
      planItems.push(itemPlan);
    }
  }

  if (conflicts.length > 0) {
    return {
      success: false,
      errorType: 'UUID_MISMATCH',
      conflicts
    };
  }

  return {
    success: true,
    matches,
    soloLocal,
    soloRemoto,
    planItems,
    counts: {
      totalLocal: localProducts.length,
      totalRemote: remoteProducts.length,
      matchesCount: matches.length,
      soloLocalCount: soloLocal.length,
      soloRemotoCount: soloRemoto.length,
      needsLocalUpdateCount: planItems.filter(p => p.needsLocalUpdate).length,
      needsRemoteUpdateCount: planItems.filter(p => p.needsRemoteUpdate).length
    }
  };
}

async function runBackfill() {
  const isExecuteMode = process.argv.includes('--execute');

  console.log('====================================================');
  console.log(`   BACKFILL DE UUID EN PRODUCTOS — MODO: ${isExecuteMode ? '🔥 EJECUCIÓN REAL' : '🔍 DRY-RUN (SOLO LECTURA)'}`);
  console.log('====================================================\n');

  // 1. Conectar SQLite local
  const dbPath = path.join(process.env.APPDATA || (process.platform === 'darwin' ? process.env.HOME + '/Library/Preferences' : process.env.HOME + '/.config'), 'inventario-baupi', 'data.db');
  let db;
  try {
    db = new Database(dbPath);
    console.log(`[SQLite] Conectado a base de datos en: ${dbPath}`);
  } catch (err) {
    console.error(`[SQLite] Error conectando a base de datos local (${dbPath}):`, err.message);
    process.exit(1);
  }

  // Asegurar que la columna uuid exista en SQLite local
  try {
    db.prepare("ALTER TABLE productos ADD COLUMN uuid TEXT").run();
  } catch (err) {}

  const localProducts = db.prepare('SELECT id, uuid, codigo, nombre FROM productos ORDER BY id ASC').all();
  console.log(`[SQLite] Productos locales leídos: ${localProducts.length}`);

  // 2. Conectar Supabase remoto
  if (!isSupabaseConfigured()) {
    console.error('❌ Error: Supabase no está configurado en .env.');
    process.exit(1);
  }

  const client = getSupabaseClient();
  let remoteProducts = [];
  try {
    const { data, error: remoteErr } = await client
      .from('productos')
      .select('id, uuid, codigo, nombre')
      .order('id', { ascending: true });

    if (remoteErr) {
      if (remoteErr.message && remoteErr.message.includes('column productos.uuid does not exist')) {
        console.log('ℹ️ Nota: La columna `uuid` aún no existe en Supabase. Se consultarán las columnas existentes para la simulación.');
        const { data: dataNoUuid, error: err2 } = await client
          .from('productos')
          .select('id, codigo, nombre')
          .order('id', { ascending: true });
        if (err2) throw err2;
        remoteProducts = (dataNoUuid || []).map(r => ({ ...r, uuid: null }));
      } else {
        throw remoteErr;
      }
    } else {
      remoteProducts = data || [];
    }
  } catch (err) {
    console.error('❌ Error al consultar Supabase:', err.message || err);
    process.exit(1);
  }

  console.log(`[Supabase] Productos remotos leídos: ${remoteProducts.length}\n`);

  // 3. Calcular Plan de Backfill
  const plan = computeBackfillPlan(localProducts, remoteProducts);

  if (!plan.success) {
    if (plan.errorType === 'DUPLICATES_DETECTED') {
      console.error('🚨 CONFLICTO DETECTADO: Clave natural duplicada encontrada.');
      if (plan.duplicatesLocal.length > 0) {
        console.error(`Duplicados en SQLite Local (${plan.duplicatesLocal.length}):`);
        console.table(plan.duplicatesLocal);
      }
      if (plan.duplicatesRemote.length > 0) {
        console.error(`Duplicados en Supabase Remoto (${plan.duplicatesRemote.length}):`);
        console.table(plan.duplicatesRemote);
      }
      console.error('\n❌ OPERACIÓN ABORTADA. Debe resolverse manualmente la duplicación antes de proseguir.');
      process.exit(1);
    }

    if (plan.errorType === 'UUID_MISMATCH') {
      console.error('🚨 CONFLICTO DETECTADO: UUID Mismatch entre SQLite y Supabase.');
      console.error(`Total conflictos: ${plan.conflicts.length}`);
      console.table(plan.conflicts);
      console.error('\n❌ OPERACIÓN ABORTADA. Debe resolverse manualmente el conflicto antes de proseguir.');
      process.exit(1);
    }
  }

  console.log('=== PLAN CALCULADO DE BACKFILL ===');
  console.log(`- Total Productos Locales: ${plan.counts.totalLocal}`);
  console.log(`- Total Productos Remotos: ${plan.counts.totalRemote}`);
  console.log(`- Coincidencias (MATCH): ${plan.counts.matchesCount}`);
  console.log(`- Solo Local (SOLO_LOCAL): ${plan.counts.soloLocalCount}`);
  console.log(`- Solo Remoto (SOLO_REMOTO): ${plan.counts.soloRemotoCount}`);
  console.log(`- Actualizaciones pendientes en SQLite: ${plan.counts.needsLocalUpdateCount}`);
  console.log(`- Actualizaciones pendientes en Supabase: ${plan.counts.needsRemoteUpdateCount}\n`);

  if (plan.soloRemoto.length > 0) {
    console.log(`--- DETALLE DE LOS ${plan.soloRemoto.length} PRODUCTOS SOLO REMOTO (Se les asignará UUID propio en Supabase) ---`);
    console.table(plan.soloRemoto.map(p => ({ remoteId: p.remoteId, codigo: p.codigo, nombre: p.nombre, uuidAsignado: p.uuid })));
    console.log('');
  }

  if (!isExecuteMode) {
    console.log('ℹ️ Modo Dry-Run finalizado. Ningún cambio fue realizado en las bases de datos.');
    console.log('Para ejecutar los cambios en las bases de datos, ejecute:');
    console.log('   npx electron scripts/backfill_productos_uuid.js --execute');
    process.exit(0);
  }

  // 4. Verificación de Seguridad Previa a Ejecución Real
  console.log('🔒 Verificando consistencia de datos antes de aplicar cambios real...');
  const reLocal = db.prepare('SELECT id, uuid, codigo, nombre FROM productos ORDER BY id ASC').all();
  const { data: reRemote } = await client.from('productos').select('id, codigo, nombre').order('id', { ascending: true });
  const rePlan = computeBackfillPlan(reLocal, reRemote || []);

  if (!rePlan.success || rePlan.counts.matchesCount !== plan.counts.matchesCount || rePlan.counts.soloRemotoCount !== plan.counts.soloRemotoCount) {
    console.error('🚨 SEGURIDAD ABORTADA: Los datos cambiaron entre la simulación y la ejecución.');
    process.exit(1);
  }

  // 5. Ejecución real (escrituras)
  console.log('🚀 Aplicando actualizaciones de backfill...');
  let localUpdated = 0;
  let remoteUpdated = 0;

  // Actualización atómica en SQLite local
  const updateLocalStmt = db.prepare('UPDATE productos SET uuid = ? WHERE id = ?');
  const runLocalTransaction = db.transaction((items) => {
    let count = 0;
    for (const item of items) {
      if (item.needsLocalUpdate && item.localId) {
        updateLocalStmt.run(item.uuid, item.localId);
        count++;
      }
    }
    return count;
  });

  localUpdated = runLocalTransaction(plan.planItems);

  // Actualización controlada en Supabase remoto
  for (const item of plan.planItems) {
    if (item.needsRemoteUpdate && item.remoteId) {
      const { error: updErr } = await client
        .from('productos')
        .update({ uuid: item.uuid })
        .eq('id', item.remoteId);

      if (updErr) {
        console.error(`❌ Error actualizando Supabase para ID ${item.remoteId}:`, updErr.message);
      } else {
        remoteUpdated++;
      }
    }
  }

  console.log(`\n🎉 BACKFILL FINALIZADO EXITOSAMENTE:`);
  console.log(`- SQLite locales actualizados: ${localUpdated}`);
  console.log(`- Supabase remotos actualizados: ${remoteUpdated}`);
  process.exit(0);
}

module.exports = { computeBackfillPlan, makeNaturalKey };

if (require.main === module) {
  runBackfill().catch(err => {
    console.error('❌ Error fatal en backfill:', err.message || err);
    process.exit(1);
  });
}
