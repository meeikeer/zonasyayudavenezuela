import { escucharCentros, crearCentro, actualizarCentro, eliminarCentro, inicializarAlmacenamiento } from './crud.js';
import { initMap, renderCentros, ajustarBounds, centrarMapa, getMap, buscarDireccion, onMarkerClick, onMapClick } from './maps.js';

const ESTADOS_VENEZUELA = [
  'Amazonas', 'Anzoátegui', 'Apure', 'Aragua', 'Barinas',
  'Bolívar', 'Carabobo', 'Cojedes', 'Delta Amacuro',
  'Distrito Capital', 'Falcón', 'Guárico', 'Lara', 'Mérida',
  'Miranda', 'Monagas', 'Nueva Esparta', 'Portuguesa', 'Sucre',
  'Táchira', 'Trujillo', 'La Guaira', 'Yaracuy', 'Zulia'
];

let cancelarEscucha = null;
let editandoId = null;
let insumos = [];
let centrosActuales = {};

function toast(msg, tipo = 'success') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = `toast ${tipo} show`;
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.remove('show'), 3000);
}

function cargando(mostrar) {
  const el = document.getElementById('loading-indicator');
  if (el) el.style.opacity = mostrar ? '1' : '0';
}

function renderInsumos() {
  const container = document.getElementById('insumos-container');
  container.innerHTML = '';
  insumos.forEach((item, idx) => {
    const tag = document.createElement('span');
    tag.className = `insumo-tag ${item.conseguido ? 'conseguido' : ''}`;
    tag.innerHTML = `
      <span>${item.conseguido ? '✅' : '⬜'}</span>
      <span>${item.nombre}</span>
      <span class="remove" data-index="${idx}">&times;</span>`;
    tag.addEventListener('click', (e) => {
      if (e.target.classList.contains('remove')) return;
      item.conseguido = !item.conseguido;
      renderInsumos();
    });
    tag.querySelector('.remove').addEventListener('click', (e) => {
      e.stopPropagation();
      insumos.splice(idx, 1);
      renderInsumos();
    });
    container.appendChild(tag);
  });
}

window.agregarInsumo = function () {
  const input = document.getElementById('form-nuevo-insumo');
  const val = input.value.trim();
  if (!val) return;
  const normalizado = val.charAt(0).toUpperCase() + val.slice(1).toLowerCase();
  if (insumos.some(i => i.nombre.toLowerCase() === normalizado.toLowerCase())) {
    toast('Ese insumo ya fue agregado', 'error');
    return;
  }
  insumos.push({ nombre: normalizado, conseguido: false });
  input.value = '';
  renderInsumos();
  input.focus();
};

function abrirModal(mode, data = null) {
  const overlay = document.getElementById('modal-overlay');
  const title = document.getElementById('modal-title');
  const submitBtn = document.getElementById('btn-submit');
  const deleteBtn = document.getElementById('btn-eliminar');

  document.getElementById('centro-form').reset();
  document.getElementById('form-estado').value = document.getElementById('estado-select').value;

  if (mode === 'create') {
    title.textContent = 'Nuevo Centro';
    submitBtn.textContent = 'Guardar';
    deleteBtn.classList.add('hidden');
    editandoId = null;
    insumos = [];
    if (data) {
      document.getElementById('form-lat').value = data.lat;
      document.getElementById('form-lng').value = data.lng;
    }
  } else {
    title.textContent = 'Editar Centro';
    submitBtn.textContent = 'Actualizar';
    deleteBtn.classList.remove('hidden');
    editandoId = data.id;
    insumos = (data.insumos || []).map(n => ({ nombre: n, conseguido: false }));
    (data.conseguidos || []).forEach(c => {
      const item = insumos.find(i => i.nombre === c);
      if (item) item.conseguido = true;
    });
    document.getElementById('form-nombre').value = data.nombre || '';
    document.getElementById('form-direccion').value = data.direccion || '';
    document.getElementById('form-categoria').value = data.categoria || 'Acopio';
    document.getElementById('form-lat').value = data.lat || '';
    document.getElementById('form-lng').value = data.lng || '';
  }

  renderInsumos();
  overlay.style.display = 'flex';
  requestAnimationFrame(() => document.getElementById('form-nombre').focus());
}

window.cerrarModal = function () {
  document.getElementById('modal-overlay').style.display = 'none';
  editandoId = null;
};

document.addEventListener('keydown', (e) => { if (e.key === 'Escape') window.cerrarModal(); });
document.getElementById('modal-overlay').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) window.cerrarModal();
});
document.getElementById('modal-close').addEventListener('click', window.cerrarModal);

