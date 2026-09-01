package com.tesoreria.improvement.infrastructure.persistence;

import com.tesoreria.user.infrastructure.adapter.out.persistence.entity.UserEntity;
import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "improvement_suggestion_notes")
public class ImprovementSuggestionNoteEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "suggestion_id", nullable = false)
    private ImprovementSuggestionEntity suggestion;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "author_user_id", nullable = false)
    private UserEntity author;

    @Column(nullable = false, length = 1200)
    private String content;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public Long getId() { return id; }
    public ImprovementSuggestionEntity getSuggestion() { return suggestion; }
    public void setSuggestion(ImprovementSuggestionEntity value) { suggestion = value; }
    public UserEntity getAuthor() { return author; }
    public void setAuthor(UserEntity value) { author = value; }
    public String getContent() { return content; }
    public void setContent(String value) { content = value; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}
