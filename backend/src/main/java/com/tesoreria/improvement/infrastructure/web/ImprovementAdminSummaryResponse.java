package com.tesoreria.improvement.infrastructure.web;

public record ImprovementAdminSummaryResponse(
        long total,
        long received,
        long underReview,
        long planned,
        long implemented,
        long critical) {
}
