'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';

export function useSupabaseRealtime(
  tableName: string,
  onPayloadReceived: (payload: any) => void
) {
  useEffect(() => {
    const channelName = `realtime:${tableName}`;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: tableName },
        (payload) => {
          console.log(`[Realtime ${tableName}] Evento detectado:`, payload.eventType, payload);
          onPayloadReceived(payload);
        }
      )
      .subscribe((status) => {
        console.log(`[Realtime Status ${tableName}]:`, status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tableName, onPayloadReceived]);
}
