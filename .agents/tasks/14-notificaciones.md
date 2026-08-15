Implementa un sistema completo de notificaciones internas para la aplicación de tesorería.

## Objetivo

El administrador debe poder enviar notificaciones a los apoderados.

Debe poder:

* enviar una notificación a un solo apoderado;
* seleccionar varios apoderados;
* seleccionar todos los apoderados;
* escribir título y contenido de la notificación;
* opcionalmente indicar prioridad o tipo de notificación.

Los apoderados deben recibir las notificaciones dentro de la aplicación.

## Backend

Analiza primero la arquitectura existente del proyecto y reutiliza los patrones actuales.

No crees una arquitectura paralela si ya existen módulos, repositorios, DTOs, servicios, controladores, manejo de usuarios y seguridad que puedan reutilizarse.

Implementa un módulo de notificaciones.

Modelo sugerido:

### Notification

* id
* title
* message
* type o priority
* createdBy
* createdAt

### UserNotification

* id
* notificationId
* userId
* read
* readAt
* createdAt

La relación UserNotification debe permitir que una misma Notification tenga muchos destinatarios y que cada destinatario tenga su propio estado leído/no leído.

No dupliques innecesariamente el contenido completo de la notificación por cada usuario.

Crear endpoints similares a:

POST /api/notifications

Para crear y enviar una notificación.

Debe aceptar uno o varios IDs de destinatarios.

También debe permitir enviar a todos los apoderados.

GET /api/notifications/me

Devuelve las notificaciones del usuario autenticado, ordenadas desde la más reciente.

GET /api/notifications/me/unread-count

Devuelve la cantidad de notificaciones no leídas.

PATCH /api/notifications/{id}/read

Marca una notificación como leída para el usuario autenticado.

PATCH /api/notifications/read-all

Marca todas las notificaciones del usuario autenticado como leídas.

Implementa las validaciones y controles de seguridad correspondientes.

Solo los roles administrativos autorizados deben poder enviar notificaciones.

Un apoderado solamente puede consultar y modificar el estado de sus propias notificaciones.

## Base de datos

Usar Flyway.

IMPORTANTE:

No modificar ninguna migración histórica existente.

Crear una migración Flyway NUEVA con la siguiente versión disponible.

Crear las tablas, índices, foreign keys y restricciones necesarias.

Agregar índices especialmente para consultas por:

* user_id;
* read;
* created_at;
* notification_id.

## Frontend - Administrador

En la pantalla/listado de apoderados agregar selección mediante checkbox.

Debe existir:

* selección individual;
* selección múltiple;
* opción "Seleccionar todos";
* botón "Enviar notificación".

Al presionar "Enviar notificación", mostrar un modal o pantalla con:

* destinatarios;
* título;
* mensaje;
* tipo/prioridad;
* botón Enviar.

Mostrar confirmación cuando la operación finalice correctamente.

## Frontend - Apoderado

Agregar una campana de notificaciones en el header/navbar.

Cuando no existan notificaciones sin leer, mostrar la campana en estado normal.

Cuando existan notificaciones sin leer:

* mostrar un badge con el número de notificaciones;
* cambiar visualmente el estado de la campana;
* aplicar una animación suave de movimiento para llamar la atención;
* la animación no debe ser permanente ni molesta;
* debe mantenerse claramente visible el indicador de mensajes pendientes.

Ejemplo visual:

🔔 3

Al hacer clic en la campana, abrir la sección o panel de notificaciones.

Las notificaciones no leídas deben diferenciarse visualmente de las leídas.

Al abrir una notificación debe marcarse como leída y actualizar inmediatamente el contador.

Agregar también una opción:

"Marcar todas como leídas".

## Actualización del contador

El badge de la campana debe reflejar siempre la cantidad real de notificaciones no leídas.

Analiza cuál es la mejor opción según la arquitectura actual:

* actualización al navegar;
* polling periódico;
* Server-Sent Events;
* WebSocket.

Para la primera implementación prefiero una solución simple y mantenible.

Si no existe infraestructura realtime actualmente, no agregues WebSocket innecesariamente.

Puede utilizarse polling liviano del unread-count y actualización inmediata después de leer una notificación.

Diseña el código de manera que posteriormente pueda evolucionar a tiempo real sin rehacer todo el módulo.

## UX

Quiero que el apoderado note claramente que tiene una notificación pendiente.

El comportamiento esperado es:

1. llega una nueva notificación;
2. aparece el badge numérico;
3. la campana cambia de estado y realiza una pequeña animación;
4. el usuario entra a Notificaciones;
5. las nuevas aparecen resaltadas;
6. cuando las lee, se actualiza el contador;
7. cuando ya no quedan pendientes, la campana vuelve a su estado normal.

## Antes de implementar

Primero analiza el código existente y dime:

* qué entidades de usuario/apoderado ya existen;
* cómo se manejan actualmente los roles;
* dónde está el header/navbar;
* qué componentes existentes pueden reutilizarse;
* cuál será la nueva migración Flyway;
* qué archivos planeas crear o modificar.

Después implementa la funcionalidad respetando la arquitectura actual y evitando cambios innecesarios.
