import { supabase } from '../supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

let currentWebPresenceChannel: RealtimeChannel | null = null;
let activeWebPresenceCallback: ((onlineIds: string[]) => void) | null = null;

export interface CompanyUserProfile {
  id: string;
  nombre: string;
  cargo: string;
  avatar_url: string | null;
  company_id: string;
  isCurrent?: boolean;
}

export function startWebPresence(
  companyId: string,
  userId: string,
  onSync: (onlineIds: string[]) => void
) {
  if (!supabase || !companyId || !userId) return;

  activeWebPresenceCallback = onSync;

  if (currentWebPresenceChannel) {
    try {
      currentWebPresenceChannel.unsubscribe();
      supabase.removeChannel(currentWebPresenceChannel);
    } catch (e) {
      // Ignorar errores al limpiar canal previo
    }
  }

  try {
    const channelName = `company-presence-${companyId || 'default-company'}`;
    currentWebPresenceChannel = supabase.channel(channelName, {
      config: { presence: { key: userId } },
    });

    const notifyState = () => {
      if (!currentWebPresenceChannel || !activeWebPresenceCallback) return;
      const state = currentWebPresenceChannel.presenceState();

      console.log('================ [WEB PRESENCE LOG] ================');
      console.log('user_id:', userId);
      console.log('company_id:', companyId);
      console.log('channel:', channelName);
      console.log('subscribe: SUBSCRIBED');
      console.log('track: ok');
      console.log('presenceState:', state);
      console.log('Object.keys(channel.presenceState()).length:', Object.keys(state).length);
      console.log('===================================================');

      activeWebPresenceCallback(Object.keys(state));
    };

    currentWebPresenceChannel
      .on('presence', { event: 'sync' }, notifyState)
      .on('presence', { event: 'join' }, notifyState)
      .on('presence', { event: 'leave' }, notifyState)
      .subscribe(async (status) => {
        console.log(`[WEB PRESENCE] Estado de la suscripción al canal "${channelName}":`, status);
        if (status === 'SUBSCRIBED') {
          const trackRes = await currentWebPresenceChannel?.track({
            user_id: userId,
            online_at: new Date().toISOString(),
          });
          console.log('[WEB PRESENCE] Resultado de track():', trackRes);
          notifyState();
        }
      });
  } catch (err) {
    console.warn('[PresenceWebService] Error iniciando tracking de presencia en la Web:', err);
  }
}

export function stopWebPresence() {
  if (currentWebPresenceChannel) {
    try {
      currentWebPresenceChannel.untrack();
      currentWebPresenceChannel.unsubscribe();
      supabase.removeChannel(currentWebPresenceChannel);
    } catch (e) {
      // Ignorar errores al desuscribirse
    }
    currentWebPresenceChannel = null;
  }
  activeWebPresenceCallback = null;
}

export async function fetchCompanyWebProfiles(companyId: string, currentUserId: string): Promise<CompanyUserProfile[]> {
  if (!supabase) return [];

  try {
    let query = supabase.from('company_users').select('*');
    if (companyId && companyId !== 'default-company') {
      query = query.eq('company_id', companyId);
    }

    const { data: profiles, error } = await query;

    if (error || !profiles || profiles.length === 0) {
      const { data: fallbackProfiles } = await supabase.from('company_users').select('*');
      const list = fallbackProfiles || [];
      return list.map((p) => ({
        id: p.id,
        nombre: p.nombre || p.name || 'Usuario',
        cargo: p.cargo || p.role || p.rol || 'Miembro',
        avatar_url: p.avatar_url || null,
        company_id: p.company_id || companyId,
        isCurrent: p.id === currentUserId,
      }));
    }

    return profiles.map((p) => ({
      id: p.id,
      nombre: p.nombre || p.name || 'Usuario',
      cargo: p.cargo || p.role || p.rol || 'Miembro',
      avatar_url: p.avatar_url || null,
      company_id: p.company_id || companyId,
      isCurrent: p.id === currentUserId,
    }));
  } catch (err) {
    console.warn('[PresenceWebService] Error al consultar perfiles de la empresa:', err);
    return [];
  }
}
