package com.tesoreria.improvement.infrastructure.persistence;

import com.tesoreria.user.infrastructure.adapter.out.persistence.entity.UserEntity;
import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "improvement_suggestions")
public class ImprovementSuggestionEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private UserEntity user;

    @Column(name = "organization_id")
    private Long organizationId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private ImprovementCategory category;

    @Column(name = "selected_items", columnDefinition = "TEXT")
    private String selectedItems;

    @Column(nullable = false, length = 120)
    private String title;

    @Column(nullable = false, length = 2000)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "user_impact", nullable = false, length = 40)
    private UserImpact userImpact;

    @Enumerated(EnumType.STRING)
    @Column(name = "internal_priority", nullable = false, length = 40)
    private ImprovementPriority internalPriority = ImprovementPriority.MEDIUM;

    @Column(name = "screenshot_object_name", length = 500)
    private String screenshotObjectName;

    @Column(name = "screenshot_content_type", length = 80)
    private String screenshotContentType;

    @Column(name = "source_route", nullable = false, length = 300)
    private String sourceRoute;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private ImprovementStatus status = ImprovementStatus.RECEIVED;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public Long getId() { return id; }
    public UserEntity getUser() { return user; }
    public void setUser(UserEntity value) { user = value; }
    public Long getOrganizationId() { return organizationId; }
    public void setOrganizationId(Long value) { organizationId = value; }
    public ImprovementCategory getCategory() { return category; }
    public void setCategory(ImprovementCategory value) { category = value; }
    public String getSelectedItems() { return selectedItems; }
    public void setSelectedItems(String value) { selectedItems = value; }
    public String getTitle() { return title; }
    public void setTitle(String value) { title = value; }
    public String getDescription() { return description; }
    public void setDescription(String value) { description = value; }
    public UserImpact getUserImpact() { return userImpact; }
    public void setUserImpact(UserImpact value) { userImpact = value; }
    public ImprovementPriority getInternalPriority() { return internalPriority; }
    public void setInternalPriority(ImprovementPriority value) { internalPriority = value; }
    public String getScreenshotObjectName() { return screenshotObjectName; }
    public void setScreenshotObjectName(String value) { screenshotObjectName = value; }
    public String getScreenshotContentType() { return screenshotContentType; }
    public void setScreenshotContentType(String value) { screenshotContentType = value; }
    public String getSourceRoute() { return sourceRoute; }
    public void setSourceRoute(String value) { sourceRoute = value; }
    public ImprovementStatus getStatus() { return status; }
    public void setStatus(ImprovementStatus value) { status = value; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}
