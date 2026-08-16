# Tarea: Implementar almacenamiento de archivos con Google Cloud Storage

## Objetivo

Implementar en el **Sistema de Tesorería** la carga, almacenamiento, consulta, visualización, descarga y eliminación de archivos adjuntos utilizando **Google Cloud Storage (GCS)**.

La solución debe integrarse con la arquitectura actual:

- Frontend web desplegado en **Netlify**.
- Backend **Spring Boot** desplegado en **Google Cloud Run**.
- Base de datos PostgreSQL.
- Autenticación y autorización existentes.
- Soporte futuro o actual para múltiples tesorerías.

Los archivos pueden estar asociados a registros como:

- Boletas.
- Facturas.
- Comprobantes.
- Gastos.
- Recaudaciones.
- Otros documentos administrativos.

## Principio de arquitectura

NO guardar los archivos binarios dentro de PostgreSQL.

Guardar:

- El archivo físico en Google Cloud Storage.
- Los metadatos y la referencia al archivo en PostgreSQL.

Arquitectura esperada:

```text
Frontend (Netlify)
        |
        | HTTPS
        v
Backend Spring Boot (Cloud Run)
        |
        +---- PostgreSQL
        |       Metadatos del adjunto
        |
        +---- Google Cloud Storage
                Archivo real
```

## 1. Crear/configurar Google Cloud Storage

Crear un bucket dedicado para documentos del Sistema de Tesorería.

Ejemplo de nombre conceptual:

`tesoreria-documentos`

No asumir que ese nombre está disponible globalmente. Utilizar el nombre real configurado para el proyecto.

El bucket debe ser **privado**.

NO habilitar acceso público general.

No utilizar `allUsers` ni `allAuthenticatedUsers` para permitir lectura de documentos.

## 2. Región

Siempre que sea razonable, utilizar una ubicación compatible/cercana a la región en la que actualmente se ejecuta el backend de Cloud Run.

Revisar primero la configuración real del proyecto antes de crear recursos.

## 3. Service Account de Cloud Run

Identificar la Service Account que utiliza actualmente el servicio backend de Cloud Run.

Otorgarle únicamente los permisos necesarios sobre el bucket.

Debe poder:

- Crear objetos.
- Leer objetos.
- Eliminar objetos cuando la aplicación autorice una eliminación.
- Consultar metadatos necesarios.

Aplicar principio de mínimo privilegio.

NO introducir archivos JSON de claves de Service Account dentro del repositorio.

NO subir credenciales a GitHub.

NO incluir claves privadas en variables del frontend.

En producción, utilizar las credenciales proporcionadas por la identidad de la Service Account de Cloud Run / Application Default Credentials.

## 4. Dependencia Java

Agregar al backend la dependencia oficial de Google Cloud Storage adecuada al sistema de build actual.

El proyecto debe continuar compilando con la versión de Java utilizada actualmente.

No actualizar versiones globales innecesariamente.

## 5. Configuración

Agregar configuración mediante variables de entorno.

Ejemplo conceptual:

```text
GCS_BUCKET_NAME
```

Opcionalmente:

```text
GCS_ENABLED
GCS_SIGNED_URL_EXPIRATION_MINUTES
GCS_MAX_FILE_SIZE_MB
```

No hardcodear nombres de bucket específicos de producción dentro del código Java.

Integrar las variables con la configuración Spring Boot existente.

## 6. Servicio de almacenamiento

Crear una abstracción clara para almacenamiento.

Ejemplo conceptual:

```java
public interface FileStorageService {
    StoredFile upload(...);
    FileAccessResult getAccess(...);
    void delete(...);
}
```

Implementar:

```text
GoogleCloudStorageService
```

Esto permitirá cambiar de proveedor en el futuro sin acoplar controladores y lógica de negocio directamente a GCS.

## 7. Organización de objetos en el bucket

Los documentos deben quedar separados por tesorería.

NO utilizar solamente el nombre original enviado por el usuario.

Ejemplo:

```text
tesorerias/{tesoreriaId}/gastos/{gastoId}/2026/08/{uuid}.pdf
```

o:

```text
tesorerias/{tesoreriaId}/documentos/{uuid}.pdf
```

La estructura exacta debe adaptarse al dominio real del proyecto.

Requisitos:

- Incluir `tesoreriaId`.
- Utilizar UUID para evitar colisiones.
- Conservar la extensión validada cuando sea necesaria.
- No permitir que el cliente decida libremente el path interno del bucket.
- Prevenir path traversal como `../../archivo`.

## 8. Tabla de documentos adjuntos

Crear una entidad/tabla independiente para los adjuntos.

