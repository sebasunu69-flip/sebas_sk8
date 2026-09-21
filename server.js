const http = require("http");

const PORT = 3000;

// Datos temporales
let usuarios = [
    {
        id: 1,
        nombre: "Sebas"
    },
    {
        id: 2,
        nombre: "Juan"
    }
];

const servidor = http.createServer((req, res) => {

    console.log("RECIBIENDO:", req.method, req.url);

    // Permitir JSON
    res.setHeader("Content-Type", "application/json; charset=utf-8");

    // GET - Obtener todos los usuarios
    if (req.method === "GET" && req.url === "/usuarios") {

        res.writeHead(200);
        res.end(JSON.stringify(usuarios));

        return;
    }

    // POST - Crear un nuevo usuario
    if (req.method === "POST" && req.url === "/usuarios") {

        let cuerpo = "";

        req.on("data", (parte) => {
            cuerpo += parte;
        });

        req.on("end", () => {

            const nuevoUsuario = JSON.parse(cuerpo);

            nuevoUsuario.id = usuarios.length + 1;

            usuarios.push(nuevoUsuario);

            res.writeHead(201);
            res.end(JSON.stringify({
                mensaje: "Usuario creado correctamente",
                usuario: nuevoUsuario
            }));
        });

        return;
    }

    // PUT - Actualizar un usuario
    if (req.method === "PUT" && req.url.startsWith("/usuarios/")) {

        let cuerpo = "";

        req.on("data", (parte) => {
            cuerpo += parte;
        });

        req.on("end", () => {

            const id = parseInt(req.url.split("/")[2]);

            const datosActualizados = JSON.parse(cuerpo);

            const usuario = usuarios.find((usuario) => usuario.id === id);

            if (!usuario) {

                res.writeHead(404);

                res.end(JSON.stringify({
                    error: "Usuario no encontrado"
                }));

                return;
            }

            usuario.nombre = datosActualizados.nombre;

            res.writeHead(200);

            res.end(JSON.stringify({
                mensaje: "Usuario actualizado correctamente",
                usuario: usuario
            }));
        });

        return;
    }

    // DELETE - Eliminar un usuario
    if (req.method === "DELETE" && req.url.startsWith("/usuarios/")) {

        const id = parseInt(req.url.split("/")[2]);

        const indice = usuarios.findIndex((usuario) => usuario.id === id);

        if (indice === -1) {

            res.writeHead(404);

            res.end(JSON.stringify({
                error: "Usuario no encontrado"
            }));

            return;
        }

        const usuarioEliminado = usuarios.splice(indice, 1);

        res.writeHead(200);

        res.end(JSON.stringify({
            mensaje: "Usuario eliminado correctamente",
            usuario: usuarioEliminado[0]
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