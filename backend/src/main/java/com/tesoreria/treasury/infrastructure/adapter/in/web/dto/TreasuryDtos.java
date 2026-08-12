package com.tesoreria.treasury.infrastructure.adapter.in.web.dto;

import com.tesoreria.treasury.core.model.*;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@SuppressWarnings("PMD.MissingStaticMethodInNonInstantiatableClass")
public final class TreasuryDtos {
    private TreasuryDtos() {
    }

    public record ConfigRequest(
            @Positive BigDecimal annualAmount,
            @NotNull AllowedPaymentMode allowedMode,
            @NotNull LocalDate annualDueDate,
            @NotNull LocalDate firstDueDate,
            @NotNull LocalDate secondDueDate) {
    }

    public record ModeRequest(@Min(2000) int year, @NotNull PaymentMode mode) {
    }

    public record PaymentRequest(@NotNull LocalDate paymentDate, @Positive BigDecimal amount,
                                 @Size(max = 500) String observations) {
    }

    public record AnnulmentRequest(@NotBlank @Size(max = 500) String reason) {
    }

    public record GenerationResponse(int generated) {
    }

    public record PlanResponse(Long id, Long familyId, String familyCode, String primaryGuardian,
                               String studentName, String course, PaymentMode mode) {
    }

    public record ObligationResponse(Long id, Long familyId, String familyCode,
                                     String primaryGuardian, String studentName, String course, PaymentMode mode,
                                     InstallmentType installment, String concept,
                                     BigDecimal amount, LocalDate dueDate, LocalDate paymentDate,
                                     ObligationStatus status) {
    }

    public record ReportResponse(Long familyId, String familyCode, String primaryGuardian,
                                 String studentName,
                                 String course, PaymentMode mode, List<ObligationResponse> obligations) {
    }

    public record ContributionConfigRequest(@NotBlank @Size(max = 80) String name,
                                            boolean active, @PositiveOrZero BigDecimal referenceAmount,
                                            @Size(max = 500) String observations) {
    }

    public record ContributionPaymentRequest(@Min(2000) int schoolYear,
                                             @NotNull ContributionType contributionType, @NotNull LocalDate paymentDate,
                                             @Size(max = 500) String notes) {
    }

    public record ContributionResponse(Long id, ContributionStatus status,
                                       LocalDate paymentDate, BigDecimal amount, String registeredBy, String notes,
                                       LocalDateTime cancelledAt) {
    }

    public record FamilyContributionResponse(Long familyId, String familyCode,
                                             String studentName, String course, String primaryGuardian,
                                             ContributionResponse cepa,
                                             ContributionResponse solidarity) {
    }

    public record ProfileResponse(Long familyId, String familyCode, String studentName,
                                  String studentMessage, String guardianPhone, String relationship,
                                  boolean primaryGuardian, PaymentMode mode,
                                  List<ObligationResponse> obligations, ContributionResponse cepa,
                                  ContributionResponse solidarity) {
    }

    public record ContributionSummaryResponse(long totalFamilies, long cepaPaid,
                                              long cepaPending, long solidarityPaid, long solidarityPending,
                                              long fullyPaid, long withPending) {
    }

    public record ExpenseRequest(@Min(2000) int schoolYear,
                                 @NotBlank @Size(max = 250) String description, @Positive BigDecimal amount,
                                 @NotNull LocalDate expenseDate, @NotNull ExpenseCategory category,
                                 ExpensePaymentMethod paymentMethod, @Size(max = 150) String recipient,
                                 @Size(max = 100) String receiptNumber, @Size(max = 1000) String notes,
                                 @Size(max = 500) String correctionReason) {
    }

    public record IncomeRequest(@Min(2000) int schoolYear,
                                @NotBlank @Size(max = 250) String description, @Positive BigDecimal amount,
                                @NotNull LocalDate incomeDate, @NotNull IncomeCategory category,
                                @Size(max = 150) String source, IncomePaymentMethod paymentMethod,
                                @Size(max = 100) String receiptNumber, @Size(max = 80) String course,
                                @Positive Long familyId, @Size(max = 1000) String notes,
                                @Size(max = 500) String correctionReason) {
    }
}
