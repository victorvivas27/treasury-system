package messaging;

import com.tesoreria.messaging.application.GuardianWhatsAppService;
import com.tesoreria.messaging.config.WhatsAppProperties;
import com.tesoreria.messaging.core.InvitationMessagePort;
import com.tesoreria.messaging.infrastructure.*;
import com.tesoreria.apoderado.infrastructure.adapter.out.persistence.entity.ApoderadoEntity;
import com.tesoreria.apoderado.infrastructure.adapter.out.persistence.repository.ApoderadoJpaRepository;
import com.tesoreria.organization.application.CurrentOrganizationService;
import com.tesoreria.organization.config.TenantUserDetails;
import com.tesoreria.user.application.usecase.AccountRecoveryService;
import com.tesoreria.user.core.model.User;
import com.tesoreria.user.core.port.out.UserRepositoryOutPort;
import com.tesoreria.user.infrastructure.adapter.out.persistence.repository.UserTokenJpaRepository;
import com.tesoreria.user.infrastructure.adapter.out.persistence.entity.UserTokenEntity;
import com.tesoreria.shared.domain.exception.DomainException;
import org.junit.jupiter.api.*;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.function.Consumer;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
import static org.junit.jupiter.api.Assertions.*;

class GuardianWhatsAppServiceTest {
 private final AccountRecoveryService recovery = mock(AccountRecoveryService.class);
 private final GuardianInvitationRepository invitations = mock(GuardianInvitationRepository.class);
 private final ApoderadoJpaRepository guardians = mock(ApoderadoJpaRepository.class);
 private final CurrentOrganizationService organization = mock(CurrentOrganizationService.class);
 private final InvitationMessagePort messaging = mock(InvitationMessagePort.class);
 private final UserTokenJpaRepository tokens = mock(UserTokenJpaRepository.class);
 private final UserRepositoryOutPort users = mock(UserRepositoryOutPort.class);
 private final WhatsAppProperties config = new WhatsAppProperties();
 private GuardianWhatsAppService service;
 private ApoderadoEntity guardian;
 private User user;
 private final GuardianWhatsAppService.Consent consent = new GuardianWhatsAppService.Consent(true, "Signed form", LocalDateTime.now().minusDays(1));
 @BeforeEach void setup() {
  config.setEnabled(true); config.setPublicUrl("https://app.example");
  when(organization.getId()).thenReturn(5L);
  guardian = new ApoderadoEntity(7L, "AP-12345678", "Ana", "ana@example.com", "912345678", null);
  when(guardians.lockInOrganization(7L, 5L)).thenReturn(Optional.of(guardian));
  var principal = mock(TenantUserDetails.class); when(principal.getUserId()).thenReturn(3L);
  SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(principal, null, java.util.List.of()));
  user = new User(); user.setId(9L);
  when(users.findById(9L)).thenReturn(Optional.of(user));
  when(tokens.findByTokenHashAndType(anyString(), any())).thenReturn(Optional.of(new UserTokenEntity()));
  when(invitations.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
  when(messaging.sendInvitation(anyString(), anyString(), anyString(), anyString()))
    .thenReturn(new InvitationMessagePort.SendResult("wamid.test", null, false));
  doAnswer(invocation -> {
   Consumer<AccountRecoveryService.GuardianInvitation> dispatch = invocation.getArgument(1);
   dispatch.accept(new AccountRecoveryService.GuardianInvitation(user, guardian, "private-token", "hash-only"));
   return user;
  }).when(recovery).inviteGuardian(eq(7L), any(), eq(1440L));
  service = new GuardianWhatsAppService(recovery, invitations, guardians, organization, config, messaging, tokens, users);
 }
 @AfterEach void clear() { SecurityContextHolder.clearContext(); }
 @Test void recordsConsentAndMetaAcceptanceWithoutClaimingDelivery() {
  var status = service.invite(7L, consent);
  assertEquals("ACCEPTED", status.deliveryStatus()); assertNull(status.deliveredAt());
  var capture = org.mockito.ArgumentCaptor.forClass(GuardianInvitationEntity.class);
  verify(invitations, times(2)).save(capture.capture());
  var saved = capture.getValue();
  assertEquals("hash-only", saved.getTokenHash()); assertEquals("+56912345678", saved.getPhone());
  assertEquals("Signed form", saved.getConsentSource()); assertEquals(3L, saved.getConsentRecordedBy());
  assertEquals(24, java.time.Duration.between(saved.getCreatedAt(), saved.getExpiresAt()).toHours());
 }
 @Test void exposesOnlyConfiguredAvailabilityWithoutQueryingInvitations() {
  assertTrue(service.channels().whatsappEnabled());
  config.setEnabled(false);
  assertFalse(service.channels().whatsappEnabled());
  verifyNoInteractions(recovery, invitations, messaging);
 }
 @Test void persistsSanitizedApiFailure() {
  when(messaging.sendInvitation(anyString(), anyString(), anyString(), anyString()))
   .thenReturn(new InvitationMessagePort.SendResult(null, "META_REQUEST_FAILED", false));
  var status = service.invite(7L, consent);
  assertEquals("FAILED", status.deliveryStatus()); assertEquals("META_REQUEST_FAILED", status.errorCode());
 }
 @Test void sendsBothChannelsUsingTheSameIssuedToken() {
  when(recovery.sendGuardianInvitationEmail(any(), eq("https://app.example"))).thenReturn(true);
  var result = service.invite(7L, new GuardianWhatsAppService.Consent(true, "Signed form", consent.authorizedAt(), true));
  assertEquals(Boolean.TRUE, result.emailSent());
  verify(messaging).sendInvitation("+56912345678", "Ana", "Tesoreria Escolar", "private-token");
  verify(recovery).sendGuardianInvitationEmail(
    new AccountRecoveryService.GuardianInvitation(user, guardian, "private-token", "hash-only"), "https://app.example");
  verify(recovery, times(1)).inviteGuardian(eq(7L), any(), eq(1440L));
 }
 @Test void retainsWhatsAppAcceptanceWhenEmailFails() {
  var result = service.invite(7L, new GuardianWhatsAppService.Consent(true, "Signed form", consent.authorizedAt(), true));
  assertEquals("ACCEPTED", result.deliveryStatus());
  assertEquals(Boolean.FALSE, result.emailSent());
 }
 @Test void sendsEmailEvenWhenMetaRejectsMessage() {
  when(recovery.sendGuardianInvitationEmail(any(), anyString())).thenReturn(true);
  when(messaging.sendInvitation(anyString(), anyString(), anyString(), anyString()))
   .thenReturn(new InvitationMessagePort.SendResult(null, "META_REQUEST_FAILED", false));
  var result = service.invite(7L, new GuardianWhatsAppService.Consent(true, "Signed form", consent.authorizedAt(), true));
  assertEquals("FAILED", result.deliveryStatus());
  assertEquals(Boolean.TRUE, result.emailSent());
 }
 @Test void blocksMissingConsentAndInvalidPhoneBeforeIssuingToken() {
  assertThrows(DomainException.class, () -> service.invite(7L, new GuardianWhatsAppService.Consent(false, "", null)));
  guardian.setTelefono("123"); assertThrows(DomainException.class, () -> service.invite(7L, consent));
  verifyNoInteractions(recovery, messaging);
 }
 @Test void limitsResendsFromPersistedTimestamp() {
  var previous = new GuardianInvitationEntity(); previous.setCreatedAt(LocalDateTime.now());
  when(invitations.findFirstByGuardianIdAndOrganizationIdOrderByIdDesc(7L, 5L)).thenReturn(Optional.of(previous));
  assertThrows(DomainException.class, () -> service.invite(7L, consent)); verifyNoInteractions(recovery, messaging);
 }
 @Test void permitsResendAfterCooldown() {
  var previous = new GuardianInvitationEntity(); previous.setCreatedAt(LocalDateTime.now().minusMinutes(2));
  when(invitations.findFirstByGuardianIdAndOrganizationIdOrderByIdDesc(7L, 5L)).thenReturn(Optional.of(previous));
  assertEquals("ACCEPTED", service.invite(7L, consent).deliveryStatus());
 }
 @Test void blocksDisabledConfigurationHttpAndUnauthorizedTestRecipient() {
  config.setEnabled(false); assertThrows(DomainException.class, () -> service.invite(7L, consent));
  config.setEnabled(true); config.setPublicUrl("http://app.example");
  assertThrows(DomainException.class, () -> service.invite(7L, consent));
  config.setPublicUrl("https://app.example"); config.setProvider("meta");
  config.setAccessToken("secret"); config.setPhoneNumberId("123"); config.setBusinessAccountId("456");
  config.setApiVersion("v25.0"); config.setTemplateInvitation("invitation");
  assertThrows(DomainException.class, () -> service.invite(7L, consent)); verifyNoInteractions(recovery, messaging);
 }
 @Test void distinguishesSimulationAndExpiration() {
  when(messaging.sendInvitation(anyString(), anyString(), anyString(), anyString()))
   .thenReturn(new InvitationMessagePort.SendResult("mock-test", null, true));
  assertTrue(service.invite(7L, consent).simulated());
  var previous = new GuardianInvitationEntity(); previous.setUserId(9L); previous.setExpiresAt(LocalDateTime.now().minusHours(1));
  when(invitations.findFirstByGuardianIdAndOrganizationIdOrderByIdDesc(7L, 5L)).thenReturn(Optional.of(previous));
  assertEquals("EXPIRED", service.latest(7L).status());
  user.setInvitationAcceptedAt(LocalDateTime.now());
  assertEquals("ACTIVATED", service.latest(7L).status());
 }
}
