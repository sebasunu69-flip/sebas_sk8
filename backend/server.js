const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const PORT = 3000;
const CSV = path.join(__dirname, 'data', 'clientes.csv');
const EVENTOS = path.join(__dirname, 'data', 'eventos.ndjson');
let siguienteSolicitud = 0;

// El archivo de eventos es generado por la aplicación y NO se versiona en Git.
if (!fs.existsSync(EVENTOS)) fs.writeFileSync(EVENTOS, '', 'utf8');

function encabezadosCORS() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'no-store'
  };
}

function responder(res, estado, datos) {
  const cuerpo = JSON.stringify(datos);
  res.writeHead(estado, {
    ...encabezadosCORS(),
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(cuerpo)
  });
  res.end(cuerpo);
}

function leerCuerpo(req) {
  return new Promise((resolve, reject) => {
    let texto = '';
    req.on('data', bloque => {
      texto += bloque;
      if (texto.length > 20000) {
        reject(new Error('Cuerpo demasiado grande'));
        req.destroy();
      }
    });
    req.on('end', () => {
      try { resolve(texto ? JSON.parse(texto) : {}); }
      catch { reject(new Error('JSON inválido')); }
    });
    req.on('error', reject);
  });
}

// -------------------- CLIENTES (laboratorio anterior) --------------------
function leerClientes() {
  const texto = fs.readFileSync(CSV, 'utf8').trim();
  if (!texto) return [];
  const lineas = texto.split(/\r?\n/);
  return lineas.slice(1).filter(Boolean).map(linea => {
    const [id, nombre, correo] = linea.split(',');
    return { id: Number(id), nombre, correo };
  });
}

function guardarClientes(clientes) {
  const filas = clientes.map(c => `${c.id},${c.nombre},${c.correo}`);
  fs.writeFileSync(CSV, ['id,nombre,correo', ...filas].join('\n') + '\n');
}

function validarCliente(datos) {
  if (!datos || typeof datos.nombre !== 'string' ||
      typeof datos.correo !== 'string') return false;
  const nombre = datos.nombre.trim();
  const correo = datos.correo.trim();
  return Boolean(nombre && correo && correo.includes('@') &&
    !/[\r\n,]/.test(nombre) && !/[\r\n,]/.test(correo));
}

// -------------------- EVENTOS BIG DATA --------------------
function leerEventos() {
  const texto = fs.readFileSync(EVENTOS, 'utf8').trim();
  if (!texto) return [];

  return texto.split(/\r?\n/).filter(Boolean).map(linea => {
    try { return JSON.parse(linea); }
    catch { return null; }
  }).filter(Boolean);
}

let siguienteEventoId = Math.max(
  0,
  ...leerEventos().map(evento => Number(evento.id) || 0)
) + 1;

function guardarEvento(datos = {}) {
  const problemas = [];

  let timestamp = datos.timestamp;
  if (!timestamp) {
    // Si la aplicación no envía hora, el servidor asigna la hora de recepción.
    timestamp = new Date().toISOString();
  } else if (Number.isNaN(Date.parse(timestamp))) {
    problemas.push('timestamp inválido');
    timestamp = new Date().toISOString();
  } else {
    timestamp = new Date(timestamp).toISOString();
  }

  const tipo = typeof datos.tipo === 'string' ? datos.tipo.trim() : '';
  const fuente = typeof datos.fuente === 'string' ? datos.fuente.trim() : 'desconocida';
  const sesion = typeof datos.sesion === 'string' ? datos.sesion.trim() : '';
  const detalle = datos.detalle && typeof datos.detalle === 'object' ? datos.detalle : {};

  if (!tipo) problemas.push('tipo faltante');
  if (!sesion) problemas.push('sesión faltante');
  if (typeof detalle.duracion_ms === 'number' && detalle.duracion_ms < 0) {
    problemas.push('duración negativa');
  }

  const evento = {
    id: siguienteEventoId++,
    timestamp,
    tipo: tipo || 'sin_tipo',
    fuente,
    sesion: sesion || 'sin_sesion',
    ruta: datos.ruta || '',
    metodo: datos.metodo || '',
    calidad: problemas.length ? 'sospechoso' : 'valido',
    problemas,
    detalle
  };

  fs.appendFileSync(EVENTOS, JSON.stringify(evento) + '\n', 'utf8');
  return evento;
}

function crearDetalleSintetico(tipo, i, sospechoso) {
  const duracion = sospechoso ? -1 : 40 + (i * 17) % 900;

  if (tipo === 'busqueda') {
    const terminos = ['ana', 'cliente', 'correo', 'mora', 'ruiz'];
    return {
      termino: terminos[i % terminos.length],
      resultados: (i * 3) % 8,
      duracion_ms: duracion
    };
  }

  if (tipo === 'click_interfaz') {
    const botones = ['GET recargar', 'POST crear', 'PUT editar', 'DELETE borrar'];
    return { boton: botones[i % botones.length], duracion_ms: duracion };
  }

  if (tipo === 'cliente_creado' || tipo === 'cliente_editado' || tipo === 'cliente_eliminado') {
    return { cliente_id: 1 + (i % 25), duracion_ms: duracion };
  }

  if (tipo === 'visita_frontend') {
    return { pantalla: 'clientes-bigdata', ancho_ventana: 900 + (i % 5) * 100, duracion_ms: duracion };
  }

  return { codigo: i % 3 === 0 ? 'FETCH_ERROR' : 'TIMEOUT', duracion_ms: duracion };
}

