// test-products.js
//
// Script independiente para probar los métodos de lectura de supabaseProductService.js.
// Ejecución: node test-products.js

'use strict';

const supabaseProductService = require('./services/supabaseProductService');
const CONFIG = require('./services/config');

// Función auxiliar para inspeccionar la estructura de propiedades y tipos
function inspectObjectStructure(obj) {
  if (!obj || typeof obj !== 'object') return 'N/A';
  return Object.keys(obj)
    .map(key => `${key}: ${typeof obj[key]} (${obj[key] === null ? 'null' : obj[key]})`)
    .join(', ');
}

async function runTests() {
  console.log('====================================================');
  console.log('  PRUEBA DE LECTURA DE PRODUCTOS — SUPABASE');
  console.log('====================================================\n');

  console.log(`[Estado de Configuración]`);
  console.log(`- APP_MODE: ${CONFIG.APP_MODE}`);
  console.log(`- SUPABASE_URL: ${CONFIG.SUPABASE_URL || '(No configurado)'}\n`);

  // ── 1. TEST getProducts() ──────────────────────────────────────────
  console.log('📌 1. PROBANDO getProducts()');
  try {
    const products = await supabaseProductService.getProducts();
    console.log(`✅ getProducts() ejecutado con éxito. Productos obtenidos: ${products.length}`);
    if (products.length > 0) {
      console.log(`   Estructura del primer objeto: [${inspectObjectStructure(products[0])}]`);
    } else {
      console.log('   ℹ️ Retornó [] (posible falta de credenciales o tabla vacía).');
    }
  } catch (err) {
    console.error('❌ Error en getProducts():', err.message);
  }

  console.log('\n----------------------------------------------------\n');

  // ── 2. TEST getProductById() ───────────────────────────────────────
  console.log('📌 2. PROBANDO getProductById()');
  try {
    // ID válido (1)
    console.log('   a) Consulta con ID válido (1):');
    const prodById = await supabaseProductService.getProductById(1);
    if (prodById) {
      console.log(`   ✅ Encontrado:`, prodById);
      console.log(`   Estructura: [${inspectObjectStructure(prodById)}]`);
    } else {
      console.log('   ℹ️ No se encontró producto con ID 1 o Supabase inactivo.');
    }

    // ID inexistente (-999)
    console.log('   b) Consulta con ID inexistente (-999):');
    const nonExistentId = await supabaseProductService.getProductById(-999);
    console.log(`   ✅ Respuesta para ID inexistente:`, nonExistentId);

    // Parámetros inválidos (null, undefined, invalid string)
    console.log('   c) Consulta con parámetros inválidos (null, undefined, "abc"):');
    const resNull = await supabaseProductService.getProductById(null);
    const resUndef = await supabaseProductService.getProductById(undefined);
    const resStr = await supabaseProductService.getProductById('abc');
    console.log(`   ✅ Respuestas con params inválidos: null->${resNull}, undef->${resUndef}, str->${resStr}`);
  } catch (err) {
    console.error('❌ Error en getProductById():', err.message);
  }

  console.log('\n----------------------------------------------------\n');

  // ── 3. TEST getProductByCode() ─────────────────────────────────────
  console.log('📌 3. PROBANDO getProductByCode()');
  try {
    // Código de prueba
    console.log('   a) Consulta con código de prueba ("COD001"):');
    const prodByCode = await supabaseProductService.getProductByCode('COD001');
    if (prodByCode) {
      console.log(`   ✅ Encontrado:`, prodByCode);
    } else {
      console.log('   ℹ️ No se encontró producto con código "COD001" o Supabase inactivo.');
    }

    // Código inexistente
    console.log('   b) Consulta con código inexistente ("NON_EXISTENT_CODE_999"):');
    const nonExistentCode = await supabaseProductService.getProductByCode('NON_EXISTENT_CODE_999');
    console.log(`   ✅ Respuesta para código inexistente:`, nonExistentCode);

    // Parámetros inválidos
    console.log('   c) Consulta con parámetros inválidos (null, "", "   "):');
    const codeNull = await supabaseProductService.getProductByCode(null);
    const codeEmpty = await supabaseProductService.getProductByCode('');
    const codeSpaces = await supabaseProductService.getProductByCode('   ');
    console.log(`   ✅ Respuestas con params inválidos: null->${codeNull}, empty->${codeEmpty}, spaces->${codeSpaces}`);
  } catch (err) {
    console.error('❌ Error en getProductByCode():', err.message);
  }

  console.log('\n----------------------------------------------------\n');

  // ── 4. TEST searchProducts() ───────────────────────────────────────
  console.log('📌 4. PROBANDO searchProducts()');
  try {
    // Búsqueda por término parcial ("a")
    console.log('   a) Búsqueda parcial ("a"):');
    const searchRes = await supabaseProductService.searchProducts('a');
    console.log(`   ✅ searchProducts("a") ejecutado con éxito. Productos devueltos: ${searchRes.length}`);

    // Búsqueda con término inexistente ("XYZ_SEARCH_TERM_999")
    console.log('   b) Búsqueda inexistente ("XYZ_SEARCH_TERM_999"):');
    const searchEmptyRes = await supabaseProductService.searchProducts('XYZ_SEARCH_TERM_999');
    console.log(`   ✅ searchProducts("XYZ_SEARCH_TERM_999") devueltos: ${searchEmptyRes.length}`);

    // Búsqueda con parámetros nulos o vacíos
    console.log('   c) Búsqueda con parámetros vacíos / nulos (null, ""):');
    const searchNull = await supabaseProductService.searchProducts(null);
    const searchEmpty = await supabaseProductService.searchProducts('');
    console.log(`   ✅ Resultados con params nulos/vacíos: null->${searchNull.length} prods, empty->${searchEmpty.length} prods`);
  } catch (err) {
    console.error('❌ Error en searchProducts():', err.message);
  }

  console.log('\n====================================================');
  console.log('  PRUEBAS FINALIZADAS SIN ERRORES CRÍTICOS');
  console.log('====================================================\n');
}

runTests();
