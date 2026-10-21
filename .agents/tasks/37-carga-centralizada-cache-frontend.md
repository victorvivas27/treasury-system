# Tarea 37 — Carga centralizada y caché temporal del frontend

Fecha de registro: 21/10/2026.

Estado: patrón implementado en las vistas indicadas en el mapa de código. La migración del resto de la aplicación es progresiva; este documento no afirma que todas las pantallas hayan sido migradas.

## Objetivo y alcance global

Evitar cargas repetidas al navegar, reemplazar los skeletons de las vistas migradas por un loader compartido y reducir saltos visuales. Mantener el diseño adaptable, las autorizaciones y las reglas financieras existentes.

Esta tarea documenta el funcionamiento común, sus límites y el procedimiento para extenderlo o diagnosticarlo. Complementa las tareas 10 (estrategia de caché) y 11 (skeletons): describe la implementación actual del frontend, sin redefinir la caché del servidor ni exigir eliminar skeletons que todavía usan otras pantallas.

No se modificaron contratos HTTP, esquema de base de datos ni reglas de cálculo por esta mejora. El backend sigue siendo la fuente oficial de datos y validaciones.

## Qué se guarda y dónde

La caché nueva conserva respuestas y solicitudes pendientes en variables y mapas de módulos JavaScript. Vive en la memoria de cada pestaña mientras la aplicación está abierta.

- No escribe respuestas en carpetas, archivos, localStorage, sessionStorage ni IndexedDB.
- No es una caché nueva del backend, Redis o PostgreSQL.
- No debe confundirse con la caché HTTP del navegador, los recursos de la PWA o preferencias existentes guardadas por otras funcionalidades.
- Una recarga completa pierde esta memoria. Las pestañas no comparten automáticamente sus datos.
- El cierre y establecimiento de sesión disparan la limpieza para evitar reutilizar respuestas de otra sesión.
- Algunas selecciones de interfaz también se conservan en memoria: año, filtros o vista, según el consumidor.

## Ciclo de carga y vigencia

1. La vista obtiene un recurso estable según el contexto que afecta a su respuesta.
2. Si no hay datos ni error resuelto, muestra `LoadingState` y bloquea la interacción con el contenido en preparación mediante `inert` y `aria-busy`.
3. Solicitudes simultáneas del mismo recurso comparten la promesa pendiente.
4. Una respuesta correcta publica los datos, registra su fecha y retira el loader inicial.
5. Si se vuelve durante los siguientes **60 segundos**, se reutiliza el resultado sin repetir esa consulta.
6. Si la vigencia terminó o el recurso fue invalidado, la siguiente carga consulta otra vez. Cuando hay datos anteriores, pueden seguir visibles durante esa actualización.
7. Si falla una actualización, el recurso conserva los datos anteriores y expone el error para ofrecer reintento. Un fallo inicial no debe presentarse como una lista vacía válida.

**Los 60 segundos no son un temporizador de refresco.** No hay una consulta automática cada minuto mientras se permanece en la pantalla. La comprobación ocurre al montar el consumidor o solicitar una carga. Tampoco expulsa físicamente las entradas vencidas: la memoria se libera al limpiar la caché o recargar la aplicación.

Las excepciones de seguimiento periódico incluyen Mercado Pago y el contador global de Notificaciones. Este último consulta cada 60 segundos con la pestaña visible y conserva sus eventos en tiempo real y el refresco al recuperar visibilidad. La caché no desactiva estos mecanismos existentes; no representan polling global para las demás vistas.

## Operaciones del recurso compartido

El helper actual se llama `createDashboardResource`, aunque ya se reutiliza fuera del dashboard. Su nombre no limita su uso a esa página. Antes de crear otro helper equivalente, reutilizarlo o evaluar una extracción común con todos sus consumidores.