NO agregar columnas como `archivo1`, `archivo2`, `archivo3` a la entidad de gasto.

Una relación uno-a-muchos debe permitir múltiples documentos.

Ejemplo conceptual:

```text
documento_adjunto
--------------------------------
id
tesoreria_id
registro_id
tipo_registro
nombre_original
storage_object_name
content_type
extension
tamano_bytes
subido_por_usuario_id
created_at
updated_at
```

Adaptar nombres y relaciones a las convenciones existentes.

No romper migraciones históricas existentes.

Crear una **nueva migración Flyway**.

No modificar archivos de migraciones Flyway que ya hayan sido ejecutados en producción.

## 9. Tipos de archivos permitidos

Permitir inicialmente:

### PDF
- `.pdf`
- `application/pdf`

### Imágenes
- `.jpg`
- `.jpeg`
- `.png`
- `.webp`

### Microsoft Word
- `.doc`
- `.docx`

### Microsoft Excel
- `.xls`
- `.xlsx`

Validar extensión, MIME type, tamaño, archivo vacío y nombre.

No confiar exclusivamente en `MultipartFile.getContentType()`.

## 10. Tamaño máximo

Definir un límite configurable.

Valor inicial recomendado:

```text
10 MB por archivo
```

Variable:

```text
GCS_MAX_FILE_SIZE_MB=10
```

Configurar también los límites multipart de Spring Boot.

## 11. Seguridad y autorización

Antes de subir, consultar, descargar o eliminar un archivo, el backend debe verificar:

1. Usuario autenticado.
2. Tesorería activa/correcta.
3. Que el registro pertenece a esa tesorería.
4. Que el usuario tiene permisos para realizar la operación.
5. Que el documento solicitado pertenece realmente al registro/tesorería.

Nunca confiar en un `tesoreriaId` recibido del frontend sin validarlo.

Evitar vulnerabilidades IDOR/BOLA.

## 12. Subida

Crear un endpoint consistente con el proyecto.

Ejemplo conceptual:

```http
POST /api/gastos/{gastoId}/adjuntos
Content-Type: multipart/form-data
```

Proceso:

```text
1. Autenticar.
2. Validar permisos.
3. Validar gasto/registro.
4. Validar archivo.
5. Generar UUID/path.
6. Subir a GCS.
7. Guardar metadatos en PostgreSQL.
8. Devolver DTO.
```

## 13. Consistencia entre GCS y PostgreSQL

Evitar objetos huérfanos.

Si la subida a GCS funciona pero falla el insert en PostgreSQL, intentar eliminar el objeto recién creado.

Manejar de forma segura fallas parciales de eliminación o persistencia.

## 14. Listar documentos

Crear endpoint para consultar adjuntos.

Ejemplo:

```http
GET /api/gastos/{gastoId}/adjuntos
```

No devolver el path interno del bucket si el frontend no lo necesita.

## 15. Visualización y descarga

El bucket debe permanecer privado.

Implementar una de estas alternativas:

### Alternativa A: Backend proxy
El backend lee desde GCS y entrega el archivo al usuario.

### Alternativa B: Signed URL temporal
El backend valida permisos y genera una URL firmada temporal.

Preferir Signed URLs si encaja correctamente con la identidad de Cloud Run.

Expiración recomendada:

```text
5 minutos
```

Configurable con:

```text
GCS_SIGNED_URL_EXPIRATION_MINUTES=5
```

## 16. Frontend

Agregar una sección de adjuntos en el registro de gasto/boleta.

Ejemplo:

```text
Documentos adjuntos

[ Seleccionar archivos ]

PDF, Word, Excel o imágenes
Máximo 10 MB por archivo

boleta.pdf              1.2 MB   [X]
comprobante.jpg         850 KB   [X]
```

Debe funcionar en escritorio, tablet y celular.

## 17. Vista de documentos

Mostrar acciones según tipo:

### PDF
- Ver
- Descargar
- Eliminar

### Imágenes
- Ver
- Descargar
- Eliminar

### Word / Excel
- Descargar
- Eliminar

No es obligatorio renderizar Word o Excel dentro del navegador.

## 18. Eliminación

Crear endpoint:

```http
DELETE /api/documentos/{documentoId}
```

Validar autenticación, autorización, tesorería y pertenencia del documento.

Eliminar el objeto de GCS y actualizar/eliminar la metadata correspondiente.

## 19. PWA / Service Worker

Si el frontend ya es PWA:

**NO cachear documentos privados.**

No cachear:

- PDFs privados.
- Word.
- Excel.
- Imágenes privadas.
- URLs firmadas.
- Endpoints de documentos.
- `/api/*`.

