# Plan de gráficos interactivos por módulos — Treasury System

Fecha: 2026-10-09.
Estado: módulo 1 generado y validado como piloto; módulo 2 y etapas restantes pendientes.

## Objetivo

Construir gráficos interactivos que permitan entender cada módulo, seguir sus flujos y localizar el código que los implementa. Primero se hará el módulo 1 como piloto; luego se avanzará en orden hasta integrar un mapa general.

Cada gráfico describirá el código disponible al momento de su elaboración. Una relación prevista o pendiente se identificará como tal y no se presentará como implementada.

Los números de este documento son etapas de documentación visual. No son los identificadores SA de la auditoría de seguridad ni necesariamente carpetas independientes del backend. Por ejemplo, eventos escolares está dentro de `treasury`.

## Orden de ejecución

| Etapa | Módulo o vista | Resultado principal | Estado |
| --- | --- | --- | --- |
| 1 | Autenticación, usuarios y seguridad | Login, permisos y ciclo de vida de las sesiones | [Piloto completado](modules/01-auth-security/README.md) |
| 2 | Organizaciones y cursos | Contexto de organización y aislamiento entre cursos | Pendiente |
| 3 | Alumnos | Pantalla, operaciones, persistencia y relaciones | Pendiente |
| 4 | Apoderados | Gestión, pertenencia e invitaciones | Pendiente |
| 5 | Familias | Vínculos entre alumnos y apoderados | Pendiente |
| 6 | Tesorería y pagos | Cuotas, obligaciones, pagos, movimientos y reportes | Pendiente |
| 7 | Eventos escolares | Gastos, recaudación y liquidación | Pendiente |
| 8 | Stands | Productos, ventas y apertura/cierre | Pendiente |
| 9 | Notificaciones y chat | Entrega de mensajes por HTTP y WebSocket | Pendiente |
| 10 | Comunidad | Información del curso, publicaciones y fotografías | Pendiente |
| 11 | Centro de mejoras | Propuestas y gestión administrativa | Pendiente |
| 12 | Infraestructura compartida y navegación | Servicios comunes y recorrido entre pantallas | Pendiente |
| 13 | Mapa general | Conexiones entre los módulos ya documentados | Pendiente |

## Preparación antes del módulo 1

1. Confirmar la versión de Archify y revisar sus instrucciones oficiales vigentes antes de instalarlo o ejecutar comandos.
2. Definir cómo se usará localmente y dónde se guardarán los resultados. Registrar la versión utilizada para poder reproducirlos.
3. Tomar como referencia el commit del proyecto y registrar si hay cambios locales. No mezclar un gráfico antiguo con código nuevo sin señalarlo.
4. Definir una presentación común: frontend, entrada HTTP/WebSocket, aplicación, dominio, persistencia y servicios externos.
5. Usar nombres comprensibles para los componentes y etiquetas explícitas para las conexiones: llama, valida, consulta, guarda, publica o depende de.
6. Preparar un índice de módulos. Esta preparación no implica generar todos los gráficos a la vez.

El módulo 1 se ejecutó con Archify 3.0.1 desde una carpeta temporal aislada. Sus seis gráficos se abren desde el [índice del piloto](modules/01-auth-security/index.html); versiones, evidencias y validaciones están documentadas en su README. La generación de los demás módulos sigue pendiente.

