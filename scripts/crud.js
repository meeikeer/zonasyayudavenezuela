import { getFirebaseOps } from './firebase-config.js';

const DEMO_KEY = 'mapa_solidario';

function getDemoStore() {
  try { return JSON.parse(localStorage.getItem(DEMO_KEY) || '{}'); }
  catch { return {}; }
}

function setDemoStore(store) {
  localStorage.setItem(DEMO_KEY, JSON.stringify(store));
}

function dispatchDemoChange(estado) {
  window.dispatchEvent(new CustomEvent('demo-change', { detail: { estado } }));
}

export async function crearCentro(estado, data) {
  const ops = getFirebaseOps();
  if (ops) {
    const result = await ops.push(ops.ref(`${estado}/centros`), data);
    return result.key;
  }

  const id = Date.now().toString(36) + Math.random().toString(36).substring(2, 11);
  const store = getDemoStore();
  if (!store[estado]) store[estado] = {};
  store[estado][id] = data;
  setDemoStore(store);
  dispatchDemoChange(estado);
  return id;
}

export async function actualizarCentro(estado, id, data) {
  const ops = getFirebaseOps();
  if (ops) {
    await ops.set(ops.ref(`${estado}/centros/${id}`), data);
    return;
  }

  const store = getDemoStore();
  if (!store[estado]) store[estado] = {};
  store[estado][id] = data;
  setDemoStore(store);
  dispatchDemoChange(estado);
}

export async function eliminarCentro(estado, id) {
  const ops = getFirebaseOps();
  if (ops) {
    await ops.remove(ops.ref(`${estado}/centros/${id}`));
    return;
  }

  const store = getDemoStore();
  if (store[estado]?.[id]) {
    delete store[estado][id];
    setDemoStore(store);
    dispatchDemoChange(estado);
  }
}

export function escucharCentros(estado, onData) {
  const ops = getFirebaseOps();
  if (ops) {
    const centrosRef = ops.ref(`${estado}/centros`);
    const unsub = ops.onValue(
      centrosRef,
      (snap) => onData(snap.val() || {}),
      (err) => {
        console.warn('Firebase error, cambiando a demo:', err);
        unsub();
        iniciarDemo(estado, onData);
      }
    );
    return unsub;
  }

  return iniciarDemo(estado, onData);
}

function iniciarDemo(estado, onData) {
  const cargar = () => {
    const store = getDemoStore();
    onData(store[estado] || {});
  };
  cargar();
  const interval = setInterval(cargar, 2000);
  const onCambio = (e) => {
    if (e.detail.estado === estado) cargar();
  };
  window.addEventListener('demo-change', onCambio);
  return () => {
    clearInterval(interval);
    window.removeEventListener('demo-change', onCambio);
  };
}
