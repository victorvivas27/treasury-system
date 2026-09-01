package com.tesoreria.improvement.infrastructure.persistence;

import com.tesoreria.user.infrastructure.adapter.out.persistence.entity.UserEntity;
import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "improvement_suggestion_relations")
@IdClass(ImprovementSuggestionRelationId.class)
public class ImprovementSuggestionRelationEntity {
    @Id
    @Column(name = "suggestion_id")
    private Long suggestionId;

    @Id
    @Column(name = "related_suggestion_id")
    private Long relatedSuggestionId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "created_by_user_id", nullable = false)
    private UserEntity createdBy;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public Long getSuggestionId() { return suggestionId; }
    public void setSuggestionId(Long value) { suggestionId = value; }
    public Long getRelatedSuggestionId() { return relatedSuggestionId; }
    public void setRelatedSuggestionId(Long value) { relatedSuggestionId = value; }
    public UserEntity getCreatedBy() { return createdBy; }
    public void setCreatedBy(UserEntity value) { createdBy = value; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