| Operación | Efecto y uso |
| --- | --- |
| `getSnapshot()` / `subscribe()` | Exponen estado estable y notificaciones para `useSyncExternalStore`. |
| `load()` | Reutiliza una petición pendiente o un resultado vigente; consulta si corresponde. |
| `load(true)` | Omite la vigencia, pero comparte una petición que ya esté pendiente. |
| `invalidate()` | Marca datos como vencidos sin borrarlos. Generalmente se consultan en la próxima carga; reinicia una carga pendiente con consumidores activos para no dejar la vista detenida. |
| `set(data)` | Publica una respuesta autoritativa como vigente y descarta resultados anteriores pendientes. No usar para compartir borradores sin guardar. |
| `clear()` | Borra estado y descarta respuestas de solicitudes anteriores mediante un contador de generación. |

Estado disponible: `data`, `loading`, `error` y `failure`. `load()` captura los errores y resuelve su promesa: los consumidores deben revisar el estado publicado; un `catch` alrededor de `load()` no sustituye esa comprobación.

La caché de contenido comunitario implementa su propio ciclo porque también administra imágenes, decodificación y liberación de URLs de objetos. No duplicar ese tratamiento para respuestas JSON ordinarias.

## Loader y arranque

El loader compartido usa el logo, un indicador animado, un mensaje configurable y un fondo de 65 % del color de fondo con desenfoque de 2 px. La página puede verse detrás mientras se prepara. Respeta movimiento reducido y restaura el scroll al desmontarse.

El HTML inicial necesita un loader estático antes de montar React. Comparte clases y estilos con `LoadingState`; no es un segundo componente visual independiente. Se muestra si el arranque sigue pendiente después de 250 ms, sin imponer una permanencia mínima artificial. Si llegó a mostrarse, su salida dura 180 ms. La cubierta de actualización de la PWA también usa el componente compartido.

No montar varios loaders simultáneos para una misma vista. Revisar especialmente la restauración de `body.style.overflow` cuando coincidan modales y carga, ya que ambos pueden bloquear el scroll.

## Mapa de código para mantenimiento

Las rutas siguientes son relativas a la raíz del repositorio. Este mapa identifica responsabilidades; el comportamiento común se describe arriba para evitar implementaciones distintas por pantalla.

| Responsabilidad | Archivo o ubicación |
| --- | --- |
| Componente y apariencia del loader | `frontend/src/shared/ui/loading/LoadingState.tsx` y `LoadingState.css` |
| HTML de arranque y estilos críticos | `frontend/index.html`, `frontend/src/shared/style/global.css`, `frontend/vite.config.ts` |
| Cubierta de actualización PWA | `frontend/src/main.tsx` |
| Recurso reutilizable, hook, resumen anual, utilidades compartidas de cumpleaños y mensaje | `frontend/src/presentation/pages/dashboard/dashboardCache.ts` |
| Contenido comunitario e imágenes preparadas | `frontend/src/presentation/pages/home/hooks/homeCommunityCache.ts` |
| Horario publicado, periodos y selección anual | `frontend/src/presentation/hooks/academic/usePublishedSchedule.ts` |
| Datos bancarios, pagos propios y revisión administrativa | `frontend/src/presentation/pages/tesoreria/paymentsCache.ts` |
| Disponibilidad del proveedor y reconciliación | `frontend/src/presentation/hooks/treasury/mercadoPagoAvailability.ts` y `useMercadoPago.ts` |
| Ingresos, resumen, curso y selecciones | `frontend/src/presentation/pages/tesoreria/incomesCache.ts` |
| Egresos, resumen y selecciones | `frontend/src/presentation/pages/tesoreria/expensesCache.ts` |
| Eventos, stands, paneles y selección de la página compartida | `frontend/src/presentation/pages/stand/standCache.ts` |
| Eventos de limpieza e invalidación comunitaria | `frontend/src/shared/community/homeCommunityEvents.ts` |
| Evento de limpieza reutilizado por las cachés de sesión | `frontend/src/shared/treasury/dashboardEvents.ts` |
| Integración con ingreso, establecimiento y cierre de sesión | `frontend/src/presentation/context/AuthContext.tsx` |

