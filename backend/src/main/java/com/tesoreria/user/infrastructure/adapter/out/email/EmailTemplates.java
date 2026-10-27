package com.tesoreria.user.infrastructure.adapter.out.email;

import java.time.LocalDateTime;
import java.time.Year;
import java.time.format.DateTimeFormatter;

public final class EmailTemplates {

    private static final String IMAGE_SOURCE_START = "<img src=\"";
    private EmailTemplates() {
    }

    public static String verification(String name, String link) {
        return action(name, "Verifica tu correo", "Bienvenido a Tesorería Escolar. Activa tu cuenta para comenzar.",
                "Verificar mi correo", link, "Este enlace vence en 24 horas.");
    }

    public static String guardianInvitation(String name, String link) {
        String safeLink = escape(link);
        String body = "<p>Te invitamos a ser parte de Tesorer\u00eda Escolar, el espacio para consultar "
                + "los aportes, pagos y actividades de tu curso.</p>"
                + "<p>Para activar tu acceso, crea tu contrase\u00f1a con el siguiente bot\u00f3n:</p>"
                + "<p style=\"margin:28px 0;text-align:center\"><a href=\"" + safeLink
                + "\" style=\"display:inline-block;background:#1E3A5F;color:#fff;padding:14px 24px;"
                + "border-radius:8px;text-decoration:none;font-weight:bold\">Crear mi cuenta</a></p>"
                + "<p>Este enlace vence en <strong>24 horas</strong> y solo puede usarse una vez.</p>"
                + "<p style=\"font-size:13px\">Si el bot\u00f3n no funciona, copia este enlace en tu navegador:<br>"
                + "<a style=\"word-break:break-all\" href=\"" + safeLink + "\">" + safeLink + "</a></p>"
                + "<table role=\"presentation\" width=\"100%\" style=\"margin-top:24px;background:#f0fdf4;"
                + "border-radius:8px\"><tr><td style=\"padding:16px\"><strong>\u00bfNecesitas ayuda?</strong>"
                + "<p style=\"margin:8px 0 0\">Escr\u00edbeme por WhatsApp y te ayudar\u00e9 a crear tu cuenta.</p>"
                + "<p style=\"margin:10px 0 0\"><a href=\"https://wa.me/56986348085\" "
                + "style=\"color:#166534;text-decoration:none;font-weight:bold\">"
                + IMAGE_SOURCE_START + EmailImages.url("support-chat") + "\" width=\"22\" height=\"22\" alt=\"WhatsApp\" "
                + "style=\"vertical-align:middle;border:0;margin-right:8px\">+56 9 8634 8085</a></p></td></tr></table>"
                + "<p style=\"font-size:13px;color:#64748b\">Si no reconoces esta invitaci\u00f3n, "
                + "puedes ignorar este correo.</p>";
        return base("Hola " + escape(name) + ",", "Te damos la bienvenida", body, "welcome-banner");
    }

    public static String passwordReset(String name, String link) {
        return action(name, "Restablece tu contraseña", "Recibimos una solicitud para crear una nueva contraseña.",
                "Crear nueva contraseña", link, "Este enlace vence en 60 minutos.", "password-reset-banner");
    }

    public static String recoverySummary(String name, java.util.List<com.tesoreria.user.core.model.RecoveryLink> links) {
        StringBuilder body = new StringBuilder(512);
        body.append("<p>Solicitaste recuperar tu acceso. Elige la cuenta que deseas recuperar:</p><ul>");
        for (var link : links) {
            body.append("<li><a href=\"").append(escape(link.url())).append("\">")
                    .append(escape(link.course())).append("</a></li>");
        }
        body.append("</ul><p>Los enlaces vencen en 60 minutos. Si no solicitaste este correo, ignóralo.</p>");
        return base(escape(name), "Recupera tu acceso", body.toString(), "password-reset-banner");
    }

    public static String passwordChanged(String name, LocalDateTime changedAt) {
        String body = "<p>Tu contraseña fue modificada el "
                + escape(changedAt.format(DateTimeFormatter.ofPattern("dd-MM-yyyy HH:mm")))
                + ".</p><p>Si reconoces esta actividad, no debes hacer nada. Si no, solicita una recuperación "
                + "de contraseña y contacta al administrador.</p>" + support();
        return base("Hola " + escape(name) + ",", "Tu contraseña fue modificada", body, "password-changed-banner");
    }

