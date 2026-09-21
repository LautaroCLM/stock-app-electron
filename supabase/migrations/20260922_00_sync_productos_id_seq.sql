-- Migration: Resync productos_id_seq with MAX(id)
-- Date: 2026-09-21
-- Description: Resynchronizes the physical auto-increment sequence for productos.id with MAX(id) to prevent primary key collision errors during INSERTs.

SELECT setval(
  pg_get_serial_sequence('productos', 'id'),
  COALESCE(MAX(id), 1)
)
FROM productos;
