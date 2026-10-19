// cloud.js - Supabase Realtime Cloud Persistence & Mobile Link Sharing for Fernando & Luisa Mesas
import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = 'https://tapusiqdotxhtnyxavta.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_6YvmpwE3e3aF8D1FoFRMrQ_Zr4y28m5';
export const BODA_RECORD_ID = 'boda_fernando_luisa';

const STORAGE_KEY = 'boda_fernando_luisa_mesas_v3';

// Initialize Supabase Client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
  realtime: { params: { eventsPerSecond: 10 } }
});

// Event listener for cloud status changes
let onStatusChangeCallback = null;
export function setCloudStatusListener(cb) {
  onStatusChangeCallback = cb;
}

function notifyStatus(status, details = '') {
  if (typeof onStatusChangeCallback === 'function') {
    onStatusChangeCallback(status, details);
  }
}

/**
 * Saves seating layout to LocalStorage and Supabase Database
 */
export async function saveSeatingState(tables) {
  const payload = {
    tables,
    updatedAt: new Date().toISOString()
  };

  // 1. Local Persistence (instant backup)
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (e) {
    console.warn('LocalStorage save error:', e);
  }

  // 2. Supabase Cloud DB Persistence (Synchronizes across all devices/users)
  let cloudSaved = false;
  let cloudError = null;

  try {
    notifyStatus('saving', 'Guardando en la nube...');
    const { error } = await supabase
      .from('boda_mesas')
      .upsert({
        id: BODA_RECORD_ID,
        tables: tables,
        updated_at: payload.updatedAt
      }, { onConflict: 'id' });

    if (!error) {
      cloudSaved = true;
      notifyStatus('synced', 'Sincronizado con Supabase');
    } else {
      cloudError = error;
      console.warn('Supabase save error (check if table "boda_mesas" exists):', error.message);
      notifyStatus('offline', error.message.includes('not find the table') 
        ? 'Falta crear tabla boda_mesas' 
        : 'Error guardando en nube');
    }
  } catch (e) {
    cloudError = e;
    console.warn('Supabase network error:', e);
    notifyStatus('offline', 'Modo local (sin conexión a BD)');
  }

  return { cloudSaved, error: cloudError, timestamp: payload.updatedAt };
}

/**
 * Loads seating layout checking:
 * 1. URL Hash (shared link via WhatsApp/Mobile override)
 * 2. Supabase Cloud DB (Global sync for all guests)
 * 3. LocalStorage (Offline fallback)
 */
export async function loadSeatingState() {
  // 1. Check URL Hash first (if someone opened a shared link)
  try {
    const hash = window.location.hash;
    if (hash && hash.startsWith('#layout=')) {
      const encoded = hash.slice(8);
      const jsonStr = decodeURIComponent(atob(encoded));
      const parsed = JSON.parse(jsonStr);
      if (Array.isArray(parsed.tables)) {
        console.log('Loaded seating from shared URL link');
        notifyStatus('synced', 'Cargado desde enlace compartido');
        return { tables: parsed.tables, source: 'url' };
      }
    }
  } catch (e) {
    console.warn('Could not parse layout from URL hash:', e);
  }

  // 2. Load from Supabase Cloud DB
  try {
    notifyStatus('connecting', 'Conectando a Supabase...');
    const { data, error } = await supabase
      .from('boda_mesas')
      .select('id, tables, updated_at')
      .eq('id', BODA_RECORD_ID)
      .maybeSingle();

    if (!error && data && Array.isArray(data.tables) && data.tables.length > 0) {
      console.log('✅ Distribución cargada exitosamente desde Supabase DB');
      notifyStatus('synced', 'Conectado a la nube (Supabase)');
      // Cache in LocalStorage
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ tables: data.tables, updatedAt: data.updated_at }));
      } catch (err) { /* ignore */ }
      return { tables: data.tables, source: 'supabase', updatedAt: data.updated_at };
    } else if (error) {
      console.warn('Supabase load note:', error.message);
      if (error.message.includes('not find the table')) {
        notifyStatus('needs_table', 'Crea la tabla en Supabase');
      } else {
        notifyStatus('offline', 'Error cargando BD');
      }
    }
  } catch (e) {
    console.warn('Supabase connection error:', e);
    notifyStatus('offline', 'Sin conexión');
  }

  // 3. Fallback to LocalStorage
  try {
    const local = localStorage.getItem(STORAGE_KEY);
    if (local) {
      const parsed = JSON.parse(local);
      if (Array.isArray(parsed.tables) && parsed.tables.length > 0) {
        notifyStatus('local', 'Cargado de caché local');
        return { tables: parsed.tables, source: 'local' };
      }
    }
  } catch (e) {
    console.warn('Error reading LocalStorage:', e);
  }

  return null;
}

/**
 * Subscribes to Realtime updates on the boda_mesas table
 * so all viewers get instantaneous updates when anyone assigns or modifies a table!
 */
export function subscribeToCloudChanges(onUpdate) {
  try {
    const channel = supabase
      .channel('boda-mesas-realtime-channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'boda_mesas',
          filter: `id=eq.${BODA_RECORD_ID}`
        },
        (payload) => {
          if (payload.new && Array.isArray(payload.new.tables)) {
            console.log('⚡ Cambio en tiempo real detectado en Supabase!');
            notifyStatus('synced', 'Actualizado en tiempo real');
            if (typeof onUpdate === 'function') {
              onUpdate(payload.new.tables, payload.new.updated_at);
            }
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('📡 Supabase Realtime conectado');
        }
      });

    return channel;
  } catch (e) {
    console.warn('Could not initialize Supabase Realtime channel:', e);
    return null;
  }
}

/**
 * Generates an instant shareable link containing the compressed state
 * Perfect for sending via WhatsApp or opening on phone!
 */
export function generateShareableLink(tables) {
  try {
    const minimalTables = tables.map(t => ({
      id: t.id,
      name: t.name,
      capacity: t.capacity,
      isNoviosTable: t.isNoviosTable,
      isPresidencial: t.isPresidencial,
      position: t.position,
      seats: t.seats.map(s => ({
        index: s.index,
        guestId: s.guestId,
        customName: s.customName
      }))
    }));

    const jsonStr = JSON.stringify({ tables: minimalTables });
    const encoded = btoa(encodeURIComponent(jsonStr));
    const baseUrl = window.location.origin + window.location.pathname;
    return `${baseUrl}#layout=${encoded}`;
  } catch (e) {
    console.error('Error generating shareable link:', e);
    return window.location.href;
  }
}
