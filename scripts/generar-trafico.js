const http = require("http");

const baseUrl = process.argv[2] || "http://localhost:3000";
const total = Number(process.argv[3] || 100);
const concurrencia = Number(process.argv[4] || 5);

const metodos = ["GET", "POST", "PUT", "DELETE"];

function realizarPeticion(metodo, ruta) {
    return new Promise((resolve) => {

        const url = new URL(ruta, baseUrl);

        let cuerpo = null;

        if (metodo === "POST") {
            cuerpo = JSON.stringify({
                nombre: "Cliente prueba",
                correo: "prueba@example.com"
            });
        }

        if (metodo === "PUT") {
            cuerpo = JSON.stringify({
                nombre: "Cliente actualizado",
                correo: "actualizado@example.com"
            });
        }

        const opciones = {
            hostname: url.hostname,
            port: url.port || 80,
            path: url.pathname,
            method: metodo,
            headers: {}
        };

        if (cuerpo) {
            opciones.headers["Content-Type"] = "application/json";
            opciones.headers["Content-Length"] =
                Buffer.byteLength(cuerpo);
        }

        const req = http.request(opciones, (res) => {

            res.on("data", () => {});

            res.on("end", () => {
                resolve({
                    metodo,
                    ruta,
                    status: res.statusCode
                });
            });
        });

        req.on("error", (error) => {
            resolve({
                metodo,
                ruta,
                error: error.message
            });
        });

        if (cuerpo) {
            req.write(cuerpo);
        }

        req.end();
    });
}

async function trabajador(inicio, fin) {

    for (let i = inicio; i < fin; i++) {

        let metodo = metodos[i % metodos.length];

        let ruta = "/api/laboratorio/evento";

        // Cada 7 solicitudes probamos una ruta inexistente
        if (i % 7 === 0) {
            ruta = "/api/clientes/999999";
        }

        const resultado = await realizarPeticion(
            metodo,
            ruta
        );

        console.log(
            `${i + 1}/${total}`,
            resultado
        );
    }
}

async function main() {

    console.log("Generador de tráfico HTTP");
    console.log("URL:", baseUrl);
    console.log("Total:", total);
    console.log("Concurrencia:", concurrencia);

    const tareas = [];

    const tamaño = Math.ceil(total / concurrencia);

    for (let i = 0; i < concurrencia; i++) {

        const inicio = i * tamaño;
        const fin = Math.min(
            inicio + tamaño,
            total
        );

        if (inicio < fin) {
            tareas.push(
                trabajador(inicio, fin)
            );
        }
    }

    await Promise.all(tareas);

    console.log("Tráfico terminado.");
}

main();