function generarEventosSinteticos(cantidad) {
  const tipos = [
    'visita_frontend',
    'click_interfaz',
    'busqueda',
    'cliente_creado',
    'cliente_editado',
    'cliente_eliminado',
    'error_frontend'
  ];

  for (let i = 0; i < cantidad; i++) {
    const tipo = tipos[Math.floor(Math.random() * tipos.length)];
    const sospechoso = i % 10 === 0; // aproximadamente 10% con un dato dudoso
    const haceMs = Math.floor(Math.random() * 45000); // últimos 45 segundos

    guardarEvento({
      timestamp: new Date(Date.now() - haceMs).toISOString(),
      tipo,
      fuente: 'simulador',
      sesion: `sim-${1 + (i % 12)}`,
      ruta: '/simulacion',
      metodo: 'SIM',
      detalle: crearDetalleSintetico(tipo, i, sospechoso)
    });
  }
}

function construirResumen() {
  const eventos = leerEventos();
  const validos = eventos.filter(e => e.calidad === 'valido');
  const sospechosos = eventos.filter(e => e.calidad !== 'valido');
  const ahora = Date.now();

  const ultimoMinuto = validos.filter(e => {
    const tiempo = Date.parse(e.timestamp);
    return Number.isFinite(tiempo) && ahora - tiempo <= 60000;
  }).length;

  const porTipoObj = {};
  const porFuenteObj = {};

  for (const evento of validos) {
    porTipoObj[evento.tipo] = (porTipoObj[evento.tipo] || 0) + 1;
    porFuenteObj[evento.fuente] = (porFuenteObj[evento.fuente] || 0) + 1;
  }

  const porTipo = Object.entries(porTipoObj)
    .map(([tipo, cantidad]) => ({ tipo, cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad);

  const porFuente = Object.entries(porFuenteObj)
    .map(([fuente, cantidad]) => ({ fuente, cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad);

  const sesionesUnicas = new Set(validos.map(e => e.sesion).filter(Boolean)).size;
  const tiposDistintos = new Set(validos.map(e => e.tipo)).size;
  const tipoMasFrecuente = porTipo[0] || { tipo: 'sin datos', cantidad: 0 };
  const porcentajeValidos = eventos.length
    ? Math.round((validos.length / eventos.length) * 100)
    : 100;

  let conclusion = 'Aún no hay suficientes eventos para obtener una conclusión.';
  if (validos.length) {
    conclusion = `La interacción válida más frecuente es "${tipoMasFrecuente.tipo}" ` +
      `con ${tipoMasFrecuente.cantidad} eventos. Se observaron ${sesionesUnicas} sesiones.`;
  }
  if (sospechosos.length) {
    conclusion += ` Antes de decidir, revisa ${sospechosos.length} eventos marcados como sospechosos.`;
  }

  return {
    total_eventos: eventos.length,
    eventos_validos: validos.length,
    eventos_sospechosos: sospechosos.length,
    porcentaje_validos: porcentajeValidos,
    eventos_ultimo_minuto: ultimoMinuto,
    sesiones_unicas: sesionesUnicas,
    tipos_distintos: tiposDistintos,
    tipo_mas_frecuente: tipoMasFrecuente,
    por_tipo: porTipo,
    por_fuente: porFuente,
    conclusion
  };
}

// -------------------- SERVIDOR HTTP --------------------
const servidor = http.createServer(async (req, res) => {
  const numero = ++siguienteSolicitud;
  const inicio = Date.now();
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const ruta = url.pathname;

  console.log(`\n[${numero}] ${req.method} ${ruta}`);
  res.on('finish', () => console.log(`[${numero}] Respuesta: ${res.statusCode}`));

  if (req.method === 'OPTIONS') {
    res.writeHead(204, encabezadosCORS());
    res.end();
    return;
  }

  try {
    if (req.method === 'GET' && (ruta === '/' || ruta === '/health')) {
      responder(res, 200, {
        mensaje: 'Backend HTTP + Big Data funcionando',
        puerto: PORT,
        clientes: '/api/clientes',
        eventos: '/api/eventos',
        analitica: '/api/analitica/resumen'
      });
      return;
    }

    // Las consultas del tablero NO se registran como eventos para evitar
    // que medir el sistema altere continuamente el conjunto de datos.
    if (req.method === 'GET' && ruta === '/api/analitica/resumen') {
      responder(res, 200, construirResumen());
      return;
    }

    if (req.method === 'GET' && ruta === '/api/eventos') {
      const limiteSolicitado = Number(url.searchParams.get('limite')) || 12;
      const limite = Math.max(1, Math.min(limiteSolicitado, 100));
      const eventos = leerEventos().slice(-limite).reverse();
      responder(res, 200, eventos);
      return;
    }

    if (req.method === 'POST' && ruta === '/api/eventos') {
      const datos = await leerCuerpo(req);
      const evento = guardarEvento({
        ...datos,
        fuente: 'frontend',
        ruta: datos.ruta || '/',
        metodo: datos.metodo || 'UI'
      });
      responder(res, 201, evento);
      return;
    }

    if (req.method === 'POST' && ruta === '/api/eventos/generar') {
      const datos = await leerCuerpo(req);
      const cantidad = Math.max(1, Math.min(Number(datos.cantidad) || 100, 1000));
      const antes = leerEventos().length;
      generarEventosSinteticos(cantidad);
      const despues = leerEventos().length;
      responder(res, 201, {
        generados: despues - antes,
        total_eventos: despues,
        mensaje: 'Lote de eventos generado para el laboratorio'
      });
      return;
    }

    // -------------------- CRUD DE CLIENTES --------------------
    const match = ruta.match(/^\/api\/clientes\/(\d+)$/);
    if (ruta !== '/api/clientes' && !match) {
      responder(res, 404, { error: 'Ruta no encontrada' });
      return;
    }

    const clientes = leerClientes();
    const id = match ? Number(match[1]) : null;
    const indice = match ? clientes.findIndex(c => c.id === id) : -1;

    if (req.method === 'GET' && ruta === '/api/clientes') {
      guardarEvento({
        tipo: 'api_listar_clientes',
        fuente: 'backend',
        sesion: 'servidor',
        ruta,
        metodo: 'GET',
        detalle: { cantidad_clientes: clientes.length, duracion_ms: Date.now() - inicio }
      });
      responder(res, 200, clientes);
      return;
    }

    if (req.method === 'GET' && match) {
      guardarEvento({
        tipo: 'api_consultar_cliente',
        fuente: 'backend',
        sesion: 'servidor',
        ruta,
        metodo: 'GET',
        detalle: { cliente_id: id, encontrado: indice >= 0, duracion_ms: Date.now() - inicio }
      });
      responder(res, indice < 0 ? 404 : 200,
        indice < 0 ? { error: 'Cliente no encontrado' } : clientes[indice]);
      return;
    }

    if (req.method === 'POST' && ruta === '/api/clientes') {
      const datos = await leerCuerpo(req);
      if (!validarCliente(datos)) {
        responder(res, 400, { error: 'Nombre y correo válidos requeridos' });
        return;
      }

      const nuevo = {
        id: Math.max(0, ...clientes.map(c => c.id)) + 1,
        nombre: datos.nombre.trim(),
        correo: datos.correo.trim()
      };
      clientes.push(nuevo);
      guardarClientes(clientes);

      guardarEvento({
        tipo: 'cliente_creado',
        fuente: 'backend',
        sesion: 'servidor',
        ruta,
        metodo: 'POST',
        detalle: { cliente_id: nuevo.id, duracion_ms: Date.now() - inicio }
      });

      responder(res, 201, nuevo);
      return;
    }

    if (req.method === 'PUT' && match) {
      if (indice < 0) {
        responder(res, 404, { error: 'Cliente no encontrado' });
        return;
      }

      const datos = await leerCuerpo(req);
      if (!validarCliente(datos)) {
        responder(res, 400, { error: 'Nombre y correo válidos requeridos' });
        return;
      }

      clientes[indice] = {
        id,
        nombre: datos.nombre.trim(),
        correo: datos.correo.trim()
      };
      guardarClientes(clientes);

      guardarEvento({
        tipo: 'cliente_editado',
        fuente: 'backend',
        sesion: 'servidor',
        ruta,
        metodo: 'PUT',
        detalle: { cliente_id: id, duracion_ms: Date.now() - inicio }
      });

      responder(res, 200, clientes[indice]);
      return;
    }

    if (req.method === 'DELETE' && match) {
      if (indice < 0) {
        responder(res, 404, { error: 'Cliente no encontrado' });
        return;
      }

      const [eliminado] = clientes.splice(indice, 1);
      guardarClientes(clientes);

      guardarEvento({
        tipo: 'cliente_eliminado',
        fuente: 'backend',
        sesion: 'servidor',
        ruta,
        metodo: 'DELETE',
        detalle: { cliente_id: id, duracion_ms: Date.now() - inicio }
      });

      responder(res, 200, eliminado);
      return;
    }

    responder(res, 405, { error: 'Método no permitido' });
  } catch (error) {
    console.error(`[${numero}] Error:`, error.message);
    if (!res.headersSent) responder(res, 400, { error: error.message });
  }
});

servidor.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend Big Data escuchando en http://localhost:${PORT}`);
  console.log(`Eventos RAW: ${EVENTOS}`);
});
