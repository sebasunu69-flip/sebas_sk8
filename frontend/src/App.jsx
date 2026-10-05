import { useEffect, useState } from 'react';
import './App.css';

const API = `http://${window.location.hostname}:3000`;

export default function App() {
  const [clientes, setClientes] = useState([]);
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [estado, setEstado] = useState('');

  async function solicitar(ruta, opciones = {}) {
    const metodo = opciones.method || 'GET';

    setEstado(`${metodo} ${ruta} ...`);

    const respuesta = await fetch(`${API}${ruta}`, opciones);
    const datos = await respuesta.json();

    console.log('[HTTP]', metodo, ruta, respuesta.status, datos);

    if (!respuesta.ok) {
      throw new Error(datos.error || 'Error HTTP');
    }

    return datos;
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
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          nombre,
          correo
        })
      });

      setNombre('');
      setCorreo('');

      await cargar();
    } catch (error) {
      setEstado(error.message);
    }
  }

  async function editar(cliente) {
    const nuevoNombre = window.prompt(
      'Nuevo nombre:',
      cliente.nombre
    );

    if (nuevoNombre === null) return;

    const nuevoCorreo = window.prompt(
      'Nuevo correo:',
      cliente.correo
    );

    if (nuevoCorreo === null) return;

    try {
      await solicitar(`/api/clientes/${cliente.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          nombre: nuevoNombre,
          correo: nuevoCorreo
        })
      });

      await cargar();
    } catch (error) {
      setEstado(error.message);
    }
  }

  async function eliminar(id) {
    try {
      await solicitar(`/api/clientes/${id}`, {
        method: 'DELETE'
      });

      await cargar();
    } catch (error) {
      setEstado(error.message);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  return (
    <main className="contenedor">
      <h1>Laboratorio HTTP - Clientes</h1>

      <p className="subtitulo">
        Frontend React: <strong>{window.location.origin}</strong>
        <br />
        Backend API: <strong>{API}</strong>
      </p>

      <section className="panel">
        <h2>Crear cliente</h2>

        <form onSubmit={crear}>
          <input
            value={nombre}
            onChange={e => setNombre(e.target.value)}
            placeholder="Nombre ficticio"
            required
          />

          <input
            value={correo}
            onChange={e => setCorreo(e.target.value)}
            placeholder="correo@example.com"
            type="email"
            required
          />

          <button type="submit">
            POST crear
          </button>
        </form>
      </section>

      <section className="panel">
        <div className="fila-titulo">
          <h2>Clientes</h2>

          <button onClick={cargar}>
            GET recargar
          </button>
        </div>

        {clientes.map(cliente => (
          <article
            className="cliente"
            key={cliente.id}
          >
            <span>
              {cliente.id} | {cliente.nombre} | {cliente.correo}
            </span>

            <div>
              <button onClick={() => editar(cliente)}>
                PUT editar
              </button>

              <button onClick={() => eliminar(cliente.id)}>
                DELETE borrar
              </button>
            </div>
          </article>
        ))}
      </section>

      <pre className="estado">
        {estado}
      </pre>

      <p>
        Abre F12 → Network y observa GET, OPTIONS, POST, PUT y DELETE.
      </p>
    </main>
  );
}