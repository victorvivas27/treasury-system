# Diagnostico de rendimiento - Notificaciones

Fecha: 2026-09-02

## 1. Arquitectura encontrada

Flujo al abrir `/notifications`:

Usuario hace clic en Notificaciones
↓
`frontend/src/presentation/routers/AppRouter.tsx`
↓
`Notificacion`
↓
`AuthContext` decide rol activo
↓
Apoderado: `GuardianInbox` + `NotificationProvider`
↓
Admin: `AdminNotificationCenter` + `NotificationProvider` + `useApoderados`
↓
`NotificationRepositoryImpl`
↓
`/api/v1/notifications/...`
↓
`NotificationController`
↓
`NotificationService`
↓
`NotificationJpaRepository`, `UserNotificationJpaRepository`, `NotificationReplyJpaRepository`
↓
PostgreSQL
↓
DTOs `NotificationResponse`, `SentNotificationResponse`, `NotificationReplyResponse`
↓
Frontend renderiza lista/conversacion

Archivos principales:

- Frontend pagina: `frontend/src/presentation/pages/notificacion/Notificacion.tsx`
- Frontend provider: `frontend/src/presentation/context/NotificationContext.tsx`
- Frontend realtime: `frontend/src/presentation/context/RealtimeContext.tsx`
- Frontend client API: `frontend/src/core/C-infra/repositories/notification/NotificationRepositoryImpl.ts`
- Backend controller: `backend/src/main/java/com/tesoreria/notification/infrastructure/web/NotificationController.java`
- Backend service: `backend/src/main/java/com/tesoreria/notification/application/NotificationService.java`
- Backend repositories: `NotificationJpaRepository`, `UserNotificationJpaRepository`, `NotificationReplyJpaRepository`
- Migraciones/indices relevantes: `V6__create_notifications.sql`, `V7__add_notification_visibility.sql`, `V8__create_notification_replies.sql`, `V9__add_notification_reply_read_status.sql`, `V42__add_notification_unread_indexes.sql`

## 2. Requests al abrir la pantalla

Evidencia por codigo. No se ejecuto la navegacion real contra produccion porque el flujo actual puede disparar escrituras automaticas (`PATCH /notifications/read-all`) al abrir la pantalla.

Apoderado:

| Request | Origen | Paralelo/secuencial | Observacion |
| --- | --- | --- | --- |
| `GET /notifications/me` | `NotificationProvider.refresh()` | Paralelo con unread-count | Carga lista de notificaciones visibles. |
| `GET /notifications/me/unread-count` | `NotificationProvider.refresh()` | Paralelo con lista | Carga contador global. |
| `GET /notifications/threads/{deliveryId}/messages` | `NotificationConversation.load()` | Despues de tener lista | Carga conversacion y en backend marca replies recibidas como leidas. |
| `GET /notifications/me/unread-count` | Antes: evento `notification-unread-changed` desde `listReplies()` | Duplicado | Eliminado. |
| `PATCH /notifications/read-all` | `GuardianInbox` cuando `unreadCount > 0` | Despues de refresh | Escritura automatica en apertura. Impide auditoria productiva read-only. |
| `GET /notifications/treasury/contact` | `GuardianInbox` | Paralelo despues de render | Solo para estado sin conversaciones/contacto. |
| `GET /notifications/push/config` | `NotificationProvider.inspectPush()` | Tras `window.load` | Configuracion push global, no exclusiva de pantalla. |

Admin:

