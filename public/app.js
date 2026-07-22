// ============ Estado global ============
const state = { audios: [], documentos: [], mensajes: [], comisiones: [] };
let editingType = null;
let editingId = null;

// ============ Tabs ============
document.querySelectorAll('.tab').forEach(t => {
  t.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(x => x.classList.remove('active'));
    t.classList.add('active');
    document.getElementById(t.dataset.tab).classList.add('active');
  });
});

// ============ Fetch helpers ============
async function api(method, path, body) {
  const res = await fetch('/api' + path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

// ============ Cargar y renderizar ============
async function loadAll() {
  state.audios = await api('GET', '/audios');
  state.documentos = await api('GET', '/documentos');
  state.mensajes = await api('GET', '/mensajes');
  state.comisiones = await api('GET', '/comisiones');
  renderAudios();
  renderDocumentos();
  renderMensajes();
  renderComisiones('Dayana');
  renderComisiones('Alejandra');
  renderBienvenida('Dayana');
  renderBienvenida('Alejandra');
  tablasComisiones.dayana = await api('GET', '/tabla-comisiones/dayana');
  tablasComisiones.alejandra = await api('GET', '/tabla-comisiones/alejandra');
  renderTablaComisiones('Dayana');
  renderTablaComisiones('Alejandra');
  tablaTarifas = await api('GET', '/tabla-tarifas');
  renderTablaTarifas();
}

// ============ Tabla de tarifas (link único) ============
let tablaTarifas = null;

function driveEmbedUrl(url) {
  if (!url) return '';
  // Google Sheets / Docs / Slides: usa /preview
  let m = url.match(/\/(spreadsheets|document|presentation)\/d\/([\w-]+)/);
  if (m) return `https://docs.google.com/${m[1]}/d/${m[2]}/preview`;
  // Google Drive folder
  m = url.match(/\/drive\/folders\/([\w-]+)/);
  if (m) return `https://drive.google.com/embeddedfolderview?id=${m[1]}#grid`;
  // Google Drive file
  m = url.match(/\/file\/d\/([\w-]+)/);
  if (m) return `https://drive.google.com/file/d/${m[1]}/preview`;
  return url;
}

function abrirTablaTarifas() {
  const actual = tablaTarifas?.url || '';
  const nuevo = prompt('Pega el link de tu tabla en Drive (dejalo vacio para eliminar):', actual);
  if (nuevo === null) return;
  if (nuevo.trim() === '') {
    borrarTablaTarifas();
  } else {
    guardarTablaTarifas(nuevo.trim());
  }
}

async function guardarTablaTarifas(url) {
  const res = await fetch('/api/tabla-tarifas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url })
  });
  if (res.ok) {
    tablaTarifas = await res.json();
    renderTablaTarifas();
    toast('Link guardado');
  } else {
    toast('Error al guardar');
  }
}

async function borrarTablaTarifas() {
  if (!confirm('Eliminar el link de la tabla de tarifas?')) return;
  await fetch('/api/tabla-tarifas', { method: 'DELETE' });
  tablaTarifas = null;
  renderTablaTarifas();
  toast('Eliminada');
}

function renderTablaTarifas() {
  const cont = document.getElementById('tarifas-contenedor');
  const btnAbrir = document.getElementById('btn-abrir-tarifas-drive');
  if (!cont) return;
  if (tablaTarifas && tablaTarifas.url) {
    if (btnAbrir) {
      btnAbrir.style.display = 'inline-flex';
      btnAbrir.onclick = () => window.open(tablaTarifas.url, '_blank');
    }
    const embed = driveEmbedUrl(tablaTarifas.url);
    cont.innerHTML = `
      <div class="tarifas-meta">Actualizada ${new Date(tablaTarifas.uploaded).toLocaleDateString('es-CO', {day:'2-digit',month:'short',year:'numeric'})} · Los cambios en Drive se reflejan al instante</div>
      <div class="tarifas-frame">
        <iframe src="${escapeAttr(embed)}" frameborder="0" allowfullscreen></iframe>
      </div>
    `;
  } else {
    if (btnAbrir) btnAbrir.style.display = 'none';
    cont.innerHTML = `
      <div class="archivo-card empty" onclick="abrirTablaTarifas()" style="cursor:pointer">
        <div class="archivo-icon">📊</div>
        <div class="archivo-info">
          <div class="archivo-nombre">Aun no hay tabla de tarifas</div>
          <div class="archivo-meta">Haz clic aqui para pegar el link de tu tabla en Google Drive.</div>
        </div>
      </div>
    `;
  }
}

function groupBy(arr, key) {
  const g = {};
  arr.forEach(x => { (g[x[key]] = g[x[key]] || []).push(x); });
  return g;
}

function normalize(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}
function matchesSearch(item, query, fields) {
  if (!query) return true;
  const q = normalize(query);
  return fields.some(f => normalize(item[f]).includes(q));
}

function renderAudios() {
  const q = document.getElementById('search-audios')?.value || '';
  const filtered = state.audios.filter(a => matchesSearch(a, q, ['titulo', 'descripcion', 'categoria']));
  const grouped = groupBy(filtered, 'categoria');
  const c = document.getElementById('lista-audios');
  c.innerHTML = '';
  if (filtered.length === 0) {
    c.innerHTML = '<div class="no-results">No hay audios que coincidan con "' + escapeHtml(q) + '"</div>';
    return;
  }
  Object.entries(grouped).forEach(([cat, items]) => {
    const group = document.createElement('div');
    group.className = 'categoria-group';
    group.innerHTML = `<div class="categoria-title">${escapeHtml(cat)}</div><div class="cards"></div>`;
    const cards = group.querySelector('.cards');
    items.forEach(a => {
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `
        <div>
          <div class="card-title">${escapeHtml(a.titulo)}</div>
          <div class="card-meta">${escapeHtml(a.descripcion || '')}${a.duracion ? '  ·  ' + escapeHtml(a.duracion) : ''}</div>
        </div>
        <div class="card-actions">
          ${a.link_carpeta ? `<a class="card-link" href="${escapeAttr(a.link_carpeta)}" target="_blank">Abrir carpeta</a>` : ''}
          <button class="btn-ghost" data-edit>Editar</button>
          <button class="btn-ghost danger" data-del>Eliminar</button>
        </div>
      `;
      card.querySelector('[data-edit]').onclick = () => openModal('audio', a);
      card.querySelector('[data-del]').onclick = () => del('audio', a.id);
      cards.appendChild(card);
    });
    c.appendChild(group);
  });
}

function renderDocumentos() {
  const q = document.getElementById('search-documentos')?.value || '';
  const filtered = state.documentos.filter(d => matchesSearch(d, q, ['titulo', 'nota', 'categoria']));
  const grouped = groupBy(filtered, 'categoria');
  const c = document.getElementById('lista-documentos');
  c.innerHTML = '';
  if (filtered.length === 0) {
    c.innerHTML = '<div class="no-results">No hay documentos que coincidan con "' + escapeHtml(q) + '"</div>';
    return;
  }
  Object.entries(grouped).forEach(([cat, items]) => {
    const group = document.createElement('div');
    group.className = 'categoria-group';
    group.innerHTML = `<div class="categoria-title">${escapeHtml(cat)}</div><div class="cards"></div>`;
    const cards = group.querySelector('.cards');
    items.forEach(d => {
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `
        <div>
          <div class="card-title">${escapeHtml(d.titulo)}</div>
          ${d.nota ? `<div class="card-meta">${escapeHtml(d.nota)}</div>` : ''}
        </div>
        <div class="card-actions">
          ${d.link ? `<a class="card-link" href="${escapeAttr(d.link)}" target="_blank">Abrir</a>` : ''}
          <button class="btn-ghost" data-copy>Copiar link</button>
          <button class="btn-ghost" data-edit>Editar</button>
          <button class="btn-ghost danger" data-del>Eliminar</button>
        </div>
      `;
      card.querySelector('[data-copy]').onclick = () => copyText(d.link || '');
      card.querySelector('[data-edit]').onclick = () => openModal('documento', d);
      card.querySelector('[data-del]').onclick = () => del('documento', d.id);
      cards.appendChild(card);
    });
    c.appendChild(group);
  });
}

function renderMensajes() {
  const q = document.getElementById('search-mensajes')?.value || '';
  const filtered = state.mensajes.filter(m => matchesSearch(m, q, ['titulo', 'contenido', 'categoria']));
  const grouped = groupBy(filtered, 'categoria');
  const c = document.getElementById('lista-mensajes');
  c.innerHTML = '';
  if (filtered.length === 0) {
    c.innerHTML = '<div class="no-results">No hay mensajes que coincidan con "' + escapeHtml(q) + '"</div>';
    return;
  }
  Object.entries(grouped).forEach(([cat, items]) => {
    const group = document.createElement('div');
    group.className = 'categoria-group';
    group.innerHTML = `<div class="categoria-title">${escapeHtml(cat)}</div><div class="cards"></div>`;
    const cards = group.querySelector('.cards');
    items.forEach(m => {
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `
        <div class="card-title">${escapeHtml(m.titulo)}</div>
        <div class="card-body">${escapeHtml(m.contenido)}</div>
        ${m.variables ? `<div class="card-variables">Variables: ${escapeHtml(m.variables)}</div>` : ''}
        <div class="card-actions">
          <button class="btn-primary" data-copy>Copiar</button>
          ${m.variables ? `<button class="btn-ghost" data-usar>Rellenar variables</button>` : ''}
          <button class="btn-ghost" data-edit>Editar</button>
          <button class="btn-ghost danger" data-del>Eliminar</button>
        </div>
      `;
      card.querySelector('[data-copy]').onclick = () => copyText(m.contenido);
      const usarBtn = card.querySelector('[data-usar]');
      if (usarBtn) usarBtn.onclick = () => openUsar(m);
      card.querySelector('[data-edit]').onclick = () => openModal('mensaje', m);
      card.querySelector('[data-del]').onclick = () => del('mensaje', m.id);
      cards.appendChild(card);
    });
    c.appendChild(group);
  });
}

// ============ Tabla de comisiones (link por vendedor) ============
const tablasComisiones = { dayana: null, alejandra: null };

function abrirTablaComisiones(vendedor) {
  const key = vendedor.toLowerCase();
  const actual = tablasComisiones[key]?.url || '';
  const nuevo = prompt('Pega el link de tu tabla de comisiones en Drive (dejalo vacio para eliminar):', actual);
  if (nuevo === null) return;
  if (nuevo.trim() === '') {
    borrarTablaComisiones(vendedor);
  } else {
    guardarTablaComisiones(vendedor, nuevo.trim());
  }
}

async function guardarTablaComisiones(vendedor, url) {
  const key = vendedor.toLowerCase();
  const res = await fetch('/api/tabla-comisiones/' + key, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url })
  });
  if (res.ok) {
    tablasComisiones[key] = await res.json();
    renderTablaComisiones(vendedor);
    toast('Link guardado');
  } else {
    toast('Error al guardar');
  }
}

