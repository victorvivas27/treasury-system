# Arquitectura dentro de Tesorería

La aplicación incorpora **Arquitectura del sistema** con un icono de ramas en la barra de navegación del Home, junto a Administraciones. También está disponible en **Gestión → Arquitectura del sistema**. Ambos enlaces llevan a `/admin/arquitectura` y aparecen únicamente para la cuenta dueña autorizada por el servidor. Permite seleccionar las seis vistas del módulo 1, consultarlas dentro de Tesorería y ampliar el visor. Los módulos siguientes se agregarán al catálogo cuando estén documentados y validados.

## Acceso del dueño

La autorización se comprueba en el servidor para el catálogo y para cada HTML. ADMIN y USER no tienen acceso. SUPER_ADMIN tampoco basta si existe más de una cuenta con ese rol.

- Si hay una sola cuenta SUPER_ADMIN y `ARCHITECTURE_OWNER_USER_ID` no está establecido, esa cuenta tiene acceso.
- Si existen varias, establece `ARCHITECTURE_OWNER_USER_ID` con el ID de la cuenta dueña. Únicamente esa cuenta puede entrar y debe conservar SUPER_ADMIN, estar habilitada y no bloqueada.
- Ante varias cuentas SUPER_ADMIN sin un ID configurado, el acceso queda cerrado para todas. Un ID inexistente, negativo o de otro rol tampoco habilita acceso.

La variable se lee como `app.architecture.owner-user-id`. Docker Compose la transmite al backend. Para otro despliegue, configúrala en el entorno del servicio. Reinicia el backend tras cambiarla. No hay correos, contraseñas ni tokens de propietario incrustados en el código.

El menú consulta el permiso del servidor antes de mostrarse; la ruta vuelve a comprobarlo. La API aplica autenticación JWT, revocación y la política de dueño independientemente de la interfaz.

## Entrega privada y visor

| Entrada | Respuesta |
| --- | --- |
| `GET /api/v1/admin/architecture/access` | Permiso de la cuenta SUPER_ADMIN actual, sin contenido de gráficos |
| `GET /api/v1/admin/architecture` | Catálogo del módulo 1, únicamente para el dueño |
| `GET /api/v1/admin/architecture/diagrams/{id}` | HTML de una vista permitida, únicamente para el dueño |

En HTTP las rutas llevan el context path `/tesoreria`. El cliente usa su interceptor autenticado habitual: ningún token viaja en parámetros de URL. Las respuestas llevan `Cache-Control: no-store`; los HTML se entregan como descarga binaria con `nosniff` y se cargan en un iframe con origen aislado. Sus scripts no acceden al DOM ni al almacenamiento de la sesión de Tesorería. La política del visor bloquea conexiones de red desde el gráfico; los enlaces a fuentes pueden abrir GitHub en otra pestaña.

Los HTML se empaquetan en `backend/src/main/resources/architecture-diagrams`, fuera de `static` y `public`. No se copian al frontend ni a GitHub Pages. La API acepta solo los seis identificadores del catálogo y rechaza archivos arbitrarios. La documentación local en `docs/architecture` sigue accesible a quien tenga una copia del repositorio; la protección de la aplicación no cambia los permisos del repositorio.

## Actualizar gráficos

1. Actualiza las fuentes JSON y su revisión, comprobando el código.
2. Ejecuta Archify y obtén recibos `finalize` vigentes con todas las etapas aprobadas.
3. Desde la raíz del repositorio, ejecuta `node scripts/sync-architecture-artifacts.mjs`. El script verifica las huellas de JSON y HTML antes de copiar.
4. Incluye documentación y copias privadas en el mismo cambio. `processResources` impide compilar desde un checkout completo si las copias difieren.
5. Si agregas un módulo, amplía el catálogo y las pruebas. Ejecuta las comprobaciones del backend y del frontend y reconstruye ambos antes de desplegar.

Docker conserva su contexto `backend/`: las copias privadas viajan con él y se empaquetan en el JAR. Esta integración no ejecuta un despliegue remoto.

## Verificación de la integración

- `gradlew.bat check`: 658 pruebas, sin fallos, errores ni omisiones; PMD y JaCoCo aprobados. Cobertura de líneas: 80,85 %.
- Frontend: 442 pruebas en 80 archivos, aprobadas con `pnpm exec vitest run --maxWorkers=2`; lint y build aprobados. La primera ejecución con el paralelismo predeterminado agotó los 5 segundos de una prueba de Dashboard; se repitió con menos procesos, conservando el límite y la prueba.
- Chrome: página React con API simulada y los seis HTML reales. Se comprobó renderizado, cambio de vista, alternancia de tema y bloqueo de acceso al documento padre desde cada iframe. La autorización real se probó además con MockMvc y el contexto Spring, incluyendo acceso directo, cuenta ambigua y recursos fuera de la API.
- JAR: las seis vistas están en `BOOT-INF/classes/architecture-diagrams/`, sin una copia pública en `static`.

La instancia del backend que ya estuviera ejecutándose debe reiniciarse con la nueva compilación para incorporar la API. El frontend en desarrollo recibe las nuevas rutas mediante Vite; para un entorno publicado, hay que desplegar los nuevos builds de ambos servicios.