Consumidores migrados: Home después del login, Dashboard, Cumpleaños, horario de clases publicado, Tesorería → Pagos, Ingresos, Egresos y la página compartida Resumen de stands / Ventas del stand. El editor de horarios conserva su skeleton activo; no eliminarlo como supuesto código muerto.

## Identidad, sesión e invalidación

La clave debe incluir todo aquello que cambia la respuesta: usuario, rol cuando corresponda, año y filtros relevantes. Pagos, Ingresos y Egresos separan usuario, rol, año y filtros; horario publicado separa cuenta y año. Algunos recursos compartidos se aíslan por limpieza de sesión, no por una clave de usuario explícita.

`DASHBOARD_RESET`, pese a su nombre, limpia también recursos de horario publicado, pagos, disponibilidad e ingresos. Home usa su evento propio. `AuthContext` dispara ambos circuitos en los límites de sesión. Mantener esa integración si se renombran o extraen utilidades.

Las mutaciones correctas invalidan recursos mediante interceptores de respuestas Axios o eventos explícitos. Revisar siempre las expresiones de rutas reales en cada módulo: no existe una invalidación universal que descubra automáticamente todas las dependencias. Las acciones visibles también pueden forzar una recarga o publicar la respuesta guardada con `set`.

Al agregar una acción o endpoint, verificar qué listados, resúmenes y recursos dependientes altera y actualizar su invalidación. Guardar un ingreso, corregirlo o anularlo debe actualizar listado y resumen; aprobar un pago puede afectar además ingresos y dashboard.

Los borradores de formularios deben permanecer locales hasta que el backend confirme el guardado. La caché no acredita que un pago fue aprobado: el retorno de Mercado Pago fuerza consultas y reconciliación con el backend; nunca se confía en `status=approved` de la URL para marcarlo pagado.

Stands separa cuenta y modo de consulta/administración; añade año para eventos, evento para listados y stand/pestaña para paneles. La página hidrata sus estados locales desde recursos existentes al volver y usa `readStandResource` para leerlos: este adaptador comprueba el estado de error del helper y sí rechaza su promesa ante fallos. Los contadores locales descartan lecturas de selecciones anteriores. Las escrituras de `/tesoreria/stands` y `/tesoreria/eventos` invalidan estos recursos; las acciones administrativas fuerzan la recarga correspondiente. El resumen de apoderados consulta las opciones públicas y el resumen, sin descargar productos o ventas administrativas.

## Aplicación a futuras vistas

1. Identificar consultas, parámetros, permisos, dependencias y acciones que modifican los datos antes de editar.
2. Crear recursos estables fuera del render usando el helper existente; no crear un recurso nuevo en cada render ni añadir esperas artificiales.
3. Definir claves completas y limpieza de sesión. Si se incorpora cambio de organización sin reiniciar sesión, incluir ese contexto o limpiar explícitamente antes de reutilizar recursos.
4. Suscribir la vista con `useDashboardResource`. Agrupar su preparación inicial para mostrar un solo loader semitransparente; mantener errores y reintento accesibles.
5. Conservar los datos durante actualizaciones cuando sea apropiado. Distinguir error, vacío válido y falta de respuesta; no mostrar importes iniciales como resultados confirmados.
6. Conectar mutaciones e invalidaciones según las rutas reales. Forzar carga después del guardado o usar una respuesta completa y autoritativa con `set`.
7. Eliminar JSX, imports y CSS del skeleton sustituido. Conservar componentes que sigan teniendo consumidores.
8. Verificar retorno sin consultas dentro de la vigencia, actualización después de cambios, error/reintento, aislamiento de cuenta/año/filtros y descarte de respuestas anteriores a la limpieza.
9. Validar desktop a **1216 × 552 px** y móviles, incluyendo 390 y 320 px de ancho, ausencia de desbordamiento, bloqueo del fondo y acceso a filtros y modales.

## Diagnóstico de problemas

