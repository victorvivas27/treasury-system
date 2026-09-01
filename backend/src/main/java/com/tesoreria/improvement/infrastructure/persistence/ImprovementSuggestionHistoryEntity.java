package com.tesoreria.improvement.infrastructure.persistence;

import com.tesoreria.user.infrastructure.adapter.out.persistence.entity.UserEntity;
import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "improvement_suggestion_history")
public class ImprovementSuggestionHistoryEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "suggestion_id", nullable = false)
    private ImprovementSuggestionEntity suggestion;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "changed_by_user_id", nullable = false)
    private UserEntity changedBy;

    @Column(name = "field_name", nullable = false, length = 40)
    private String fieldName;

    @Column(name = "old_value", length = 80)
    private String oldValue;

    @Column(name = "new_value", nullable = false, length = 80)
    private String newValue;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public Long getId() { return id; }
    public ImprovementSuggestionEntity getSuggestion() { return suggestion; }
    public void setSuggestion(ImprovementSuggestionEntity value) { suggestion = value; }
    public UserEntity getChangedBy() { return changedBy; }
    public void setChangedBy(UserEntity value) { changedBy = value; }
    public String getFieldName() { return fieldName; }
    public void setFieldName(String value) { fieldName = value; }
    public String getOldValue() { return oldValue; }
    public void setOldValue(String value) { oldValue = value; }
    public String getNewValue() { return newValue; }
    public void setNewValue(String value) { newValue = value; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