function renderTablaComisiones(vendedor) {
  const key = vendedor.toLowerCase();
  const el = document.getElementById('tabla-comisiones-' + key);
  if (!el) return;
  const tabla = tablasComisiones[key];
  el.innerHTML = tabla && tabla.url ? `
    <div class="archivo-card">
      <div class="archivo-icon">📊</div>
      <div class="archivo-info">
        <div class="archivo-nombre">Tabla de comisiones de ${escapeHtml(vendedor)}</div>
        <div class="archivo-meta">
          Actualizada ${new Date(tabla.uploaded).toLocaleDateString('es-CO', {day:'2-digit',month:'short',year:'numeric'})} · Los cambios en Drive se reflejan al instante
        </div>
      </div>
      <div class="archivo-acciones">
        <a class="btn-primary small" href="${escapeAttr(tabla.url)}" target="_blank" rel="noopener">Abrir en Drive</a>
        <button class="btn-ghost small" onclick="abrirTablaComisiones('${escapeAttr(vendedor)}')">Cambiar link</button>
        <button class="btn-ghost small danger" onclick="borrarTablaComisiones('${escapeAttr(vendedor)}')">Eliminar</button>
      </div>
    </div>
  ` : `
    <div class="archivo-card empty" onclick="abrirTablaComisiones('${escapeAttr(vendedor)}')">
      <div class="archivo-icon">📊</div>
      <div class="archivo-info">
        <div class="archivo-nombre">Aun no hay tabla de comisiones</div>
        <div class="archivo-meta">Haz clic para pegar el link de tu tabla en Drive.</div>
      </div>
    </div>
  `;
}

