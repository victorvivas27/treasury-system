Revisa todo el repositorio y determina qué configuraciones faltan para desplegar el proyecto en Google Cloud mediante GitHub Actions, Artifact Registry y Cloud Run, usando Workload Identity Federation y sin claves JSON.

Antes de modificar cualquier archivo, analiza y entrega un informe con:

1. La estructura actual del proyecto.
2. Los lenguajes, frameworks y versiones detectadas.
3. Si contiene backend, frontend o ambos.
4. El sistema de compilación utilizado:
   - Maven o Gradle para Java.
   - npm, yarn o pnpm para el frontend.
5. La versión de Java y Node.js requerida.
6. Si existe un Dockerfile y si está correctamente configurado para Cloud Run.
7. Si existe un archivo .dockerignore.
8. Si la aplicación escucha el puerto definido por la variable de entorno PORT.
9. Si existen perfiles o configuraciones de producción.
10. Qué variables de entorno y secretos necesita la aplicación.
11. Si existen archivos .env, credenciales o secretos que no deban subirse a GitHub.
12. Si el archivo .gitignore está correctamente configurado.
13. Si existe la carpeta .github/workflows y algún workflow de despliegue.
14. Qué configuración falta para:
    - compilar el proyecto;
    - ejecutar las pruebas;
    - construir una imagen Docker;
    - publicar la imagen en Artifact Registry;
    - desplegarla en Cloud Run.
15. Qué permisos necesitará la cuenta de servicio de Google Cloud.
16. Qué variables deben crearse en GitHub Actions.
17. Qué servicios externos utiliza el proyecto, como bases de datos, Firebase, APIs o almacenamiento.
18. Posibles errores que impedirían ejecutar el proyecto dentro de un contenedor.
19. Recomendaciones de seguridad y producción.
20. Una lista ordenada de los cambios necesarios, desde el más urgente hasta el opcional.

No realices cambios todavía.

No inventes configuraciones. Basa el informe únicamente en los archivos encontrados en el repositorio.

Cuando encuentres datos sensibles, no muestres sus valores. Indica solamente el nombre del archivo, la variable o el secreto afectado.

Al finalizar, presenta:
- Estado actual.
- Configuraciones faltantes.
- Archivos que habría que crear o modificar.
- Variables de GitHub necesarias.
- Variables de Cloud Run necesarias.
- Riesgos o bloqueos detectados.
- Plan de implementación por etapas.
