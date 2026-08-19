# Implementar mensajería en tiempo real con WebSocket + STOMP

## Objetivo

Implementar mensajería en tiempo real en la aplicación existente sin migrar el backend a WebFlux.

La aplicación actualmente utiliza Spring Boot con Spring MVC, JWT, PostgreSQL y ya existe una implementación inicial de notificaciones.

La solución debe mantener la arquitectura actual y agregar WebSocket + STOMP para que:

- Un usuario pueda enviar un mensaje a otro usuario.
- El mensaje se guarde en PostgreSQL.
- El destinatario reciba el mensaje inmediatamente sin refrescar la página.
- El remitente reciba también el mensaje persistido por el servidor, con su ID y fecha definitivos.
- Las notificaciones puedan reutilizar la misma conexión WebSocket.
- Cada usuario reciba solamente sus propios mensajes y notificaciones.
- La autenticación del WebSocket utilice el JWT existente.

---

## Restricciones importantes

NO migrar el proyecto a Spring WebFlux.

NO reemplazar los controladores REST existentes.

NO introducir `Mono` o `Flux` solamente para implementar el chat.

Mantener:

```text
Spring Boot
Spring MVC
Spring Security
JWT
PostgreSQL
REST existente
```

Agregar:

```text
WebSocket
STOMP
spring-boot-starter-websocket
```

La arquitectura esperada es:

```text
React
│
├── REST ───────────────► Spring MVC
│
└── WebSocket/STOMP ◄──► Spring Boot
                          │
                          ├── ChatService
                          ├── NotificationService
                          └── PostgreSQL
```

---

# 1. Dependencia

Agregar al `build.gradle` del backend:

```gradle
implementation 'org.springframework.boot:spring-boot-starter-websocket'
```

No eliminar:

```gradle
implementation 'org.springframework.boot:spring-boot-starter-web'
```

---

# 2. Configuración WebSocket

Crear una configuración similar a:

```java
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.enableSimpleBroker("/topic", "/queue");
        registry.setApplicationDestinationPrefixes("/app");
        registry.setUserDestinationPrefix("/user");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry
            .addEndpoint("/ws")
            .setAllowedOriginPatterns("*");
    }
}
```

IMPORTANTE:

No dejar `*` como configuración definitiva en producción.

Usar los orígenes permitidos ya configurados para el frontend, incluyendo el dominio de producción correspondiente.

---

# 3. Autenticación con JWT

El WebSocket debe identificar al usuario mediante el JWT que ya utiliza la aplicación.

El frontend debe enviar el token durante la conexión STOMP, por ejemplo:

```javascript
connectHeaders: {
  Authorization: `Bearer ${token}`
}
```

En el backend implementar un `ChannelInterceptor` para interceptar el frame STOMP `CONNECT`.

Debe:

1. Leer el header `Authorization`.
2. Verificar que comience con `Bearer `.
3. Extraer el JWT.
4. Validarlo usando el servicio JWT existente.
5. Obtener la identidad del usuario.
6. Crear/asignar el `Principal` de la conexión.

Ejemplo conceptual:

```java
@Component
public class WebSocketAuthInterceptor implements ChannelInterceptor {

    private final JwtService jwtService;

    public WebSocketAuthInterceptor(JwtService jwtService) {
        this.jwtService = jwtService;
    }

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {

        StompHeaderAccessor accessor =
            MessageHeaderAccessor.getAccessor(
                message,
                StompHeaderAccessor.class
            );

        if (
            accessor != null &&
            StompCommand.CONNECT.equals(accessor.getCommand())
        ) {

            String authorization =
                accessor.getFirstNativeHeader("Authorization");

            if (
                authorization == null ||
                !authorization.startsWith("Bearer ")
            ) {
                throw new AccessDeniedException(
                    "Missing WebSocket authorization"
                );
            }

            String token = authorization.substring(7);

            Authentication authentication =
                jwtService.getAuthentication(token);

            accessor.setUser(authentication);
        }

        return message;
    }
}
```

ADAPTAR este código al servicio JWT existente.

No crear un segundo sistema de JWT si ya existe uno.

Registrar el interceptor:

