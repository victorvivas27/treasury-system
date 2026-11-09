package com.tesoreria.user.infrastructure.adapter.out.email;

import com.tesoreria.organization.application.OrganizationEmailBranding;
import com.tesoreria.user.core.model.RecoveryLink;
import com.tesoreria.user.core.port.out.EmailOutPort;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.mail.javamail.JavaMailSender;
import tools.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.List;
import java.util.concurrent.Flow;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class ResendEmailAdapterTest {
    private final ObjectMapper mapper = new ObjectMapper();
    private HttpClient client;
    private HttpResponse<String> response;
    private ResendEmailAdapter adapter;

    @BeforeEach
    @SuppressWarnings("unchecked")
    void setUp() throws Exception {
        client = mock(HttpClient.class);
        response = mock(HttpResponse.class);
        when(client.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class))).thenReturn(response);
        when(response.statusCode()).thenReturn(200);
        when(response.body()).thenReturn("{\"id\":\"email-fixture\"}");
        adapter = new ResendEmailAdapter(mapper, client, "re_fixture",
                "Tesorería Escolar <invitaciones@tesoreriaescolar.app>", "treasury.system.app@gmail.com", "");
    }

    @Test
    void invitationUsesVerifiedSenderAndOrganizationReplyAddress() throws Exception {
        assertTrue(adapter.sendGuardianInvitationEmail("guardian@example.com", "Ana <script>",
                "https://app.example/invite?token=fixture&course=1",
                new OrganizationEmailBranding("Curso 4A", "curso@example.com")));
        HttpRequest request = sentRequest();
        assertEquals("https://api.resend.com/emails", request.uri().toString());
        assertEquals("POST", request.method());
        assertEquals("Bearer re_fixture", request.headers().firstValue("Authorization").orElseThrow());
        var body = mapper.readTree(bodyOf(request));
        assertEquals("Curso 4A <invitaciones@tesoreriaescolar.app>", body.path("from").asString());
        assertEquals("curso@example.com", body.path("reply_to").asString());
        assertEquals(1, body.path("to").size());
        assertEquals("guardian@example.com", body.path("to").get(0).asString());
        assertEquals("Te damos la bienvenida a Tesorería Escolar", body.path("subject").asString());
        assertTrue(body.path("html").asString().contains("Ana &lt;script&gt;"));
        assertTrue(body.path("html").asString().contains("token=fixture&amp;course=1"));
        assertFalse(body.has("cc"));
        assertFalse(body.has("bcc"));
    }

    @Test
    void allAccountEmailsUseExistingTemplatesAndDefaultReplyTo() throws Exception {
        assertTrue(adapter.sendVerificationEmail("user@example.com", "Usuario", "https://app.example/verify"));
        assertEquals("treasury.system.app@gmail.com", mapper.readTree(bodyOf(sentRequest())).path("reply_to").asString());
        assertTrue(adapter.sendPasswordResetEmail("user@example.com", "Usuario", "https://app.example/reset"));
        assertTrue(adapter.sendPasswordChangedEmail("user@example.com", "Usuario", LocalDateTime.now()));
        assertTrue(adapter.sendRecoverySummary("user@example.com", "Usuario",
                List.of(new RecoveryLink("Curso", "https://app.example/recover"))));
        verify(client, times(4)).send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class));
    }

    @Test
    void providerRejectionsAndLimitsAreNotReportedAsSuccess() {
        for (int status : new int[]{400, 401, 403, 429, 500}) {
            when(response.statusCode()).thenReturn(status);
            assertFalse(adapter.sendVerificationEmail("user@example.com", "Usuario", "https://app.example/verify"));
        }
    }

    @Test
    void malformedOrMissingProviderIdIsNotSuccess() {
        for (String body : new String[]{"{}", "{\"id\":\"\"}", "not-json"}) {
            when(response.body()).thenReturn(body);
            assertFalse(adapter.sendVerificationEmail("user@example.com", "Usuario", "https://app.example/verify"));
        }
    }

    @Test
    void networkFailureDoesNotRetryOrSendThroughGmail() throws Exception {
        when(client.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class))).thenThrow(new IOException("fixture"));
        assertFalse(adapter.sendVerificationEmail("user@example.com", "Usuario", "https://app.example/verify"));
        verify(client).send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class));
    }

    @Test
    void interruptionPreservesThreadFlag() throws Exception {
        when(client.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class))).thenThrow(new InterruptedException());
        try {
            assertFalse(adapter.sendVerificationEmail("user@example.com", "Usuario", "https://app.example/verify"));
            assertTrue(Thread.currentThread().isInterrupted());
        } finally {
            Thread.interrupted();
        }
    }

    @Test
    void selectingResendRequiresCredentialsAndSender() {
        assertThrows(IllegalArgumentException.class, () -> new ResendEmailAdapter(mapper, client, "", "sender@example.com", "", ""));
        assertThrows(IllegalArgumentException.class, () -> new ResendEmailAdapter(mapper, client, "re_fixture", "", "", ""));
    }

    @Test
    void springSelectsExactlyOneProviderWithoutChangingTheDefault() {
        ApplicationContextRunner runner = new ApplicationContextRunner()
                .withUserConfiguration(GmailEmailAdapter.class, ResendEmailAdapter.class)
                .withBean(ObjectMapper.class, () -> mapper)
                .withBean(JavaMailSender.class, () -> mock(JavaMailSender.class))
                .withPropertyValues("app.email.from=invitaciones@tesoreriaescolar.app",
                        "app.email.resend.api-key=re_fixture");
        runner.run(context -> {
            assertNull(context.getStartupFailure());
            assertEquals(1, context.getBeansOfType(EmailOutPort.class).size());
            assertInstanceOf(GmailEmailAdapter.class, context.getBean(EmailOutPort.class));
        });
        runner.withPropertyValues("app.email.provider=resend").run(context -> {
            assertNull(context.getStartupFailure());
            assertEquals(1, context.getBeansOfType(EmailOutPort.class).size());
            assertInstanceOf(ResendEmailAdapter.class, context.getBean(EmailOutPort.class));
        });
    }

    private HttpRequest sentRequest() throws Exception {
        ArgumentCaptor<HttpRequest> request = ArgumentCaptor.forClass(HttpRequest.class);
        verify(client).send(request.capture(), any(HttpResponse.BodyHandler.class));
        return request.getValue();
    }

    private String bodyOf(HttpRequest request) {
        StringBuilder body = new StringBuilder();
        request.bodyPublisher().orElseThrow().subscribe(new Flow.Subscriber<ByteBuffer>() {
            public void onSubscribe(Flow.Subscription subscription) { subscription.request(Long.MAX_VALUE); }
            public void onNext(ByteBuffer buffer) { body.append(StandardCharsets.UTF_8.decode(buffer)); }
            public void onError(Throwable error) { fail(error); }
            public void onComplete() { }
        });
        return body.toString();
    }
}
