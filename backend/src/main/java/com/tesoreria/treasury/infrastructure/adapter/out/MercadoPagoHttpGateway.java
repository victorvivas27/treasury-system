package com.tesoreria.treasury.infrastructure.adapter.out;

import com.tesoreria.shared.domain.exception.DomainException;
import com.tesoreria.treasury.config.MercadoPagoSettings;
import com.tesoreria.treasury.core.port.out.MercadoPagoGateway;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.math.BigDecimal;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

@Component
public class MercadoPagoHttpGateway implements MercadoPagoGateway {
    private final MercadoPagoSettings settings;
    private final ObjectMapper mapper;
    private final HttpClient client;

    @org.springframework.beans.factory.annotation.Autowired
    public MercadoPagoHttpGateway(MercadoPagoSettings settings, ObjectMapper mapper) {
        this(settings, mapper, HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build());
    }

    MercadoPagoHttpGateway(MercadoPagoSettings settings, ObjectMapper mapper, HttpClient client) {
        this.settings = settings;
        this.mapper = mapper;
        this.client = client;
    }

    @Override
    public Checkout createPreference(String reference, String concept, BigDecimal amount, int year) {
        String back = settings.returnUrl() + "?mp_return=1&year=" + year;
        Map<String, Object> body = Map.of(
                "items", List.of(Map.of("id", reference, "title", concept, "quantity", 1,
                        "currency_id", "CLP", "unit_price", amount)),
                "external_reference", reference,
                "back_urls", Map.of("success", back, "failure", back, "pending", back),
                "auto_return", "approved", "notification_url", settings.webhookUrl(),
                "binary_mode", false);
        JsonNode response = request("/checkout/preferences", mapper.writeValueAsString(body), reference);
        String url = response.path("init_point").asText();
        URI uri = URI.create(url);
        if (!"https".equals(uri.getScheme())
                || !java.util.Set.of("www.mercadopago.cl", "www.mercadopago.com").contains(uri.getHost())
                || uri.getUserInfo() != null || uri.getPort() != -1 || response.path("id").asText().isBlank()
                || !settings.collectorId().equals(response.path("collector_id").asText()))
            throw unavailable();
        return new Checkout(response.path("id").asText(), url);
    }

    @Override
    public ProviderPayment getPayment(String paymentId) {
        if (paymentId == null || !paymentId.matches("[0-9]{1,30}"))
            throw new DomainException("pago", HttpStatus.BAD_REQUEST, "Identificador de pago inválido");
        JsonNode value = request("/v1/payments/" + paymentId, null, null);
        String paidAt = value.path("date_approved").asText("");
        return new ProviderPayment(value.path("id").asText(), value.path("external_reference").asText(),
                value.path("status").asText(), new BigDecimal(value.path("transaction_amount").asText()),
                value.path("currency_id").asText(), value.path("collector_id").asText(),
                value.path("live_mode").asBoolean(), parseDate(paidAt));
    }

    private OffsetDateTime parseDate(String value) {
        if (value.isBlank())
            return null;
        return OffsetDateTime.parse(value);
    }

    private JsonNode request(String path, String body, String key) {
        if (!settings.enabled())
            throw unavailable();
        HttpRequest.Builder builder = HttpRequest.newBuilder(URI.create("https://api.mercadopago.com" + path))
                .timeout(Duration.ofSeconds(20)).header("Authorization", "Bearer " + settings.accessToken());
        if (body != null)
            builder.header("Content-Type", "application/json").header("X-Idempotency-Key", key)
                    .POST(HttpRequest.BodyPublishers.ofString(body));
        try {
            HttpResponse<String> response = client.send(builder.build(), HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300)
                throw unavailable();
            return mapper.readTree(response.body());
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw unavailable();
        } catch (IOException exception) {
            throw unavailable();
        }
    }

    private DomainException unavailable() {
        return new DomainException("pago", HttpStatus.SERVICE_UNAVAILABLE,
                "Mercado Pago no está disponible. Intenta nuevamente.");
    }
}
