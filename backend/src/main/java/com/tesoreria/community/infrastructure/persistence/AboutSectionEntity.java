package com.tesoreria.community.infrastructure.persistence;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "about_sections")
public class AboutSectionEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, length = 120) private String title;
    @Column(nullable = false, length = 2000) private String description;
    @Column(name = "display_order", nullable = false) private Integer displayOrder;
    @Column(nullable = false) private boolean visible;
    @Column(length = 30) private String icon;
    @Column(name = "accent_color", length = 20) private String accentColor;
    @Column(name = "highlighted_phrase", length = 240) private String highlightedPhrase;
    private Boolean featured;
    @Column(name = "created_at", nullable = false) private LocalDateTime createdAt;
    @Column(name = "updated_at", nullable = false) private LocalDateTime updatedAt;

    public Long getId() { return id; } public void setId(Long id) { this.id = id; }
    public String getTitle() { return title; } public void setTitle(String value) { title = value; }
    public String getDescription() { return description; }
    public void setDescription(String value) { description = value; }
    public Integer getDisplayOrder() { return displayOrder; }
    public void setDisplayOrder(Integer value) { displayOrder = value; }
    public boolean isVisible() { return visible; } public void setVisible(boolean value) { visible = value; }
    public String getIcon() { return icon == null ? "USERS" : icon; }
    public void setIcon(String value) { icon = value; }
    public String getAccentColor() { return accentColor == null ? "TURQUOISE" : accentColor; }
    public void setAccentColor(String value) { accentColor = value; }
    public String getHighlightedPhrase() { return highlightedPhrase; }
    public void setHighlightedPhrase(String value) { highlightedPhrase = value; }
    public boolean isFeatured() { return Boolean.TRUE.equals(featured); }
    public void setFeatured(boolean value) { featured = value; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime value) { createdAt = value; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime value) { updatedAt = value; }
}
