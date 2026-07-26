package user;

import com.tesoreria.user.infrastructure.adapter.out.email.GmailEmailAdapter;
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
                mailSender, "\"Tesorería Escolar <tesoreria.colegio@gmail.com>\"");
    }

    @Test
    void sendVerificationEmail_deberiaEnviarMensajeHtmlConGmail() throws Exception {
        boolean sent = adapter.sendVerificationEmail(
                "usuario@example.com", "Usuario", "http://localhost:5173/verificar?token=abc");

        assertTrue(sent);
        verify(mailSender).send(any(MimeMessage.class));
        MimeMessage message = mailSender.createMimeMessage();
        assertEquals("tesoreria.colegio@gmail.com",
                ((InternetAddress) message.getFrom()[0]).getAddress());
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
}
