package messaging;
import com.tesoreria.messaging.application.WhatsAppWebhookService;
import com.tesoreria.messaging.config.WhatsAppProperties;
import com.tesoreria.messaging.infrastructure.*;
import com.tesoreria.shared.domain.exception.DomainException;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.HexFormat;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class WhatsAppWebhookServiceTest {
 private final WhatsAppProperties config = new WhatsAppProperties();
 private final GuardianInvitationRepository invitations = mock(GuardianInvitationRepository.class);
 private final WhatsAppWebhookService service = new WhatsAppWebhookService(config, invitations, new ObjectMapper());
 private void configure() { config.setEnabled(true); config.setAppSecret("secret"); config.setVerifyToken("verify"); config.setBusinessAccountId("456"); config.setPhoneNumberId("123"); }
 @Test void verifiesHandshakeAndRejectsUnsignedOrTamperedPayloads() throws Exception {
  configure(); assertEquals("challenge", service.verify("subscribe", "verify", "challenge"));
  assertThrows(DomainException.class, () -> service.verify("subscribe", "bad", "challenge"));
  byte[] body = payload("delivered");
  assertThrows(DomainException.class, () -> service.receive(body, null));
  assertThrows(DomainException.class, () -> service.receive(body, "sha256=bad"));
  verifyNoInteractions(invitations);
 }
 @Test void deliveryIsIdempotentAndNeverRegressesAfterLateFailure() throws Exception {
  configure(); var invitation = new GuardianInvitationEntity(); invitation.setDeliveryStatus("ACCEPTED");
  when(invitations.findByMessageId("wamid.test")).thenReturn(Optional.of(invitation));
  byte[] body = payload("delivered"); service.receive(body, signature(body));
  assertEquals("DELIVERED", invitation.getDeliveryStatus()); assertNotNull(invitation.getDeliveredAt());
  service.receive(body, signature(body));
  body = payload("failed"); service.receive(body, signature(body));
  assertEquals("DELIVERED", invitation.getDeliveryStatus()); verify(invitations, times(1)).save(invitation);
 }
 @Test void ignoresForeignAccountsAndSanitizesDeliveryErrors() throws Exception {
  configure(); var invitation = new GuardianInvitationEntity(); invitation.setDeliveryStatus("ACCEPTED");
  when(invitations.findByMessageId("wamid.test")).thenReturn(Optional.of(invitation));
  byte[] body = payload("failed"); service.receive(body, signature(body));
  assertEquals("FAILED", invitation.getDeliveryStatus()); assertEquals("META_DELIVERY_FAILED", invitation.getErrorCode());
  clearInvocations(invitations); config.setBusinessAccountId("other"); service.receive(body, signature(body));
  verifyNoInteractions(invitations);
 }
 @Test void requestsRetryWhenDeliveryRacesTheInvitationCommit() throws Exception {
  configure();
  String recent = new String(payload("delivered"), StandardCharsets.UTF_8)
    .replace("1792166400", String.valueOf(java.time.Instant.now().getEpochSecond()));
  byte[] body = recent.getBytes(StandardCharsets.UTF_8);
  assertThrows(DomainException.class, () -> service.receive(body, signature(body)));
  byte[] old = payload("delivered");
  assertDoesNotThrow(() -> service.receive(old, signature(old)));
 }
 private byte[] payload(String status) {
  return ("{\"object\":\"whatsapp_business_account\",\"entry\":[{\"id\":\"456\",\"changes\":[{\"value\":{\"metadata\":{\"phone_number_id\":\"123\"},\"statuses\":[{\"id\":\"wamid.test\",\"status\":\"" + status + "\",\"timestamp\":\"1792166400\"}]}}]}]}").getBytes(StandardCharsets.UTF_8);
 }
 private String signature(byte[] body) throws Exception {
  Mac mac = Mac.getInstance("HmacSHA256"); mac.init(new SecretKeySpec("secret".getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
  return "sha256=" + HexFormat.of().formatHex(mac.doFinal(body));
 }
}
