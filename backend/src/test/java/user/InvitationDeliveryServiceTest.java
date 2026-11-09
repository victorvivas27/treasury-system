package user;

import com.tesoreria.apoderado.application.usecase.ApoderadoService;
import com.tesoreria.apoderado.core.model.Apoderado;
import com.tesoreria.organization.application.CurrentOrganizationService;
import com.tesoreria.user.application.usecase.InvitationDeliveryService;
import com.tesoreria.user.core.model.InvitationEmailAccepted;
import com.tesoreria.user.infrastructure.adapter.out.persistence.entity.GuardianEmailDeliveryEntity;
import com.tesoreria.user.infrastructure.adapter.out.persistence.repository.GuardianEmailDeliveryRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;
import java.time.Instant;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class InvitationDeliveryServiceTest {
    private final GuardianEmailDeliveryRepository repository = mock(GuardianEmailDeliveryRepository.class);
    private final ApoderadoService guardians = mock(ApoderadoService.class);
    private final CurrentOrganizationService organization = mock(CurrentOrganizationService.class);
    private final InvitationDeliveryService service = new InvitationDeliveryService(repository, guardians, organization, "fixture");
    private GuardianEmailDeliveryEntity row;

    @BeforeEach void setup() {
        row = new GuardianEmailDeliveryEntity(); row.setStatus("SENT");
        when(repository.findByMessageId("fixture-id")).thenReturn(Optional.of(row));
    }

    @Test void deliveryAdvancesAndOldOrDuplicateEventsNeverUndoIt() {
        Instant now = Instant.now();
        service.receive("fixture-id", "email.delivered", now, true);
        service.receive("fixture-id", "email.delivered", now, true);
        service.receive("fixture-id", "email.sent", now.minusSeconds(1), true);
        service.receive("fixture-id", "email.delivery_delayed", now.plusSeconds(1), true);
        assertEquals("DELIVERED", row.getStatus());
        verify(repository, times(1)).save(row);
    }

    @Test void rejectionAndDelaysAreDistinctFromDelivery() {
        Instant now = Instant.now();
        service.receive("fixture-id", "email.delivery_delayed", now, true);
        assertEquals("DELAYED", row.getStatus());
        service.receive("fixture-id", "email.bounced", now.plusSeconds(1), true);
        assertEquals("BOUNCED", row.getStatus());
    }

    @Test void earlyInvitationCallbacksRequestRetryWhileOtherMailIsIgnored() {
        when(repository.findByMessageId("fixture-id")).thenReturn(Optional.empty());
        assertEquals(503, assertThrows(ResponseStatusException.class,
                () -> service.receive("fixture-id", "email.delivered", Instant.now(), true)).getStatusCode().value());
        assertDoesNotThrow(() -> service.receive("fixture-id", "email.delivered", Instant.now(), false));
        verify(repository, never()).save(any());
    }

    @Test void latestStatusAlwaysUsesCurrentCourseAndScopedGuardian() {
        Apoderado guardian = mock(Apoderado.class);
        when(guardian.getApoderadoId()).thenReturn(7L);
        when(guardians.findByCodigo("AP-ABC12345")).thenReturn(guardian);
        when(organization.getId()).thenReturn(4L);
        when(repository.findFirstByOrganizationIdAndGuardianIdOrderByIdDesc(4L, 7L)).thenReturn(Optional.of(row));
        assertEquals("SENT", service.latest("AP-ABC12345").status());
        verify(repository).findFirstByOrganizationIdAndGuardianIdOrderByIdDesc(4L, 7L);
    }

    @Test void acceptancePersistsOnlyProviderIdAndTenantReference() {
        Apoderado guardian = mock(Apoderado.class);
        when(guardian.getApoderadoId()).thenReturn(7L);
        when(guardians.findByEmail("guardian@example.com")).thenReturn(guardian);
        when(organization.getId()).thenReturn(4L);
        service.accepted(new InvitationEmailAccepted("fixture-id", "guardian@example.com"));
        verify(repository).save(argThat(value -> value.getOrganizationId().equals(4L)
                && value.getGuardianId().equals(7L) && value.getStatus().equals("SENT")));
    }
}
