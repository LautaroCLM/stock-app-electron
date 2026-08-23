-- =============================================================================
-- Permisos SQL para Supabase (Rol anon)
-- =============================================================================
-- Este archivo documenta y automatiza la concesión de permisos SQL necesarios
-- para que el rol 'anon' pueda consultar las tablas y secuencias del esquema
-- público mediante la Publishable Key (Anon Key) de Supabase.
-- =============================================================================

-- Permite al rol 'anon' acceder al esquema 'public' para resolver y buscar objetos en este esquema.
GRANT USAGE ON SCHEMA public TO anon;

-- Otorga permisos de lectura (SELECT) sobre todas las tablas existentes en el esquema 'public' al rol 'anon'.
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

-- Otorga permisos de lectura (SELECT) sobre todas las secuencias existentes en el esquema 'public' al rol 'anon'.
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;
