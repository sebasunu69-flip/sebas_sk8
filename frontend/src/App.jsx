import { useEffect, useMemo, useState } from 'react';
import './App.css';

const API = `http://${window.location.hostname}:3000`;

function obtenerSesion() {
  let sesion = localStorage.getItem('bigdata_sesion');
  if (!sesion) {
    sesion = `ses-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    localStorage.setItem('bigdata_sesion', sesion);
  }
  return sesion;
}

const SESION = obtenerSesion();

export default function App() {
  const [clientes, setClientes] = useState([]);
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [estado, setEstado] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [filtroActivo, setFiltroActivo] = useState('');
  const [analitica, setAnalitica] = useState(null);
  const [eventos, setEventos] = useState([]);
  const [cantidadSimulada, setCantidadSimulada] = useState(100);

  const clientesVisibles = useMemo(() => {
    const texto = filtroActivo.trim().toLowerCase();
    if (!texto) return clientes;
    return clientes.filter(cliente =>
      cliente.nombre.toLowerCase().includes(texto) ||
      cliente.correo.toLowerCase().includes(texto)
    );
  }, [clientes, filtroActivo]);

  async function solicitar(ruta, opciones = {}) {
    const metodo = opciones.method || 'GET';
    setEstado(`${metodo} ${ruta} ...`);
    const respuesta = await fetch(`${API}${ruta}`, opciones);
    const datos = await respuesta.json();
    console.log('[HTTP]', metodo, ruta, respuesta.status, datos);
    if (!respuesta.ok) throw new Error(datos.error || 'Error HTTP');
    return datos;
  }

  async function registrarEvento(tipo, detalle = {}) {
    try {
      await fetch(`${API}/api/eventos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo,
          sesion: SESION,
          ruta: window.location.pathname,
          detalle: {
            ...detalle,
            ancho_ventana: window.innerWidth
          }
        })
      });
    } catch (error) {
      console.warn('No se pudo registrar la interacción:', error.message);
    }
  }

  async function actualizarBigData() {
    try {
      const [respuestaResumen, respuestaEventos] = await Promise.all([
        fetch(`${API}/api/analitica/resumen`),
        fetch(`${API}/api/eventos?limite=12`)
      ]);
      const resumen = await respuestaResumen.json();
      const recientes = await respuestaEventos.json();
      setAnalitica(resumen);
      setEventos(recientes);
    } catch (error) {
      setEstado(`Error al actualizar analítica: ${error.message}`);
    }
  }

  async function cargar() {
    try {
      const datos = await solicitar('/api/clientes');
      setClientes(datos);
      setEstado(`GET correcto: ${datos.length} clientes`);
    } catch (error) {
      setEstado(error.message);
    }
  }

  async function crear(evento) {
    evento.preventDefault();
    try {
      await solicitar('/api/clientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, correo })
      });
      setNombre('');
      setCorreo('');
      await cargar();
      await actualizarBigData();
    } catch (error) {
      setEstado(error.message);
    }
  }

  async function editar(cliente) {
    const nuevoNombre = window.prompt('Nuevo nombre:', cliente.nombre);
    if (nuevoNombre === null) return;
    const nuevoCorreo = window.prompt('Nuevo correo:', cliente.correo);
    if (nuevoCorreo === null) return;

    try {
      await solicitar(`/api/clientes/${cliente.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: nuevoNombre, correo: nuevoCorreo })
      });
      await cargar();
      await actualizarBigData();
    } catch (error) {
      setEstado(error.message);
    }
  }

  async function eliminar(id) {
    try {
      await solicitar(`/api/clientes/${id}`, { method: 'DELETE' });
      await cargar();
      await actualizarBigData();
    } catch (error) {
      setEstado(error.message);
    }
  }

  async function buscar(evento) {
    evento.preventDefault();
    const inicio = performance.now();
    setFiltroActivo(busqueda);

    const texto = busqueda.trim().toLowerCase();
    const resultados = texto
      ? clientes.filter(cliente =>
          cliente.nombre.toLowerCase().includes(texto) ||
          cliente.correo.toLowerCase().includes(texto)
        ).length
      : clientes.length;

    await registrarEvento('busqueda', {
      termino: busqueda,
      resultados,
      duracion_ms: Math.round(performance.now() - inicio)
    });
    await actualizarBigData();
  }

  async function generarLote() {
    try {
      const cantidad = Math.max(1, Math.min(Number(cantidadSimulada) || 100, 1000));
      const resultado = await solicitar('/api/eventos/generar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cantidad })
      });
      setEstado(`Volumen generado: ${resultado.generados} eventos. Total: ${resultado.total_eventos}`);
      await actualizarBigData();
    } catch (error) {
      setEstado(error.message);
    }
  }

  async function capturarClick(evento) {
    const boton = evento.target.closest('button');
    if (!boton) return;
    await registrarEvento('click_interfaz', {
      boton: boton.textContent.trim().slice(0, 80),
      duracion_ms: 0
    });
  }

  useEffect(() => {
    async function iniciar() {
      await registrarEvento('visita_frontend', {
        pantalla: 'clientes-bigdata',
        duracion_ms: 0
      });
      await cargar();
      await actualizarBigData();
    }
    iniciar();
  }, []);

  const maximoTipo = Math.max(1, ...(analitica?.por_tipo || []).map(item => item.cantidad));

  return (
    <main className="contenedor" onClickCapture={capturarClick}>
      <h1>Laboratorio Big Data - 5V</h1>
      <p className="subtitulo">
        Frontend React: <strong>{window.location.origin}</strong><br />
        Backend API: <strong>{API}</strong><br />
        Sesión de este navegador: <strong>{SESION}</strong>
      </p>

      <section className="panel aviso">
        <h2>¿Qué está pasando?</h2>
        <p>
          La aplicación sigue administrando clientes, pero ahora cada interacción importante
          produce eventos. El backend los guarda como datos RAW en
          <code> backend/data/eventos.ndjson</code> y luego calcula métricas para el tablero.
        </p>
      </section>

      <section className="panel">
        <h2>1. Interactúa con la aplicación</h2>
        <form onSubmit={crear}>
          <input value={nombre} onChange={e => setNombre(e.target.value)}
            placeholder="Nombre ficticio" required />
          <input value={correo} onChange={e => setCorreo(e.target.value)}
            placeholder="correo@example.com" type="email" required />
          <button type="submit">POST crear</button>
        </form>

        <form className="buscador" onSubmit={buscar}>
          <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre o correo" />
          <button type="submit">Buscar y registrar evento</button>
          <button type="button" onClick={() => { setBusqueda(''); setFiltroActivo(''); }}>
            Quitar filtro
          </button>
        </form>

        <div className="fila-titulo">
          <h3>Clientes visibles: {clientesVisibles.length}</h3>
          <button onClick={async () => { await cargar(); await actualizarBigData(); }}>
            GET recargar
          </button>
        </div>

        {clientesVisibles.map(cliente => (
          <article className="cliente" key={cliente.id}>
            <span>{cliente.id} | {cliente.nombre} | {cliente.correo}</span>
            <div>
              <button onClick={() => editar(cliente)}>PUT editar</button>
              <button onClick={() => eliminar(cliente.id)}>DELETE borrar</button>
            </div>
          </article>
        ))}
      </section>

      <section className="panel">
        <h2>2. Generador de datos para estudiar Volumen y Velocidad</h2>
        <div className="controles-lote">
          <label>
            Cantidad de eventos:
            <input type="number" min="1" max="1000" value={cantidadSimulada}
              onChange={e => setCantidadSimulada(e.target.value)} />
          </label>
          <button onClick={generarLote}>Generar lote sintético</button>
          <button onClick={actualizarBigData}>Actualizar analítica</button>
        </div>
        <p className="nota">
          El simulador crea distintos tipos de eventos. Aproximadamente 10% incluyen una duración
          negativa para que puedas observar el problema de Veracidad y calidad de datos.
        </p>
      </section>

      <section className="panel">
        <h2>3. Tablero de las 5V</h2>
        <div className="tarjetas">
          <article className="tarjeta">
            <span>VOLUMEN</span>
            <strong>{analitica?.total_eventos ?? 0}</strong>
            <small>eventos RAW almacenados</small>
          </article>
          <article className="tarjeta">
            <span>VELOCIDAD</span>
            <strong>{analitica?.eventos_ultimo_minuto ?? 0}</strong>
            <small>eventos válidos en el último minuto</small>
          </article>
          <article className="tarjeta">
            <span>VARIEDAD</span>
            <strong>{analitica?.tipos_distintos ?? 0}</strong>
            <small>tipos distintos de eventos</small>
          </article>
          <article className="tarjeta">
            <span>VERACIDAD</span>
            <strong>{analitica?.porcentaje_validos ?? 100}%</strong>
            <small>{analitica?.eventos_sospechosos ?? 0} sospechosos</small>
          </article>
          <article className="tarjeta">
            <span>VALOR</span>
            <strong>{analitica?.tipo_mas_frecuente?.tipo ?? 'sin datos'}</strong>
            <small>interacción válida más frecuente</small>
          </article>
        </div>

        <h3>Distribución de eventos válidos por tipo</h3>
        <div className="barras">
          {(analitica?.por_tipo || []).map(item => (
            <div className="barra-fila" key={item.tipo}>
              <span>{item.tipo}</span>
              <div className="barra-fondo">
                <div className="barra" style={{ width: `${(item.cantidad / maximoTipo) * 100}%` }} />
              </div>
              <strong>{item.cantidad}</strong>
            </div>
          ))}
        </div>

        <div className="conclusion">
          <strong>Interpretación:</strong> {analitica?.conclusion || 'Genera eventos para obtener una conclusión.'}
        </div>
      </section>

      <section className="panel">
        <h2>4. Últimos eventos RAW</h2>
        <div className="tabla-eventos">
          <div className="evento encabezado-eventos">
            <span>Hora</span><span>Tipo</span><span>Fuente</span><span>Calidad</span>
          </div>
          {eventos.map(evento => (
            <div className="evento" key={evento.id}>
              <span>{new Date(evento.timestamp).toLocaleTimeString()}</span>
              <span>{evento.tipo}</span>
              <span>{evento.fuente}</span>
              <span>{evento.calidad}</span>
            </div>
          ))}
        </div>
      </section>

      <pre className="estado">{estado}</pre>
      <p className="pie-ayuda">
        Abre F12 -&gt; Network y observa cómo una interacción puede producir una solicitud HTTP,
        un evento RAW y luego una métrica agregada.
      </p>
    </main>
  );
}
