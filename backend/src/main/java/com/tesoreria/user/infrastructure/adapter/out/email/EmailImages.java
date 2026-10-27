package com.tesoreria.user.infrastructure.adapter.out.email;

import java.net.URI;
import java.util.Map;

/** Resolves template artwork without changing layout or touching real attachments. */
public final class EmailImages {
    public static final String DEFAULT_BASE_URL = "https://storage.googleapis.com/treasury-system-app-vivas-email-assets/email/v1";
    private static final String HTTPS_SCHEME = "https";
    private static final String LOCALHOST = "localhost";
    private static final Map<String, String> IMAGES = Map.of(
            "treasury-logo", "icono-tesoreria.png",
            "support-chat", "support-chat.png",
            "welcome-banner", "principal_login.png",
            "password-changed-banner", "password-changed.png",
            "password-reset-banner", "password-reset.png");
    private final String publicBaseUrl;

    public EmailImages(String publicBaseUrl) {
        String base = publicBaseUrl == null || publicBaseUrl.isBlank() ? DEFAULT_BASE_URL : publicBaseUrl.trim();
        URI uri = URI.create(base);
        if (!HTTPS_SCHEME.equalsIgnoreCase(uri.getScheme()) || uri.getHost() == null
                || uri.getUserInfo() != null || uri.getQuery() != null || uri.getFragment() != null
                || LOCALHOST.equalsIgnoreCase(uri.getHost())) {
            throw new IllegalArgumentException("EMAIL_ASSETS_BASE_URL debe ser una URL HTTPS pública sin credenciales, query ni fragmento");
        }
        this.publicBaseUrl = base.replaceAll("/+$", "");
    }

    public String resolve(String html) {
        String resolved = html;
        for (var image : IMAGES.entrySet()) {
            resolved = resolved.replace("src=\"" + url(image.getKey()) + "\"",
                    "src=\"" + publicBaseUrl.replace("&", "&amp;") + "/" + image.getValue() + "\"");
        }
        return resolved;
    }

    public static String url(String imageId) {
        String filename = IMAGES.get(imageId);
        if (filename == null) throw new IllegalArgumentException("Imagen de correo desconocida: " + imageId);
        return DEFAULT_BASE_URL + "/" + filename;
    }
}
