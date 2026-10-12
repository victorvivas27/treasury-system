package com.tesoreria.architecture.application;

import com.tesoreria.shared.domain.exception.DomainException;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.List;

@Service
public class ArchitectureCatalogService {
    private static final List<Diagram> DIAGRAMS = List.of(
            new Diagram("architecture", "Componentes", "Pantallas, seguridad, servicios, tablas y correo."),
            new Diagram("login", "Login y curso", "Credenciales, cuenta y elección de organización."),
            new Diagram("refresh", "Renovar la sesión", "Cookies, CSRF, rotación y familia de sesión."),
            new Diagram("password-change", "Cambiar contraseña", "Cambio autenticado y revocación de SA-06."),
            new Diagram("password-reset", "Recuperar y activar", "Código de un uso y variante de invitación."),
            new Diagram("access-validation", "HTTP y WebSocket", "Validación por petición, CONNECT y límites."));

    public Catalog catalog() {
        return new Catalog("01-auth-security", "Autenticación, usuarios y seguridad",
                "88eb6f11d7a0534b518a9e4ce7ddb70dfef596b6", "2026-10-09", DIAGRAMS);
    }

    public byte[] diagram(String id) throws IOException {
        if (DIAGRAMS.stream().noneMatch(diagram -> diagram.id().equals(id))) {
            throw new DomainException("diagram", HttpStatus.NOT_FOUND, "Gráfico no encontrado");
        }
        try (var content = new ClassPathResource("architecture-diagrams/" + id + ".html").getInputStream()) {
            return content.readAllBytes();
        }
    }

    public record Diagram(String id, String title, String description) { }
    public record Catalog(String moduleId, String title, String revision, String generatedAt,
                          List<Diagram> diagrams) { }
}
