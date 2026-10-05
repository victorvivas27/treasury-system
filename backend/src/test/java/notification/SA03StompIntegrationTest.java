package notification;

import com.tesoreria.TesoreriaAppApplication;
import com.tesoreria.notification.application.NotificationCreatedEvent;
import com.tesoreria.notification.infrastructure.web.NotificationRealtimePublisher;
import com.tesoreria.organization.config.TenantUserDetails;
import com.tesoreria.organization.core.model.OrganizationType;
import com.tesoreria.organization.infrastructure.persistence.OrganizationEntity;
import com.tesoreria.organization.infrastructure.persistence.OrganizationJpaRepository;
import com.tesoreria.user.application.usecase.CustomUserDetailsService;
import com.tesoreria.user.config.security.JwtService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.messaging.converter.StringMessageConverter;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.user.SimpUserRegistry;
import org.springframework.messaging.simp.stomp.*;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.web.socket.client.standard.StandardWebSocketClient;
import org.springframework.web.socket.messaging.WebSocketStompClient;
import java.lang.reflect.Type;
import java.util.List;
import java.util.concurrent.*;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(classes = TesoreriaAppApplication.class,
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "spring.datasource.url=jdbc:h2:mem:sa03stomp;DB_CLOSE_DELAY=-1",
        "app.storage.gcs.enabled=false", "MERCADO_PAGO_ACCESS_TOKEN=",
        "MERCADO_PAGO_WEBHOOK_SECRET=", "MERCADO_PAGO_ORGANIZATION_ID=0",
        "MERCADO_PAGO_COLLECTOR_ID=", "MERCADO_PAGO_RETURN_URL=", "MERCADO_PAGO_WEBHOOK_URL="})
