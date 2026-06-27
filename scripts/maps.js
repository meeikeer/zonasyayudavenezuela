let map = null;
const markers = {};
const pendingMarkers = [];
let onMarkerClickCb = null;
let onMapClickCb = null;

export function onMarkerClick(cb) { onMarkerClickCb = cb; }
export function onMapClick(cb) { onMapClickCb = cb; }

const limitesVenezuela = [
  [0.5, -73.5],
  [12.5, -59.5]
];

export function initMap(containerId) {
  map = L.map(containerId, {
    center: [10.4806, -66.9036],
    zoom: 7,
    minZoom: 6,
    maxBounds: limitesVenezuela,
    maxBoundsViscosity: 1.0,
    zoomControl: true,
    attributionControl: true
  });

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19
  }).addTo(map);

  map.on('click', (e) => {
    if (onMapClickCb) {
      onMapClickCb({
        lat: e.latlng.lat.toFixed(6),
        lng: e.latlng.lng.toFixed(6)
      });
    }
  });

  procesarPendientes();
  return map;
}

export async function buscarDireccion(query) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&countrycodes=ve`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'MapaSolidario/1.0' }
  });
  const data = await res.json();
  if (!data || data.length === 0) return null;
  return {
    lat: parseFloat(data[0].lat),
    lng: parseFloat(data[0].lon),
    displayName: data[0].display_name
  };
}

export function renderCentros(centros) {
  Object.values(markers).forEach(m => map.removeLayer(m));
  Object.keys(markers).forEach(k => delete markers[k]);

  if (!map) {
    Object.entries(centros).forEach(([id, centro]) => pendingMarkers.push({ id, centro }));
    return Object.keys(centros).length;
  }

  Object.entries(centros).forEach(([id, centro]) => {
    markers[id] = crearMarcador(id, centro);
  });

  return Object.keys(centros).length;
}

function procesarPendientes() {
  while (pendingMarkers.length > 0) {
    const { id, centro } = pendingMarkers.shift();
    if (!markers[id]) {
      markers[id] = crearMarcador(id, centro);
    }
  }
}

function crearMarcador(id, centro) {
  const marker = L.marker([centro.lat, centro.lng], {
    icon: icono(centro.categoria),
    title: centro.nombre
  }).addTo(map);

  const insumosStr = (centro.insumos || []).map(i =>
    (centro.conseguidos || []).includes(i) ? `<s>${i}</s>` : i
  ).join(', ') || 'Sin insumos';

  marker.bindTooltip(
    `<strong style="font-size:14px">${centro.nombre}</strong><br>
     <span style="font-size:12px">${centro.categoria}</span><br>
     <span style="color:#666;font-size:11px">${insumosStr}</span>`,
    { direction: 'top', offset: [0, -10] }
  );

  marker.on('click', () => {
    if (onMarkerClickCb) onMarkerClickCb(id, centro);
  });

  return marker;
}

function icono(categoria) {
  const emoji = categoria === 'Acopio' ? '📦' :
                categoria === 'Refugio' ? '🏠' : '⚠️';
  const color = categoria === 'Acopio' ? '#2563eb' :
                categoria === 'Refugio' ? '#16a34a' : '#dc2626';

  return L.divIcon({
    className: 'marcador-personalizado',
    html: `<div style="
      width:36px;height:36px;
      background:white;
      border:2px solid ${color};
      border-radius:50%;
      display:flex;align-items:center;justify-content:center;
      font-size:18px;
      cursor:pointer;
    ">${emoji}</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    tooltipAnchor: [0, -36]
  });
}

export function ajustarBounds(centros) {
  if (!map) return;
  const bounds = L.latLngBounds();
  Object.values(centros).forEach(c => bounds.extend([c.lat, c.lng]));
  if (!bounds.isValid()) return;
  map.fitBounds(bounds, { padding: [60, 60], maxZoom: 13 });
}

export function centrarMapa(lat, lng, zoom = 7) {
  if (!map) return;
  map.setView([lat, lng], zoom);
}

export function getMap() { return map; }
