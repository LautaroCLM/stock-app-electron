// test-connection.js
//
// Script ejecutable para probar la conexión a Supabase.
// Ejecución: node test-connection.js

'use strict';

const { testConnection, isSupabaseConfigured } = require('./services/supabaseClient');
const CONFIG = require('./services/config');

async function main() {
  console.log('====================================================');
  console.log('  PRUEBA DE CONEXIÓN A SUPABASE — INVENTARIO APP');
  console.log('====================================================\n');

  console.log(`[Configuración Actual]`);
  console.log(`- APP_MODE: ${CONFIG.APP_MODE}`);
  console.log(`- SUPABASE_URL: ${CONFIG.SUPABASE_URL || '(No configurado)'}`);
  console.log(`- SUPABASE_KEY: ${CONFIG.SUPABASE_KEY ? '****** (Configurado)' : '(No configurado)'}\n`);

  if (!isSupabaseConfigured()) {
    console.log('❌ Supabase no está configurado aún.');
    console.log('ℹ️ Para probar tu conexión real:');
    console.log('   1. Copia .env.example a un nuevo archivo llamado .env');
    console.log('   2. Ingresa tu SUPABASE_URL y SUPABASE_ANON_KEY en .env');
    console.log('   3. Vuelve a ejecutar: node test-connection.js\n');
    console.log('La aplicación seguirá funcionando normalmente con SQLite local.');
    return;
  }

  console.log('⏳ Verificando comunicación con la base de datos de Supabase...');
  const result = await testConnection();

  if (result.success) {
    console.log(`✅ ${result.message}`);
  } else {
    console.log(`❌ ${result.message}`);
    if (result.details) {
      console.log('  Detalles del error:', result.details);
    }
  }
  console.log('\n====================================================');
}

main();
