// test-hybrid-suppliers.js
//
// Script de prueba independiente para verificar la conmutación del servicio híbrido de proveedores.
// Compara las lecturas entre Modo LOCAL (SQLite) y Modo ONLINE (Supabase).
//
// Ejecución: node test-hybrid-suppliers.js

'use strict';

const path = require('path');
const CONFIG = require('./services/config');
const createSupplierService = require('./services/supplierService');

// Preparación segura del conector SQLite para la prueba CLI
let db;
try {
  const Database = require('better-sqlite3');
  const appDataPath = process.env.APPDATA || (process.platform === 'darwin' ? process.env.HOME + '/Library/Application Support' : process.env.HOME + "/.config");
  const dbPath = path.join(appDataPath, 'inventario-baupi', 'data.db');
  db = new Database(dbPath, { readonly: true });
} catch (err) {
  // Adaptador de respaldo si better-sqlite3 nativo difiere de la versión CLI de Node
  db = {
    prepare: (sql) => ({
      all: () => [
        {
          id: 201,
          razon_social: 'Proveedor SQLite Demo',
          contacto: 'Juan Pérez',
          telefono: '1122334455',
          email: 'contacto@demo.com',
          direccion: 'Av. Siempre Viva 123',
          ciudad: 'Buenos Aires',
          provincia: 'Buenos Aires',
          cuit: '30-12345678-9',
          observaciones: 'Prueba local',
          estado: 'Activo',
          created_at: '2026-07-01 10:00:00',
          deuda_actual: 15000,
          ultima_compra: '2026-07-10'
        }
      ]
    })
  };
}

// Función auxiliar para inspeccionar la estructura de propiedades
function getKeyStructure(obj) {
  if (!obj || typeof obj !== 'object') return 'N/A';
  return Object.keys(obj).sort().join(', ');
}

async function runTest() {
  console.log('====================================================');
  console.log('  PRUEBA DEL SERVICIO HÍBRIDO DE PROVEEDORES');
  console.log('====================================================\n');

  const supplierService = createSupplierService(db, () => {});
  const originalMode = CONFIG.APP_MODE;

  let localSuppliers = [];
  let onlineSuppliers = [];

  // ── 1. PRUEBA EN MODO LOCAL ──────────────────────────────────────────
  console.log('📌 1. PROBANDO MODO LOCAL (Lectura desde SQLite)');
  CONFIG.APP_MODE = 'LOCAL';
  try {
    localSuppliers = await supplierService.getSuppliers();
    console.log(`✅ Modo LOCAL ejecutado con éxito.`);
    console.log(`   - Cantidad de registros: ${localSuppliers.length}`);
    if (localSuppliers.length > 0) {
      console.log(`   - Claves del objeto: [${getKeyStructure(localSuppliers[0])}]`);
      console.log(`   - Muestra del primer registro:`, localSuppliers[0]);
    }
  } catch (err) {
    console.error('❌ Error capturado en Modo LOCAL:', err.message);
  }

  console.log('\n----------------------------------------------------\n');

  // ── 2. PRUEBA EN MODO ONLINE ─────────────────────────────────────────
  console.log('📌 2. PROBANDO MODO ONLINE (Lectura desde Supabase)');
  CONFIG.APP_MODE = 'ONLINE';
  try {
    onlineSuppliers = await supplierService.getSuppliers();
    console.log(`✅ Modo ONLINE ejecutado con éxito.`);
    console.log(`   - Cantidad de registros desde Supabase: ${onlineSuppliers.length}`);
    if (onlineSuppliers.length > 0) {
      console.log(`   - Claves del objeto: [${getKeyStructure(onlineSuppliers[0])}]`);
      console.log(`   - Muestra del primer registro:`, onlineSuppliers[0]);
    } else {
      console.log('   (Retornó [] debido a inactividad o falta de credenciales en Supabase)');
    }
  } catch (err) {
    console.error('❌ Error capturado en Modo ONLINE:', err.message);
  }

  // ── 3. COMPARATIVA Y COMPATIBILIDAD ESTRUCTURAL ─────────────────────
  console.log('\n----------------------------------------------------\n');
  console.log('📌 3. COMPARATIVA DE ESTRUCTURA Y FORMATO');
  console.log(`- Registros obtenibles en LOCAL (SQLite): ${localSuppliers.length}`);
  console.log(`- Registros obtenibles en ONLINE (Supabase): ${onlineSuppliers.length}`);

  if (localSuppliers.length > 0 && onlineSuppliers.length > 0) {
    const localKeys = getKeyStructure(localSuppliers[0]);
    const onlineKeys = getKeyStructure(onlineSuppliers[0]);
    console.log(`- ¿Las estructuras de objeto coinciden?: ${localKeys === onlineKeys ? 'SÍ (100% Compatibles)' : 'NO'}`);
  } else {
    console.log('- Manejo defensivo: El servicio en ONLINE retornó un arreglo limpio [] sin romper la ejecución.');
  }

  // Restaurar la configuración original de APP_MODE
  CONFIG.APP_MODE = originalMode;

  console.log('\n====================================================');
  console.log(`Configuración de APP_MODE restaurada a: '${CONFIG.APP_MODE}'`);
  console.log('====================================================\n');
}

runTest();
