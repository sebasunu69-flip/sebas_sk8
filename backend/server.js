const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const PORT = 3000;
const CSV = path.join(__dirname, 'data', 'clientes.csv');
let siguienteSolicitud = 0;

function encabezadosCORS() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'no-store'
  };
}

function leerClientes() {
  const texto = fs.readFileSync(CSV, 'utf8').trim();
  if (!texto) return [];

  const lineas = texto.split(/\r?\n/);

  return lineas.slice(1).filter(Boolean).map(linea => {
    const [id, nombre, correo] = linea.split(',');
    return {
      id: Number(id),
      nombre,
      correo
    };
  });
}

function guardarClientes(clientes) {
  const filas = clientes.map(
    c => `${c.id},${c.nombre},${c.correo}`
  );

  fs.writeFileSync(
    CSV,
    ['id,nombre,correo', ...filas].join('\n') + '\n'
  );
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

      if (texto.length > 10000) {
        reject(new Error('Cuerpo demasiado grande'));
        req.destroy();
      }
    });

    req.on('end', () => {
      try {
        resolve(JSON.parse(texto));
      } catch {
        reject(new Error('JSON inválido'));
      }
    });

    req.on('error', reject);
  });
}

function validar(datos) {
  if (
    !datos ||
    typeof datos.nombre !== 'string' ||
    typeof datos.correo !== 'string'
  ) {
    return false;
  }

  const nombre = datos.nombre.trim();
  const correo = datos.correo.trim();

  return Boolean(
    nombre &&
    correo &&
    correo.includes('@') &&
    !/[\r\n,]/.test(nombre) &&
    !/[\r\n,]/.test(correo)
  );
}

const servidor = http.createServer(async (req, res) => {
  const numero = ++siguienteSolicitud;

  const url = new URL(
    req.url,
    `http://${req.headers.host || 'localhost'}`
  );

  const ruta = url.pathname;

  console.log(`\n[${numero}] ${req.method} ${ruta}`);
  console.log(
    `[${numero}] Origin: ${req.headers.origin || 'sin Origin'}`
  );

  res.on('finish', () => {
    console.log(
      `[${numero}] Respuesta: ${res.statusCode}`
    );
  });

  if (req.method === 'OPTIONS') {
    res.writeHead(204, encabezadosCORS());
    res.end();
    return;
  }

  try {
    if (
      req.method === 'GET' &&
      (ruta === '/' || ruta === '/health')
    ) {
      responder(res, 200, {
        mensaje: 'Backend funcionando',
        puerto: PORT,
        recurso: '/api/clientes'
      });
      return;
    }

    const match = ruta.match(/^\/api\/clientes\/(\d+)$/);

    if (ruta !== '/api/clientes' && !match) {
      responder(res, 404, {
        error: 'Ruta no encontrada'
      });
      return;
    }

    const clientes = leerClientes();

    const id = match ? Number(match[1]) : null;

    const indice = match
      ? clientes.findIndex(c => c.id === id)
      : -1;

    if (
      req.method === 'GET' &&
      ruta === '/api/clientes'
    ) {
      responder(res, 200, clientes);
      return;
    }

    if (req.method === 'GET' && match) {
      responder(
        res,
        indice < 0 ? 404 : 200,
        indice < 0
          ? { error: 'Cliente no encontrado' }
          : clientes[indice]
      );
      return;
    }

    if (
      req.method === 'POST' &&
      ruta === '/api/clientes'
    ) {
      const datos = await leerCuerpo(req);

      if (!validar(datos)) {
        responder(res, 400, {
          error: 'Nombre y correo válidos requeridos'
        });
        return;
      }

      const nuevo = {
        id: Math.max(0, ...clientes.map(c => c.id)) + 1,
        nombre: datos.nombre.trim(),
        correo: datos.correo.trim()
      };

      clientes.push(nuevo);
      guardarClientes(clientes);

      responder(res, 201, nuevo);
      return;
    }

    if (req.method === 'PUT' && match) {
      if (indice < 0) {
        responder(res, 404, {
          error: 'Cliente no encontrado'
        });
        return;
      }

      const datos = await leerCuerpo(req);

      if (!validar(datos)) {
        responder(res, 400, {
          error: 'Nombre y correo válidos requeridos'
        });
        return;
      }

      clientes[indice] = {
        id,
        nombre: datos.nombre.trim(),
        correo: datos.correo.trim()
      };

      guardarClientes(clientes);

      responder(res, 200, clientes[indice]);
      return;
    }

    if (req.method === 'DELETE' && match) {
      if (indice < 0) {
        responder(res, 404, {
          error: 'Cliente no encontrado'
        });
        return;
      }

      const [eliminado] = clientes.splice(indice, 1);

      guardarClientes(clientes);

      responder(res, 200, eliminado);
      return;
    }

    responder(res, 405, {
      error: 'Método no permitido'
    });

  } catch (error) {
    console.error(
      `[${numero}] Error:`,
      error.message
    );

    if (!res.headersSent) {
      responder(res, 400, {
        error: error.message
      });
    }
  }
});

servidor.listen(PORT, '0.0.0.0', () => {
  console.log(
    `Backend escuchando en http://localhost:${PORT}`
  );
});