```java
@Override
public void configureClientInboundChannel(
    ChannelRegistration registration
) {
    registration.interceptors(webSocketAuthInterceptor);
}
```

---

# 4. Modelo de mensajes

Crear o adaptar una entidad para los mensajes.

Ejemplo:

```java
@Entity
@Table(name = "chat_messages")
public class ChatMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long senderId;

    private Long receiverId;

    @Column(nullable = false)
    private String content;

    private Instant createdAt;

    private boolean read;
}
```

Si existe un modelo de conversación, utilizar una relación con `conversationId`.

Preferiblemente:

```text
Conversation
 └── ChatMessage
```

en lugar de depender únicamente de `senderId` y `receiverId`.

---

# 5. Migración de base de datos

La aplicación usa Flyway.

Crear la migración correspondiente.

Ejemplo conceptual:

```sql
CREATE TABLE chat_messages (
    id BIGSERIAL PRIMARY KEY,
    sender_id BIGINT NOT NULL,
    receiver_id BIGINT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    read BOOLEAN NOT NULL DEFAULT FALSE
);
```

Adaptar nombres, foreign keys y esquema al proyecto real.

No usar `ddl-auto` para crear estas tablas en producción.

---

# 6. DTO para enviar mensajes

El frontend NO debe poder indicar libremente el `senderId`.

El remitente siempre debe obtenerse del usuario autenticado.

Ejemplo:

```java
public record SendMessageRequest(
    Long receiverId,
    String content
) {}
```

Respuesta:

```java
public record ChatMessageResponse(
    Long id,
    Long senderId,
    Long receiverId,
    String content,
    Instant createdAt,
    boolean read
) {}
```

---

# 7. Servicio de mensajes

Crear un `ChatService` responsable de:

- Validar al destinatario.
- Validar contenido.
- Determinar el remitente autenticado.
- Guardar el mensaje.
- Retornar el mensaje persistido.

Ejemplo:

```java
@Transactional
public ChatMessageResponse sendMessage(
    Long senderId,
    SendMessageRequest request
) {

    ChatMessage entity = new ChatMessage();

    entity.setSenderId(senderId);
    entity.setReceiverId(request.receiverId());
    entity.setContent(request.content().trim());
    entity.setCreatedAt(Instant.now());
    entity.setRead(false);

    ChatMessage saved = repository.save(entity);

    return mapper.toResponse(saved);
}
```

---

# 8. Controlador STOMP

Crear un controlador de mensajes.

Ejemplo:

```java
@Controller
public class ChatWebSocketController {

    private final ChatService chatService;
    private final SimpMessagingTemplate messagingTemplate;

    public ChatWebSocketController(
        ChatService chatService,
        SimpMessagingTemplate messagingTemplate
    ) {
        this.chatService = chatService;
        this.messagingTemplate = messagingTemplate;
    }

    @MessageMapping("/chat.send")
    public void send(
        SendMessageRequest request,
        Principal principal
    ) {

        Long senderId =
            resolveUserId(principal);

        ChatMessageResponse message =
            chatService.sendMessage(senderId, request);

        messagingTemplate.convertAndSendToUser(
            String.valueOf(message.receiverId()),
            "/queue/messages",
            message
        );

        messagingTemplate.convertAndSendToUser(
            String.valueOf(message.senderId()),
            "/queue/messages",
            message
        );
    }
}
```

IMPORTANTE:

`convertAndSendToUser()` debe utilizar exactamente el mismo identificador que devuelve `Principal.getName()`.

Si el `Principal` utiliza email, username o UUID, usar ese mismo valor.

No asumir que debe ser el ID numérico sin verificar cómo funciona la autenticación actual.

---

# 9. Destinos STOMP

Utilizar:

```text
Cliente -> servidor
/app/chat.send
```

Mensajes recibidos por un usuario:

```text
/user/queue/messages
```

Notificaciones:

```text
/user/queue/notifications
```

Esto permite reutilizar una sola conexión WebSocket.

Ejemplo:

```text
WebSocket /ws
│
├── /user/queue/messages
│
└── /user/queue/notifications
```

---

# 10. Integración con notificaciones existentes

Revisar primero la implementación actual de notificaciones.

NO duplicar lógica ya existente.

