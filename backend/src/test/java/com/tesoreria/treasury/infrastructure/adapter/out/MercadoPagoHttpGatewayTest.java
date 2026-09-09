package com.tesoreria.treasury.infrastructure.adapter.out;

import com.tesoreria.shared.domain.exception.DomainException;
import com.tesoreria.treasury.config.MercadoPagoSettings;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import tools.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.net.http.*;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.Flow;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class MercadoPagoHttpGatewayTest {
    private final HttpClient client = mock(HttpClient.class);
    private final ObjectMapper mapper = new ObjectMapper();
    private final MercadoPagoHttpGateway gateway = new MercadoPagoHttpGateway(new MercadoPagoSettings("secret-token",
            "signature-secret", 1, "123", "https://curso.test/tesoreria/pagos", "https://api.test/webhook", true), mapper, client);

    @Test void usesInitPointAndBuildsServerSidePreference() throws Exception {
        respond(201, "{\"id\":\"pref\",\"collector_id\":123,\"init_point\":\"https://www.mercadopago.cl/checkout/v1/redirect?pref_id=pref\"}");
        var result = gateway.createPreference("reference", "Cuota anual", new BigDecimal("70000"), 2026);
        assertEquals("pref", result.preferenceId());
        ArgumentCaptor<HttpRequest> request = ArgumentCaptor.forClass(HttpRequest.class);
        verify(client).send(request.capture(), any(HttpResponse.BodyHandler.class));
        assertEquals("https://api.mercadopago.com/checkout/preferences", request.getValue().uri().toString());
        assertEquals("Bearer secret-token", request.getValue().headers().firstValue("Authorization").orElseThrow());
        var body = mapper.readTree(body(request.getValue()));
        assertEquals(70000, body.path("items").get(0).path("unit_price").asInt());
        assertEquals("CLP", body.path("items").get(0).path("currency_id").asText());
        assertEquals("reference", body.path("external_reference").asText());
        assertEquals("https://curso.test/tesoreria/pagos?mp_return=1&year=2026", body.path("back_urls").path("success").asText());
    }

    @Test void verifiesRedirectHostAndCollector() throws Exception {
        respond(201, "{\"id\":\"pref\",\"collector_id\":123,\"init_point\":\"https://evil.test/checkout\"}");
        assertThrows(DomainException.class, () -> gateway.createPreference("ref", "Cuota", BigDecimal.TEN, 2026));
        respond(201, "{\"id\":\"pref\",\"collector_id\":999,\"init_point\":\"https://www.mercadopago.cl/checkout\"}");
        assertThrows(DomainException.class, () -> gateway.createPreference("ref", "Cuota", BigDecimal.TEN, 2026));
    }

    @Test void readsPaymentAndDoesNotExposeProviderErrors() throws Exception {
        respond(200, "{\"id\":42,\"external_reference\":\"ref\",\"status\":\"pending\",\"transaction_amount\":70000,\"currency_id\":\"CLP\",\"collector_id\":123,\"live_mode\":false,\"date_approved\":null}");
        var result = gateway.getPayment("42");
        assertEquals("pending", result.status()); assertNull(result.paidAt()); assertFalse(result.liveMode());
        respond(401, "secret response");
        assertFalse(assertThrows(DomainException.class, () -> gateway.getPayment("42")).getMessage().contains("secret"));
        assertThrows(DomainException.class, () -> gateway.getPayment("../users"));
    }

    @SuppressWarnings("unchecked")
    private void respond(int status, String body) throws Exception {
        HttpResponse<String> response = mock(HttpResponse.class);
        when(response.statusCode()).thenReturn(status); when(response.body()).thenReturn(body);
        when(client.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class))).thenReturn(response);
    }

    private String body(HttpRequest request) {
        StringBuilder result = new StringBuilder();
        request.bodyPublisher().orElseThrow().subscribe(new Flow.Subscriber<ByteBuffer>() {
            public void onSubscribe(Flow.Subscription subscription) { subscription.request(Long.MAX_VALUE); }
            public void onNext(ByteBuffer item) { result.append(StandardCharsets.UTF_8.decode(item)); }
            public void onError(Throwable error) { throw new AssertionError(error); }
            public void onComplete() { }
        });
        return result.toString();
    }
}