| Síntoma | Qué comprobar primero |
| --- | --- |
| Vuelve a consultar al regresar | Vigencia de 60 s, invalidación reciente, cambio de clave, recarga completa, recurso creado dentro del render o varias consultas que todavía no usan caché. |
| Un cambio guardado no aparece | Endpoint incluido en el interceptor/evento, clave del recurso recargado y respuesta real del backend. Invalidar no equivale siempre a refrescar inmediatamente. |
| Datos cambiados por otra persona no aparecen en la misma pantalla | Es el comportamiento esperado sin polling ni suscripción en tiempo real. Volver a la vista después de la vigencia o recargar. |
| Loader no termina | Recurso pendiente, respuesta que nunca resuelve, condición de preparación que ignora el error, dependencia requerida que no se cargó o invalidación durante la primera carga. |
| Se muestran datos de otro año o cuenta | Clave incompleta, selección retenida fuera de su contexto, limpieza de sesión ausente o respuestas tardías sin protección de generación. |
| Lista vacía después de un error | Rechazo transformado incorrectamente en `[]` o falta de diferenciación entre vacío válido y fallo. |
| Scroll bloqueado al cerrar carga o modal | Orden de montaje/desmontaje y restauración del overflow entre loader y overlays. |
| Consumo de memoria creciente con muchos filtros | Los mapas conservan combinaciones durante la sesión; no tienen límite LRU. Evaluar límites o agrupación si el uso real lo requiere. |
| Una imagen tarda o aparece cancelada | Revisar URL, estado HTTP, descarga/decodificación, desmontaje y cancelación. Una solicitud abortada por sí sola no demuestra un problema de base de datos o de caché. |

Usar Network y contar requests antes/después de navegar; distinguir lectura inicial, actualización, mutación y recursos estáticos. Si una recarga completa corrige el síntoma, revisar identidad e invalidación de caché, pero contrastar también la respuesta del servidor: la mejoría por recarga no demuestra por sí sola la causa.

## Verificación registrada y límites

Durante la implementación se ejecutaron pruebas dirigidas de los recursos y consumidores modificados, lint, compilación y comprobaciones de navegador con respuestas HTTP simuladas. Se comprobó carga inicial, retorno sin consultas redundantes, errores/reintentos, separación de contexto y actualización tras acciones en los flujos cubiertos.

Última entrega de Ingresos: **19 pruebas aprobadas en tres archivos**, lint y build aprobados; revisión en Chromium para USER y ADMIN a 1216 × 552, 390 × 844 y 320 × 640. Se verificó retorno sin nuevas lecturas mientras la caché estaba vigente, selección conservada y registro simulado actualizado. El build mantiene un aviso preexistente de `eval` en Lottie.

Pruebas de referencia: `dashboardCache.test.ts`, `homeCommunityCache.test.tsx`, `usePublishedSchedule.test.tsx`, `paymentsCache.integration.test.ts`, `incomesCache.integration.test.ts` y las pruebas de las páginas y del hook de Mercado Pago correspondientes.

Entrega de Egresos: 25 pruebas aprobadas en cuatro archivos (página y caché de Egresos, página de Ingresos y helper compartido), lint y build aprobados. Chromium con USER y ADMIN a los mismos tres tamaños: loader inicial, retorno sin lecturas repetidas y registro administrativo simulado con recarga de listado y resumen. Se eliminó el skeleton de Egresos y su CSS; se conservaron las confirmaciones y reglas de registro existentes. Referencia adicional: `expensesCache.integration.test.ts`.

Entrega de Stands: 19 pruebas aprobadas en cuatro archivos (página compartida, caché con transporte simulado, selección de datos por panel y helper compartido), lint y build aprobados. Chromium con USER y ADMIN a los mismos tres tamaños: loader inicial, cambio de evento, selección conservada al volver y ausencia de consultas repetidas y desbordamiento horizontal. Las pruebas de caché verifican invalidación tras registrar una venta y limpieza de sesión. Se retiraron los dos componentes skeleton y sus estilos. Referencia adicional: `standCache.integration.test.ts`.

Las pruebas frontend con transporte simulado no acreditan integración con backend real. Las verificaciones de navegador no realizaron pagos reales ni modificaron datos productivos. No se afirma una ejecución completa de toda la suite del repositorio por esta tarea.

