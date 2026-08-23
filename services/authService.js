// services/authService.js
//
// Servicio de Autenticación Centralizado con Supabase Auth para Electron.
// Maneja signInWithPassword, signOut, getSession y persistencia de sesión en disco.

'use strict';

const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const { getSupabaseClient } = require('./supabaseClient');

let sessionFilePath = null;

function getSessionFilePath() {
  if (!sessionFilePath) {
    const userDataPath = app ? app.getPath('userData') : process.cwd();
    sessionFilePath = path.join(userDataPath, 'auth_session.json');
  }
  return sessionFilePath;
}

function readStoredSession() {
  try {
    const file = getSessionFilePath();
    if (fs.existsSync(file)) {
      const data = fs.readFileSync(file, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.warn('[AuthService] Error leyendo sesión almacenada:', err.message);
  }
  return null;
}

function writeStoredSession(sessionData) {
  try {
    const file = getSessionFilePath();
    fs.writeFileSync(file, JSON.stringify(sessionData, null, 2), 'utf8');
  } catch (err) {
    console.error('[AuthService] Error guardando sesión en disco:', err.message);
  }
}

function clearStoredSession() {
  try {
    const file = getSessionFilePath();
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
    }
  } catch (err) {
    console.warn('[AuthService] Error eliminando archivo de sesión:', err.message);
  }
}

async function fetchUserProfile(supabase, authUser) {
  if (!authUser) return null;
  try {
    const { data: profileData } = await supabase
      .from('company_users')
      .select('*')
      .eq('id', authUser.id)
      .maybeSingle();

    if (profileData) {
      const role = profileData.cargo || profileData.role || profileData.rol || 'administrador';
      const company = {
        id: profileData.company_id || 'default-company',
        nombre: profileData.company_name || 'La Perla Desarrolladora S.A.'
      };
      return {
        id: authUser.id,
        nombre: profileData.nombre || profileData.name || authUser.user_metadata?.full_name || authUser.email.split('@')[0],
        email: authUser.email,
        cargo: profileData.cargo || 'Master Admin',
        rol: role,
        role: role,
        avatar_url: profileData.avatar_url || null,
        company_id: company.id,
        empresa: company.nombre,
        company: company
      };
    }
  } catch (err) {
    console.warn('[AuthService] Error al consultar tabla company_users, usando fallback:', err.message);
  }

  const defaultCompany = {
    id: 'default-company',
    nombre: 'La Perla Desarrolladora S.A.'
  };

  return {
    id: authUser.id,
    nombre: authUser.user_metadata?.full_name || authUser.email.split('@')[0] || 'Usuario Administrador',
    email: authUser.email,
    rol: 'administrador',
    role: 'administrador',
    company_id: defaultCompany.id,
    empresa: defaultCompany.nombre,
    company: defaultCompany
  };
}

async function signIn({ email, password }) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return {
      success: false,
      message: 'Supabase no está configurado en las variables de entorno.'
    };
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      let friendlyMessage = error.message;
      if (error.message.toLowerCase().includes('invalid login credentials')) {
        friendlyMessage = 'Credenciales incorrectas. Verificá tu correo y contraseña.';
      } else if (error.message.toLowerCase().includes('email not confirmed')) {
        friendlyMessage = 'El correo electrónico aún no ha sido confirmado en Supabase.';
      }
      return { success: false, message: friendlyMessage };
    }

    const authUser = data.user;
    const session = data.session;
    const profile = await fetchUserProfile(supabase, authUser);

    writeStoredSession({
      session,
      user: authUser,
      profile,
      updatedAt: new Date().toISOString()
    });

    return {
      success: true,
      user: authUser,
      profile,
      session
    };
  } catch (err) {
    console.error('[AuthService] Error en signIn:', err);
    return {
      success: false,
      message: err.message || 'Error de red al conectar con Supabase Auth.'
    };
  }
}

async function signOut() {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('[AuthService] Error en Supabase signOut:', err.message);
    }
  }
  clearStoredSession();
  return { success: true };
}

async function getSession() {
  const supabase = getSupabaseClient();
  if (!supabase) {
    clearStoredSession();
    return {
      session: null,
      user: null,
      profile: null,
      error: 'Supabase Auth no está configurado en las variables de entorno.'
    };
  }

  const stored = readStoredSession();
  if (!stored || !stored.session || !stored.session.access_token) {
    return { session: null, user: null, profile: null };
  }

  try {
    const { data, error } = await supabase.auth.getUser(stored.session.access_token);
    if (error || !data || !data.user) {
      console.warn('[AuthService] Token de sesión expirado o inválido:', error?.message);
      clearStoredSession();
      return {
        session: null,
        user: null,
        profile: null,
        error: 'Sesión expirada o inválida. Por favor, iniciá sesión nuevamente.'
      };
    }

    const currentProfile = await fetchUserProfile(supabase, data.user);
    writeStoredSession({
      session: stored.session,
      user: data.user,
      profile: currentProfile,
      updatedAt: new Date().toISOString()
    });

    return {
      session: stored.session,
      user: data.user,
      profile: currentProfile
    };
  } catch (err) {
    console.error('[AuthService] Error al verificar sesión con Supabase online:', err.message);
    clearStoredSession();
    return {
      session: null,
      user: null,
      profile: null,
      error: 'Error de conexión con el servidor de autenticación Supabase.'
    };
  }
}

