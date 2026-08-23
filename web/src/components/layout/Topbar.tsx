'use client';

import React, { useState, useEffect } from 'react';
import { Menu, Search, Bell, Sun, Moon, User, LogOut, Building2, ShieldCheck, Users } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { Badge } from '@/components/ui/Badge';
import { fetchCompanyWebProfiles, CompanyUserProfile } from '@/lib/services/presenceWebService';

interface TopbarProps {
  onOpenMobileSidebar: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({ onOpenMobileSidebar }) => {
  const { theme, toggleTheme } = useTheme();
  const { user, company, role, logout, onlineUserIds } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const [companyUsers, setCompanyUsers] = useState<CompanyUserProfile[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState<boolean>(false);

  const activeCompanyName = company?.nombre || user?.company?.nombre || 'La Perla Desarrolladora S.A.';
  const activeRoleName = role || user?.role || 'administrador';

  useEffect(() => {
    if (showProfileMenu && user) {
      setIsLoadingUsers(true);
      const companyId = user.company_id || user.company?.id || 'default-company';
      fetchCompanyWebProfiles(companyId, user.id).then((users) => {
        setCompanyUsers(users);
        setIsLoadingUsers(false);
      });
    }
  }, [showProfileMenu, user]);

  const handleLogout = async () => {
    setShowProfileMenu(false);
    await logout();
  };

  const sortedWebUsers = [...companyUsers].sort((a, b) => {
    if (a.isCurrent) return -1;
    if (b.isCurrent) return 1;

    const aOnline = (onlineUserIds as Set<string>)?.has(a.id);
    const bOnline = (onlineUserIds as Set<string>)?.has(b.id);

    if (aOnline && !bOnline) return -1;
    if (!aOnline && bOnline) return 1;

    return (a.nombre || '').localeCompare(b.nombre || '');
  });

  return (
    <header className="sticky top-0 z-30 h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 lg:px-8 flex items-center justify-between transition-colors">
      {/* Left: Mobile Menu Trigger + Search Input */}
      <div className="flex items-center space-x-4 flex-1">
        <button
          onClick={onOpenMobileSidebar}
          className="lg:hidden p-2 rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="relative max-w-md w-full hidden sm:block">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="search"
            placeholder="Buscar inventario, códigos, clientes o comprobantes..."
            className="w-full pl-9 pr-4 py-2 bg-slate-100 dark:bg-slate-800/80 border-0 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
          />
        </div>
      </div>

      {/* Right Actions: Theme Toggle, Notifications, User Profile */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        {/* Company Active Badge */}
        <div className="hidden lg:flex items-center space-x-1.5 px-3 py-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60">
          <Building2 className="w-3.5 h-3.5 text-blue-500" />
          <span className="truncate max-w-[160px]">{activeCompanyName}</span>
        </div>

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          aria-label="Cambiar Tema"
          className="p-2 rounded-xl text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          {theme === 'dark' ? (
            <Sun className="w-5 h-5 text-amber-400" />
          ) : (
            <Moon className="w-5 h-5 text-slate-600" />
          )}
        </button>

        {/* Notifications Popover Toggle */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors relative"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-600 ring-2 ring-white dark:ring-slate-900" />
          </button>

          {showNotifications ? (
            <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl py-3 z-50">
              <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <span className="font-semibold text-xs text-slate-900 dark:text-slate-100">Notificaciones</span>
                <span className="text-[10px] bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full font-medium">3 Nuevas</span>
              </div>
              <div className="p-4 text-center text-xs text-slate-500 dark:text-slate-400">
                Sistema de autenticación y sincronización remota activo.
              </div>
            </div>
          ) : null}
        </div>

        <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 mx-1 hidden sm:block" />

        {/* User Profile Menu */}
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center space-x-2.5 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-md">
              <User className="w-4 h-4" />
            </div>
            <div className="text-left hidden md:block">
              <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 leading-tight">{user?.name || 'Usuario'}</p>
              <p className="text-[10px] text-slate-400 leading-tight capitalize">{activeRoleName}</p>
            </div>
          </button>

          {showProfileMenu ? (
            <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl py-2 z-50">
              <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 space-y-1">
                <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">{user?.name}</p>
                <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
                <div className="pt-1 flex items-center space-x-2">
                  <Badge variant="info" className="capitalize text-[10px]">
                    {activeRoleName}
                  </Badge>
                </div>
              </div>
              <div className="py-1">
                <div className="px-4 py-2 text-[11px] text-slate-500 dark:text-slate-400 flex items-center space-x-2">
                  <Building2 className="w-3.5 h-3.5 text-blue-500" />
                  <span className="truncate">{activeCompanyName}</span>
                </div>
                <div className="px-4 py-1.5 text-[10px] text-slate-400 flex items-center space-x-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Sesión activa con Supabase</span>
                </div>

                {/* Sección Usuarios de la Empresa con Presencia Realtime */}
                <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                <div className="px-4 py-1.5 flex items-center space-x-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <Users className="w-3.5 h-3.5 text-blue-500" />
                  <span>Usuarios de la Empresa</span>
                </div>
                <div className="max-h-44 overflow-y-auto px-2 space-y-1 py-1">
                  {isLoadingUsers ? (
                    <p className="text-[11px] text-slate-400 text-center py-2 italic">Cargando usuarios...</p>
                  ) : sortedWebUsers.length === 0 ? (
                    <p className="text-[11px] text-slate-400 text-center py-2 italic">No hay otros usuarios.</p>
                  ) : (
                    sortedWebUsers.map((u) => {
                      const isOnline = (onlineUserIds as Set<string>)?.has(u.id) || u.isCurrent;
                      const initial = (u.nombre || 'U')[0].toUpperCase();
                      return (
                        <div
                          key={u.id}
                          className="flex items-center space-x-2.5 px-2 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors text-xs"
                        >
                          <span
                            className={`w-2 h-2 rounded-full flex-shrink-0 ${
                              isOnline ? 'bg-emerald-500 shadow-sm' : 'bg-slate-300 dark:bg-slate-600'
                            }`}
                            title={isOnline ? 'Conectado' : 'Desconectado'}
                          />
                          <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[10px] flex-shrink-0 overflow-hidden">
                            {u.avatar_url ? (
                              <img src={u.avatar_url} alt={u.nombre} className="w-full h-full object-cover" />
                            ) : (
                              initial
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-slate-900 dark:text-slate-100 text-[11px] truncate flex items-center space-x-1">
                              <span className="truncate">{u.nombre}</span>
                              {u.isCurrent && (
                                <span className="bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 text-[9px] font-bold px-1.5 py-0.5 rounded ml-1">
                                  Tú
                                </span>
                              )}
                            </p>
                            <p className="text-[10px] text-slate-400 truncate">{u.cargo}</p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center space-x-2.5 px-4 py-2 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Cerrar Sesión</span>
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
};
