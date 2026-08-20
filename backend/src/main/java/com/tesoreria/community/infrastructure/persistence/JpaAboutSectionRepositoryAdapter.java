package com.tesoreria.community.infrastructure.persistence;

import com.tesoreria.community.core.model.AboutSection;
import com.tesoreria.community.core.port.out.AboutSectionRepositoryOutPort;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Repository;

@Repository
public class JpaAboutSectionRepositoryAdapter implements AboutSectionRepositoryOutPort {
    private final AboutSectionJpaRepository repository;
    public JpaAboutSectionRepositoryAdapter(AboutSectionJpaRepository repository) {
        this.repository = repository;
    }
    @Override public List<AboutSection> findAll() {
        return repository.findAllByOrderByDisplayOrderAscIdAsc().stream().map(this::domain).toList();
    }
    @Override public List<AboutSection> findVisible() {
        return repository.findByVisibleTrueOrderByDisplayOrderAscIdAsc().stream().map(this::domain).toList();
    }
    @Override public Optional<AboutSection> findById(Long id) {
        return repository.findById(id).map(this::domain);
    }
    @Override public AboutSection save(AboutSection value) {
        return domain(repository.save(entity(value)));
    }
    @Override public void deleteById(Long id) { repository.deleteById(id); }
    private AboutSection domain(AboutSectionEntity value) {
        return new AboutSection(value.getId(), value.getTitle(), value.getDescription(),
                value.getDisplayOrder(), value.isVisible(), value.getIcon(), value.getAccentColor(),
                value.getHighlightedPhrase(), value.isFeatured(), value.getCreatedAt(), value.getUpdatedAt());
    }
    private AboutSectionEntity entity(AboutSection value) {
        AboutSectionEntity result = new AboutSectionEntity();
        result.setId(value.id()); result.setTitle(value.title()); result.setDescription(value.description());
        result.setDisplayOrder(value.displayOrder()); result.setVisible(value.visible());
        result.setIcon(value.icon()); result.setAccentColor(value.accentColor());
        result.setHighlightedPhrase(value.highlightedPhrase()); result.setFeatured(value.featured());
        result.setCreatedAt(value.createdAt()); result.setUpdatedAt(value.updatedAt());
        return result;
    }
}
