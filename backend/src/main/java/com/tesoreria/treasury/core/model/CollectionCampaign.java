package com.tesoreria.treasury.core.model;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Instant;
import java.util.List;

public record CollectionCampaign(Long id, int schoolYear, String title, BigDecimal defaultAmount,
        LocalDate dueDate, String createdBy, LocalDateTime createdAt, Long incomeId,
        List<Participant> participants, List<Movement> movements) {
    public record Participant(Long familyId, String familyCode, String studentName,
            String guardian, String course, BigDecimal expectedAmount) { }
    public record Movement(String requestId, Long familyId, Long incomeId, Long expenseId,
            BigDecimal amount, LocalDate date, String reference, String recipient, boolean cancelled, Instant recordedAt) { }
}
