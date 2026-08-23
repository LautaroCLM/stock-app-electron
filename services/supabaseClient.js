// services/supabaseClient.js
//
// Fase 1.3 (Paso 4) — Cliente Centralizado de Supabase con Prueba de Conexión de Solo Lectura.
// Centraliza la instanciación de Supabase y provee un método de test de comunicación sin escrituras.

'use strict';

const { createClient } = require('@supabase/supabase-js');
const WebSocket = require('ws');
const CONFIG = require('./config');

let supabaseInstance = null;

/**
 * Obtiene o inicializa la instancia única (Singleton) del cliente de Supabase.
 * Retorna null si las credenciales no han sido configuradas.
 * 
 * @returns {import('@supabase/supabase-js').SupabaseClient|null}
 */
function getSupabaseClient() {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  const supabaseUrl = process.env.SUPABASE_URL || CONFIG.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || CONFIG.SUPABASE_KEY;

  console.log("Tipo de key utilizada:");
  if (process.env.SUPABASE_ANON_KEY && supabaseKey === process.env.SUPABASE_ANON_KEY) {
    console.log("ANON");
  } else if (process.env.SUPABASE_SERVICE_ROLE_KEY && supabaseKey === process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log("SERVICE_ROLE");
  } else {
    console.log("OTRA");
  }

  if (supabaseUrl && supabaseKey) {
    try {
      supabaseInstance = createClient(supabaseUrl, supabaseKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        },
        realtime: {
          transport: WebSocket
        }
      });
      console.log('[SupabaseClient] Cliente de Supabase inicializado correctamente.');
    } catch (err) {
      console.error('[SupabaseClient] Error inicializando el cliente de Supabase:', err.message);
      supabaseInstance = null;
    }
  } else {
    // Si no hay credenciales configuradas, la instancia permanece en null (modo puramente local).
    supabaseInstance = null;
  }

  return supabaseInstance;
}

/**
 * Verifica si Supabase está configurado con credenciales válidas en la configuración.
 * @returns {boolean}
 */
function isSupabaseConfigured() {
  const supabaseUrl = process.env.SUPABASE_URL || CONFIG.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || CONFIG.SUPABASE_KEY;
  return Boolean(supabaseUrl && supabaseKey);
}

/**
 * Realiza una prueba de conectividad de solo lectura hacia Supabase.
 * No modifica datos, no inserta registros ni altera ninguna tabla.
 * 
 * @returns {Promise<{ success: boolean, message: string, details?: any }>}
 */
async function testConnection() {
  const client = getSupabaseClient();
  if (!client) {
    return {
      success: false,
      message: 'Supabase no está configurado. Completa SUPABASE_URL y SUPABASE_ANON_KEY en tu archivo .env'
    };
  }

  try {
    const { data, error } = await client
      .from('categorias')
      .select('*')
      .limit(1);

    console.dir(data, { depth: null });
    console.dir(error, { depth: null });

    if (error) {
      console.log(JSON.stringify(error, null, 2));
      return {
        success: false,
        message: `Error al consultar Supabase: ${error.message} (Código: ${error.code})`,
        details: error
      };
    }

    return {
      success: true,
      message: '¡Conexión a Supabase exitosa! Las credenciales y la red responden correctamente.'
    };
  } catch (err) {
    console.dir(err, { depth: null });
    console.log(err);
    return {
      success: false,
      message: `Error de red/conexión hacia Supabase: ${err.message}`,
      details: err
    };
  }
}

module.exports = {
  getSupabaseClient,
  isSupabaseConfigured,
  testConnection,
  get supabase() {
    return getSupabaseClient();
  }
};
