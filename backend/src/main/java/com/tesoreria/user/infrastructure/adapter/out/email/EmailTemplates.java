package com.tesoreria.user.infrastructure.adapter.out.email;

import java.time.LocalDateTime;
import java.time.Year;
import java.time.format.DateTimeFormatter;

public final class EmailTemplates {
    private EmailTemplates() {
    }

    public static String verification(String name, String link) {
        return action(name, "Verifica tu correo", "Bienvenido a Tesorería Escolar. Activa tu cuenta para comenzar.",
                "Verificar mi correo", link, "Este enlace vence en 24 horas.");
    }

    public static String passwordReset(String name, String link) {
        return action(name, "Restablece tu contraseña", "Recibimos una solicitud para crear una nueva contraseña.",
                "Crear nueva contraseña", link, "Este enlace vence en 60 minutos.");
    }

    public static String passwordChanged(String name, LocalDateTime changedAt) {
        String body = "<p>Tu contraseña fue modificada el "
                + escape(changedAt.format(DateTimeFormatter.ofPattern("dd-MM-yyyy HH:mm")))
                + ".</p><p>Si reconoces esta actividad, no debes hacer nada. Si no, solicita una recuperación "
                + "de contraseña y contacta al administrador.</p>";
        return base("Hola " + escape(name) + ",", "Tu contraseña fue modificada", body);
    }

    private static String action(String name, String title, String message, String button,
                                 String link, String expiry) {
        String safeLink = escape(link);
        String body = "<p>" + escape(message) + "</p><p style=\"text-align:center;margin:28px 0\">"
                + "<a href=\"" + safeLink + "\" style=\"background:#1E3A5F;color:#fff;padding:13px 22px;"
                + "border-radius:8px;text-decoration:none;font-weight:600\">" + escape(button) + "</a></p>"
                + "<p>" + escape(expiry) + "</p><p>También puedes copiar este enlace:<br><a href=\""
                + safeLink + "\">" + safeLink + "</a></p><p>Si no realizaste esta acción, ignora este correo.</p>";
        return base("Hola " + escape(name) + ",", title, body);
    }

    private static String base(String greeting, String title, String body) {
        return "<!doctype html><html><body style=\"margin:0;background:#f1f5f9;font-family:Arial,sans-serif;"
                + "color:#1f2937\"><table role=\"presentation\" width=\"100%\"><tr><td style=\"padding:24px 12px\">"
                + "<table role=\"presentation\" style=\"max-width:600px;margin:auto;background:#fff;border-radius:12px;"
                + "padding:32px\" width=\"100%\"><tr><td><div style=\"color:#1E3A5F;font-size:20px;font-weight:bold\">"
                + "Tesorería Escolar</div><h1 style=\"font-size:24px\">" + escape(title) + "</h1><p>"
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
