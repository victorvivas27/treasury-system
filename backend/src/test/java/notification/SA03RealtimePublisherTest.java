package notification;

import com.tesoreria.notification.application.*;
import com.tesoreria.notification.infrastructure.web.*;
import org.junit.jupiter.api.Test;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import java.time.LocalDateTime;
import java.util.List;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

class SA03RealtimePublisherTest {
    @Test void everyEventRoutesByAccountId() {
        var messaging = mock(SimpMessagingTemplate.class);
        var publisher = new NotificationRealtimePublisher(messaging);
        var reply = new RealtimeReply(123L, null, 20L);
        publisher.notificationCreated(new NotificationCreatedEvent(1L, List.of(10L)));
        verify(messaging).convertAndSendToUser(eq("10"), eq("/queue/notifications"), any());
        clearInvocations(messaging);
        publisher.replyCreated(new NotificationReplyCreatedEvent(reply, 10L));
        verify(messaging).convertAndSendToUser(eq("20"), eq("/queue/messages"), any());
        verify(messaging).convertAndSendToUser(eq("10"), eq("/queue/messages"), any());
        verify(messaging).convertAndSendToUser(eq("20"), eq("/queue/notifications"), any());
        verifyNoMoreInteractions(messaging);
        clearInvocations(messaging);
        publisher.replyUpdated(new NotificationReplyUpdatedEvent(reply, 10L));
        verify(messaging).convertAndSendToUser(eq("20"), eq("/queue/messages"), any());
        verify(messaging).convertAndSendToUser(eq("10"), eq("/queue/messages"), any());
        verifyNoMoreInteractions(messaging);
        clearInvocations(messaging);
        publisher.messagesRead(new NotificationReadEvent(List.of(2L), List.of(3L),
                LocalDateTime.now(), List.of(10L, 20L, 10L)));
        verify(messaging).convertAndSendToUser(eq("20"), eq("/queue/messages"), any());
        verify(messaging).convertAndSendToUser(eq("10"), eq("/queue/messages"), any());
        verifyNoMoreInteractions(messaging);
        clearInvocations(messaging);
        publisher.replyDeleted(new NotificationReplyDeletedEvent(2L, 20L));
        verify(messaging).convertAndSendToUser(eq("20"), eq("/queue/messages"), any());
        verifyNoMoreInteractions(messaging);
    }
}