async function updateProfile({ nombre, cargo, avatarBase64, avatarFileName }) {
  const supabase = getSupabaseClient();
  const stored = readStoredSession();
  if (!stored || !stored.user || !stored.user.id) {
    return { success: false, message: 'No hay una sesión activa de usuario.' };
  }

  const userId = stored.user.id;
  let avatarUrl = stored.profile?.avatar_url || null;

  if (supabase) {
    try {
      // 1. Si se adjunta una nueva foto de perfil en base64
      if (avatarBase64) {
        try {
          const base64Data = avatarBase64.replace(/^data:image\/\w+;base64,/, '');
          const buffer = Buffer.from(base64Data, 'base64');
          const fileExt = (avatarFileName && avatarFileName.split('.').pop().toLowerCase()) || 'png';
          const filePath = `${userId}/avatar.${fileExt}`;

          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(filePath, buffer, {
              contentType: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`,
              upsert: true
            });

          if (!uploadError) {
            const { data: publicUrlData } = supabase.storage
              .from('avatars')
              .getPublicUrl(filePath);
            if (publicUrlData && publicUrlData.publicUrl) {
              avatarUrl = publicUrlData.publicUrl;
            }
          } else {
            console.warn('[AuthService] Error subiendo imagen a Storage bucket "avatars", usando Data URL:', uploadError.message);
            avatarUrl = avatarBase64;
          }
        } catch (storageErr) {
          console.warn('[AuthService] Error procesando imagen en Storage, usando Data URL:', storageErr.message);
          avatarUrl = avatarBase64;
        }
      }

      // 2. Actualizar registro en la tabla company_users de Supabase
      const updateData = {
        id: userId,
        nombre: nombre,
        cargo: cargo,
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString()
      };

      const { error: dbError } = await supabase
        .from('company_users')
        .upsert(updateData, { onConflict: 'id' });

      if (dbError) {
        console.warn('[AuthService] Error guardando perfil en la base de datos Supabase:', dbError.message);
      }
    } catch (err) {
      console.warn('[AuthService] Excepción al actualizar perfil en Supabase:', err.message);
      if (avatarBase64) avatarUrl = avatarBase64;
    }
  } else if (avatarBase64) {
    avatarUrl = avatarBase64;
  }

  // 3. Actualizar la sesión guardada localmente
  const updatedProfile = {
    ...stored.profile,
    nombre: nombre || stored.profile?.nombre || 'Usuario',
    cargo: cargo || stored.profile?.cargo || 'Master Admin',
    avatar_url: avatarUrl
  };

  writeStoredSession({
    ...stored,
    profile: updatedProfile,
    updatedAt: new Date().toISOString()
  });

  return {
    success: true,
    profile: updatedProfile,
    message: 'Perfil de usuario actualizado correctamente.'
  };
}

let currentPresenceChannel = null;
let activePresenceCallback = null;

async function getCompanyUsers() {
  const supabase = getSupabaseClient();
  const stored = readStoredSession();
  const currentUserId = stored?.user?.id;
  const companyId = stored?.profile?.company_id || 'default-company';

  if (!supabase) {
    if (stored?.profile) {
      return {
        success: true,
        users: [{
          id: currentUserId || 'local-user',
          nombre: stored.profile.nombre || 'Usuario',
          cargo: stored.profile.cargo || 'Master Admin',
          avatar_url: stored.profile.avatar_url || null,
          company_id: companyId,
          isCurrent: true
        }]
      };
    }
    return { success: false, users: [] };
  }

  try {
    let query = supabase.from('company_users').select('*');
    if (companyId && companyId !== 'default-company') {
      query = query.eq('company_id', companyId);
    }

    const { data: profiles, error } = await query;

    if (error || !profiles || profiles.length === 0) {
      const { data: fallbackProfiles } = await supabase.from('company_users').select('*');
      const list = (fallbackProfiles && fallbackProfiles.length > 0) ? fallbackProfiles : [];
      
      const formatted = list.map(p => ({
        id: p.id,
        nombre: p.nombre || p.name || 'Usuario',
        cargo: p.cargo || p.role || p.rol || 'Miembro',
        avatar_url: p.avatar_url || null,
        company_id: p.company_id || companyId,
        isCurrent: p.id === currentUserId
      }));

      if (currentUserId && !formatted.some(u => u.id === currentUserId) && stored?.profile) {
        formatted.unshift({
          id: currentUserId,
          nombre: stored.profile.nombre || 'Usuario',
          cargo: stored.profile.cargo || 'Master Admin',
          avatar_url: stored.profile.avatar_url || null,
          company_id: companyId,
          isCurrent: true
        });
      }

      return { success: true, users: formatted };
    }

    const formattedUsers = profiles.map(p => ({
      id: p.id,
      nombre: p.nombre || p.name || 'Usuario',
      cargo: p.cargo || p.role || p.rol || 'Miembro',
      avatar_url: p.avatar_url || null,
      company_id: p.company_id || companyId,
      isCurrent: p.id === currentUserId
    }));

    if (currentUserId) {
      const existing = formattedUsers.find(u => u.id === currentUserId);
      if (existing) {
        existing.isCurrent = true;
        if (stored?.profile) {
          if (stored.profile.nombre) existing.nombre = stored.profile.nombre;
          if (stored.profile.cargo) existing.cargo = stored.profile.cargo;
          if (stored.profile.avatar_url) existing.avatar_url = stored.profile.avatar_url;
        }
      } else if (stored?.profile) {
        formattedUsers.unshift({
          id: currentUserId,
          nombre: stored.profile.nombre || 'Usuario',
          cargo: stored.profile.cargo || 'Master Admin',
          avatar_url: stored.profile.avatar_url || null,
          company_id: companyId,
          isCurrent: true
        });
      }
    }

    console.log('--- [AUTH SERVICE DIAGNOSTIC LOG] ---');
    console.log('profiles.length:', profiles ? profiles.length : 0);
    console.log('formattedUsers.length:', formattedUsers.length);
    console.log('formattedUsers:', formattedUsers);
    console.log('------------------------------------');

    return { success: true, users: formattedUsers };
  } catch (err) {
    console.warn('[AuthService] Error obteniendo usuarios de la empresa:', err.message);
    if (stored?.profile) {
      return {
        success: true,
        users: [{
          id: currentUserId || 'local-user',
          nombre: stored.profile.nombre || 'Usuario',
          cargo: stored.profile.cargo || 'Master Admin',
          avatar_url: stored.profile.avatar_url || null,
          company_id: companyId,
          isCurrent: true
        }]
      };
    }
    return { success: false, users: [] };
  }
}

function startPresenceTracking(onPresenceChange) {
  const supabase = getSupabaseClient();
  const stored = readStoredSession();
  if (!supabase || !stored || !stored.user || !stored.user.id) return;

  const userId = stored.user.id;
  const companyId = stored.profile?.company_id || 'default-company';
  activePresenceCallback = onPresenceChange;

  if (currentPresenceChannel) {
    try {
      currentPresenceChannel.unsubscribe();
    } catch (e) {}
  }

  try {
    const channelName = `company-presence-${companyId}`;
    currentPresenceChannel = supabase.channel(channelName, {
      config: { presence: { key: userId } }
    });

    const notifyPresenceState = () => {
      if (!currentPresenceChannel || !activePresenceCallback) return;
      const state = currentPresenceChannel.presenceState();

      console.log('================ [ELECTRON PRESENCE LOG] ================');
      console.log('user_id:', userId);
      console.log('company_id:', companyId);
      console.log('channel:', channelName);
      console.log('subscribe: SUBSCRIBED');
      console.log('track: ok');
      console.log('presenceState:', state);
      console.log('Object.keys(channel.presenceState()).length:', Object.keys(state).length);
      console.log('========================================================');

      activePresenceCallback(Object.keys(state));
    };

    currentPresenceChannel
      .on('presence', { event: 'sync' }, notifyPresenceState)
      .on('presence', { event: 'join' }, notifyPresenceState)
      .on('presence', { event: 'leave' }, notifyPresenceState)
      .subscribe(async (status) => {
        console.log(`[ELECTRON PRESENCE] Estado de la suscripción al canal "${channelName}":`, status);
        if (status === 'SUBSCRIBED') {
          const trackRes = await currentPresenceChannel.track({
            user_id: userId,
            online_at: new Date().toISOString()
          });
          console.log('[ELECTRON PRESENCE] Resultado de track():', trackRes);
          notifyPresenceState();
        }
      });
  } catch (err) {
    console.warn('[AuthService] Error iniciando tracking de presencia:', err.message);
  }
}

function stopPresenceTracking() {
  if (currentPresenceChannel) {
    try {
      currentPresenceChannel.untrack();
      currentPresenceChannel.unsubscribe();
    } catch (err) {}
    currentPresenceChannel = null;
  }
  activePresenceCallback = null;
}

module.exports = {
  signIn,
  signOut,
  getSession,
  readStoredSession,
  updateProfile,
  getCompanyUsers,
  startPresenceTracking,
  stopPresenceTracking
};
