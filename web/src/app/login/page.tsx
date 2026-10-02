'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { ToastNotification, ToastMessage } from '@/components/ui/ToastNotification';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Lock, Mail, Building2, ShieldCheck, ArrowRight, Loader2, Zap } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login, quickLogin, isAuthenticated, isLoading: isAuthLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  // If already authenticated, redirect to Dashboard
  useEffect(() => {
    if (isAuthenticated && !isAuthLoading) {
      router.push('/');
    }
  }, [isAuthenticated, isAuthLoading, router]);

  const handleQuickLogin = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const { error: loginError } = await quickLogin();
      if (loginError) {
        setError(loginError);
        setToast({ id: Date.now().toString(), type: 'error', text: loginError });
      } else {
        setToast({
          id: Date.now().toString(),
          type: 'success',
          text: 'Inicio de sesión rápido exitoso. Redirigiendo...',
        });
        setTimeout(() => {
          router.push('/');
        }, 300);
      }
    } catch (err: any) {
      const msg = err?.message || 'Error al realizar inicio de sesión rápido.';
      setError(msg);
      setToast({ id: Date.now().toString(), type: 'error', text: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Por favor, ingresá tu correo electrónico.');
      return;
    }

    if (!password) {
      setError('Por favor, ingresá tu contraseña.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError('Ingresá un formato de correo electrónico válido.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error: loginError } = await login(trimmedEmail, password);

      if (loginError) {
        let friendlyMessage = loginError;
        if (loginError.toLowerCase().includes('invalid login credentials')) {
          friendlyMessage = 'Credenciales incorrectas. Verificá tu correo y contraseña.';
        } else if (loginError.toLowerCase().includes('email not confirmed')) {
          friendlyMessage = 'El correo electrónico no ha sido confirmado aún.';
        }
        setError(friendlyMessage);
        setToast({ id: Date.now().toString(), type: 'error', text: friendlyMessage });
      } else {
        setToast({
          id: Date.now().toString(),
          type: 'success',
          text: 'Sesión iniciada correctamente. Redirigiendo...',
        });
        setTimeout(() => {
          router.push('/');
        }, 400);
      }
    } catch (err: any) {
      const msg = err?.message || 'Ocurrió un error inesperado al iniciar sesión.';
      setError(msg);
      setToast({ id: Date.now().toString(), type: 'error', text: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-100">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-4" />
        <p className="text-xs text-slate-400 font-medium">Verificando sesión con Supabase Auth...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 sm:p-6 lg:p-8 custom-scrollbar">
      <div className="max-w-md w-full space-y-8 bg-slate-900/90 backdrop-blur-md border border-slate-800 p-8 rounded-3xl shadow-2xl relative overflow-hidden">
        {/* Top Decorative Gradient Line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600" />

        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600/10 border border-blue-500/20 text-blue-400 shadow-inner">
            <Building2 className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">La Perla Desarrolladora S.A.</h1>
          <p className="text-xs text-slate-400">Sistema Integral de Gestión & Stock — Versión Web</p>
        </div>

        {/* Error Alert Box */}
        <ErrorAlert error={error} onDismiss={() => setError(null)} />

        {/* Quick Access Button */}
        <div className="p-4 bg-gradient-to-br from-blue-900/40 via-indigo-900/30 to-purple-900/40 border border-blue-500/30 rounded-2xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-300 flex items-center space-x-1.5">
              <Zap className="w-4 h-4 text-amber-400 animate-bounce" />
              <span>Acceso Rápido sin Contraseña</span>
            </span>
            <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full font-mono">1-Click</span>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            Presioná el botón a continuación para ingresar al sistema de forma inmediata sin tipear correo ni clave.
          </p>
          <Button
            type="button"
            variant="secondary"
            onClick={handleQuickLogin}
            disabled={isSubmitting}
            className="w-full py-2.5 text-xs font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition-all"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center space-x-2">
                <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                <span>Ingresando de forma rápida...</span>
              </span>
            ) : (
              <span className="flex items-center justify-center space-x-2">
                <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
                <span>Iniciar Sesión Rápido (Acceso Directo)</span>
              </span>
            )}
          </Button>
        </div>

        <div className="relative flex items-center justify-center">
          <div className="border-t border-slate-800 w-full" />
          <span className="bg-slate-900 px-3 text-[11px] text-slate-500 font-medium uppercase tracking-wider whitespace-nowrap">
            o con credenciales
          </span>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Correo Electrónico</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="usuario@empresa.com"
                  disabled={isSubmitting}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Contraseña</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={isSubmitting}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50"
                  required
                />
              </div>
            </div>
          </div>

          <Button type="submit" variant="primary" className="w-full py-2.5 text-xs font-semibold" disabled={isSubmitting}>
            {isSubmitting ? (
              <span className="flex items-center justify-center space-x-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Iniciando sesión...</span>
              </span>
            ) : (
              <span className="flex items-center justify-center space-x-2">
                <span>Ingresar al Sistema</span>
                <ArrowRight className="w-4 h-4" />
              </span>
            )}
          </Button>
        </form>

        {/* Security badge footer */}
        <div className="pt-4 border-t border-slate-800/80 flex items-center justify-center space-x-2 text-[11px] text-slate-500">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Autenticación segura con Supabase Auth</span>
        </div>
      </div>

      <ToastNotification toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}

