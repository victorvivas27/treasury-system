package com.tesoreria.community.application.usecase;

import com.tesoreria.community.core.model.AboutSection;
import com.tesoreria.community.core.port.out.AboutSectionRepositoryOutPort;
import com.tesoreria.shared.domain.exception.DomainException;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;

public class AboutSectionService {
    private final AboutSectionRepositoryOutPort repository;

    public AboutSectionService(AboutSectionRepositoryOutPort repository) { this.repository = repository; }

    @Transactional(readOnly = true)
    public List<AboutSection> publicSections() { return repository.findVisible(); }

    @Transactional(readOnly = true)
    public List<AboutSection> all() { return repository.findAll(); }

    @Transactional
    public AboutSection create(String title, String description, Integer displayOrder, boolean visible,
            String icon, String accentColor, String highlightedPhrase, boolean featured) {
        LocalDateTime now = LocalDateTime.now();
        return repository.save(new AboutSection(null, title.trim(), description.trim(), displayOrder,
                visible, icon, accentColor, normalizeOptional(highlightedPhrase), featured, now, now));
    }

    @Transactional
    public AboutSection update(Long id, String title, String description, Integer displayOrder,
            boolean visible, String icon, String accentColor, String highlightedPhrase,
            boolean featured) {
        AboutSection current = find(id);
        return repository.save(new AboutSection(id, title.trim(), description.trim(), displayOrder,
                visible, icon, accentColor, normalizeOptional(highlightedPhrase), featured,
                current.createdAt(), LocalDateTime.now()));
    }

    @Transactional
    public void delete(Long id) {
        find(id);
        repository.deleteById(id);
    }

    private AboutSection find(Long id) {
        return repository.findById(id).orElseThrow(() -> new DomainException(
                "id", HttpStatus.NOT_FOUND, "El contenido de Sobre nosotros no existe"));
    }

    private String normalizeOptional(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
