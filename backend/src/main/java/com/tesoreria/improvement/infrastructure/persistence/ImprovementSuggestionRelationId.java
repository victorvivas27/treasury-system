package com.tesoreria.improvement.infrastructure.persistence;

import java.io.Serializable;
import java.util.Objects;

public class ImprovementSuggestionRelationId implements Serializable {
    private static final long serialVersionUID = 1L;

    private Long suggestionId;
    private Long relatedSuggestionId;

    public ImprovementSuggestionRelationId() {
    }

    public ImprovementSuggestionRelationId(Long suggestionId, Long relatedSuggestionId) {
        this.suggestionId = suggestionId;
        this.relatedSuggestionId = relatedSuggestionId;
    }

    @Override
    public boolean equals(Object candidate) {
        if (this == candidate) return true;
        if (!(candidate instanceof ImprovementSuggestionRelationId value)) return false;
        return Objects.equals(suggestionId, value.suggestionId)
                && Objects.equals(relatedSuggestionId, value.relatedSuggestionId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(suggestionId, relatedSuggestionId);
    }
}
