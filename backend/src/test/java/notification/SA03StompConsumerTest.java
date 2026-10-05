package notification;

import com.tesoreria.notification.application.NotificationService;
import com.tesoreria.notification.application.RealtimeReply;
import com.tesoreria.notification.config.StompAccountAuthentication;
import com.tesoreria.notification.config.StompDestinationInterceptor;
import com.tesoreria.notification.infrastructure.web.*;
import com.tesoreria.organization.config.TenantUserDetails;
import com.tesoreria.user.core.constant.RoleEnum;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.messaging.Message;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.stomp.*;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class SA03StompConsumerTest {
    @AfterEach void clear() { SecurityContextHolder.clearContext(); }

    @Test void replyResolvesActorAndBothDestinationsById() {
        var service = mock(NotificationService.class);
        var messaging = mock(SimpMessagingTemplate.class);
        when(service.realtimeReply(eq(123L), any(), eq(20L))).thenReturn(new RealtimeReply(123L, null, 10L));
        var controller = new NotificationWebSocketController(service, messaging);
        controller.reply(new NotificationMessageRequest(123L, "Respuesta"), identity());
        verify(service).realtimeReply(eq(123L), any(), eq(20L));
        verify(messaging).convertAndSendToUser(eq("10"), eq("/queue/messages"), any());
        verify(messaging).convertAndSendToUser(eq("20"), eq("/queue/messages"), any());
        verify(messaging).convertAndSendToUser(eq("10"), eq("/queue/notifications"), any());
        verifyNoMoreInteractions(messaging);
    }

    @Test void onlyLogicalPrivateSubscriptionsAndApplicationReplyAreAllowed() {
        var interceptor = new StompDestinationInterceptor();
        for (String destination : new String[] {"/user/queue/messages", "/user/queue/notifications"}) {
            assertNotNull(interceptor.preSend(frame(StompCommand.SUBSCRIBE, destination, true), null));
        }
        assertNotNull(interceptor.preSend(frame(StompCommand.SEND, "/app/notifications.reply", true), null));
        for (String destination : new String[] {"/user/10/queue/messages", "/queue/messages-user1", "/topic/admin", "/user/queue/admin"}) {
            assertThrows(AccessDeniedException.class,
                    () -> interceptor.preSend(frame(StompCommand.SUBSCRIBE, destination, true), null));
        }
        assertThrows(AccessDeniedException.class,
                () -> interceptor.preSend(frame(StompCommand.SEND, "/app/admin", true), null));
        assertThrows(AccessDeniedException.class,
                () -> interceptor.preSend(frame(StompCommand.SEND, "/queue/messages", true), null));
        assertThrows(AccessDeniedException.class,
                () -> interceptor.preSend(frame(StompCommand.SEND, "/app/notifications.reply", false), null));
    }

    @Test void handlerReceivesCorrectTenantAndOriginalThreadContextIsRestored() {
        var interceptor = new StompDestinationInterceptor();
        var previous = SecurityContextHolder.getContext();
        Message<?> message = frame(StompCommand.SEND, "/app/notifications.reply", true);
        interceptor.beforeHandle(message, null, null);
        var auth = SecurityContextHolder.getContext().getAuthentication();
        assertEquals("20", auth.getName());
        assertEquals(2L, ((TenantUserDetails) auth.getPrincipal()).getOrganizationId());
        interceptor.afterMessageHandled(message, null, null, new IllegalStateException("handler failed"));
        assertSame(previous, SecurityContextHolder.getContext());
        assertNull(SecurityContextHolder.getContext().getAuthentication());
    }

    private StompAccountAuthentication identity() {
        return new StompAccountAuthentication(new TenantUserDetails(20L, 2L, "same@mail.com", "x",
                RoleEnum.USER, true, true));
    }
    private Message<byte[]> frame(StompCommand command, String destination, boolean authenticated) {
        var accessor = StompHeaderAccessor.create(command);
        accessor.setDestination(destination);
        if (authenticated) accessor.setUser(identity());
        accessor.setLeaveMutable(true);
        return MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());
    }
}
