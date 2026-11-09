package com.tesoreria.user.infrastructure.adapter.out.email;

import com.tesoreria.organization.application.OrganizationEmailBranding;
import com.tesoreria.user.core.model.RecoveryLink;
import com.tesoreria.user.core.model.InvitationEmailAccepted;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.context.ApplicationEventPublisherAware;
import java.util.function.Consumer;
import com.tesoreria.user.core.port.out.EmailOutPort;
import jakarta.mail.internet.InternetAddress;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** A successful send means API acceptance, not delivery to the recipient's inbox. */
@Component
@ConditionalOnProperty(name = "app.email.provider", havingValue = "resend")
public class ResendEmailAdapter implements EmailOutPort, ApplicationEventPublisherAware {
    private static final Logger LOGGER = LoggerFactory.getLogger(ResendEmailAdapter.class);
    private static final URI ENDPOINT = URI.create("https://api.resend.com/emails");
    private final ObjectMapper mapper;
    private final HttpClient client;
    private final String apiKey;
    private final String from;
    private final String replyTo;
    private final EmailImages images;
    private ApplicationEventPublisher events;

    @Override
    public void setApplicationEventPublisher(ApplicationEventPublisher publisher) { this.events = publisher; }

    @Autowired
    public ResendEmailAdapter(ObjectMapper mapper,
                              @Value("${app.email.resend.api-key:}") String apiKey,
                              @Value("${app.email.from:}") String from,
                              @Value("${app.email.reply-to:}") String replyTo,
                              @Value("${app.email.assets-base-url:}") String assetsBaseUrl) {
        this(mapper, HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build(),
                apiKey, from, replyTo, assetsBaseUrl);
    }

    ResendEmailAdapter(ObjectMapper mapper, HttpClient client, String apiKey, String from,
                       String replyTo, String assetsBaseUrl) {
        if (apiKey.isBlank() || from.isBlank()) {
            throw new IllegalArgumentException("Resend requiere RESEND_API_KEY y EMAIL_FROM");
        }
        this.mapper = mapper;
        this.client = client;
        this.apiKey = apiKey.trim();
        this.from = from.trim();
        this.replyTo = replyTo.trim();
        this.images = new EmailImages(assetsBaseUrl);
    }

    @Override
    public boolean sendRecoverySummary(String email, String name, List<RecoveryLink> links) {
        return send(email, "Recupera tu acceso a Tesorer\u00eda Escolar",
                EmailTemplates.recoverySummary(name, links), null);
    }

    @Override
    public boolean sendVerificationEmail(String email, String name, String link) {
        return sendVerificationEmail(email, name, link, null);
    }

    @Override
    public boolean sendVerificationEmail(String email, String name, String link, OrganizationEmailBranding branding) {
        return send(email, "Verifica tu correo para activar tu cuenta", EmailTemplates.verification(name, link), branding);
    }

    @Override
    public boolean sendGuardianInvitationEmail(String email, String name, String link, OrganizationEmailBranding branding) {
        return send(email, "Te damos la bienvenida a Tesorer\u00eda Escolar", EmailTemplates.guardianInvitation(name, link), branding,
                id -> { if (events != null) events.publishEvent(new InvitationEmailAccepted(id, email)); });
    }

    @Override
    public boolean sendPasswordResetEmail(String email, String name, String link) {
        return sendPasswordResetEmail(email, name, link, null);
    }

    @Override
    public boolean sendPasswordResetEmail(String email, String name, String link, OrganizationEmailBranding branding) {
        return send(email, "Restablece tu contrase\u00f1a", EmailTemplates.passwordReset(name, link), branding);
    }

    @Override
    public boolean sendPasswordChangedEmail(String email, String name, LocalDateTime changedAt) {
        return sendPasswordChangedEmail(email, name, changedAt, null);
    }

    @Override
    public boolean sendPasswordChangedEmail(String email, String name, LocalDateTime changedAt,
                                             OrganizationEmailBranding branding) {
        return send(email, "Tu contrase\u00f1a fue modificada", EmailTemplates.passwordChanged(name, changedAt), branding);
    }

    private boolean send(String to, String subject, String html, OrganizationEmailBranding branding) {
        return send(to, subject, html, branding, null);
    }

    private boolean send(String to, String subject, String html, OrganizationEmailBranding branding,
                         Consumer<String> onAccepted) {
        try {
            Map<String, Object> body = new LinkedHashMap<>();
            InternetAddress sender = new InternetAddress(from, true);
            sender.validate();
            if (branding != null && branding.senderName() != null && !branding.senderName().isBlank()) {
                sender.setPersonal(branding.senderName(), "UTF-8");
            }
            body.put("from", sender.toUnicodeString());
            body.put("to", List.of(to));
            body.put("subject", subject);
            body.put("html", images.resolve(html));
            if (onAccepted != null) body.put("tags", List.of(Map.of("name", "purpose", "value", "guardian_invitation")));
            String responseAddress = branding != null && branding.replyToEmail() != null
                    && !branding.replyToEmail().isBlank() ? branding.replyToEmail().trim() : replyTo;
            if (!responseAddress.isBlank()) body.put("reply_to", responseAddress);
            HttpRequest request = HttpRequest.newBuilder(ENDPOINT).timeout(Duration.ofSeconds(20))
                    .header("Authorization", "Bearer " + apiKey).header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(mapper.writeValueAsString(body))).build();
            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                // Never log bodies: provider errors can echo recipient addresses or account tokens.
                if (LOGGER.isWarnEnabled()) LOGGER.warn("Resend rejected email: HTTP {}", response.statusCode());
                return false;
            }
            String id = mapper.readTree(response.body()).path("id").asString("");
            if (id.isBlank()) {
                LOGGER.warn("Resend response did not include an email ID");
                return false;
            }
            if (LOGGER.isInfoEnabled()) LOGGER.info("Resend accepted email: id={}", id);
            if (onAccepted != null) onAccepted.accept(id);
            return true;
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            LOGGER.warn("Resend email request interrupted");
            return false;
        } catch (IOException | jakarta.mail.MessagingException | RuntimeException exception) {
            // Do not log exception messages, credentials, email bodies, or activation links.
            LOGGER.warn("Resend email request failed");
            return false;
        }
    }
}
