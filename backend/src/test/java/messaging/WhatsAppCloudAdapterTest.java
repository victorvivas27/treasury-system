package messaging;
import com.tesoreria.messaging.config.WhatsAppProperties;
import com.tesoreria.messaging.infrastructure.WhatsAppCloudAdapter;
import org.junit.jupiter.api.Test;
import org.springframework.web.client.RestClient;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.http.MediaType;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;
import static org.junit.jupiter.api.Assertions.*;

class WhatsAppCloudAdapterTest {
 @Test void sendsApprovedTemplateAndUrlButtonThroughOfficialEndpoint() {
  var config = new WhatsAppProperties(); config.setProvider("meta"); config.setApiVersion("v25.0");
  config.setPhoneNumberId("123"); config.setAccessToken("secret"); config.setTemplateInvitation("guardian_invitation");
  var builder = RestClient.builder().baseUrl("https://graph.facebook.com");
  var server = MockRestServiceServer.bindTo(builder).build();
  server.expect(requestTo("https://graph.facebook.com/v25.0/123/messages"))
   .andExpect(header("Authorization", "Bearer secret"))
   .andExpect(jsonPath("$.template.components[1].parameters[0].text").value("private-token"))
   .andExpect(jsonPath("$.to").value("56912345678"))
   .andRespond(withSuccess("{\"messages\":[{\"id\":\"wamid.test\"}]}", MediaType.APPLICATION_JSON));
  var adapter = new WhatsAppCloudAdapter(config, builder.build());
  assertEquals("wamid.test", adapter.sendInvitation("+56912345678", "Ana", "App", "private-token").messageId());
  server.verify();
 }
 @Test void sanitizesProviderFailuresAndMockNeverCallsNetwork() {
  var config = new WhatsAppProperties(); config.setProvider("meta");
  config.setApiVersion("v25.0"); config.setPhoneNumberId("123");
  var builder = RestClient.builder().baseUrl("https://graph.facebook.com");
  var server = MockRestServiceServer.bindTo(builder).build();
  server.expect(anything()).andRespond(withServerError());
  var adapter = new WhatsAppCloudAdapter(config, builder.build());
  assertEquals("META_REQUEST_FAILED", adapter.sendInvitation("+56912345678", "Ana", "App", "token").errorCode());
  server.verify(); config.setProvider("mock");
  assertTrue(adapter.sendInvitation("+56912345678", "Ana", "App", "token").simulated());
 }
}
