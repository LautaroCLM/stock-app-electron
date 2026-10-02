'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  UserProfile,
  UserRole,
  Company,
  PermissionModule,
  PermissionAction,
  hasPermission as hasPermissionHelper,
} from '@/types';
import { supabase } from '@/lib/supabase/client';
import { startWebPresence, stopWebPresence } from '@/lib/services/presenceWebService';

interface AuthContextType {
  user: UserProfile | null;
  profile: UserProfile | null;
  role: UserRole | null;
  company: Company | null;
  permissions: PermissionAction[];
  isAuthenticated: boolean;
  isLoading: boolean;
  onlineUserIds: Set<string>;
  login: (email: string, password: string) => Promise<{ error: string | null }>;
  quickLogin: () => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
  hasPermission: (module: PermissionModule, action: PermissionAction) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());

  // Efecto para gestionar Supabase Realtime Presence cuando el usuario está autenticado
  useEffect(() => {
    if (!user || !user.id) {
      setOnlineUserIds(new Set());
      return;
    }

    const companyId = user.company_id || user.company?.id || 'default-company';
    startWebPresence(companyId, user.id, (onlineIds) => {
      setOnlineUserIds(new Set(onlineIds));
    });

    const handleBeforeUnload = () => {
      stopWebPresence();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      stopWebPresence();
    };
  }, [user]);

  const saveQuickSession = (u: UserProfile, c: Company) => {
    setUser(u);
    setCompany(c);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('stock_app_quick_user', JSON.stringify({ user: u, company: c }));
      } catch (err) {
        console.warn('[AuthContext] Error guardando quick user:', err);
      }
    }
  };

  const clearUser = useCallback(() => {
    setUser(null);
    setCompany(null);
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('stock_app_quick_user');
      } catch (e) {}
    }
  }, []);

  const restoreSavedQuickUser = useCallback((): boolean => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('stock_app_quick_user');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed?.user) {
            setUser(parsed.user);
            setCompany(parsed.company || { id: 'default-company', nombre: 'La Perla Desarrolladora S.A.' });
            return true;
          }
        } catch (e) {}
      }
    }
    return false;
  }, []);

  const loadUserProfile = useCallback(async (authUser: any) => {
    try {
      const { data: profileData } = await supabase
        .from('company_users')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

      if (profileData) {
        const userRole: UserRole = (profileData.role || profileData.rol || 'administrador') as UserRole;
        const companyData: Company = profileData.company || {
          id: profileData.company_id || 'default-company',
          nombre: profileData.company_name || 'La Perla Desarrolladora S.A.',
        };
        const loadedUser: UserProfile = {
          id: authUser.id,
          name:
            profileData.name ||
            profileData.nombre ||
            authUser.user_metadata?.full_name ||
            authUser.email?.split('@')[0] ||
            'Usuario',
          email: authUser.email || '',
          role: userRole,
          company_id: companyData.id,
          company: companyData,
          avatarUrl: profileData.avatar_url || authUser.user_metadata?.avatar_url,
        };
        saveQuickSession(loadedUser, companyData);
      } else {
        const defaultRole: UserRole = 'administrador';
        const defaultCompany: Company = {
          id: 'default-company',
          nombre: 'La Perla Desarrolladora S.A.',
          cuit: '30-71955729-1',
        };
        const fallbackUser: UserProfile = {
          id: authUser.id,
          name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'Usuario Administrador',
          email: authUser.email || '',
          role: defaultRole,
          company_id: defaultCompany.id,
          company: defaultCompany,
        };
        saveQuickSession(fallbackUser, defaultCompany);
      }
    } catch (err) {
      console.warn('[AuthContext] Error cargando perfil desde Supabase:', err);
      const defaultCompany: Company = {
        id: 'default-company',
        nombre: 'La Perla Desarrolladora S.A.',
      };
      const fallbackUser: UserProfile = {
        id: authUser.id,
        name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'Usuario',
        email: authUser.email || '',
        role: 'administrador',
        company_id: defaultCompany.id,
        company: defaultCompany,
      };
      saveQuickSession(fallbackUser, defaultCompany);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!isMounted) return;

        if (session?.user) {
          await loadUserProfile(session.user);
        } else {
          const restored = restoreSavedQuickUser();
          if (!restored) {
            clearUser();
          }
        }
      } catch (err) {
        console.error('[AuthContext] Error obteniendo sesión:', err);
        const restored = restoreSavedQuickUser();
        if (!restored) {
          clearUser();
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    initAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;

      if (session?.user) {
        await loadUserProfile(session.user);
        setIsLoading(false);
      } else if (event === 'SIGNED_OUT') {
        clearUser();
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [loadUserProfile, clearUser, restoreSavedQuickUser]);

  const login = async (email: string, password: string): Promise<{ error: string | null }> => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setIsLoading(false);
        return { error: error.message || 'Credenciales inválidas.' };
      }
      if (data.session?.user) {
        await loadUserProfile(data.session.user);
      }
      setIsLoading(false);
      return { error: null };
    } catch (err: any) {
      setIsLoading(false);
      return { error: err.message || 'Error al conectar con Supabase Auth.' };
    }
  };

  const quickLogin = async (): Promise<{ error: string | null }> => {
    setIsLoading(true);
    try {
      const defaultCompany: Company = {
        id: 'default-company',
        nombre: 'La Perla Desarrolladora S.A.',
        cuit: '30-71955729-1',
      };
      const quickUser: UserProfile = {
        id: 'quick-user-operator',
        name: 'Usuario Acceso Rápido',
        email: 'laperla21@gmail.com',
        role: 'administrador',
        company_id: defaultCompany.id,
        company: defaultCompany,
      };

      saveQuickSession(quickUser, defaultCompany);
      setIsLoading(false);
      return { error: null };
    } catch (err: any) {
      setIsLoading(false);
      return { error: err.message || 'Error en el inicio de sesión rápido.' };
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('[AuthContext] Error durante signOut:', err);
    } finally {
      clearUser();
      setIsLoading(false);
    }
  };

  const checkPermission = (module: PermissionModule, action: PermissionAction): boolean => {
    if (!user) return false;
    return hasPermissionHelper(user.role, module, action);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile: user,
        role: user?.role || null,
        company,
        permissions: [],
        isAuthenticated: !!user,
        isLoading,
        onlineUserIds,
        login,
        quickLogin,
        logout,
        hasPermission: checkPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser utilizado dentro de un AuthProvider');
  }
  return context;
}
