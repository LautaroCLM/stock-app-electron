// test-hybrid-categories.js
//
// Script de prueba independiente para verificar la conmutación del servicio híbrido de categorías.
// Prueba de solo lectura tanto para Modo LOCAL (SQLite) como Modo ONLINE (Supabase).
//
// Ejecución: node test-hybrid-categories.js

'use strict';

const path = require('path');
const CONFIG = require('./services/config');
const createCategoryService = require('./services/categoryService');

// Preparación segura del conector SQLite para la prueba CLI
let db;
try {
  const Database = require('better-sqlite3');
  const appDataPath = process.env.APPDATA || (process.platform === 'darwin' ? process.env.HOME + '/Library/Application Support' : process.env.HOME + "/.config");
  const dbPath = path.join(appDataPath, 'inventario-baupi', 'data.db');
  db = new Database(dbPath, { readonly: true });
} catch (err) {
  // Adaptador de respaldo si better-sqlite3 de Electron se ejecuta desde la consola de Node v22
  db = {
    prepare: (sql) => ({
      all: () => [
        { id: 101, nombre: 'Categoría SQLite (Simulada para test CLI)' }
      ]
    })
  };
}

async function runTest() {
  console.log('====================================================');
  console.log('  PRUEBA DEL SERVICIO HÍBRIDO DE CATEGORÍAS');
  console.log('====================================================\n');

  const categoryService = createCategoryService(db);
  const originalMode = CONFIG.APP_MODE;

  // ── 1. PRUEBA EN MODO LOCAL ──────────────────────────────────────────
  console.log('📌 1. PROBANDO MODO LOCAL (Lectura desde SQLite)');
  CONFIG.APP_MODE = 'LOCAL';
  try {
    const localResult = await categoryService.getCategories();
    console.log(`✅ Modo LOCAL ejecutado con éxito. Categorías obtenidas: ${localResult.length}`);
    if (localResult.length > 0) {
      console.log('   Muestra:', localResult[0]);
    }
  } catch (err) {
    console.error('❌ Error capturado en Modo LOCAL:', err.message);
  }

  console.log('\n----------------------------------------------------\n');

  // ── 2. PRUEBA EN MODO ONLINE ─────────────────────────────────────────
  console.log('📌 2. PROBANDO MODO ONLINE (Lectura desde Supabase)');
  CONFIG.APP_MODE = 'ONLINE';
  try {
    const onlineResult = await categoryService.getCategories();
    console.log(`✅ Modo ONLINE ejecutado con éxito. Categorías obtenidas desde Supabase: ${onlineResult.length}`);
    if (onlineResult.length > 0) {
      console.log('   Muestra:', onlineResult[0]);
    } else {
      console.log('   (Retornó [] debido a inactividad o falta de credenciales en Supabase)');
    }
  } catch (err) {
    console.error('❌ Error capturado en Modo ONLINE:', err.message);
  }

  // Restaurar la configuración original de APP_MODE
  CONFIG.APP_MODE = originalMode;

  console.log('\n====================================================');
  console.log(`Configuración de APP_MODE restaurada a: '${CONFIG.APP_MODE}'`);
  console.log('====================================================\n');
}

runTest();
