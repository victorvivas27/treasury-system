package com.tesoreria.user.infrastructure.adapter.out.email;

import com.tesoreria.organization.application.OrganizationEmailBranding;
import com.tesoreria.user.core.port.out.EmailOutPort;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Component;

import java.io.UnsupportedEncodingException;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;

@Component
@ConditionalOnProperty(name = "app.email.provider", havingValue = "gmail", matchIfMissing = true)
public class GmailEmailAdapter implements EmailOutPort {
    @Override
    public boolean sendRecoverySummary(String email, String name, java.util.List<com.tesoreria.user.core.model.RecoveryLink> links) {
        return send(email, name, "Recupera tu acceso a Tesorería Escolar", EmailTemplates.recoverySummary(name, links), null);
    }
    private static final int QUOTED_VALUE_MIN_LENGTH = 2;
    private static final int SINGLE_ADDRESS_COUNT = 1;
    private final JavaMailSender mailSender;
    private final String from;
    private final EmailImages images;

    public GmailEmailAdapter(
            JavaMailSender mailSender,
            String from) {
        this(mailSender, from, EmailImages.DEFAULT_BASE_URL);
    }

    @Autowired
    public GmailEmailAdapter(
            JavaMailSender mailSender,
            @Value("${app.email.from:}") String from,
            @Value("${app.email.assets-base-url:}") String assetsBaseUrl) {
        this.mailSender = mailSender;
        this.from = from;
        this.images = new EmailImages(assetsBaseUrl);
    }

    @Override
    public boolean sendVerificationEmail(String email, String name, String link) {
        return sendVerificationEmail(email, name, link, null);
    }

    @Override
    public boolean sendVerificationEmail(String email, String name, String link,
                                         OrganizationEmailBranding branding) {
        return send(email, name, "Verifica tu correo para activar tu cuenta",
                EmailTemplates.verification(name, link), branding);
    }

    @Override
    public boolean sendGuardianInvitationEmail(String email, String name, String link,
                                               OrganizationEmailBranding branding) {
        return send(email, name, "Te damos la bienvenida a Tesorer\u00eda Escolar",
                EmailTemplates.guardianInvitation(name, link), branding);
    }

    @Override
    public boolean sendPasswordResetEmail(String email, String name, String link) {
        return sendPasswordResetEmail(email, name, link, null);
    }

    @Override
    public boolean sendPasswordResetEmail(String email, String name, String link,
                                          OrganizationEmailBranding branding) {
        return send(email, name, "Restablece tu contraseña",
                EmailTemplates.passwordReset(name, link), branding);
    }

    @Override
    public boolean sendPasswordChangedEmail(String email, String name, LocalDateTime changedAt) {
        return sendPasswordChangedEmail(email, name, changedAt, null);
    }

    @Override
    public boolean sendPasswordChangedEmail(String email, String name, LocalDateTime changedAt,
                                            OrganizationEmailBranding branding) {
        return send(email, name, "Tu contraseña fue modificada",
                EmailTemplates.passwordChanged(name, changedAt), branding);
    }

    private boolean send(String to, String recipientName, String subject, String html,
                         OrganizationEmailBranding branding) {
        if (from == null || from.isBlank()) return false;
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, false, "UTF-8");
            helper.setFrom(parseFrom(branding));
            if (branding != null && branding.replyToEmail() != null
                    && !branding.replyToEmail().isBlank()) {
                helper.setReplyTo(new InternetAddress(branding.replyToEmail().trim(), true));
            }
            helper.setTo(new InternetAddress(to, repairUtf8Mojibake(recipientName), "UTF-8"));
            helper.setSubject(subject);
            String resolvedHtml = images.resolve(html);
            helper.setText(resolvedHtml, true);
            mailSender.send(message);
            return true;
        } catch (MessagingException | MailException | UnsupportedEncodingException exception) {
            return false;
        }
    }

    private InternetAddress parseFrom(OrganizationEmailBranding branding)
            throws MessagingException, UnsupportedEncodingException {
        String normalized = repairUtf8Mojibake(from.trim());
        if (normalized.length() >= QUOTED_VALUE_MIN_LENGTH && normalized.startsWith("\"")
                && normalized.endsWith("\"")) {
            normalized = normalized.substring(1, normalized.length() - 1).trim();
        }
        InternetAddress[] addresses = InternetAddress.parse(normalized, true);
        if (addresses.length != SINGLE_ADDRESS_COUNT) {
            throw new MessagingException("EMAIL_FROM debe contener un único remitente");
        }
        InternetAddress parsed = addresses[0];
        String personal = branding != null && branding.senderName() != null
                && !branding.senderName().isBlank()
                ? repairUtf8Mojibake(branding.senderName().trim()) : parsed.getPersonal();
        return new InternetAddress(parsed.getAddress(), personal, "UTF-8");
    }

    private String repairUtf8Mojibake(String value) {
        if (value == null || (!value.contains("\u00C3") && !value.contains("\u00C2"))) return value;
        String repaired =
                new String(value.getBytes(StandardCharsets.ISO_8859_1), StandardCharsets.UTF_8);
        return repaired.contains("\uFFFD") ? value : repaired;
    }
}
