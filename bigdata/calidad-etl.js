const fs = require("fs");
const path = require("path");

const ARCHIVO_ENTRADA = path.join(
    __dirname,
    "..",
    "data",
    "raw",
    "eventos.csv"
);

const ARCHIVO_VALIDOS = path.join(
    __dirname,
    "..",
    "data",
    "processed",
    "eventos_validos.csv"
);

const ARCHIVO_RECHAZADOS = path.join(
    __dirname,
    "..",
    "data",
    "processed",
    "eventos_rechazados.csv"
);

const ARCHIVO_CALIDAD = path.join(
    __dirname,
    "..",
    "data",
    "reports",
    "calidad.csv"
);

// Leer archivo de eventos
const contenido = fs.readFileSync(
    ARCHIVO_ENTRADA,
    "utf-8"
).trim();

const lineas = contenido.split(/\r?\n/);

const encabezado = lineas[0]
    .split(",")
    .map((campo) => campo.replaceAll('"', ""));

const validos = [];
const rechazados = [];

for (let i = 1; i < lineas.length; i++) {

    const columnas = lineas[i]
        .split(",")
        .map((campo) => campo.replaceAll('"', ""));

    const evento = {};

    encabezado.forEach((campo, indice) => {
        evento[campo] = columnas[indice];
    });

    const status = Number(evento.status);
    const duracion = Number(evento.duracion_ms);

    const fechaValida =
        !Number.isNaN(
            Date.parse(evento.fecha)
        );

    const statusValido =
        Number.isInteger(status) &&
        status >= 100 &&
        status <= 599;

    const duracionValida =
        Number.isFinite(duracion) &&
        duracion >= 0;

    const camposCompletos =
        evento.fecha &&
        evento.id &&
        evento.metodo &&
        evento.ruta &&
        evento.status !== undefined &&
        evento.duracion_ms !== undefined;

    if (
        camposCompletos &&
        fechaValida &&
        statusValido &&
        duracionValida
    ) {

        evento.status = status;
        evento.duracion_ms = duracion;

        validos.push(evento);

    } else {

        rechazados.push({
            ...evento,
            motivo: "Registro inválido"
        });
    }
}

// Convertir eventos a CSV
function eventoCSV(evento) {

    return [
        evento.fecha,
        evento.id,
        evento.metodo,
        evento.ruta,
        evento.status,
        evento.duracion_ms
    ]
        .map((valor) => `"${String(valor).replaceAll('"', '""')}"`)
        .join(",");
}

// Crear carpetas de salida
fs.mkdirSync(
    path.dirname(ARCHIVO_VALIDOS),
    {
        recursive: true
    }
);

fs.mkdirSync(
    path.dirname(ARCHIVO_CALIDAD),
    {
        recursive: true
    }
);

// Guardar eventos válidos
let contenidoValidos =
    "fecha,id,metodo,ruta,status,duracion_ms\n";

validos.forEach((evento) => {

    contenidoValidos +=
        eventoCSV(evento) + "\n";
});

fs.writeFileSync(
    ARCHIVO_VALIDOS,
    contenidoValidos,
    "utf-8"
);

// Guardar eventos rechazados
let contenidoRechazados =
    "fecha,id,metodo,ruta,status,duracion_ms,motivo\n";

rechazados.forEach((evento) => {

    contenidoRechazados += [
        evento.fecha,
        evento.id,
        evento.metodo,
        evento.ruta,
        evento.status,
        evento.duracion_ms,
        evento.motivo
    ]
        .map((valor) => `"${String(valor).replaceAll('"', '""')}"`)
        .join(",") + "\n";
});

fs.writeFileSync(
    ARCHIVO_RECHAZADOS,
    contenidoRechazados,
    "utf-8"
);

// Generar reporte de calidad
const total =
    validos.length + rechazados.length;

const porcentajeValidos =
    total > 0
        ? (validos.length / total) * 100
        : 0;

const porcentajeRechazados =
    total > 0
        ? (rechazados.length / total) * 100
        : 0;

let calidad =
    "metrica,valor\n";

calidad +=
    `total_eventos,${total}\n`;

calidad +=
    `eventos_validos,${validos.length}\n`;

calidad +=
    `eventos_rechazados,${rechazados.length}\n`;

calidad +=
    `porcentaje_validos,${porcentajeValidos.toFixed(2)}\n`;

calidad +=
    `porcentaje_rechazados,${porcentajeRechazados.toFixed(2)}\n`;

fs.writeFileSync(
    ARCHIVO_CALIDAD,
    calidad,
    "utf-8"
);

console.log("ETL y control de calidad terminado.");
console.log("Total de eventos:", total);
console.log("Eventos válidos:", validos.length);
console.log("Eventos rechazados:", rechazados.length);
console.log(
    "Archivo válidos:",
    ARCHIVO_VALIDOS
);
console.log(
    "Archivo rechazados:",
    ARCHIVO_RECHAZADOS
);
console.log(
    "Reporte de calidad:",
    ARCHIVO_CALIDAD
);