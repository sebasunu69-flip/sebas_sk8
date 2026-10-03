const fs = require("fs");
const path = require("path");

const ARCHIVO_ENTRADA = path.join(
    __dirname,
    "..",
    "data",
    "raw",
    "eventos.csv"
);

const ARCHIVO_SALIDA = path.join(
    __dirname,
    "..",
    "data",
    "reports",
    "reporte_batch.csv"
);

// Leer el CSV
const contenido = fs.readFileSync(
    ARCHIVO_ENTRADA,
    "utf-8"
).trim();

const lineas = contenido.split(/\r?\n/);

const encabezado = lineas[0]
    .split(",")
    .map((campo) => campo.replaceAll('"', ""));

const eventos = [];

for (let i = 1; i < lineas.length; i++) {

    const columnas = lineas[i]
        .split(",")
        .map((campo) => campo.replaceAll('"', ""));

    const evento = {};

    encabezado.forEach((campo, indice) => {
        evento[campo] = columnas[indice];
    });

    evento.status = Number(evento.status);
    evento.duracion_ms = Number(evento.duracion_ms);

    eventos.push(evento);
}

// Agrupar por método y estado
const grupos = {};

for (const evento of eventos) {

    const clave =
        `${evento.metodo}|${evento.status}`;

    if (!grupos[clave]) {

        grupos[clave] = {
            metodo: evento.metodo,
            status: evento.status,
            duraciones: []
        };
    }

    grupos[clave].duraciones.push(
        evento.duracion_ms
    );
}

// Calcular promedio
function promedio(valores) {

    const suma = valores.reduce(
        (total, valor) => total + valor,
        0
    );

    return suma / valores.length;
}

// Calcular percentil
function percentil(valores, porcentaje) {

    const ordenados = [...valores].sort(
        (a, b) => a - b
    );

    const posicion =
        Math.ceil(
            porcentaje * ordenados.length
        ) - 1;

    return ordenados[
        Math.max(0, posicion)
    ];
}

// Crear reporte
let reporte =
    "metodo,status,cantidad,promedio_ms,p95_ms\n";

for (const clave in grupos) {

    const grupo = grupos[clave];

    const cantidad =
        grupo.duraciones.length;

    const promedio_ms =
        promedio(grupo.duraciones);

    const p95_ms =
        percentil(
            grupo.duraciones,
            0.95
        );

    reporte +=
        `${grupo.metodo},${grupo.status},${cantidad},` +
        `${promedio_ms.toFixed(2)},` +
        `${p95_ms.toFixed(2)}\n`;
}

// Crear carpeta reports si no existe
fs.mkdirSync(
    path.dirname(ARCHIVO_SALIDA),
    {
        recursive: true
    }
);

// Guardar reporte
fs.writeFileSync(
    ARCHIVO_SALIDA,
    reporte,
    "utf-8"
);

console.log(
    "Procesamiento Batch terminado."
);

console.log(
    "Eventos procesados:",
    eventos.length
);

console.log(
    "Reporte generado:",
    ARCHIVO_SALIDA
);