| Request | Origen | Paralelo/secuencial | Observacion |
| --- | --- | --- | --- |
| `GET /notifications/me` | `NotificationProvider.refresh()` | Paralelo con unread-count | Contador/notificaciones propias del admin. |
| `GET /notifications/me/unread-count` | `NotificationProvider.refresh()` | Paralelo con lista | Contador global. |
| `GET /apoderados?page,size,search` | `useApoderados({ pageSize: 20 })` | Al montar admin | Destinatarios disponibles. |
| `GET /notifications/sent` | `AdminNotificationCenter.loadSent()` | Al montar admin | Endpoint principal de historial enviado. |
| `PATCH /notifications/read-all` | `AdminNotificationCenter` cuando `adminUnreadCount > 0` | Despues de refresh | Escritura automatica en apertura. |
| `GET /notifications/threads/{deliveryId}/messages` | Al abrir un destinatario | Bajo demanda | No ocurre hasta abrir `details`. |

## 3. Endpoint mas lento

No se pudo medir TTFB/duracion productiva en esta sesion sin violar la restriccion read-only, porque abrir Notificaciones puede ejecutar `PATCH /notifications/read-all`.

Por evidencia estatica, los endpoints con mayor riesgo eran:

- Apoderado: `GET /notifications/threads/{deliveryId}/messages`, porque disparaba otro `GET /notifications/me/unread-count` desde el cliente inmediatamente despues de responder.
- Admin: `GET /notifications/sent`, porque hacia N+1 queries: 1 query para notificaciones enviadas + 1 query por cada notificacion para destinatarios.

## 4. Tiempos frontend/backend conocidos

Antes manual provisto:

| Muestra | Tiempo |
| --- | ---: |
| 1 | 2140 ms |
| 2 | 1810 ms |
| 3 | 1870 ms |
| 4 | 1710 ms |
| 5 | 1970 ms |

Promedio: 1900 ms. Minimo: 1710 ms. Maximo: 2140 ms.

No hay separacion confirmada de backend vs frontend en esta sesion. La causa es operacional, no tecnica: la prueba productiva segura debe impedir escrituras, y la pantalla actual escribe al abrir si hay no leidos.

## 5. Queries SQL involucradas

Queries derivadas/JPA relevantes:

- Usuario actual por email: `users.findByCorreo(email)`
- Lista apoderado: `user_notifications` filtrado por `user_id` e `is_visible`, ordenado por `created_at desc`.
- Count no leidas: `user_notifications` filtrado por `user_id`, `is_read=false`, `is_visible=true`.
- Count replies no leidas: `notification_replies` con joins a `user_notifications` y `notifications`, filtrando `is_read=false`, `author_id <> userId` y participacion del usuario.
- Conversacion: query nativa en `NotificationReplyJpaRepository.findConversation`, con joins a `user_notifications` y `notifications`, filtro por destinatario/creador, anti-join contra `notification_reply_hidden_users`, orden `reply.created_at asc`.
- Enviadas admin: `notifications.findByCreatedByCorreoOrderByCreatedAtDesc`.
- Antes: por cada notificacion enviada, `deliveries.findByNotificationIdOrderByUserNombreAsc(notificationId)`.
- Despues: una sola query batch:
  `select row from UserNotificationEntity row join fetch row.user where row.notification.id in :notificationIds order by row.notification.id asc, row.user.nombre asc`.

Indices existentes relevantes:

- `idx_notifications_created_at`
- `idx_user_notifications_user_read`
- `idx_user_notifications_created_at`
- `idx_user_notifications_notification`
- `idx_user_notifications_user_visible`
- `idx_notification_replies_delivery_created`
- `idx_notification_replies_read`
- `idx_user_notifications_user_unread_visible`
- `idx_notification_replies_unread_author_delivery`
- `idx_notifications_created_by`

No se crearon indices nuevos porque no hubo plan SQL/EXPLAIN que demostrara falta de indice.

## 6. Cuello de botella encontrado

Cuellos de botella demostrados por codigo:

