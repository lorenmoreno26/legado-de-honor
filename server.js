// LEGADO DE HONOR - Servidor local (Node + Express, almacen JSON)
const express = require('express');
const fs = require('fs');
const path = require('path');
const os = require('os');
const Buffer = global.Buffer;

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'legado-data.json');

// ============ Almacen de datos (JSON) ============
function loadDB() {
  if (!fs.existsSync(DB_FILE)) {
    const initial = require('./seed.js')();
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf8');
    return initial;
  }
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}
function saveDB(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
}
function nextId(list) {
  return list.reduce((m, x) => Math.max(m, x.id || 0), 0) + 1;
}
function sortItems(list) {
  return list.sort((a, b) => {
    if (a.categoria !== b.categoria) return a.categoria.localeCompare(b.categoria);
    if ((a.orden || 0) !== (b.orden || 0)) return (a.orden || 0) - (b.orden || 0);
    return a.id - b.id;
  });
}

let db = loadDB();

app.use(express.json({ limit: '30mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ============ Tabla de comisiones (link por vendedor) ============
if (!db.tablasVendedor) { db.tablasVendedor = {}; saveDB(db); }

app.get('/api/tabla-comisiones/:vendedor', (req, res) => {
  const v = req.params.vendedor.toLowerCase();
  res.json(db.tablasVendedor?.[v] || null);
});
app.post('/api/tabla-comisiones/:vendedor', (req, res) => {
  const v = req.params.vendedor.toLowerCase();
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'falta url' });
  if (!db.tablasVendedor) db.tablasVendedor = {};
  db.tablasVendedor[v] = {
    url: String(url).trim(),
    uploaded: new Date().toISOString()
  };
  saveDB(db);
  res.json(db.tablasVendedor[v]);
});
app.delete('/api/tabla-comisiones/:vendedor', (req, res) => {
  const v = req.params.vendedor.toLowerCase();
  if (db.tablasVendedor) delete db.tablasVendedor[v];
  saveDB(db);
  res.json({ ok: true });
});

// ============ Tabla de tarifas (link único de servicios) ============
app.get('/api/tabla-tarifas', (req, res) => {
  res.json(db.tablaTarifas || null);
});
app.post('/api/tabla-tarifas', (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'falta url' });
  db.tablaTarifas = {
    url: String(url).trim(),
    uploaded: new Date().toISOString()
  };
  saveDB(db);
  res.json(db.tablaTarifas);
});
app.delete('/api/tabla-tarifas', (req, res) => {
  delete db.tablaTarifas;
  saveDB(db);
  res.json({ ok: true });
});

// ============ CRUD generico ============
function makeCRUD(resource, fields) {
  app.get('/api/' + resource, (req, res) => {
    res.json(sortItems([...db[resource]]));
  });
  app.post('/api/' + resource, (req, res) => {
    const item = { id: nextId(db[resource]) };
    fields.forEach(f => { item[f] = req.body[f] ?? (f === 'orden' ? 0 : ''); });
    item.orden = parseInt(item.orden) || 0;
    db[resource].push(item);
    saveDB(db);
    res.json(item);
  });
  app.put('/api/' + resource + '/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const idx = db[resource].findIndex(x => x.id === id);
    if (idx === -1) return res.status(404).json({ error: 'no encontrado' });
    fields.forEach(f => { db[resource][idx][f] = req.body[f] ?? (f === 'orden' ? 0 : ''); });
    db[resource][idx].orden = parseInt(db[resource][idx].orden) || 0;
    saveDB(db);
    res.json(db[resource][idx]);
  });
  app.delete('/api/' + resource + '/:id', (req, res) => {
    const id = parseInt(req.params.id);
    db[resource] = db[resource].filter(x => x.id !== id);
    saveDB(db);
    res.json({ ok: true });
  });
}

makeCRUD('audios',      ['categoria', 'titulo', 'descripcion', 'duracion', 'link_carpeta', 'orden']);
makeCRUD('documentos',  ['categoria', 'titulo', 'link', 'nota', 'orden']);
makeCRUD('mensajes',    ['categoria', 'titulo', 'contenido', 'variables', 'orden']);
if (!db.comisiones) { db.comisiones = []; saveDB(db); }
makeCRUD('comisiones',  ['vendedor', 'cliente', 'tipo_proceso', 'fecha', 'valor', 'estado', 'notas', 'orden']);

// ============ Arrancar servidor ============
app.listen(PORT, '0.0.0.0', () => {
  console.log('\n========================================');
  console.log('  LEGADO DE HONOR - Guia de Ventas');
  console.log('========================================');
  console.log(`  Local:    http://localhost:${PORT}`);
  const nets = os.networkInterfaces();
  Object.keys(nets).forEach(name => {
    nets[name].forEach(net => {
      if (net.family === 'IPv4' && !net.internal) {
        console.log(`  WiFi:     http://${net.address}:${PORT}`);
      }
    });
  });
  console.log('========================================');
  console.log('  Datos guardados en: legado-data.json');
  console.log('  Detener servidor: Ctrl+C');
  console.log('========================================\n');
});
