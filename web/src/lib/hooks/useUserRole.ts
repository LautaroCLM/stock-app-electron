'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';

export type UserRole = 'admin' | 'empleado';

export function useUserRole() {
  const [role, setRole] = useState<UserRole>('empleado');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function fetchRole() {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const user = sessionData?.session?.user;
        if (!user) {
          if (isMounted) {
            setRole('empleado');
            setIsLoading(false);
          }
          return;
        }

        const { data: profile } = await supabase
          .from('company_users')
          .select('role, rol, cargo')
          .eq('id', user.id)
          .maybeSingle();

        if (isMounted) {
          if (profile) {
            const rawRole = (profile.role || profile.rol || 'empleado').toLowerCase();
            const isAdmin = rawRole === 'admin' || rawRole === 'master admin' || rawRole === 'administrador';
            setRole(isAdmin ? 'admin' : 'empleado');
          } else {
            setRole('empleado');
          }
        }
      } catch (err) {
        console.warn('[useUserRole] Error al obtener el rol del usuario, asignando rol por defecto (empleado):', err);
        if (isMounted) setRole('empleado');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    fetchRole();

    return () => {
      isMounted = false;
    };
  }, []);

  return { role, isAdmin: role === 'admin', isLoading };
}