- Duplicacion frontend: `NotificationRepositoryImpl.listReplies()` emitia `notification-unread-changed` despues de cada carga de conversacion. `NotificationProvider` escucha ese evento y ejecuta `refreshUnreadCount()`, provocando un segundo `GET /notifications/me/unread-count` durante la apertura. Esto coincide con la observacion manual de varias llamadas a `unread-count`.
- N+1 backend admin: `NotificationService.sent()` recorria cada notificacion enviada y consultaba sus destinatarios individualmente. Con N notificaciones, eran `1 + N` queries de destinatarios/notificaciones, sin necesidad funcional.
- Riesgo de medicion: la pantalla marca automaticamente todo como leido al entrar si `unreadCount > 0`, generando `PATCH /notifications/read-all`. Esto agrega latencia y ademas hace insegura una auditoria productiva read-only.

## 7. Cambios realizados

- `frontend/src/core/C-infra/repositories/notification/NotificationRepositoryImpl.ts`
  - Se elimino el evento `notification-unread-changed` desde `listReplies()`.
  - Impacto esperado: una llamada menos a `GET /notifications/me/unread-count` al abrir/cargar una conversacion.

- `backend/src/main/java/com/tesoreria/notification/infrastructure/persistence/UserNotificationJpaRepository.java`
  - Se agrego una query batch con `join fetch row.user` para cargar destinatarios de multiples notificaciones enviadas en una sola consulta.

- `backend/src/main/java/com/tesoreria/notification/application/NotificationService.java`
  - `sent()` ahora obtiene todas las entregas con una sola query y agrupa por `notification.id`.
  - El contrato de respuesta no cambia.

- `backend/src/test/java/notification/NotificationServiceTest.java`
  - Se agrego test que verifica que dos notificaciones enviadas usan una sola consulta batch y no la consulta por notificacion.

## 8. Comparacion antes/despues

Antes manual:

- Promedio: 1900 ms
- Minimo: 1710 ms
- Maximo: 2140 ms

Despues:

- No ejecutado contra produccion en esta sesion por restriccion read-only.
- Mejora medible por conteo de operaciones:
  - Apoderado: elimina 1 request duplicada a `GET /notifications/me/unread-count` por carga de conversacion.
  - Admin: reduce el patron de `GET /notifications/sent` de `1 + N` queries de destinatarios a 1 query batch para destinatarios.

La medicion real despues debe hacerse tras desplegar estos cambios, idealmente con una variante de auditoria que bloquee o desactive el auto `read-all` para que siga siendo read-only.

## 9. Riesgos o pendientes

- Aun no existe una medicion productiva backend/frontend separada con TTFB, tamano real de respuesta y conteo SQL por request.
- `PATCH /notifications/read-all` en apertura es comportamiento funcional con efecto secundario. Debe revisarse como decision de producto/rendimiento: mejora UX del contador, pero impide auditorias read-only y puede sumar latencia.
- `/notifications/me` no tiene paginacion; si el usuario acumula muchas notificaciones, la respuesta y render creceran linealmente.
- `NotificationService.mine()` y `response()` usan relaciones lazy (`notification`, `createdBy`). Sin medicion Hibernate no se confirma si hay N+1 en la lista recibida.
- `NotificationReplyJpaRepository.countUnreadReceived()` tiene joins implicitos por relaciones JPA. Los indices actuales probablemente ayudan, pero falta `EXPLAIN ANALYZE` read-only para confirmarlo.

## 10. Siguiente optimizacion recomendada

1. Desplegar cambios y ejecutar 5 mediciones equivalentes capturando endpoint, status, duracion, TTFB y tamano.
2. Para no mutar datos reales, medir con un usuario sin no leidos o con una bandera temporal de auditoria que desactive el auto `PATCH /notifications/read-all`.
3. Habilitar logging de Hibernate statistics/slow queries en un entorno controlado y medir especificamente:
   - `/notifications/me`
   - `/notifications/me/unread-count`
   - `/notifications/sent`
   - `/notifications/threads/{deliveryId}/messages`
4. Si `/notifications/me` muestra N+1 o payload grande, aplicar el siguiente cambio focalizado: query con `join fetch notification` y `join fetch notification.createdBy`, mas paginacion si el volumen real lo justifica.
