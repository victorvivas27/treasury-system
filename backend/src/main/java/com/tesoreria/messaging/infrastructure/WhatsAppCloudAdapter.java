package com.tesoreria.messaging.infrastructure;

import com.tesoreria.messaging.config.WhatsAppProperties;
import com.tesoreria.messaging.core.InvitationMessagePort;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import tools.jackson.databind.JsonNode;
import java.net.http.HttpClient;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Component
public class WhatsAppCloudAdapter implements InvitationMessagePort {
    private static final String TYPE = "type";
    private final WhatsAppProperties config;
    private final RestClient client;

    @org.springframework.beans.factory.annotation.Autowired
    public WhatsAppCloudAdapter(WhatsAppProperties config) {
        this.config = config;
        var factory = new JdkClientHttpRequestFactory(HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(5)).build());
        factory.setReadTimeout(Duration.ofSeconds(15));
        client = RestClient.builder().requestFactory(factory).baseUrl("https://graph.facebook.com").build();
    }

    public WhatsAppCloudAdapter(WhatsAppProperties config, RestClient client) {
        this.config = config;
        this.client = client;
    }

    @Override
    public SendResult sendInvitation(String phone, String name, String application, String token) {
        if ("mock".equals(config.getProvider())) return new SendResult("mock-" + UUID.randomUUID(), null, true);
        var body = Map.of("messaging_product", "whatsapp", "to", phone.substring(1), TYPE, "template",
                "template", Map.of("name", config.getTemplateInvitation(),
                "language", Map.of("code", config.getTemplateLanguage()),
                "components", List.of(Map.of(TYPE, "button", "sub_type", "url", "index", "0",
                        "parameters", List.of(text(token))))));
        try {
            JsonNode response = client.post().uri("/{version}/{phone}/messages", config.getApiVersion(), config.getPhoneNumberId())
                    .header("Authorization", "Bearer " + config.getAccessToken())
                    .body(body).retrieve().body(JsonNode.class);
            String id = response == null ? "" : response.path("messages").path(0).path("id").asText("");
            return id.isBlank() ? new SendResult(null, "META_EMPTY_RESPONSE", false) : new SendResult(id, null, false);
        } catch (org.springframework.web.client.RestClientException exception) {
            // Never retain the upstream body, credentials, recipient or activation token in errors/logs.
            return new SendResult(null, "META_REQUEST_FAILED", false);
        }
    }

    private Map<String, String> text(String value) { return Map.of(TYPE, "text", "text", value); }
}
