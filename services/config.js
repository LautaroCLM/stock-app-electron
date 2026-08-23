// services/config.js
//
// Fase 1.3 (Paso 3) — Configuración Central Global con Variables de Entorno.
// Carga variables desde el archivo .env si existe y centraliza las constantes del sistema.

'use strict';

const path = require('path');
const fs = require('fs');

// Cargar variables de entorno desde el archivo .env en la raíz del proyecto o desde process.resourcesPath (producción)
let envPath = path.join(__dirname, '../.env');
try {
  if (process.resourcesPath && fs.existsSync(path.join(process.resourcesPath, '.env'))) {
    envPath = path.join(process.resourcesPath, '.env');
  }
} catch (e) {
  // Ignorar errores al verificar ruta de recursos
}

try {
  require('dotenv').config({ path: envPath });
} catch (err) {
  // Ignorar en entornos donde dotenv no esté disponible o .env no exista
}

const CONFIG = {
  APP_MODE: process.env.APP_MODE || 'LOCAL',
  ENABLE_SYNC: process.env.ENABLE_SYNC === 'true' || false,
  ENABLE_QUEUE: process.env.ENABLE_QUEUE === 'true' || false,
  API_URL: process.env.API_URL || null,
  SUPABASE_URL: process.env.SUPABASE_URL || null,
  SUPABASE_KEY: process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || null
};

module.exports = CONFIG;
