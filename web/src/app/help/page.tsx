import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

export default function HelpPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Centro de Ayuda y Soporte</h1>
      <Card>
        <CardHeader><CardTitle>Documentación de Usuario y Preguntas Frecuentes</CardTitle></CardHeader>
        <CardContent className="p-8 text-center text-slate-400 text-xs">[Módulo Centro de Ayuda - Vista Web]</CardContent>
      </Card>
    </div>
  );
}
