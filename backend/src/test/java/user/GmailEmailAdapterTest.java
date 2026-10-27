package user;

import com.tesoreria.organization.application.OrganizationEmailBranding;
import com.tesoreria.user.infrastructure.adapter.out.email.GmailEmailAdapter;
import jakarta.mail.Message;
import jakarta.mail.Session;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mail.MailSendException;
import org.springframework.mail.javamail.JavaMailSender;

import java.time.LocalDateTime;
import java.util.Properties;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class GmailEmailAdapterTest {
    private JavaMailSender mailSender;
    private GmailEmailAdapter adapter;

    @BeforeEach
    void setUp() {
        mailSender = mock(JavaMailSender.class);
        when(mailSender.createMimeMessage())
                .thenReturn(new MimeMessage(Session.getInstance(new Properties())));
        adapter = new GmailEmailAdapter(
                mailSender, "\"Curso 1Â° bÃ¡sico A <tesoreria.colegio@gmail.com>\"");
    }

    @Test
    void recoverySummaryEscapesCourseNamesAndSendsAllLinksOnlyToTheMailbox() throws Exception {
        assertTrue(adapter.sendRecoverySummary("usuario@example.com", "Usuario", java.util.List.of(
                new com.tesoreria.user.core.model.RecoveryLink("Curso <script>", "https://app.example/reset?token=fixture-one"),
                new com.tesoreria.user.core.model.RecoveryLink("Otro Curso", "https://app.example/reset?token=fixture-two"))));
        MimeMessage message = mailSender.createMimeMessage(); message.saveChanges();
        assertEquals(1, message.getAllRecipients().length);
        assertNull(message.getRecipients(Message.RecipientType.CC));
        assertNull(message.getRecipients(Message.RecipientType.BCC));
        String html = findHtml(message);
        assertTrue(html.contains("Curso &lt;script&gt;")); assertFalse(html.contains("<script>"));
        assertTrue(html.contains("fixture-one")); assertTrue(html.contains("fixture-two"));
    }

    @Test
    void sendVerificationEmail_deberiaEnviarMensajeHtmlConGmail() throws Exception {
        boolean sent = adapter.sendVerificationEmail(
                "usuario@example.com", "José Pérez", "http://localhost:5173/verificar?token=abc");

        assertTrue(sent);
        verify(mailSender).send(any(MimeMessage.class));
        MimeMessage message = mailSender.createMimeMessage();
        assertEquals("tesoreria.colegio@gmail.com",
                ((InternetAddress) message.getFrom()[0]).getAddress());
        assertEquals("Curso 1° básico A",
                ((InternetAddress) message.getFrom()[0]).getPersonal());
        InternetAddress recipient =
                (InternetAddress) message.getRecipients(Message.RecipientType.TO)[0];
        assertEquals("usuario@example.com", recipient.getAddress());
        assertEquals("José Pérez", recipient.getPersonal());
        assertTrue(message.getHeader("From", null).contains("=?UTF-8?"));
        assertTrue(message.getHeader("To", null).contains("=?UTF-8?"));
    }

    @Test
    void sendPasswordResetEmail_deberiaRetornarFalseCuandoGmailFalla() {
        doThrow(new MailSendException("SMTP no disponible"))
                .when(mailSender).send(any(MimeMessage.class));

        boolean sent = adapter.sendPasswordResetEmail(
                "usuario@example.com", "Usuario", "http://localhost:5173/reset?token=abc");

        assertFalse(sent);
    }

    @Test
    void sendPasswordChangedEmail_deberiaRechazarRemitenteNoConfigurado() {
        GmailEmailAdapter withoutFrom = new GmailEmailAdapter(mailSender, "");

        assertFalse(withoutFrom.sendPasswordChangedEmail(
                "usuario@example.com", "Usuario", LocalDateTime.now()));
    }

    @Test
    void sendVerificationEmail_deberiaAplicarMarcaYReplyToDeOrganizacion() throws Exception {
        boolean sent = adapter.sendVerificationEmail(
                "usuario@example.com", "Usuario", "https://app.example/verificar",
                new OrganizationEmailBranding("Curso 4A", "admin4a@colegio.cl"));

        assertTrue(sent);
        MimeMessage message = mailSender.createMimeMessage();
        InternetAddress sender = (InternetAddress) message.getFrom()[0];
        InternetAddress replyTo = (InternetAddress) message.getReplyTo()[0];
        assertEquals("Curso 4A", sender.getPersonal());
        assertEquals("tesoreria.colegio@gmail.com", sender.getAddress());
        assertEquals("admin4a@colegio.cl", replyTo.getAddress());
    }
    @Test
    void invitationUsesWelcomeCopyAndPublicImages() throws Exception {
        assertTrue(adapter.sendGuardianInvitationEmail("ana@example.com", "Ana <script>",
                "https://app.example/aceptar-invitacion?token=test&course=1", null));
        MimeMessage message = mailSender.createMimeMessage();
        message.saveChanges();
        assertEquals("Te damos la bienvenida a Tesorer\u00eda Escolar", message.getSubject());
        String html = findHtml(message);
        assertTrue(html.contains("Crear mi cuenta"));
        assertTrue(html.contains("24 horas"));
        assertFalse(html.contains("60 minutos"));
        assertFalse(html.contains("Restablece"));
        assertTrue(html.contains("Ana &lt;script&gt;"));
        assertTrue(html.contains("token=test&amp;course=1"));
        assertTrue(html.contains("https://wa.me/56986348085"));
        assertTrue(html.contains("https://storage.googleapis.com/treasury-system-app-vivas-email-assets/email/v1/icono-tesoreria.png"));
        assertFalse(hasInlineImage(message, "<treasury-logo>"));
        assertFalse(hasInlineImage(message, "<support-chat>"));
        assertTrue(html.contains("<img src=\"https://storage.googleapis.com/treasury-system-app-vivas-email-assets/email/v1/principal_login.png\""));
        assertNoArtificialAttachments(message);
        assertFalse(html.contains("background-image:"));
        assertFalse(hasInlineImage(message, "<welcome-banner>"));
    }

    @Test
    void passwordResetKeepsRecoveryCopyAndExpiry() throws Exception {
        assertTrue(adapter.sendPasswordResetEmail("ana@example.com", "Ana",
                "https://app.example/restablecer-password?token=test"));
        MimeMessage message = mailSender.createMimeMessage();
        message.saveChanges();
        String html = findHtml(message);
        assertEquals("Restablece tu contrase\u00f1a", message.getSubject());
        assertTrue(html.contains("60 minutos"));
        assertFalse(html.contains("Crear mi cuenta"));
        assertTrue(html.contains("Crear nueva contraseña"));
        assertTrue(html.contains("https://app.example/restablecer-password?token=test"));
        assertTrue(html.contains("Si no realizaste esta acción, ignora este correo."));
        assertTrue(html.contains("https://wa.me/56986348085"));
        assertTrue(html.contains("https://storage.googleapis.com/treasury-system-app-vivas-email-assets/email/v1/password-reset.png"));
        assertFalse(hasInlineImage(message, "<treasury-logo>"));
        assertFalse(hasInlineImage(message, "<support-chat>"));
        assertFalse(hasInlineImage(message, "<password-reset-banner>"));
        assertNoArtificialAttachments(message);
    }

    @Test
    void passwordChangedIncludesBannerLogoAndSupport() throws Exception {
        assertTrue(adapter.sendPasswordChangedEmail("ana@example.com", "Ana <script>",
                LocalDateTime.of(2026, 10, 26, 13, 25)));
        MimeMessage message = mailSender.createMimeMessage();
        message.saveChanges();
        String html = findHtml(message);
        assertEquals("Tu contraseña fue modificada", message.getSubject());
        assertTrue(html.contains("Ana &lt;script&gt;"));
        assertTrue(html.contains("26-10-2026 13:25"));
        assertTrue(html.contains("solicita una recuperación"));
        assertTrue(html.contains("https://wa.me/56986348085"));
        assertTrue(html.contains("https://storage.googleapis.com/treasury-system-app-vivas-email-assets/email/v1/password-changed.png"));
        assertFalse(hasInlineImage(message, "<treasury-logo>"));
        assertFalse(hasInlineImage(message, "<support-chat>"));
        assertFalse(hasInlineImage(message, "<password-changed-banner>"));
        assertNoArtificialAttachments(message);
    }

    @Test
    void publicImagesAreNotEmbeddedInOutgoingMessage() throws Exception {
        GmailEmailAdapter remote = new GmailEmailAdapter(mailSender, "Tesorería <sender@example.com>",
                "https://static.example/email/v1");
        assertTrue(remote.sendPasswordResetEmail("ana@example.com", "Ana", "https://app.example/reset?token=test"));
        MimeMessage message = mailSender.createMimeMessage();
        message.saveChanges();
        String html = findHtml(message);
        assertTrue(html.contains("src=\"https://static.example/email/v1/icono-tesoreria.png\""));
        assertTrue(html.contains("src=\"https://static.example/email/v1/password-reset.png\""));
        assertTrue(html.contains("src=\"https://static.example/email/v1/support-chat.png\""));
        assertFalse(html.contains("cid:"));
        assertFalse(hasInlineImage(message, "<treasury-logo>"));
        assertFalse(hasInlineImage(message, "<support-chat>"));
        assertFalse(hasInlineImage(message, "<password-reset-banner>"));
        assertNoArtificialAttachments(message);
    }

    private void assertNoArtificialAttachments(MimeMessage message) throws Exception {
        java.io.ByteArrayOutputStream raw = new java.io.ByteArrayOutputStream();
        message.writeTo(raw);
        MimeMessage parsed = new MimeMessage(Session.getInstance(new Properties()),
                new java.io.ByteArrayInputStream(raw.toByteArray()));
        assertTrue(parsed.isMimeType("text/html"));
        assertNull(parsed.getDisposition());
        assertNull(parsed.getFileName());
        assertNull(parsed.getHeader("Content-ID"));
        String mime = raw.toString(java.nio.charset.StandardCharsets.UTF_8);
        assertFalse(mime.contains("Content-Disposition:"));
        assertFalse(mime.contains("Content-ID:"));
        assertFalse(mime.contains("filename="));
        assertFalse(mime.contains("Content-Type: image/"));
    }

    private String findHtml(jakarta.mail.Part part) throws Exception {
        if (part.isMimeType("text/html")) return (String) part.getContent();
        if (part.getContent() instanceof jakarta.mail.Multipart multipart) {
            for (int i = 0; i < multipart.getCount(); i++) {
                String html = findHtml(multipart.getBodyPart(i));
                if (!html.isEmpty()) return html;
            }
        }
        return "";
    }

    private boolean hasInlineImage(jakarta.mail.Part part, String contentId) throws Exception {
        String[] ids = part.getHeader("Content-ID");
        if (ids != null && java.util.Arrays.asList(ids).contains(contentId)) {
            return part.isMimeType("image/png") && part.getInputStream().readAllBytes().length > 0;
        }
        if (part.getContent() instanceof jakarta.mail.Multipart multipart) {
            for (int i = 0; i < multipart.getCount(); i++) {
                if (hasInlineImage(multipart.getBodyPart(i), contentId)) return true;
            }
        }
        return false;
    }
}