@ActiveProfiles("test")
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class SA03StompIntegrationTest {
    @LocalServerPort int port;
    @Autowired OrganizationJpaRepository organizations;
    @Autowired JdbcTemplate jdbc;
    @Autowired CustomUserDetailsService details;
    @Autowired JwtService jwt;
    @Autowired SimpUserRegistry registry;
    @Autowired SimpMessagingTemplate messaging;
    @Autowired NotificationRealtimePublisher publisher;

    @Test void sameEmailAccountsAreIsolatedThroughRealStompBroker() throws Exception {
        Long organizationA = organization("sa03-a");
        Long organizationB = organization("sa03-b");
        // The original bug selected ID 10 by email, even with the JWT belonging to ID 20.
        account(10L, organizationA, "ADMIN");
        account(20L, organizationB, "USER");
        assertEquals(2, jdbc.queryForObject("select count(*) from users where correo='mismo@email.com'", Integer.class));
        var client = new WebSocketStompClient(new StandardWebSocketClient());
        client.setMessageConverter(new StringMessageConverter() {
            @Override protected boolean supportsMimeType(org.springframework.messaging.MessageHeaders headers) {
                return true;
            }
        });
        var eventsA = new LinkedBlockingQueue<String>();
        var eventsA2 = new LinkedBlockingQueue<String>();
        var eventsB = new LinkedBlockingQueue<String>();
        StompSession a = null, a2 = null, b = null;
        try {
            a = connect(client, 10L, new StompSessionHandlerAdapter() { });
            a2 = connect(client, 10L, new StompSessionHandlerAdapter() { });
            b = connect(client, 20L, new StompSessionHandlerAdapter() { });
            subscribe(a, eventsA);
            subscribe(a2, eventsA2);
            subscribe(b, eventsB);
            awaitSubscriptions(3);
            assertIdentity("10", organizationA, "ROLE_ADMIN");
            assertIdentity("20", organizationB, "ROLE_USER");
            messaging.convertAndSendToUser("10", "/queue/notifications", "only-a");
            assertEquals("only-a", eventsA.poll(5, TimeUnit.SECONDS));
            assertEquals("only-a", eventsA2.poll(5, TimeUnit.SECONDS));
            assertNull(eventsB.poll(300, TimeUnit.MILLISECONDS));
            messaging.convertAndSendToUser("20", "/queue/notifications", "only-b");
            assertEquals("only-b", eventsB.poll(5, TimeUnit.SECONDS));
            assertNull(eventsA.poll(300, TimeUnit.MILLISECONDS));
            assertNull(eventsA2.poll(300, TimeUnit.MILLISECONDS));
            publisher.notificationCreated(new NotificationCreatedEvent(99L, List.of(10L)));
            assertNotNull(eventsA.poll(5, TimeUnit.SECONDS));
            assertNotNull(eventsA2.poll(5, TimeUnit.SECONDS));
            assertNull(eventsB.poll(300, TimeUnit.MILLISECONDS));
            replyUsesConnectedAccountAndTenant(b, organizationB, eventsA, eventsA2);
            denied(client, true, "/user/10/queue/notifications");
            denied(client, true, "/queue/notifications-user" + a.getSessionId());
            denied(client, true, "/user/queue/admin");
            denied(client, false, "/app/admin");
            denied(client, false, "/queue/notifications");
        } finally {
            if (a != null && a.isConnected()) a.disconnect();
            if (a2 != null && a2.isConnected()) a2.disconnect();
            if (b != null && b.isConnected()) b.disconnect();
            client.stop();
        }
    }

    private Long organization(String slug) {
        var organization = new OrganizationEntity();
        organization.setName(slug); organization.setSlug(slug);
        organization.setType(OrganizationType.COURSE); organization.setSchoolYear(2026);
        return organizations.saveAndFlush(organization).getId();
    }
    private void account(Long id, Long organization, String role) {
        jdbc.update("insert into users (id,code,nombre,correo,password,rol,organization_id,enabled,account_non_locked,email_verified_at,profile_image_type,totp_enabled) values (?,?,?,'mismo@email.com','$2a$hash',?,?,true,true,CURRENT_TIMESTAMP,'INITIALS',false)",
                id, "USR-SA03-" + id, "Cuenta Prueba", role, organization);
    }
    private StompSession connect(WebSocketStompClient client, Long id, StompSessionHandler handler) throws Exception {
        var headers = new StompHeaders();
        headers.add("Authorization", "Bearer " + jwt.generateToken(details.loadUserById(id)));
        return client.connectAsync("ws://localhost:" + port + "/tesoreria/ws",
                new org.springframework.web.socket.WebSocketHttpHeaders(), headers, handler)
                .get(10, TimeUnit.SECONDS);
    }
    private void subscribe(StompSession session, BlockingQueue<String> events) {
        subscribe(session, "/user/queue/notifications", events);
    }
    private void subscribe(StompSession session, String destination, BlockingQueue<String> events) {
        session.subscribe(destination, new StompFrameHandler() {
            @Override public Type getPayloadType(StompHeaders headers) { return String.class; }
            @Override public void handleFrame(StompHeaders headers, Object payload) { events.add((String) payload); }
        });
    }
    private void replyUsesConnectedAccountAndTenant(StompSession b, Long organization,
            BlockingQueue<String> eventsA, BlockingQueue<String> eventsA2) throws Exception {
        jdbc.update("insert into users (id,code,nombre,correo,password,rol,organization_id,enabled,account_non_locked,profile_image_type,totp_enabled) values (21,'USR-SA03-21','Administrador Prueba','admin-b@email.com','$2a$hash','ADMIN',?,true,true,'INITIALS',false)", organization);
        jdbc.update("insert into notifications (id,title,message,type,created_by,created_at,organization_id) values (101,'Test','Mensaje','INFO',21,CURRENT_TIMESTAMP,?)", organization);
        jdbc.update("insert into user_notifications (id,notification_id,user_id,is_read,is_visible,created_at,organization_id) values (201,101,20,false,true,CURRENT_TIMESTAMP,?)", organization);
        var repliesB = new LinkedBlockingQueue<String>();
        subscribe(b, "/user/queue/messages", repliesB);
        awaitSubscriptions(4);
        var headers = new StompHeaders();
        headers.setDestination("/app/notifications.reply");
        headers.setContentType(org.springframework.util.MimeTypeUtils.APPLICATION_JSON);
        b.send(headers, "{\"deliveryId\":201,\"message\":\"Respuesta de B\"}");
        String response = repliesB.poll(5, TimeUnit.SECONDS);
        assertNotNull(response, "Connected consumer did not reply");
        assertTrue(response.contains("\"authorId\":20"), response);
        assertEquals(organization, jdbc.queryForObject(
                "select organization_id from notification_replies where author_id=20", Long.class));
        assertNull(eventsA.poll(300, TimeUnit.MILLISECONDS));
        assertNull(eventsA2.poll(300, TimeUnit.MILLISECONDS));
    }
    private void awaitSubscriptions(int count) throws InterruptedException {
        long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(5);
        while (System.nanoTime() < deadline) {
            long actual = registry.getUsers().stream().flatMap(user -> user.getSessions().stream())
                    .flatMap(session -> session.getSubscriptions().stream()).count();
            if (actual == count) { Thread.sleep(100); return; }
            Thread.sleep(10);
        }
        fail("Subscriptions were not registered");
    }
    private void assertIdentity(String name, Long organization, String authority) {
        var authentication = (org.springframework.security.core.Authentication) registry.getUser(name).getPrincipal();
        var account = (TenantUserDetails) authentication.getPrincipal();
        assertEquals(Long.valueOf(name), account.getUserId());
        assertEquals(organization, account.getOrganizationId());
        assertEquals(List.of(authority), authentication.getAuthorities().stream().map(Object::toString).toList());
    }
    private void denied(WebSocketStompClient client, boolean subscription, String destination) throws Exception {
        var denied = new CountDownLatch(1);
        var session = connect(client, 20L, new StompSessionHandlerAdapter() {
            @Override public Type getPayloadType(StompHeaders headers) { return String.class; }
            @Override public void handleFrame(StompHeaders headers, Object payload) { denied.countDown(); }
            @Override public void handleTransportError(StompSession session, Throwable exception) { denied.countDown(); }
        });
        if (subscription) subscribeTo(session, destination);
        else session.send(destination, "{}");
        assertTrue(denied.await(5, TimeUnit.SECONDS), "Unauthorized destination was not rejected: " + destination);
        // The server closes unauthorized sessions after ERROR; client.stop() releases transports.
    }
    private void subscribeTo(StompSession session, String destination) {
        session.subscribe(destination, new StompFrameHandler() {
            @Override public Type getPayloadType(StompHeaders headers) { return String.class; }
            @Override public void handleFrame(StompHeaders headers, Object payload) { fail("Unauthorized delivery"); }
        });
    }
}
