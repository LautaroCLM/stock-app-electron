-- ============================================================================
-- SCRIPT SQL PARA SUPABASE: Creación de la Tabla company_users y Trigger
-- Ejecutar este script en el SQL Editor del Panel de Supabase
-- ============================================================================

-- 1. Crear tabla company_users
CREATE TABLE IF NOT EXISTS public.company_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id TEXT NOT NULL DEFAULT 'default-company',
  nombre TEXT NOT NULL,
  cargo TEXT DEFAULT 'Miembro',
  avatar_url TEXT,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Habilitar RLS (Row Level Security)
ALTER TABLE public.company_users ENABLE ROW LEVEL SECURITY;

-- 3. Crear Políticas RLS permisivas para lectura y escritura de usuarios autenticados
DROP POLICY IF EXISTS "Permitir lectura publica/autenticada de company_users" ON public.company_users;
CREATE POLICY "Permitir lectura publica/autenticada de company_users"
  ON public.company_users FOR SELECT
  TO authenticated, anon
  USING (true);

DROP POLICY IF EXISTS "Permitir insercion y edicion de company_users" ON public.company_users;
CREATE POLICY "Permitir insercion y edicion de company_users"
  ON public.company_users FOR ALL
  TO authenticated, anon
  USING (true)
  WITH CHECK (true);

-- 4. Función Trigger para copiar automáticamente nuevos usuarios desde auth.users
CREATE OR REPLACE FUNCTION public.handle_new_company_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.company_users (id, company_id, nombre, cargo, avatar_url, activo)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'company_id', 'default-company'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'cargo', NEW.raw_user_meta_data->>'role', 'Master Admin'),
    NEW.raw_user_meta_data->>'avatar_url',
    true
  )
  ON CONFLICT (id) DO UPDATE SET
    nombre = EXCLUDED.nombre,
    cargo = EXCLUDED.cargo,
    updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Vincular el Trigger a la tabla del sistema auth.users
DROP TRIGGER IF EXISTS on_auth_user_created_company_user ON auth.users;
CREATE TRIGGER on_auth_user_created_company_user
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_company_user();