function abrirDetalle(id, centro) {
  const overlay = document.getElementById('modal-detalle-overlay');
  document.getElementById('detalle-titulo').textContent = centro.nombre;

  const badgeClass = centro.categoria === 'Acopio' ? 'badge-acopio' :
                     centro.categoria === 'Refugio' ? 'badge-refugio' : 'badge-desastre';

  const insumosHtml = (centro.insumos || []).map(i => {
    const conseguido = (centro.conseguidos || []).includes(i);
    return `<span class="insumo-tag ${conseguido ? 'conseguido' : ''}" style="cursor:default">
      ${conseguido ? '✅' : '⬜'} ${i}
    </span>`;
  }).join(' ') || '<span class="text-gray-400">Sin insumos registrados</span>';

  document.getElementById('detalle-contenido').innerHTML = `
    <div class="flex items-center gap-2">
      <span class="${badgeClass}" style="padding:2px 14px;border-radius:999px;font-size:13px;font-weight:600">${centro.categoria}</span>
    </div>

    ${centro.direccion ? `
    <div>
      <label class="block text-xs font-medium text-gray-500 mb-1">Dirección</label>
      <p class="text-sm text-gray-700">${centro.direccion}</p>
    </div>` : ''}

    <div>
      <label class="block text-xs font-medium text-gray-500 mb-1">Coordenadas</label>
      <p class="text-sm text-gray-500 font-mono">${centro.lat.toFixed(6)}, ${centro.lng.toFixed(6)}</p>
    </div>

    <div>
      <label class="block text-xs font-medium text-gray-500 mb-2">Insumos</label>
      <div class="flex flex-wrap gap-2">${insumosHtml}</div>
    </div>

    <div class="pt-3 flex flex-col gap-2">
      <a href="https://www.google.com/maps/search/?api=1&query=${centro.lat},${centro.lng}"
         target="_blank" rel="noopener"
         class="block w-full text-center px-4 py-2.5 bg-black text-white rounded text-sm font-medium">
        🗺️ Cómo llegar con Google Maps
      </a>
      <button onclick="document.getElementById('modal-detalle-overlay').style.display='none'"
              class="w-full px-4 py-2 border border-gray-400 rounded text-sm font-medium">
        Cerrar
      </button>
    </div>
  `;

  overlay.style.display = 'flex';
}

document.getElementById('detalle-cerrar').addEventListener('click', () => {
  document.getElementById('modal-detalle-overlay').style.display = 'none';
});
document.getElementById('modal-detalle-overlay').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) {
    document.getElementById('modal-detalle-overlay').style.display = 'none';
  }
});

document.getElementById('centro-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const estado = document.getElementById('estado-select').value;
  const nombre = document.getElementById('form-nombre').value.trim();
  const direccion = document.getElementById('form-direccion').value.trim();
  const categoria = document.getElementById('form-categoria').value;
  const lat = parseFloat(document.getElementById('form-lat').value);
  const lng = parseFloat(document.getElementById('form-lng').value);

  if (!nombre) { toast('El nombre es obligatorio', 'error'); return; }
  if (isNaN(lat) || isNaN(lng)) { toast('Haz clic en el mapa para seleccionar ubicación', 'error'); return; }

  const nombresInsumos = insumos.map(i => i.nombre);
  const conseguidos = insumos.filter(i => i.conseguido).map(i => i.nombre);
  const centroData = { nombre, direccion, lat, lng, categoria, insumos: nombresInsumos, conseguidos };

  try {
    if (editandoId) {
      await actualizarCentro(estado, editandoId, centroData);
    } else {
      await crearCentro(estado, centroData);
    }
    document.getElementById('modal-overlay').style.display = 'none';
    document.getElementById('centro-form').reset();
    insumos = [];
    alert('Centro guardado con éxito');
  } catch (err) {
    console.error(err);
    toast('Error al guardar: ' + err.message, 'error');
  }
});

document.getElementById('btn-eliminar').addEventListener('click', async () => {
  if (!editandoId) return;
  if (!confirm('¿Eliminar este centro definitivamente?')) return;

  const estado = document.getElementById('estado-select').value;
  try {
    await eliminarCentro(estado, editandoId);
    toast('Centro eliminado ✓');
    window.cerrarModal();
  } catch (err) {
    toast('Error al eliminar: ' + err.message, 'error');
  }
});

function poblarEstados() {
  const sel = document.getElementById('estado-select');
  sel.innerHTML = '<option value="">— Selecciona un estado —</option>';
  ESTADOS_VENEZUELA.forEach(e => {
    const opt = document.createElement('option');
    opt.value = e;
    opt.dataset.base = e;
    opt.textContent = e;
    sel.appendChild(opt);
  });
}