Cuando llegue un mensaje:

```text
ChatMessage
    ↓
guardar en PostgreSQL
    ↓
enviar por /user/queue/messages
```

Si corresponde generar una notificación:

```text
Notification
    ↓
guardar / generar
    ↓
enviar por /user/queue/notifications
```

Ejemplo conceptual:

```java
messagingTemplate.convertAndSendToUser(
    receiverPrincipalName,
    "/queue/notifications",
    notification
);
```

---

# 11. REST para historial

WebSocket debe utilizarse para tiempo real.

REST debe seguir utilizándose para cargar el historial.

Ejemplo:

```text
GET /api/conversations
GET /api/conversations/{conversationId}/messages
```

Flujo:

```text
Abrir conversación
       ↓
GET historial mediante REST
       ↓
Mostrar mensajes
       ↓
WebSocket mantiene mensajes nuevos en tiempo real
```

No cargar todo el historial mediante WebSocket.

---

# 12. Frontend React

Instalar/utilizar un cliente STOMP compatible.

Ejemplo habitual:

```bash
npm install @stomp/stompjs
```

Crear una única conexión WebSocket reutilizable.

Ejemplo conceptual:

```javascript
import { Client } from "@stomp/stompjs";

const client = new Client({
  brokerURL: `${WS_URL}/ws`,

  connectHeaders: {
    Authorization: `Bearer ${token}`,
  },

  reconnectDelay: 5000,

  onConnect: () => {
    client.subscribe("/user/queue/messages", frame => {
      const message = JSON.parse(frame.body);

      handleIncomingMessage(message);
    });

    client.subscribe("/user/queue/notifications", frame => {
      const notification = JSON.parse(frame.body);

      handleIncomingNotification(notification);
    });
  },
});

client.activate();
```

Revisar si Cloud Run/Vercel/proxy requieren usar:

```text
wss://
```

en producción.

---

# 13. Enviar mensaje desde React

Ejemplo:

```javascript
client.publish({
  destination: "/app/chat.send",
  body: JSON.stringify({
    receiverId,
    content,
  }),
});
```

NO agregar directamente un mensaje definitivo al estado antes de que vuelva del backend, salvo que se implemente explícitamente optimistic UI.

La versión inicial debe priorizar consistencia.

Flujo recomendado:

```text
Usuario pulsa enviar
       ↓
STOMP /app/chat.send
       ↓
Backend guarda
       ↓
Backend devuelve ChatMessage persistido
       ↓
Frontend recibe /user/queue/messages
       ↓
setMessages(...)
```

Así el objeto recibido contiene:

```text
id real
sender
receiver
createdAt real
estado real
```

---

# 14. Evitar mensajes duplicados

Como el servidor devuelve el mensaje tanto al remitente como al destinatario, React debe evitar duplicados.

Usar `message.id`.

Ejemplo:

```javascript
setMessages(current => {
  const exists = current.some(
    item => item.id === message.id
  );

  if (exists) {
    return current;
  }

  return [...current, message];
});
```

---

# 15. Estado leído / no leído

Preparar la arquitectura para soportar:

```text
SENT
DELIVERED
READ
```

No es obligatorio implementar todo en la primera versión.

Como mínimo:

```text
read = false
```

al crear el mensaje.

Luego se podrá agregar un evento:

```text
/app/chat.read
```

para marcar mensajes como leídos.

---

# 16. Reconexión

El frontend debe reconectarse automáticamente si pierde conexión:

```javascript
reconnectDelay: 5000
```

Al reconectar:

1. Volver a suscribirse.
2. Recargar mediante REST los mensajes posteriores al último mensaje conocido si es necesario.

WebSocket no debe ser la única fuente de persistencia.

PostgreSQL sigue siendo la fuente de verdad.

---

# 17. Seguridad

Verificar:

- Un usuario autenticado no puede enviar mensajes haciéndose pasar por otro usuario.
- `senderId` nunca debe confiarse desde el frontend.
- Verificar que el receptor exista.
- Validar longitud máxima del mensaje.
- Sanitizar/renderizar correctamente el contenido en React.
- No permitir acceso a conversaciones ajenas.
- El endpoint WebSocket debe utilizar TLS (`wss://`) en producción.
- Configurar correctamente CORS/orígenes permitidos.
- El JWT debe validarse al conectar.
- Una conexión inválida debe rechazarse.