async function borrarTablaComisiones(vendedor) {
  const key = vendedor.toLowerCase();
  if (!confirm('Eliminar el link de la tabla de ' + vendedor + '?')) return;
  await fetch('/api/tabla-comisiones/' + key, { method: 'DELETE' });
  tablasComisiones[key] = null;
  renderTablaComisiones(vendedor);
  toast('Eliminada');
}

// ============ Saludo personalizado y enlace ============
function saludoPorHora() {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos dias';
  if (h < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

function renderBienvenida(vendedor) {
  const key = vendedor.toLowerCase();
  const el = document.getElementById('greeting-' + key);
  if (el) el.textContent = saludoPorHora() + ', ' + vendedor;

  // Enlace personal (guardado en localStorage por vendedor)
  const enlaceEl = document.getElementById('enlace-' + key);
  if (!enlaceEl) return;
  const url = localStorage.getItem('enlace-' + key) || '';
  if (url) {
    enlaceEl.innerHTML = `
      <a href="${escapeAttr(url)}" target="_blank" class="mi-enlace-btn">Abrir mi enlace</a>
      <button class="btn-ghost small" onclick="editarEnlace('${escapeAttr(vendedor)}')">Editar</button>
    `;
  } else {
    enlaceEl.innerHTML = `<button class="mi-enlace-btn placeholder" onclick="editarEnlace('${escapeAttr(vendedor)}')">+ Agregar mi enlace personal</button>`;
  }
}

function editarEnlace(vendedor) {
  const key = vendedor.toLowerCase();
  const actual = localStorage.getItem('enlace-' + key) || '';
  const nuevo = prompt('Pega aqui el link personal (dejalo vacio para eliminar):', actual);
  if (nuevo === null) return;
  if (nuevo.trim() === '') {
    localStorage.removeItem('enlace-' + key);
  } else {
    localStorage.setItem('enlace-' + key, nuevo.trim());
  }
  renderBienvenida(vendedor);
  toast('Enlace actualizado');
}

// ============ Comisiones (Dayana / Alejandra) ============
function formatoMoneda(n) {
  const v = parseFloat(n) || 0;
  return '$' + v.toLocaleString('es-CO', { maximumFractionDigits: 0 });
}

function renderComisiones(vendedor) {
  const q = document.getElementById('search-' + vendedor.toLowerCase())?.value || '';
  const misComisiones = state.comisiones.filter(c => c.vendedor === vendedor);
  const filtradas = misComisiones.filter(c => matchesSearch(c, q, ['cliente', 'tipo_proceso', 'estado', 'notas']));

  // Resumen
  const totalPagado = misComisiones.filter(c => c.estado === 'Pagado').reduce((s, c) => s + (parseFloat(c.valor) || 0), 0);
  const totalPendiente = misComisiones.filter(c => c.estado === 'Pendiente').reduce((s, c) => s + (parseFloat(c.valor) || 0), 0);
  const total = misComisiones.reduce((s, c) => s + (parseFloat(c.valor) || 0), 0);
  const resumen = document.getElementById('resumen-' + vendedor.toLowerCase());
  resumen.innerHTML = `
    <div class="stat-card"><div class="stat-label">Total registrado</div><div class="stat-value">${formatoMoneda(total)}</div><div class="stat-sub">${misComisiones.length} comisiones</div></div>
    <div class="stat-card success"><div class="stat-label">Pagado</div><div class="stat-value">${formatoMoneda(totalPagado)}</div></div>
    <div class="stat-card warning"><div class="stat-label">Pendiente</div><div class="stat-value">${formatoMoneda(totalPendiente)}</div></div>
  `;

  // Tabla
  const cont = document.getElementById('lista-' + vendedor.toLowerCase());
  if (filtradas.length === 0) {
    cont.innerHTML = misComisiones.length === 0
      ? '<div class="no-results">Aun no hay comisiones registradas. Agrega la primera con el boton de arriba.</div>'
      : `<div class="no-results">Sin resultados para "${escapeHtml(q)}"</div>`;
    return;
  }

  const rows = filtradas
    .slice()
    .sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''))
    .map(c => `
      <tr>
        <td>${escapeHtml(c.fecha || '')}</td>
        <td>${escapeHtml(c.cliente || '')}</td>
        <td>${escapeHtml(c.tipo_proceso || '')}</td>
        <td class="valor">${formatoMoneda(c.valor)}</td>
        <td><span class="badge badge-${(c.estado || '').toLowerCase()}">${escapeHtml(c.estado || '')}</span></td>
        <td class="notas">${escapeHtml(c.notas || '')}</td>
        <td class="acciones">
          <button class="btn-ghost" data-editar="${c.id}">Editar</button>
          <button class="btn-ghost danger" data-borrar="${c.id}">Eliminar</button>
        </td>
      </tr>
    `).join('');

  cont.innerHTML = `
    <table class="tabla">
      <thead>
        <tr><th>Fecha</th><th>Cliente</th><th>Proceso</th><th>Valor</th><th>Estado</th><th>Notas</th><th></th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;

  cont.querySelectorAll('[data-editar]').forEach(b => {
    b.onclick = () => {
      const item = state.comisiones.find(x => x.id == b.dataset.editar);
      openComisionModal(vendedor, item);
    };
  });
  cont.querySelectorAll('[data-borrar]').forEach(b => {
    b.onclick = async () => {
      if (!confirm('Eliminar esta comision?')) return;
      await api('DELETE', '/comisiones/' + b.dataset.borrar);
      toast('Eliminada');
      loadAll();
    };
  });
}

function openComisionModal(vendedor, item) {
  editingType = 'comision';
  editingId = item ? item.id : null;
  const modal = document.getElementById('modal');
  document.getElementById('modal-title').textContent = (item ? 'Editar' : 'Nueva') + ' comision - ' + vendedor;
  const form = document.getElementById('modal-form');
  const hoy = new Date().toISOString().slice(0, 10);
  form.innerHTML = `
    <div><label>Cliente</label><input name="cliente" required value="${escapeAttr(item?.cliente || '')}" placeholder="Nombre del cliente" /></div>
    <div><label>Tipo de proceso</label><input name="tipo_proceso" value="${escapeAttr(item?.tipo_proceso || '')}" placeholder="Ej: Traslado Especial, Derecho de Peticion" list="tipos-proceso" /></div>
    <datalist id="tipos-proceso">
      <option value="Traslado Especial"><option value="Traslado Voluntario"><option value="Derogacion">
      <option value="Derecho de Peticion"><option value="Recurso de Apelacion"><option value="Prestaciones sociales">
      <option value="Proceso Disciplinario"><option value="Contrato de servicios"><option value="Otro">
    </datalist>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div><label>Fecha</label><input name="fecha" type="date" required value="${escapeAttr(item?.fecha || hoy)}" /></div>
      <div><label>Valor comision (COP)</label><input name="valor" type="number" min="0" step="1000" required value="${escapeAttr(item?.valor || '')}" /></div>
    </div>
    <div><label>Estado</label>
      <select name="estado" required>
        <option value="Pendiente" ${item?.estado === 'Pendiente' ? 'selected' : ''}>Pendiente</option>
        <option value="Pagado" ${item?.estado === 'Pagado' ? 'selected' : ''}>Pagado</option>
        <option value="Cancelado" ${item?.estado === 'Cancelado' ? 'selected' : ''}>Cancelado</option>
      </select>
    </div>
    <div><label>Notas</label><textarea name="notas" placeholder="Detalles adicionales">${escapeHtml(item?.notas || '')}</textarea></div>
    <input type="hidden" name="vendedor" value="${escapeAttr(vendedor)}" />
    <div class="form-actions">
      <button type="button" class="btn-ghost" onclick="closeModal()">Cancelar</button>
      <button type="submit" class="btn-primary">Guardar</button>
    </div>
  `;
  form.onsubmit = async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    data.orden = 0;
    if (editingId) {
      await api('PUT', '/comisiones/' + editingId, data);
    } else {
      await api('POST', '/comisiones', data);
    }
    closeModal();
    toast('Guardada');
    loadAll();
  };
  modal.classList.add('active');
}

// ============ Modal editor ============
function openModal(type, item) {
  editingType = type;
  editingId = item ? item.id : null;
  const modal = document.getElementById('modal');
  const title = document.getElementById('modal-title');
  const form = document.getElementById('modal-form');
  title.textContent = (item ? 'Editar ' : 'Nuevo ') + type;

  if (type === 'audio') {
    form.innerHTML = `
      <div><label>Categoria</label><input name="categoria" required value="${escapeAttr(item?.categoria || '')}" placeholder="Ej: Saludo Inicial" /></div>
      <div><label>Titulo</label><input name="titulo" required value="${escapeAttr(item?.titulo || '')}" placeholder="Ej: Audio 1" /></div>
      <div><label>Descripcion</label><input name="descripcion" value="${escapeAttr(item?.descripcion || '')}" /></div>
      <div><label>Duracion</label><input name="duracion" value="${escapeAttr(item?.duracion || '')}" placeholder="Ej: ~1:30 min" /></div>
      <div><label>Link a carpeta de Drive</label><input name="link_carpeta" value="${escapeAttr(item?.link_carpeta || '')}" placeholder="https://drive.google.com/..." /></div>
      <div><label>Orden</label><input name="orden" type="number" value="${item?.orden || 0}" /></div>
      <div class="form-actions">
        <button type="button" class="btn-ghost" onclick="closeModal()">Cancelar</button>
        <button type="submit" class="btn-primary">Guardar</button>
      </div>
    `;
  } else if (type === 'documento') {
    form.innerHTML = `
      <div><label>Categoria</label><input name="categoria" required value="${escapeAttr(item?.categoria || '')}" placeholder="Ej: Derechos de Peticion" /></div>
      <div><label>Titulo</label><input name="titulo" required value="${escapeAttr(item?.titulo || '')}" /></div>
      <div><label>Link al documento</label><input name="link" value="${escapeAttr(item?.link || '')}" placeholder="https://docs.google.com/..." /></div>
      <div><label>Nota</label><textarea name="nota">${escapeHtml(item?.nota || '')}</textarea></div>
      <div><label>Orden</label><input name="orden" type="number" value="${item?.orden || 0}" /></div>
      <div class="form-actions">
        <button type="button" class="btn-ghost" onclick="closeModal()">Cancelar</button>
        <button type="submit" class="btn-primary">Guardar</button>
      </div>
    `;
  } else if (type === 'mensaje') {
    form.innerHTML = `
      <div><label>Categoria</label><input name="categoria" required value="${escapeAttr(item?.categoria || '')}" placeholder="Ej: Primer Contacto" /></div>
      <div><label>Titulo</label><input name="titulo" required value="${escapeAttr(item?.titulo || '')}" /></div>
      <div><label>Contenido del mensaje</label><textarea name="contenido" required rows="8">${escapeHtml(item?.contenido || '')}</textarea></div>
      <div><label>Variables (separadas por |)</label><input name="variables" value="${escapeAttr(item?.variables || '')}" placeholder="[NOMBRE] | [FECHA]" /></div>
      <div><label>Orden</label><input name="orden" type="number" value="${item?.orden || 0}" /></div>
      <div class="form-actions">
        <button type="button" class="btn-ghost" onclick="closeModal()">Cancelar</button>
        <button type="submit" class="btn-primary">Guardar</button>
      </div>
    `;
  }

  form.onsubmit = (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    data.orden = parseInt(data.orden) || 0;
    save(type, editingId, data);
  };

  modal.classList.add('active');
}

function closeModal() {
  document.getElementById('modal').classList.remove('active');
}

async function save(type, id, data) {
  const pathMap = { audio: '/audios', documento: '/documentos', mensaje: '/mensajes' };
  if (id) {
    await api('PUT', pathMap[type] + '/' + id, data);
  } else {
    await api('POST', pathMap[type], data);
  }
  closeModal();
  toast('Guardado');
  loadAll();
}

async function del(type, id) {
  if (!confirm('Eliminar este elemento?')) return;
  const pathMap = { audio: '/audios', documento: '/documentos', mensaje: '/mensajes' };
  await api('DELETE', pathMap[type] + '/' + id);
  toast('Eliminado');
  loadAll();
}

// ============ Modal rellenar variables ============
function openUsar(m) {
  const modal = document.getElementById('modal-usar');
  const body = document.getElementById('modal-usar-body');
  const vars = m.variables.split('|').map(v => v.trim()).filter(Boolean);
  const uniqueVars = [...new Set(vars)];

  const inputs = uniqueVars.map(v => `
    <div>
      <label>${escapeHtml(v)}</label>
      <input data-var="${escapeAttr(v)}" placeholder="Valor para ${escapeHtml(v)}" />
    </div>
  `).join('');

  body.innerHTML = `
    ${inputs}
    <div>
      <label>Vista previa</label>
      <div id="preview" class="preview">${escapeHtml(m.contenido)}</div>
    </div>
    <div class="form-actions">
      <button type="button" class="btn-ghost" onclick="closeUsar()">Cerrar</button>
      <button type="button" class="btn-primary" id="btn-copiar-final">Copiar mensaje final</button>
    </div>
  `;

  const template = m.contenido;
  const inputEls = body.querySelectorAll('[data-var]');
  const preview = body.querySelector('#preview');

  function actualizar() {
    let texto = template;
    inputEls.forEach(inp => {
      const val = inp.value || inp.dataset.var;
      texto = texto.split(inp.dataset.var).join(val);
    });
    preview.textContent = texto;
    return texto;
  }

  inputEls.forEach(inp => inp.addEventListener('input', actualizar));
  body.querySelector('#btn-copiar-final').onclick = () => copyText(actualizar());

  modal.classList.add('active');
}

function closeUsar() {
  document.getElementById('modal-usar').classList.remove('active');
}

// ============ Utils ============
function copyText(t) {
  navigator.clipboard.writeText(t).then(() => toast('Copiado'));
}

let toastTimer;
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 1800);
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}
function escapeAttr(s) { return escapeHtml(s); }

// Cerrar modales con click fuera
document.querySelectorAll('.modal-overlay').forEach(m => {
  m.addEventListener('click', (e) => {
    if (e.target === m) m.classList.remove('active');
  });
});

// Cargar al inicio
loadAll();
