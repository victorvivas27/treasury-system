package com.tesoreria.user.infrastructure.adapter.out.persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "user_appearance_preferences")
public class UserAppearancePreferencesEntity {
    @Id
    @Column(name = "user_id")
    private Long userId;

    @Column(name = "theme_preference", nullable = false, length = 10)
    private String themePreference;

    @Column(nullable = false, length = 32)
    private String palette;

    @Column(name = "font_family", nullable = false, length = 32)
    private String fontFamily;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public Long getUserId() { return userId; }
    public void setUserId(Long value) { userId = value; }
    public String getThemePreference() { return themePreference; }
    public void setThemePreference(String value) { themePreference = value; }
    public String getPalette() { return palette; }
    public void setPalette(String value) { palette = value; }
    public String getFontFamily() { return fontFamily; }
    public void setFontFamily(String value) { fontFamily = value; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}
