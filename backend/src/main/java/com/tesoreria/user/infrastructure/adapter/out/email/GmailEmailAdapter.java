package com.tesoreria.user.infrastructure.adapter.out.email;

import com.tesoreria.user.core.port.out.EmailOutPort;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.annotation.Value;
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
    private static final int QUOTED_VALUE_MIN_LENGTH = 2;
    private static final int SINGLE_ADDRESS_COUNT = 1;
    private final JavaMailSender mailSender;
    private final String from;

    public GmailEmailAdapter(
            JavaMailSender mailSender,
            @Value("${app.email.from:}") String from) {
        this.mailSender = mailSender;
        this.from = from;
    }

    @Override
    public boolean sendVerificationEmail(String email, String name, String link) {
        return send(email, name, "Verifica tu correo para activar tu cuenta",
                EmailTemplates.verification(name, link));
    }

    @Override
    public boolean sendPasswordResetEmail(String email, String name, String link) {
        return send(email, name, "Restablece tu contraseña", EmailTemplates.passwordReset(name, link));
    }

    @Override
    public boolean sendPasswordChangedEmail(String email, String name, LocalDateTime changedAt) {
        return send(email, name, "Tu contraseña fue modificada",
                EmailTemplates.passwordChanged(name, changedAt));
    }

    private boolean send(String to, String recipientName, String subject, String html) {
        if (from == null || from.isBlank()) {
            return false;
        }
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, "UTF-8");
            helper.setFrom(parseFrom());
            helper.setTo(new InternetAddress(to, repairUtf8Mojibake(recipientName), "UTF-8"));
            helper.setSubject(subject);
            helper.setText(html, true);
            mailSender.send(message);
            return true;
        } catch (MessagingException | MailException | UnsupportedEncodingException exception) {
            return false;
        }
    }

    private InternetAddress parseFrom() throws MessagingException, UnsupportedEncodingException {
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
        return new InternetAddress(parsed.getAddress(), parsed.getPersonal(), "UTF-8");
    }

    private String repairUtf8Mojibake(String value) {
        if (value == null || (!value.contains("Ã") && !value.contains("Â"))) {
            return value;
        }
        String repaired =
                new String(value.getBytes(StandardCharsets.ISO_8859_1), StandardCharsets.UTF_8);
        return repaired.contains("\uFFFD") ? value : repaired;
    }

}