Referencia de la herramienta: [repositorio oficial de Archify](https://github.com/tt-a1i/archify). Su documentación describe diagramas interactivos en HTML y el uso de repositorios como fuente. Las capacidades y los comandos concretos se comprobarán nuevamente al ejecutar el piloto.

## Pasos que se repetirán en cada módulo

1. **Delimitar el alcance.** Escribir qué funciones incluye el módulo y qué conexiones con otros módulos solo aparecerán como referencias.
2. **Inventariar el código.** Localizar páginas, rutas, hooks, repositorios frontend, controladores, DTO, servicios, dominio, adaptadores, entidades, migraciones y pruebas.
3. **Seguir flujos reales.** Elegir los recorridos indicados en la sección del módulo y seguir las llamadas desde la pantalla o entrada hasta la persistencia y la respuesta. Revisar también errores y permisos.
4. **Registrar evidencias.** Para cada componente y relación relevante, anotar el archivo y símbolo que la justifican. Las rutas HTTP y tablas deben verificarse en controladores, entidades y migraciones.
5. **Diseñar las vistas.** Preparar una vista de componentes y las vistas de flujo necesarias. Las dependencias externas al módulo aparecerán con el mismo identificador que usarán en el mapa general.
6. **Generar con Archify.** Elaborar la fuente del diagrama y el HTML interactivo siguiendo las instrucciones de la versión seleccionada. Conservar ambos como artefactos del módulo.
7. **Validar.** Ejecutar el validador disponible en esa versión y revisar en navegador legibilidad, navegación, conexiones y referencias al código. Registrar qué interacciones están disponibles y cuáles no.
8. **Cerrar el módulo.** Corregir discrepancias, completar su README y actualizar el índice con los resultados. Después continuar con el siguiente módulo.

Para cambios exclusivamente documentales se revisarán las rutas, referencias y el diff. Si durante el análisis aparece un defecto del producto, se registrará por separado; modificar el producto requiere definir el alcance de esa reparación y ejecutar sus pruebas correspondientes.

## Módulo 1 — Autenticación, usuarios y seguridad

Este será el piloto para comprobar si el formato de gráficos resulta útil antes de repetirlo en los demás módulos.

**Fuentes iniciales:** `backend/src/main/java/com/tesoreria/user/`, `frontend/src/presentation/pages/auth/`, `frontend/src/presentation/pages/user/`, `frontend/src/presentation/context/AuthContext.tsx`, `frontend/src/core/C-infra/repositories/auth/` y pruebas de autenticación. Revisar también las clases de seguridad y los enlaces con organización y WebSocket.

1. Inventariar login, selección de organización, usuarios, invitaciones, recuperación, cambio de contraseña, renovación y logout. Comprobar en código qué otros mecanismos de autenticación están activos.
2. Dibujar la conexión pantalla → repositorio frontend → controlador → servicio → repositorio backend → tabla.
3. Seguir un login exitoso y un rechazo por credenciales o estado de cuenta.
4. Seguir emisión y rotación de refresh: cookies, CSRF, familia de sesión y JWT de acceso.
5. Seguir cambio y recuperación de contraseña, mostrando la revocación persistente de SA-06 y la transacción que la contiene.
6. Separar la validación HTTP de la conexión WebSocket y señalar los límites de revalidación comprobados en código.
7. Generar una vista de componentes y vistas de login, refresh y cambio/recuperación de contraseña.
8. Validar el piloto y registrar las decisiones de presentación que se repetirán en el módulo 2.

**Criterio de cierre:** se puede seguir cómo comienza, se renueva y se invalida una sesión; las decisiones de permisos tienen evidencia; cada vista distingue implementación comprobada y asuntos pendientes de la auditoría.

## Módulo 2 — Organizaciones y cursos

**Fuentes iniciales:** backend `organization/`, frontend `pages/organization/` y los componentes de selección y contexto de organización.

1. Inventariar gestión de organizaciones y cursos, selección del contexto y roles que intervienen.
2. Seguir cómo una solicitud obtiene la organización activa y cómo esta llega a servicios y consultas.
3. Revisar aislamiento por organización y excepciones explícitas para administración global.
4. Representar la relación entre organización, usuario y pertenencia al curso.
5. Conectar el gráfico de organizaciones con el de autenticación.
6. Generar y validar vistas de selección de curso y de una consulta con contexto de organización.

**Criterio de cierre:** queda claro qué determina el curso de una solicitud y dónde se comprueba el acceso a sus datos.

## Módulo 3 — Alumnos

**Fuentes iniciales:** backend `alumno/` y frontend `pages/alumno/`, junto con sus hooks y repositorios.

1. Inventariar pantallas y operaciones implementadas de alta, consulta, edición y eliminación.
2. Seguir creación y modificación desde el formulario hasta la persistencia.
3. Identificar validaciones y uso del código público del alumno frente al ID interno.
4. Revisar filtros por organización y conexiones con familias.
5. Generar y validar vistas de componentes y del recorrido de gestión de un alumno.

**Criterio de cierre:** operaciones, identificadores y relación con familias coinciden con el código.

## Módulo 4 — Apoderados

**Fuentes iniciales:** backend `apoderado/`, frontend `pages/apoderado/` y los puntos de integración con usuarios e invitaciones.

1. Inventariar gestión de apoderados, estados y vínculos con el curso.
2. Seguir creación, consulta y edición, verificando el uso del código público.
3. Seguir la emisión de una invitación y su conexión con la cuenta de usuario.
4. Revisar los efectos de la pertenencia activa/inactiva sobre el acceso que realmente implementa el sistema.
5. Generar y validar vistas de gestión y de invitación, enlazadas con los módulos 1 y 2.

**Criterio de cierre:** se distingue el registro del apoderado de su cuenta de acceso y se muestra cómo se relacionan.

## Módulo 5 — Familias

**Fuentes iniciales:** backend `familia/` y frontend `pages/familia/`.

1. Inventariar familias, integrantes, parentesco y apoderado principal según el dominio real.
2. Seguir creación de familia y vinculación de alumno/apoderado.
3. Revisar validaciones de referencias y pertenencia al curso.
4. Mostrar `familiaId` y las relaciones persistidas sin confundirlos con códigos públicos.
5. Conectar la familia con cuotas y obligaciones como entradas al módulo 6.
6. Generar y validar vistas de relaciones y de creación/vinculación.

**Criterio de cierre:** se entiende cómo se forma una familia y cómo participa en tesorería.

## Módulo 6 — Tesorería y pagos

**Fuentes iniciales:** backend `treasury/`, frontend `pages/tesoreria/` y `pages/dashboard/`; revisar configuración, adaptadores de pagos y documentación de Mercado Pago.

1. Dividir la documentación en vistas pequeñas: configuración/cuotas; obligaciones/pagos; ingresos/egresos; aportes; resumen/reportes.
2. Seguir configuración anual, asignación de modalidad y generación de obligaciones.
3. Seguir registro de pago y anulación, indicando la transacción y la auditoría comprobadas.
4. Seguir pagos por transferencia y Mercado Pago en vistas propias: solicitud, confirmación y efectos persistidos.
5. Mostrar adjuntos y almacenamiento como dependencias cuando intervengan en el flujo.
6. Seguir consultas de dashboard, reportes y caché sin mezclarlas con las escrituras financieras.
7. Generar y validar las vistas por subárea y un índice interno de tesorería.

**Criterio de cierre:** cada flujo permite distinguir estados, efectos financieros y fuentes de los totales mostrados. Las reglas monetarias se describen desde el código y las pruebas.

## Módulo 7 — Eventos escolares

**Fuentes iniciales:** controlador y servicios de eventos escolares dentro de `treasury/`; localizar sus consumidores frontend en las rutas y pantallas reales.

1. Inventariar eventos, gastos, recaudación y estados implementados.
2. Seguir creación y edición de un evento.
3. Seguir cálculo, confirmación y cancelación de liquidación donde estén implementados.
4. Identificar efectos en tesorería y relación con stands.
5. Generar y validar vistas de ciclo del evento y liquidación.

**Criterio de cierre:** se ve qué cambia al confirmar una liquidación y cuáles son sus conexiones financieras.

## Módulo 8 — Stands

**Fuentes iniciales:** backend `stand/` y frontend `pages/stand/`.

1. Inventariar stands, productos, presentaciones, costos y ventas que existan en el código.
2. Seguir apertura, registro de venta y cierre.
3. Identificar validaciones de estado y permisos en cada transición.
4. Conectar resultados del stand con evento y liquidación cuando el código lo confirme.
5. Generar y validar vistas de componentes y del ciclo de operación del stand.

**Criterio de cierre:** se distinguen estados del stand y efectos de cada operación.

## Módulo 9 — Notificaciones y chat

**Fuentes iniciales:** backend `notification/` y `chat/`; frontend `pages/notificacion/` y `pages/chat/`; configuración WebSocket y consumidores relacionados.

1. Inventariar productores de notificaciones, destinatarios, conversaciones y almacenamiento.
2. Seguir una notificación desde la acción de origen hasta la pantalla del destinatario.
3. Seguir envío y recepción de mensajes de chat, identificando el transporte real.
4. Separar rutas HTTP, conexión WebSocket, destinos STOMP y resolución del usuario.
5. Revisar lectura, permisos y aislamiento de destinatarios; marcar limitaciones de seguridad aún pendientes.
6. Generar y validar vistas de entrega de notificación y mensajería.

**Criterio de cierre:** cada conexión explica quién produce, quién recibe y qué control de acceso se aplica.

## Módulo 10 — Comunidad

**Fuentes iniciales:** backend `community/` y frontend `pages/community/`.

1. Inventariar tablero del curso, información del curso y fotografías.
2. Seguir publicación y consulta del contenido implementado.
3. Revisar permisos y contexto de organización.
4. Identificar almacenamiento de imágenes y servicios compartidos utilizados.
5. Generar y validar vistas de componentes y publicación/lectura.

**Criterio de cierre:** queda documentado cómo se administra y se entrega el contenido del curso.

## Módulo 11 — Centro de mejoras

**Fuentes iniciales:** backend `improvement/` y frontend `pages/improvement/`.

1. Inventariar propuestas, estados y operaciones disponibles para usuarios y administradores.
2. Seguir creación y consulta de una propuesta.
3. Seguir la gestión administrativa y transiciones implementadas.
4. Identificar notificaciones o dependencias adicionales solo cuando tengan evidencia.
5. Generar y validar vistas de propuesta y administración.

**Criterio de cierre:** los recorridos de usuario y administrador están claramente diferenciados.

## Módulo 12 — Infraestructura compartida y navegación

**Fuentes iniciales:** backend `shared/`, configuración y migraciones; frontend `presentation/routers/AppRouter.tsx`, contexto, cliente HTTP y componentes compartidos; configuración de despliegue sin datos secretos.

1. Documentar navegador/frontend, API/backend, base de datos y servicios externos comprobados.
2. Seguir entrada a una ruta protegida y una llamada HTTP con su manejo de respuesta/error.
3. Representar CORS, errores comunes, caché, almacenamiento e instrumentación cuando correspondan.
4. Distinguir configuración de desarrollo, pruebas y producción.
5. Documentar migraciones y controles de calidad como una vista operativa aparte del flujo de negocio.
6. Generar y validar las vistas compartidas, enlazando los módulos que dependen de ellas.

**Criterio de cierre:** las dependencias comunes tienen un único nombre e identidad, sin repetirse como si fueran componentes distintos.

## Etapa 13 — Mapa general

1. Usar exclusivamente módulos y conexiones ya documentados.
2. Crear una vista general con una entrada por módulo y enlaces hacia sus gráficos detallados.
3. Integrar conexiones entre usuarios, organizaciones, alumnos, apoderados, familias, tesorería, eventos y stands; añadir comunicación y servicios transversales.
4. Comprobar que la navegación entre gráficos usa rutas relativas que funcionan desde el índice.
5. Revisar el mapa en conjunto y registrar la versión del proyecto representada.

**Criterio de cierre:** desde el índice se puede entrar a cada módulo y entender sus dependencias sin recorrer un gráfico único saturado.

## Organización prevista de los archivos

```text
docs/architecture/
  PLAN_ARCHIFY_POR_MODULOS.md
  index.md
  modules/
    01-auth-security/
    02-organizations/
    03-students/
    04-guardians/
    05-families/
    06-treasury/
    07-school-events/
    08-stands/
    09-notifications-chat/
    10-community/
    11-improvements/
    12-shared-infrastructure/
  overview/
```

Por módulo se conservará un `README.md` con alcance, flujos, dependencias, versión y validaciones; un `evidence.md` con archivos y símbolos; las fuentes del diagrama en el formato de Archify seleccionado; y las vistas HTML generadas. Los nombres concretos de esas fuentes se decidirán al comprobar la versión de la herramienta en el piloto.

## Lista de cierre de cada módulo

- [ ] Alcance y funciones documentados.
- [ ] Componentes y conexiones respaldados por archivos/símbolos existentes.
- [ ] Identificadores, estados, permisos y organización comprobados.
- [ ] Vistas de arquitectura y flujos generadas.
- [ ] Fuente del diagrama conservada y validada.
- [ ] HTML revisado en navegador y navegación comprobada.
- [ ] Dependencias externas e incertidumbres identificadas.
- [ ] README, evidencias e índice actualizados.
- [ ] Versión de Archify y versión del proyecto registradas.

## Próxima ejecución

El siguiente trabajo será el **módulo 1: autenticación, usuarios y seguridad**. Se completará como piloto, se revisará su utilidad y luego se continuará con el **módulo 2: organizaciones y cursos**, siguiendo el orden de este documento.
