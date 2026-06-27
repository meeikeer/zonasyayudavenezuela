const JSONBLOB_CREATE = 'https://jsonblob.com/api/jsonBlob';
const STORAGE_KEY = 'mapa_solidario';
const BLOB_KEY = 'mapa_solidario_blob_url';

// ─── PON AQUÍ TU URL JSON PÚBLICA ─────────────────────────────────
// Si tienes un JSON alojado (JSONBlob, MyJson, etc.), pega la URL.
// Si la dejas vacía, la app crea automáticamente un blob en JSONBlob
// (https://jsonblob.com) — sin registro, sin API key, sin tarjeta.
const API_URL = '';

let blobUrl = API_URL || localStorage.getItem(BLOB_KEY) || null;

function dispatchChange(estado) {
  window.dispatchEvent(new CustomEvent('storage-change', { detail: { estado } }));
}

export async function inicializarAlmacenamiento() {
  if (blobUrl) return true;
  try {
    const res = await fetch(JSONBLOB_CREATE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}'
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    blobUrl = res.url;
    localStorage.setItem(BLOB_KEY, blobUrl);
    console.log('☁️ Almacenamiento cloud creado:', blobUrl);
    return true;
  } catch (e) {
    console.warn('⚠️ Sin acceso cloud — usando solo localStorage');
    return false;
  }
}

async function leerTodo() {
  if (blobUrl) {
    try {
      const res = await fetch(blobUrl);
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        return data;
      }
    } catch {}
  }
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

async function guardarTodo(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  if (blobUrl) {
    try {
      await fetch(blobUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    } catch {}
  }
}

export async function crearCentro(estado, data) {
  const id = Date.now().toString(36) + Math.random().toString(36).substring(2, 11);
  const all = await leerTodo();
  if (!all[estado]) all[estado] = { centros: {} };
  all[estado].centros[id] = data;
  await guardarTodo(all);
  dispatchChange(estado);
  return id;
}

export async function actualizarCentro(estado, id, data) {
  const all = await leerTodo();
  if (!all[estado]) all[estado] = { centros: {} };
  all[estado].centros[id] = data;
  await guardarTodo(all);
  dispatchChange(estado);
}

export async function eliminarCentro(estado, id) {
  const all = await leerTodo();
  if (all[estado]?.centros?.[id]) {
    delete all[estado].centros[id];
    await guardarTodo(all);
    dispatchChange(estado);
  }
}

export function escucharCentros(estado, onData) {
  let active = true;

  async function leerYNotificar() {
    if (!active) return;
    const all = await leerTodo();
    const estadoData = all[estado];
    const centros = estadoData?.centros || estadoData || {};
    onData(centros);
  }

  leerYNotificar();

  const interval = setInterval(leerYNotificar, 5000);

  const onChange = (e) => {
    if (e.detail.estado === estado) leerYNotificar();
  };
  window.addEventListener('storage-change', onChange);

  const onStorage = (e) => {
    if (e.key === STORAGE_KEY) leerYNotificar();
  };
  window.addEventListener('storage', onStorage);

  return () => {
    active = false;
    clearInterval(interval);
    window.removeEventListener('storage-change', onChange);
    window.removeEventListener('storage', onStorage);
  };
}
