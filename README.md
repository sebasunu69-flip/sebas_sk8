# Laboratorio Full Stack HTTP

Proyecto académico de Ingeniería Informática para practicar la comunicación entre un frontend desarrollado con React y un backend desarrollado con Node.js mediante el protocolo HTTP.

El proyecto implementa un CRUD de clientes utilizando un archivo CSV como almacenamiento de datos y posteriormente se despliega en una instancia Amazon EC2.

## Tecnologías utilizadas

- Node.js
- React
- Vite
- JavaScript
- HTTP
- CORS
- Git
- GitHub
- PM2
- Nginx
- Amazon EC2
- Archivo CSV

## Arquitectura del proyecto

El proyecto está dividido en dos aplicaciones:

- **Frontend:** aplicación React ejecutada mediante Nginx en el puerto `8080`.
- **Backend:** API desarrollada con Node.js ejecutada mediante PM2 en el puerto `3000`.
- **Datos:** archivo `clientes.csv` utilizado como almacenamiento.

La comunicación se realiza mediante solicitudes HTTP.

```text
Navegador
    |
    | HTTP
    v
Nginx :8080
    |
    | Frontend React
    v
React
    |
    | HTTP + CORS
    v
Node.js :3000
    |
    v
clientes.csv