const http = require("http");

console.log("Iniciando servidor...");

const PORT = 3000;

const servidor = http.createServer((req, res) => {

    if (req.method === "GET" && req.url === "/") {

        res.writeHead(200, {
            "Content-Type": "application/json; charset=utf-8"
        });

        res.end(JSON.stringify({
            mensaje: "servidor activo"
        }));

        return;
    }

    if (req.method === "GET" && req.url === "/hola") {

        res.writeHead(200, {
            "Content-Type": "application/json; charset=utf-8"
        });

        res.end(JSON.stringify({
            mensaje: "Hola, cliente 👋"
        }));

        return;
    }

    res.writeHead(404, {
        "Content-Type": "application/json; charset=utf-8"
    });

    res.end(JSON.stringify({
        error: "Ruta no encontrada"
    }));

});

servidor.listen(PORT, "0.0.0.0", () => {
    console.log(`Servidor ejecutándose en el puerto ${PORT}`);
});