Para cambios futuros, ejecutar las suites afectadas, `pnpm lint`, `pnpm build` desde `frontend` y `git diff --check` desde la raíz. Ampliar la validación si se modifica el helper compartido, autenticación, interceptores o reglas de invalidación; esos cambios tienen varios consumidores.

## Extensión del patrón y mantenimiento de conversaciones

Notificaciones también usa el loader central y recursos en memoria. La bandeja recibida sigue en `frontend/src/presentation/context/NotificationContext.tsx`; el proveedor deduplica refrescos, expone errores para reintentar, conserva mensajes durante actualizaciones y descarta respuestas de otra cuenta o anteriores a una mutación confirmada.

`frontend/src/presentation/pages/notificacion/notificationCache.ts` administra enviados, contacto, conversaciones por deliveryId y destinatarios por página/búsqueda, separados por cuenta y limpiados con DASHBOARD_RESET. `useNotificationRecipients.ts` consulta destinatarios al abrir el panel y difiere la búsqueda 250 ms para evitar una consulta por pulsación. Esa espera es de búsqueda, no de carga inicial.

La conversación se extrajo a `NotificationConversation.tsx` y el estado de lectura a `MessageReadStatus.tsx`. Los mensajes en caché no sustituyen la sincronización: siguen los eventos de lectura, respuesta, edición y borrado. Al recuperar visibilidad se fuerza una consulta de conversación; las mutaciones y novedades invalidan las lecturas pertinentes. Una conversación no cargada no se considera completa por recibir únicamente un evento parcial.

Se retiraron el componente skeleton de mensajes y sus estilos. Se amplió el área de conversación en desktop, se hicieron más legibles los textos, se adaptaron nombres largos y se apiló el formulario en móvil. La distribución fija reemplaza el arrastre; no quedan ventanas flotantes. La guía de uso refleja la lectura automática de la bandeja.

Validación de esta extensión: 30 pruebas aprobadas en cuatro archivos (página, proveedor, caché con transporte HTTP simulado y helper compartido), lint y compilación aprobados. Chromium con USER y ADMIN a 1216 × 552, 390 × 844 y 320 × 640: carga inicial, retorno con caché, respuesta simulada y ausencia de desbordamiento horizontal. Pruebas de referencia: `NotificationContext.test.tsx`, `Notificacion.test.tsx` y `notificationCache.integration.test.ts`. Sin envíos reales ni modificación de datos productivos. La validación WebSocket sigue siendo simulada en pruebas de componentes; no se afirma una conexión a un servidor real.
### Actualización de la distribución de conversaciones

La vista de administración adopta una distribución inspirada en Ultra Messenger: lista de contactos con búsqueda a la izquierda y una sola conversación seleccionada a la derecha. La selección se conserva por cuenta en `notificationCache.selection` y se pierde al limpiar la sesión. En móvil se muestra la lista o el chat, con un botón Contactos para regresar. El apoderado conserva el acceso directo a Tesorería.

`NotificationMessenger.css` contiene la distribución de paneles y sus reglas adaptables. Se retiraron de la página y la conversación los estados, eventos y estilos de arrastre y ventanas flotantes sustituidos. El input crece al escribir, el historial mantiene scroll interno y las burbujas se alinean según autor, no según rol. En desktop usan ancho según contenido con un máximo del 60 %.

El footer compacto de Notificaciones se ajustó nuevamente por preferencia del usuario: aproximadamente 76 px, con logo, crédito y contactos legibles, en lugar de la variante de 35 px. Estas reglas están limitadas a Notificaciones y no cambian el footer de las demás rutas.

Validación de esta distribución: 24 pruebas aprobadas en tres archivos de página, caché y proveedor; lint y build aprobados. Chromium con USER y ADMIN a 1216 × 552, 390 × 844 y 320 × 640, usando HTTP simulado: regreso con caché, respuesta, búsqueda/cambio de contacto en componentes y navegación Contactos/chat en móvil. No se enviaron mensajes reales ni se modificaron datos productivos.