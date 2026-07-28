package com.tesoreria.treasury.infrastructure.adapter.in.web.controller;

import java.math.BigDecimal;
import java.security.Principal;
import java.time.*;
import java.util.List;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import com.tesoreria.treasury.application.usecase.SchoolEventService;
import com.tesoreria.treasury.core.model.*;
import com.tesoreria.treasury.infrastructure.adapter.out.persistence.entity.*;
import com.tesoreria.shared.infrastructure.constant.ApiConstants;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

@RestController
@RequestMapping(ApiConstants.TREASURY + "/eventos")
public class SchoolEventController {
  private final SchoolEventService service;

  public SchoolEventController(SchoolEventService service) {
    this.service = service;
  }

  @GetMapping("/curso-administrado")
  public ManagedCourseResponse managedCourse() {
    return new ManagedCourseResponse(service.managedCourse());
  }

  @GetMapping
  public List<EventResponse> list(@RequestParam int year) {
    return service.list(year).stream().map(this::response).toList();
  }

  @GetMapping("/{id}")
  public EventResponse get(@PathVariable Long id) {
    return response(service.get(id));
  }

  @PostMapping
  public ResponseEntity<EventResponse> create(@Valid @RequestBody EventRequest request) {
    SchoolEventEntity event = service.create(request.name(), request.schoolYear(),
        request.eventDate(), request.description(), request.status(), request.observations(),
        request.participants().stream().map(item -> new SchoolEventService.ParticipantInput(
            item.course(), item.standName(), item.standType(), item.description(),
            item.responsible(), item.observations())).toList());
    return ResponseEntity.status(HttpStatus.CREATED).body(response(event));
  }