document.getElementById('estado-select').addEventListener('change', function () {
  const estado = this.value;
  Array.from(this.options).forEach(opt => {
    if (opt.value) {
      const base = opt.dataset.base || opt.value;
      opt.dataset.base = base;
      opt.textContent = base;
    }
  });
  seleccionarEstado(estado);
});

function seleccionarEstado(estado) {
  if (cancelarEscucha) { cancelarEscucha(); cancelarEscucha = null; }
  centrosActuales = {};
  if (!estado) { renderCentros({}); renderPanel({}); cargando(false); return; }

  document.getElementById('lista-titulo').textContent = `Centros — ${estado}`;

  cargando(true);
  cancelarEscucha = escucharCentros(estado, (data) => {
    centrosActuales = data;
    const total = renderCentros(data);
    renderPanel(data);
    cargando(false);

    const sel = document.getElementById('estado-select');
    Array.from(sel.options).forEach(opt => {
      if (opt.value === estado) {
        opt.textContent = `${opt.dataset.base} (${total})`;
      }
    });

    if (total > 0) ajustarBounds(data);
  });
}

function renderPanel(data) {
  const lista = document.getElementById('lista-body');
  lista.innerHTML = '';
  const entries = Object.entries(data);
  if (entries.length === 0) {
    lista.innerHTML = '<div class="text-gray-400 text-sm text-center py-8">Sin centros registrados</div>';
    return;
  }
  entries.forEach(([id, centro]) => {
    const badgeClass = centro.categoria === 'Acopio' ? 'badge-acopio' :
                       centro.categoria === 'Refugio' ? 'badge-refugio' : 'badge-desastre';
    const item = document.createElement('div');
    item.className = 'lista-item';
    item.innerHTML = `
      <div class="lista-item-info">
        <div class="lista-item-nombre">${centro.nombre}</div>
        <span class="${badgeClass}" style="display:inline-block;padding:1px 10px;border-radius:999px;font-size:11px;font-weight:600">${centro.categoria}</span>
      </div>
      <span class="lista-item-flecha">›</span>
    `;
    item.addEventListener('click', () => {
      centrarMapa(centro.lat, centro.lng, 15);
      abrirDetalle(id, centro);
    });
    lista.appendChild(item);
  });
}

document.getElementById('btn-buscar').addEventListener('click', async () => {
  const input = document.getElementById('input-buscar');
  const query = input.value.trim();
  if (!query) return;

  const btn = document.getElementById('btn-buscar');
  btn.textContent = '...';
  btn.disabled = true;

  try {
    const result = await buscarDireccion(query);
    if (result) {
      centrarMapa(result.lat, result.lng, 15);
      L.circleMarker([result.lat, result.lng], {
        radius: 6, fillColor: '#f59e0b', fillOpacity: 0.9,
        color: '#fff', weight: 2
      }).addTo(getMap()).bindTooltip(result.displayName.split(',')[0], { direction: 'top' }).openTooltip();
      toast('Ubicación encontrada ✓');
    } else {
      toast('No se encontró la dirección en Venezuela', 'error');
    }
  } catch (err) {
    toast('Error al buscar dirección', 'error');
  }

  btn.textContent = 'Buscar';
  btn.disabled = false;
});

document.getElementById('input-buscar').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('btn-buscar').click();
});

onMarkerClick((id, centro) => abrirModal('edit', { id, ...centro }));

onMapClick((coords) => {
  if (document.getElementById('modal-overlay').style.display === 'flex') return;
  const estado = document.getElementById('estado-select').value;
  if (!estado) { toast('Selecciona un estado primero', 'error'); return; }
  abrirModal('create', coords);
});

document.getElementById('btn-mi-ubicacion').addEventListener('click', () => {
  if (!navigator.geolocation) { toast('Geolocalización no soportada', 'error'); return; }
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude, longitude } = pos.coords;
      centrarMapa(latitude, longitude, 15);
      L.circleMarker([latitude, longitude], {
        radius: 8,
        fillColor: '#2563eb',
        fillOpacity: 0.7,
        color: '#fff',
        weight: 2
      }).addTo(getMap());
    },
    () => toast('No se pudo obtener tu ubicación', 'error'),
    { enableHighAccuracy: true, timeout: 10000 }
  );
});

function init() {
  try {
    poblarEstados();

    const params = new URLSearchParams(window.location.search);
    const estadoParam = params.get('estado');
    if (estadoParam && ESTADOS_VENEZUELA.includes(estadoParam)) {
      document.getElementById('estado-select').value = estadoParam;
    }

    initMap('map');

    const estadoInicial = document.getElementById('estado-select').value;
    inicializarAlmacenamiento().then(() => {
      if (estadoInicial) seleccionarEstado(estadoInicial);
    });
  } catch (e) {
    console.error('Error en init():', e);
  }
}

init();
