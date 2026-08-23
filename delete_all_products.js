const Database = require('better-sqlite3');
const path = require('path');

// Ruta de base de datos
const dbPath = path.join(process.cwd(), 'data.db');
const db = new Database(dbPath);

try {
  // Eliminar todos los productos
  const result = db.prepare('DELETE FROM productos').run();
  console.log(`Eliminados ${result.changes} productos de la base de datos.`);
  
  // Verificar que la tabla esté vacía
  const count = db.prepare('SELECT COUNT(*) as count FROM productos').get();
  console.log(`Productos restantes: ${count.count}`);
  
  console.log('✅ Todos los productos han sido eliminados exitosamente.');
  
} catch (error) {
  console.error('❌ Error al eliminar productos:', error.message);
} finally {
  db.close();
}
