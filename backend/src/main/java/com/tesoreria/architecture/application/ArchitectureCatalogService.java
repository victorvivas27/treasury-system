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
            new Diagram("login", "Login, curso y términos", "Credenciales, organización y aceptación antes de emitir sesión."),
            new Diagram("refresh", "Renovar la sesión", "Cookies, CSRF, rotación y familia de sesión."),
            new Diagram("password-change", "Cambiar contraseña", "Cambio autenticado y revocación de SA-06."),
            new Diagram("password-reset", "Recuperar y activar", "Cola persistente, código de un uso e invitación."),
            new Diagram("access-validation", "HTTP y WebSocket", "Validación por petición, CONNECT y límites."),
            operational("ci-cd-workflows", "Eventos y coordinadores", "Qué activa cada workflow y quién coordina."),
            operational("ci-cd-dev-pr", "Push dev y PR", "Responsable por SHA, suites y check final."),
            operational("ci-cd-release", "Main y release", "PR automático, gates y publicación."),
            operational("ci-cd-evidence", "Evidencia y reutilización", "Huellas, artefactos y pruebas forzadas."),
            operational("ci-cd-delivery", "Despliegue y reportes", "Cloud Run, Pages y Allure privado."),
            operational("ci-cd-sync", "Sincronizar main → dev", "Fast-forward, merge y nueva validación."));

    private static Diagram operational(String id, String title, String description) {
        return new Diagram(id, title, description, "12-operations", "Módulo 12 · GitHub Actions y CI/CD",
                "58d5ef0bc5e7c2ec6c8d64e51172489da34a3fb9", "2026-11-16");
    }

    public Catalog catalog() {
        return new Catalog("01-auth-security", "Autenticación, usuarios y seguridad",
                "58d5ef0bc5e7c2ec6c8d64e51172489da34a3fb9", "2026-11-17", DIAGRAMS);
    }

    public byte[] diagram(String id) throws IOException {
        if (DIAGRAMS.stream().noneMatch(diagram -> diagram.id().equals(id))) {
            throw new DomainException("diagram", HttpStatus.NOT_FOUND, "Gráfico no encontrado");
        }
        try (var content = new ClassPathResource("architecture-diagrams/" + id + ".html").getInputStream()) {
            return content.readAllBytes();
        }
    }

    public record Diagram(String id, String title, String description, String moduleId,
                          String moduleTitle, String revision, String generatedAt) {
        public Diagram(String id, String title, String description) {
            this(id, title, description, "01-auth-security", "Módulo 1 · Autenticación, usuarios y seguridad",
                    "58d5ef0bc5e7c2ec6c8d64e51172489da34a3fb9", "2026-11-17");
        }
    }
    public record Catalog(String moduleId, String title, String revision, String generatedAt,
                          List<Diagram> diagrams) { }
}
