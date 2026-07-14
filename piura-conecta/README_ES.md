PIURA CONECTA — Frontend (React + Vite)
=====================================

Resumen
-------
Proyecto de interfaz para la plataforma `Piura Conecta`. Arquitectura basada en funcionalidades (`src/modulos/...`) y componentes atómicos.

Roles
-----
- `estudiante`: solo lectura (visualizar y descargar).
- `profesor` / `admin`: permisos de gestión (crear, subir, eliminar).

Instalación y ejecución (Arch Linux)
----------------------------------

1. Instalar dependencias (en la carpeta del frontend):

```bash
cd piura-conecta
npm install
```

2. Ejecutar en modo desarrollo:

```bash
npm run dev
```

3. Construir para producción:

```bash
npm run build
```

Integración con el backend
--------------------------
- El frontend usa la variable de entorno `VITE_API_URL` si está definida, por ejemplo `VITE_API_URL=http://localhost:3000`. Si no existe, por defecto utiliza `http://localhost:3000`.
	Ajusta `src/servicios/api.js` si deseas otro comportamiento.
- Para que funciones como subir archivos y administrar contenido funcionen, arranca el backend y aplica las migraciones.

Archivos importantes
-------------------
- `src/modulos/` — módulos por funcionalidad (videos, biblioteca, foro, examenes, progreso, descargas).
- `src/servicios/api.js` — cliente HTTP centralizado.
- `src/plantillas/PlantillaPrincipal.jsx` — layout principal.

Notas de localización
---------------------
Todo el código y mensajes en la interfaz han sido traducidos a español. Variables clave están en español para facilitar mantenimiento.
