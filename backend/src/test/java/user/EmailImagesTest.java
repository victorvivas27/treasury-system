package user;

import com.tesoreria.user.infrastructure.adapter.out.email.EmailImages;
import jakarta.mail.Multipart;
import jakarta.mail.Part;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.core.io.ClassPathResource;
import org.springframework.mail.javamail.MimeMessageHelper;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.Properties;

import static org.junit.jupiter.api.Assertions.*;

class EmailImagesTest {
    private static final List<String> IDS = List.of("treasury-logo", "support-chat", "welcome-banner",
            "password-changed-banner", "password-reset-banner");

    @ParameterizedTest
    @org.junit.jupiter.params.provider.MethodSource("imageCases")
    void imagesUseOnlyHttpsWithOrWithoutRealAttachment(int count, String base, boolean attachPdf) throws Exception {
        MimeMessage message = compose(count, base, attachPdf);
        List<Part> parts = leaves(message);
        assertEquals(0, parts.stream().filter(this::isImage).count());
        Part htmlPart = parts.stream().filter(part -> {
            try { return part.isMimeType("text/html"); }
            catch (Exception exception) { throw new AssertionError(exception); }
        }).findFirst().orElseThrow();
        String html = (String) htmlPart.getContent();
        assertFalse(html.contains("cid:"));
        String expectedBase = base.isBlank() ? EmailImages.DEFAULT_BASE_URL : base.replaceAll("/+$", "");
        assertEquals(count, html.split(java.util.regex.Pattern.quote(expectedBase + "/"), -1).length - 1);
        assertTrue(html.contains("width=\"64\""));
        assertEquals(attachPdf ? 2 : 1, parts.size());
        for (Part part : parts) {
            assertNull(part.getHeader("Content-ID"));
            assertNotEquals(Part.INLINE, part.getDisposition());
        }
        if (attachPdf) {
            assertAttachment(parts);
        } else {
            assertTrue(message.isMimeType("text/html"));
            assertNull(message.getFileName());
            assertNull(message.getDisposition());
        }
    }

    private static java.util.stream.Stream<org.junit.jupiter.params.provider.Arguments> imageCases() {
        return java.util.stream.Stream.of("", EmailImages.DEFAULT_BASE_URL, "https://static.example/email/v1/")
                .flatMap(base -> java.util.stream.IntStream.of(0, 1, 2, 3, 5).boxed()
                        .flatMap(count -> java.util.stream.Stream.of(false, true)
                                .map(attach -> org.junit.jupiter.params.provider.Arguments.of(count, base, attach))));
    }

    @Test
    void missingConfigurationStillUsesPublicHttps() {
        String html = "<img src=\"" + EmailImages.url("treasury-logo") + "\">";
        assertEquals(html, new EmailImages(null).resolve(html));
        assertEquals(html, new EmailImages("   ").resolve(html));
    }

    @Test
    void templatesDirectlyReferenceHttpsAndKeepResponsiveDimensions() {
        List<String> templates = List.of(
                com.tesoreria.user.infrastructure.adapter.out.email.EmailTemplates.guardianInvitation("Ana", "https://app.example/invite"),
                com.tesoreria.user.infrastructure.adapter.out.email.EmailTemplates.passwordReset("Ana", "https://app.example/reset"),
                com.tesoreria.user.infrastructure.adapter.out.email.EmailTemplates.passwordChanged("Ana", java.time.LocalDateTime.of(2026, 10, 26, 13, 25)));
        for (String html : templates) {
            assertFalse(html.contains("cid:"));
            assertFalse(html.contains("data:image"));
            assertEquals(3, html.split("<img ", -1).length - 1);
            assertEquals(3, html.split("src=\"https://storage.googleapis.com/treasury-system-app-vivas-email-assets/email/v1/", -1).length - 1);
            assertTrue(html.contains("width=\"530\""));
            assertTrue(html.contains("width:100%;max-width:530px;height:auto"));
            assertTrue(html.contains("width=\"64\" height=\"64\""));
            assertTrue(html.contains("width=\"22\" height=\"22\""));
        }
    }

    @ParameterizedTest
    @ValueSource(strings = {"http://example.com/images", "https://localhost/images",
            "https://user:pass@example.com/images", "https://example.com/images?x=1",
            "https://example.com/images#fragment", "/images"})
    void rejectsNonPublicOrAmbiguousAssetConfiguration(String base) {
        assertThrows(IllegalArgumentException.class, () -> new EmailImages(base));
    }

    private MimeMessage compose(int count, String base, boolean attachPdf) throws Exception {
        MimeMessage message = newMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, attachPdf, "UTF-8");
        StringBuilder html = new StringBuilder("<html><body><p width=\"64\">Hola</p>");
        for (String id : IDS.subList(0, count)) {
            html.append("<img src=\"").append(EmailImages.url(id)).append("\" width=\"64\" alt=\"Tesorería\">");
        }
        html.append("</body></html>");
        EmailImages images = new EmailImages(base);
        String resolved = images.resolve(html.toString());
        helper.setText(resolved, true);
        if (attachPdf) {
            helper.addAttachment("reporte.pdf", new ClassPathResource("email/reporte.pdf"),
                    "application/pdf");
        }
        return roundTrip(message);
    }

    private void assertAttachment(List<Part> parts) throws Exception {
        List<Part> attachments = new ArrayList<>();
        for (Part part : parts) {
            if (Part.ATTACHMENT.equalsIgnoreCase(part.getDisposition())) attachments.add(part);
        }
        assertEquals(1, attachments.size());
        Part attachment = attachments.get(0);
        assertEquals("reporte.pdf", attachment.getFileName());
        assertTrue(attachment.isMimeType("application/pdf"));
        try (var expected = new ClassPathResource("email/reporte.pdf").getInputStream()) {
            assertArrayEquals(expected.readAllBytes(), attachment.getInputStream().readAllBytes());
        }
    }

    private MimeMessage newMessage() {
        return new MimeMessage(Session.getInstance(new Properties()));
    }

    private MimeMessage roundTrip(MimeMessage message) throws Exception {
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        message.writeTo(output);
        return new MimeMessage(Session.getInstance(new Properties()), new ByteArrayInputStream(output.toByteArray()));
    }

    private List<Part> leaves(Part part) throws Exception {
        List<Part> result = new ArrayList<>();
        if (part.getContent() instanceof Multipart multipart) {
            for (int i = 0; i < multipart.getCount(); i++) result.addAll(leaves(multipart.getBodyPart(i)));
        } else {
            result.add(part);
        }
        return result;
    }

    private boolean isImage(Part part) {
        try { return part.isMimeType("image/png"); }
        catch (Exception exception) { throw new AssertionError(exception); }
    }

}
