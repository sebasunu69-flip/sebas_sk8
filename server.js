const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = 3000;

const ARCHIVO_CSV = path.join(__dirname, "data", "clientes.csv");

// Leer clientes desde el archivo CSV
function leerClientes() {

    const contenido = fs.readFileSync(ARCHIVO_CSV, "utf-8");

    const lineas = contenido.trim().split("\n");

    const clientes = [];

    for (let i = 1; i < lineas.length; i++) {

        const [id, nombre, correo] = lineas[i].split(",");

        clientes.push({
            id: Number(id),
            nombre: nombre,
            correo: correo
        });
    }

    return clientes;
}

// Guardar clientes en el archivo CSV
function guardarClientes(clientes) {

    let contenido = "id,nombre,correo\n";

    clientes.forEach((cliente) => {

        contenido += `${cliente.id},${cliente.nombre},${cliente.correo}\n`;

    });

    fs.writeFileSync(ARCHIVO_CSV, contenido, "utf-8");
}

const servidor = http.createServer((req, res) => {

    console.log("RECIBIENDO:", req.method, req.url);

    // Encabezados de respuesta
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");

    // GET - Obtener todos los clientes
    if (req.method === "GET" && req.url === "/api/clientes") {

        const clientes = leerClientes();

        res.writeHead(200);

        res.end(JSON.stringify(clientes));

        return;
    }

    // POST - Crear un cliente
    if (req.method === "POST" && req.url === "/api/clientes") {

        let cuerpo = "";

        req.on("data", (parte) => {

            cuerpo += parte;

        });

        req.on("end", () => {

            const datos = JSON.parse(cuerpo);

            const clientes = leerClientes();

            const nuevoCliente = {
                id: clientes.length > 0
                    ? Math.max(...clientes.map(cliente => cliente.id)) + 1
                    : 1,

                nombre: datos.nombre,

                correo: datos.correo
            };

            clientes.push(nuevoCliente);

            guardarClientes(clientes);

            res.writeHead(201);

            res.end(JSON.stringify({
                mensaje: "Cliente creado correctamente",
                cliente: nuevoCliente
            }));

        });

        return;
    }

    // PUT - Actualizar un cliente
    if (req.method === "PUT" && req.url.startsWith("/api/clientes/")) {

        let cuerpo = "";

        req.on("data", (parte) => {

            cuerpo += parte;

        });

        req.on("end", () => {

            const id = Number(req.url.split("/")[3]);

            const datos = JSON.parse(cuerpo);

            const clientes = leerClientes();

            const cliente = clientes.find(
                (cliente) => cliente.id === id
            );

            if (!cliente) {

                res.writeHead(404);

                res.end(JSON.stringify({
                    error: "Cliente no encontrado"
                }));

                return;
            }

            cliente.nombre = datos.nombre;
            cliente.correo = datos.correo;

            guardarClientes(clientes);

            res.writeHead(200);

            res.end(JSON.stringify({
                mensaje: "Cliente actualizado correctamente",
                cliente: cliente
            }));

        });

        return;
    }

    // DELETE - Eliminar un cliente
    if (req.method === "DELETE" && req.url.startsWith("/api/clientes/")) {

        const id = Number(req.url.split("/")[3]);

        const clientes = leerClientes();

        const indice = clientes.findIndex(
            (cliente) => cliente.id === id
        );

        if (indice === -1) {

            res.writeHead(404);

            res.end(JSON.stringify({
                error: "Cliente no encontrado"
            }));

            return;
        }

        const clienteEliminado = clientes.splice(indice, 1)[0];

        guardarClientes(clientes);

        res.writeHead(200);

        res.end(JSON.stringify({
            mensaje: "Cliente eliminado correctamente",
            cliente: clienteEliminado
        }));

        return;
    }

    // Ruta no encontrada
    res.writeHead(404);

    res.end(JSON.stringify({
        error: "Ruta no encontrada"
    }));
});

servidor.listen(PORT, "0.0.0.0", () => {

    console.log(`Servidor ejecutándose en el puerto ${PORT}`);

});