    private static String support() {
        return "<table role=\"presentation\" width=\"100%\" style=\"margin-top:24px;background:#f0fdf4;"
                + "border-radius:8px\"><tr><td style=\"padding:16px\"><strong>¿Necesitas ayuda?</strong>"
                + "<p style=\"margin:8px 0 0\">Escríbenos por WhatsApp para recibir soporte.</p>"
                + "<p style=\"margin:10px 0 0\"><a href=\"https://wa.me/56986348085\" "
                + "style=\"color:#166534;text-decoration:none;font-weight:bold\">"
                + IMAGE_SOURCE_START + EmailImages.url("support-chat") + "\" width=\"22\" height=\"22\" alt=\"WhatsApp\" "
                + "style=\"vertical-align:middle;border:0;margin-right:8px\">+56 9 8634 8085</a></p></td></tr></table>";
    }

    private static String action(String name, String title, String message, String button,
                                 String link, String expiry) {
        return action(name, title, message, button, link, expiry, "");
    }

    private static String action(String name, String title, String message, String button,
                                 String link, String expiry, String banner) {
        String safeLink = escape(link);
        String body = "<p>" + escape(message) + "</p><p style=\"text-align:center;margin:28px 0\">"
                + "<a href=\"" + safeLink + "\" style=\"background:#1E3A5F;color:#fff;padding:13px 22px;"
                + "border-radius:8px;text-decoration:none;font-weight:600\">" + escape(button) + "</a></p>"
                + "<p>" + escape(expiry) + "</p><p>También puedes copiar este enlace:<br><a style=\"word-break:break-all\" href=\""
                + safeLink + "\">" + safeLink + "</a></p><p>Si no realizaste esta acción, ignora este correo.</p>";
        return base("Hola " + escape(name) + ",", title, body + (banner.isEmpty() ? "" : support()), banner);
    }

    private static String base(String greeting, String title, String body, String banner) {
        boolean withLogo = !banner.isEmpty();
        String header = withLogo
                ? "<table role=\"presentation\"><tr><td style=\"padding-right:12px;vertical-align:middle\">"
                    + IMAGE_SOURCE_START + EmailImages.url("treasury-logo") + "\" width=\"64\" height=\"64\" alt=\"Logo de Tesorer\u00eda Escolar\" "
                    + "style=\"display:block;border:0\"></td><td style=\"vertical-align:middle;color:#1E3A5F;"
                    + "font-size:20px;font-weight:bold\">Tesorer\u00eda Escolar</td></tr></table>"
                : "<div style=\"color:#1E3A5F;font-size:20px;font-weight:bold\">Tesorer\u00eda Escolar</div>";
        String heading = withLogo
                ? "<h1 style=\"margin:24px 0 0;font-size:24px;line-height:1.2;color:#1E3A5F\">"
                    + IMAGE_SOURCE_START + EmailImages.url(banner) + "\" width=\"530\" alt=\"" + escape(title)
                    + "\" style=\"display:block;width:100%;max-width:530px;height:auto;border:0;border-radius:12px\">"
                    + "</h1>"
                : "<h1 style=\"font-size:24px\">" + escape(title) + "</h1>";
        return "<!doctype html><html><body style=\"margin:0;background:#f1f5f9;font-family:Arial,sans-serif;"
                + "color:#1f2937\"><table role=\"presentation\" width=\"100%\"><tr><td style=\"padding:24px 12px\">"
                + "<table role=\"presentation\" style=\"max-width:600px;margin:auto;background:#fff;border-radius:12px;"
                + "padding:32px\" width=\"100%\"><tr><td>"
                + header + heading + "<p>"
                + greeting + "</p>" + body + "<hr style=\"border:0;border-top:1px solid #e5e7eb;margin-top:28px\">"
                + "<p style=\"color:#64748b;font-size:12px\">Tesorería Escolar · " + Year.now().getValue()
                + "</p></td></tr></table></td></tr></table></body></html>";
    }

    private static String escape(String value) {
        if (value == null) return "usuario";
        return value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
                .replace("\"", "&quot;").replace("'", "&#39;");
    }
}