## 20. CORS

Configurar CORS en el bucket sólo si realmente se necesita.

Si se usan Signed URLs desde navegador, permitir únicamente los orígenes y métodos necesarios.

No usar `*` indiscriminadamente para documentos privados.

## 21. Auditoría y logs

Si existe auditoría, registrar eventos:

```text
DOCUMENT_UPLOADED
DOCUMENT_DOWNLOADED
DOCUMENT_DELETED
```

Logs útiles:

```text
documentId
tesoreriaId
registroId
storageObjectName
resultado
```

No registrar contenido de documentos, tokens, credenciales ni URLs firmadas completas.

## 22. Tests backend

Agregar pruebas para:

- subida válida;
- archivo demasiado grande;
- MIME no permitido;
- extensión no permitida;
- usuario sin permiso;
- documento de otra tesorería;
- listado;
- acceso;
- eliminación;
- error de Storage;
- múltiples archivos.

Mockear `FileStorageService` cuando corresponda.

Los tests normales no deben depender de acceso real a Google Cloud.

## 23. Migraciones Flyway

Crear una nueva migración, por ejemplo:

```text
VXX__create_documento_adjunto.sql
```

Usar el próximo número real de la secuencia existente.

**CRÍTICO: NO modificar migraciones históricas ya aplicadas.**

## 24. Variables de Cloud Run

Al finalizar indicar exactamente las variables nuevas requeridas, por ejemplo:

```text
GCS_BUCKET_NAME=...
GCS_MAX_FILE_SIZE_MB=10
GCS_SIGNED_URL_EXPIRATION_MINUTES=5
```

## 25. IAM

Documentar qué rol o permisos se agregaron a la Service Account del backend.

No otorgar roles amplios como `Owner` o `Editor` sólo para hacer funcionar Storage.

## 26. Desarrollo local

Permitir desarrollo local de forma segura.

Se puede usar:

- Application Default Credentials de `gcloud`;
- configuración específica de desarrollo;
- mock local de `FileStorageService`.

No guardar credenciales de producción en el repositorio.

## 27. Compatibilidad multi-tenant

Todas las consultas y operaciones de documentos deben respetar el aislamiento por tesorería.

Un usuario de una tesorería nunca debe poder acceder a documentos de otra.

## 28. Entrega esperada

Al finalizar, el agente debe indicar:

### Archivos creados
La lista real de clases, DTOs, migraciones y componentes creados.

### Archivos modificados
La lista exacta.

### Google Cloud
- bucket utilizado;
- región;
- Service Account;
- permisos IAM;
- variables de entorno.

### Base de datos
- migración creada;
- tabla creada;
- índices y constraints.

### API
Documentar endpoints finales.

### Frontend
Explicar cómo probar:
- cargar;
- ver;
- descargar;
- eliminar.

## 29. Criterios de aceptación

- [ ] Backend compila.
- [ ] Tests existentes siguen pasando.
- [ ] Nuevas pruebas pasan.
- [ ] Se puede subir PDF.
- [ ] Se puede subir imagen.
- [ ] Se puede subir DOC/DOCX.
- [ ] Se puede subir XLS/XLSX.
- [ ] Se rechazan formatos no permitidos.
- [ ] Se rechazan archivos mayores al límite.
- [ ] El archivo queda asociado al registro correcto.
- [ ] Los archivos se guardan en GCS.
- [ ] PostgreSQL guarda sólo metadata/referencia.
- [ ] El bucket no es público.
- [ ] Un usuario no puede acceder a otra tesorería.
- [ ] Se puede visualizar PDF de forma segura.
- [ ] Se pueden descargar Word y Excel.
- [ ] Se puede eliminar un documento autorizado.
- [ ] No existen credenciales GCP en el frontend.
- [ ] No existen claves JSON de Service Account en el repositorio.
- [ ] La PWA no cachea documentos privados.
- [ ] Funciona después del despliegue en Cloud Run y Netlify.

## Instrucción final para el agente

Antes de escribir código, inspecciona la implementación actual del proyecto y adapta esta tarea a sus patrones existentes.

No asumas nombres de entidades, endpoints, tablas, roles o componentes si ya existen equivalentes.

Prioriza reutilizar la arquitectura y convenciones actuales.

No modifiques migraciones Flyway históricas.

No debilites autenticación ni autorización para facilitar la integración.

No hagas público el bucket.

No almacenes archivos binarios dentro de PostgreSQL.

Al terminar, ejecuta las pruebas y el build disponibles y entrega un resumen de todos los cambios, junto con los pasos concretos que el desarrollador debe realizar en Google Cloud para dejar la funcionalidad operativa en producción.