  @PutMapping("/{id}")
  public EventResponse update(@PathVariable Long id,
      @Valid @RequestBody EventRequest request) {
    return response(service.update(id, request.name(), request.schoolYear(),
        request.eventDate(), request.description(), request.status(), request.observations(),
        request.participants().stream().map(item -> new SchoolEventService.ParticipantInput(
            item.course(), item.standName(), item.standType(), item.description(),
            item.responsible(), item.observations())).toList()));
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<Void> delete(@PathVariable Long id, Principal principal) {
    service.delete(id, user(principal));
    return ResponseEntity.noContent().build();
  }

  @PostMapping("/{id}/gastos")
  public ResponseEntity<EventResponse> addExpense(@PathVariable Long id,
      @Valid @RequestBody ExpenseRequest request, Principal principal) {
    SchoolEventService.ExpenseInput input = new SchoolEventService.ExpenseInput(
        request.description(), request.amount(), request.date(), request.type(), request.course(),
        request.category(), request.responsible(), request.paymentMethod(),
        request.receiptNumber(), request.observations(), request.deductFromSettlement());
    return ResponseEntity.status(HttpStatus.CREATED)
        .body(response(service.addExpense(id, input, user(principal))));
  }

  @PutMapping("/{id}/gastos/{expenseKey}")
  public EventResponse updateExpense(@PathVariable Long id, @PathVariable String expenseKey,
      @Valid @RequestBody ExpenseRequest request) {
    SchoolEventService.ExpenseInput input = new SchoolEventService.ExpenseInput(
        request.description(), request.amount(), request.date(), request.type(), request.course(),
        request.category(), request.responsible(), request.paymentMethod(),
        request.receiptNumber(), request.observations(), request.deductFromSettlement());
    return response(service.updateExpense(id, expenseKey, input));
  }

  @PatchMapping("/{id}/gastos/{expenseKey}/anulacion")
  public EventResponse cancelExpense(@PathVariable Long id, @PathVariable String expenseKey,
      @Valid @RequestBody CancelRequest request, Principal principal) {
    return response(service.cancelExpense(id, expenseKey, request.reason(), user(principal)));
  }

  @DeleteMapping("/{id}/gastos/{expenseKey}")
  public EventResponse deleteExpense(@PathVariable Long id, @PathVariable String expenseKey) {
    return response(service.deleteExpense(id, expenseKey));
  }

  @PutMapping("/{id}/recaudacion")
  public EventResponse revenue(@PathVariable Long id,
      @Valid @RequestBody RevenueRequest request) {
    return response(service.registerRevenue(id, request.amount(), request.date(),
        request.description(), request.paymentMethod(), request.receiptNumber(),
        request.observations()));
  }

  @PostMapping("/{id}/liquidacion/calcular")
  public EventSettlementCalculator.Result calculate(@PathVariable Long id) {
    return service.calculate(id);
  }

  @PostMapping("/{id}/liquidacion/confirmar")
  public EventResponse confirm(@PathVariable Long id, Principal principal) {
    return response(service.confirm(id, user(principal)));
  }

  @PostMapping("/{id}/liquidacion/cancelar")
  public EventResponse cancelSettlement(@PathVariable Long id, Principal principal) {
    return response(service.cancelSettlement(id, user(principal)));
  }

  private EventResponse response(SchoolEventEntity value) {
    BigDecimal common = sum(value, EventExpenseType.COMMON);
    BigDecimal own = sum(value, EventExpenseType.COURSE);
    BigDecimal gross = value.getGrossRevenue() == null ? BigDecimal.ZERO : value.getGrossRevenue();
    return new EventResponse(value.getId(), value.getName(), value.getSchoolYear(),
        value.getEventDate(), value.getDescription(), value.getStatus(), value.getObservations(),
        value.getParticipants().stream().map(item -> new ParticipantResponse(
            item.getCourse(), item.getStandName(), item.getStandType(), item.getDescription(),
            item.getResponsible(), item.getObservations(), item.getGrossShare(),
            item.getOwnExpenses(), item.getNetProfit(), item.getTransferStatus())).toList(),
        value.getExpenses().stream().map(item -> new ExpenseResponse(
            item.getKey(), item.getDescription(), item.getAmount(), item.getDate(), item.getType(),
            item.getCourse(), item.getCategory(), item.getResponsible(), item.getPaymentMethod(),
            item.getReceiptNumber(), item.getObservations(), item.getStatus(),
            item.getRegisteredBy(), item.getCancelledAt(), item.getCancellationReason(),
            !Boolean.FALSE.equals(item.getDeductFromSettlement()))).toList(),
        value.getGrossRevenue(), common, own, gross.subtract(common).subtract(own),
        value.getRevenueDate(), value.getRevenueDescription(), value.getRevenuePaymentMethod(),
        value.getRevenueReceipt(), value.getRevenueObservations(), value.getRemainder(),
        value.isSettlementConfirmed(), value.getCreatedAt(), value.getUpdatedAt());
  }

  private BigDecimal sum(SchoolEventEntity event, EventExpenseType type) {
    return event.getExpenses().stream()
        .filter(item -> item.getStatus() == EventExpenseStatus.ACTIVE && item.getType() == type)
        .filter(item -> !Boolean.FALSE.equals(item.getDeductFromSettlement()))
        .map(SchoolEventExpenseEmbeddable::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
  }

  private String user(Principal principal) {
    return principal == null ? "system" : principal.getName();
  }

  public record ParticipantRequest(@NotBlank @Size(max = 80) String course,
      @NotBlank @Size(max = 120) String standName, @Size(max = 100) String standType,
      @Size(max = 500) String description, @Size(max = 150) String responsible,
      @Size(max = 500) String observations) { }
  public record EventRequest(@NotBlank @Size(max = 150) String name,
      @Min(2000) int schoolYear, @NotNull LocalDate eventDate,
      @Size(max = 1000) String description, EventStatus status,
      @Size(max = 1000) String observations,
      @NotEmpty List<@Valid ParticipantRequest> participants) { }
  public record ExpenseRequest(@NotBlank @Size(max = 250) String description,
      @NotNull @Positive BigDecimal amount, @NotNull LocalDate date,
      @NotNull EventExpenseType type, @Size(max = 80) String course,
      @Size(max = 80) String category, @Size(max = 150) String responsible,
      @Size(max = 40) String paymentMethod, @Size(max = 100) String receiptNumber,
      @Size(max = 500) String observations, Boolean deductFromSettlement) { }
  public record RevenueRequest(@NotNull @Positive BigDecimal amount, @NotNull LocalDate date,
      @Size(max = 250) String description, @Size(max = 40) String paymentMethod,
      @Size(max = 100) String receiptNumber, @Size(max = 500) String observations) { }
  public record CancelRequest(@NotBlank @Size(max = 500) String reason) { }
  public record ParticipantResponse(String course, String standName, String standType,
      String description, String responsible, String observations, BigDecimal grossShare,
      BigDecimal ownExpenses, BigDecimal netProfit, EventTransferStatus transferStatus) { }
  public record ExpenseResponse(String key, String description, BigDecimal amount, LocalDate date,
      EventExpenseType type, String course, String category, String responsible,
      String paymentMethod, String receiptNumber, String observations, EventExpenseStatus status,
      String registeredBy, LocalDateTime cancelledAt, String cancellationReason,
      boolean deductFromSettlement) { }
  public record EventResponse(Long id, String name, int schoolYear, LocalDate eventDate,
      String description, EventStatus status, String observations,
      List<ParticipantResponse> participants, List<ExpenseResponse> expenses,
      BigDecimal grossRevenue, BigDecimal commonExpenses, BigDecimal courseExpenses,
      BigDecimal netProfit, LocalDate revenueDate, String revenueDescription,
      String revenuePaymentMethod, String revenueReceipt, String revenueObservations,
      BigDecimal remainder, boolean settlementConfirmed, LocalDateTime createdAt,
      LocalDateTime updatedAt) { }
  public record ManagedCourseResponse(String course) { }
}
