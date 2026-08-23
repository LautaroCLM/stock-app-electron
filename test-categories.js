// test-categories.js
//
// Script independiente para probar el servicio de lectura de categorías en Supabase.
// Ejecución: node test-categories.js

'use strict';

const supabaseCategoryService = require('./services/supabaseCategoryService');
const CONFIG = require('./services/config');

async function main() {
  console.log('====================================================');
  console.log('  PRUEBA DE LECTURA DE CATEGORÍAS — SUPABASE');
  console.log('====================================================\n');

  console.log(`[Estado de Configuración]`);
  console.log(`- APP_MODE: ${CONFIG.APP_MODE}`);
  console.log(`- SUPABASE_URL: ${CONFIG.SUPABASE_URL || '(No configurado)'}\n`);

  try {
    console.log('⏳ Consultando categorías desde Supabase...');
    const categorias = await supabaseCategoryService.getAllCategories();

    console.log(`\n✅ Consulta realizada con éxito. Categorías obtenidas: ${categorias.length}`);
    if (categorias.length > 0) {
      console.log('Detalle de categorías:');
      console.dir(categorias, { depth: null });
    } else {
      console.log('ℹ️ Se devolvió un arreglo vacío [] (posible falta de credenciales o tabla sin datos).');
    }
  } catch (err) {
    console.error('❌ Error capturado durante la prueba de categorías:', err.message);
  }

  console.log('\n====================================================');
}

main();