---

# 18. Cloud Run

El backend está desplegado en Google Cloud Run.

Verificar que WebSocket funcione correctamente sobre HTTPS/WSS.

El frontend debe transformar:

```text
https://backend.example.com
```

en:

```text
wss://backend.example.com/ws
```

para WebSocket en producción.

No crear una URL apuntando a localhost en producción.

---

# 19. Organización sugerida

Ejemplo:

```text
backend/
└── src/main/java/.../
    ├── config/
    │   ├── WebSocketConfig.java
    │   └── WebSocketAuthInterceptor.java
    │
    ├── chat/
    │   ├── ChatMessage.java
    │   ├── ChatMessageRepository.java
    │   ├── ChatService.java
    │   ├── ChatWebSocketController.java
    │   ├── SendMessageRequest.java
    │   └── ChatMessageResponse.java
    │
    └── notification/
        └── implementación existente
```

Adaptar esta organización a la estructura real del repositorio.

---

# 20. Pruebas

Agregar tests como mínimo para:

### ChatService

- guarda un mensaje correctamente;
- utiliza el usuario autenticado como sender;
- rechaza destinatario inexistente;
- rechaza mensajes vacíos;
- devuelve el ID persistido;
- fecha de creación presente.

### Seguridad

- conexión sin JWT es rechazada;
- JWT inválido es rechazado;
- usuario autenticado queda asociado al `Principal`.

### WebSocket

Comprobar:

```text
Usuario A conectado
Usuario B conectado

A envía mensaje a B

Resultado:
- mensaje persistido una sola vez;
- A recibe el mensaje confirmado;
- B recibe el mensaje;
- usuario C NO recibe el mensaje.
```

---

# 21. Criterios de aceptación

La tarea está completa cuando:

- [ ] El backend sigue funcionando con Spring MVC.
- [ ] No se migró a WebFlux.
- [ ] Existe endpoint WebSocket `/ws`.
- [ ] Se utiliza STOMP.
- [ ] El WebSocket autentica mediante el JWT existente.
- [ ] El usuario autenticado queda disponible como `Principal`.
- [ ] Se pueden enviar mensajes mediante `/app/chat.send`.
- [ ] El mensaje se persiste en PostgreSQL.
- [ ] El destinatario recibe el mensaje sin refrescar.
- [ ] El remitente recibe el mensaje persistido por el backend.
- [ ] Los mensajes utilizan `/user/queue/messages`.
- [ ] Las notificaciones utilizan `/user/queue/notifications`.
- [ ] Un tercer usuario no recibe mensajes ajenos.
- [ ] El historial se obtiene por REST.
- [ ] React actualiza el chat en tiempo real.
- [ ] Se evitan mensajes duplicados mediante el ID persistido.
- [ ] Existe reconexión automática.
- [ ] Funciona localmente.
- [ ] Funciona en producción usando `wss://`.
- [ ] Se agregaron pruebas.
- [ ] No se rompieron endpoints REST existentes.

---

# 22. Forma de trabajo del agente

Antes de modificar código:

1. Inspeccionar la estructura real del backend.
2. Identificar cómo funciona actualmente Spring Security y JWT.
3. Identificar cuál es el valor actual de `Principal.getName()`.
4. Revisar la implementación existente de notificaciones.
5. Revisar entidades de usuarios y posibles conversaciones.
6. Revisar configuración CORS.
7. Revisar frontend y manejo actual de autenticación.

Luego implementar utilizando los componentes existentes siempre que sea posible.

Evitar crear servicios duplicados si ya existe funcionalidad equivalente.

No cambiar contratos REST existentes salvo que sea estrictamente necesario.

No introducir WebFlux.

Al finalizar:

1. Ejecutar tests del backend.
2. Ejecutar build del backend.
3. Ejecutar tests/build del frontend si corresponden.
4. Informar archivos creados/modificados.
5. Informar decisiones de arquitectura importantes.
6. Informar cualquier variable de entorno nueva necesaria.
7. Explicar cómo probar dos usuarios simultáneamente.
