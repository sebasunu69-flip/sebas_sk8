const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const ARCHIVO = path.join(
    __dirname,
    "..",
    "data",
    "raw",
    "eventos.csv"
);

const CABECERA = "fecha,id,metodo,ruta,status,duracion_ms\n";

const metricas = {
    inicio: new Date().toISOString(),
    total: 0
};

function csv(valor) {
    return '"' + String(valor).replaceAll('"', '""') + '"';
}

function eventLogger(req, res, siguiente) {
    const inicio = process.hrtime.bigint();
    const id = crypto.randomUUID();

    res.setHeader("X-Event-Id", id);

    res.on("finish", () => {
        const ms =
            Number(process.hrtime.bigint() - inicio) / 1e6;

        const ruta = req.url.split("?")[0];

        const fila =
            [
                new Date().toISOString(),
                id,
                req.method,
                ruta,
                res.statusCode,
                ms.toFixed(2)
            ]
                .map(csv)
                .join(",") + "\n";

        fs.mkdirSync(path.dirname(ARCHIVO), {
            recursive: true
        });

        if (!fs.existsSync(ARCHIVO)) {
            fs.writeFileSync(ARCHIVO, CABECERA);
        }

        fs.appendFileSync(ARCHIVO, fila);

        metricas.total += 1;
    });

    siguiente();
}

eventLogger.metricas = metricas;

module.exports = eventLogger;
