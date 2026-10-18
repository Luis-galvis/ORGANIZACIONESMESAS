// cloud.js - Multi-tier Cloud Persistence & Mobile Link Sharing for Fernando & Luisa Mesas

const STORAGE_KEY = 'boda_fernando_luisa_mesas_v3';

/**
 * Saves seating layout to local storage, Cloud API, and creates a shareable link
 */
export async function saveSeatingState(tables) {
  const payload = {
    tables,
    updatedAt: new Date().toISOString()
  };

  // 1. Local Persistence (100% offline & instant)
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (e) {
    console.warn('LocalStorage save error:', e);
  }

  // 2. Cloud API Endpoint (for Vercel / serverless / Node backend)
  let cloudSaved = false;
  try {
    const res = await fetch('/api/seating', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      cloudSaved = true;
    }
  } catch (e) {
    // Backend API might not be running in pure static mode, which is fine
  }

  return { cloudSaved, timestamp: payload.updatedAt };
}

/**
 * Loads seating layout checking:
 * 1. URL Hash (shared link via WhatsApp/Mobile)
 * 2. Cloud API endpoint (/api/seating)
 * 3. LocalStorage
 */
export async function loadSeatingState() {
  // Check URL Hash first (if someone opened a shared link)
  try {
    const hash = window.location.hash;
    if (hash && hash.startsWith('#layout=')) {
      const encoded = hash.slice(8);
      const jsonStr = decodeURIComponent(atob(encoded));
      const parsed = JSON.parse(jsonStr);
      if (Array.isArray(parsed.tables)) {
        console.log('Loaded seating from shared URL link');
        return parsed.tables;
      }
    }
  } catch (e) {
    console.warn('Could not parse layout from URL hash:', e);
  }

  // Check Cloud API endpoint
  try {
    const res = await fetch('/api/seating');
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.tables) && data.tables.length > 0) {
        console.log('Loaded seating from Cloud API');
        return data.tables;
      }
    }
  } catch (e) {
    // API not available, proceed to local storage
  }

  // Fallback to LocalStorage
  try {
    const local = localStorage.getItem(STORAGE_KEY);
    if (local) {
      const parsed = JSON.parse(local);
      if (Array.isArray(parsed.tables) && parsed.tables.length > 0) {
        return parsed.tables;
      }
    }
  } catch (e) {
    console.warn('Error reading LocalStorage:', e);
  }

  return null;
}

/**
 * Generates an instant shareable link containing the compressed state
 * Perfect for sending via WhatsApp or opening on phone!
 */
export function generateShareableLink(tables) {
  try {
    // Keep minimal payload for URL length
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
