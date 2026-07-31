package com.tesoreria.treasury.application.usecase;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.tesoreria.shared.domain.exception.DomainException;
import com.tesoreria.stand.infrastructure.adapter.out.persistence.repository.StandJpaRepository;
import com.tesoreria.treasury.core.exception.TreasuryErrorCode;
import com.tesoreria.treasury.core.model.*;
import com.tesoreria.treasury.core.port.in.TreasuryUseCase;
import com.tesoreria.treasury.infrastructure.adapter.out.persistence.entity.*;
import com.tesoreria.treasury.infrastructure.adapter.out.persistence.repository.SchoolEventJpaRepository;

@Service
public class SchoolEventService {
  private static final int MIN_YEAR = 2000;
  private static final int EXPECTED_UNIQUE_STANDS = 1;
  private final SchoolEventJpaRepository events;
  private final TreasuryUseCase treasury;
  private final ManagedCourseService managedCourseService;
  private final StandJpaRepository stands;

  public SchoolEventService(SchoolEventJpaRepository events, TreasuryUseCase treasury,
      ManagedCourseService managedCourse, StandJpaRepository stands) {
    this.events = events;
    this.treasury = treasury;
    this.managedCourseService = managedCourse;
    this.stands = stands;
  }

  public String managedCourse() {
    return managedCourseService.get();
  }

  public List<SchoolEventEntity> list(int year) {
    if (year < MIN_YEAR) throw invalid("El año escolar es inválido");
    return events.findBySchoolYearOrderByEventDateDesc(year).stream()
        .filter(event -> event.getStatus() != EventStatus.CANCELADO)
        .toList();
  }

  public SchoolEventEntity get(Long id) {
    return events.findById(id)
        .orElseThrow(() -> error(TreasuryErrorCode.NOT_FOUND, "Evento no encontrado"));
  }

  @Transactional
  public SchoolEventEntity create(String name, int year, LocalDate date, String description,
      EventStatus status, String observations, List<ParticipantInput> participants) {
    validateEvent(name, year, date, participants);
    ensureNameAvailable(name, null);
    LocalDateTime now = LocalDateTime.now();
    SchoolEventEntity event = new SchoolEventEntity();
    event.setName(name.trim());
    event.setSchoolYear(year);
    event.setEventDate(date);
    event.setDescription(normalize(description));
    event.setStatus(status == null ? EventStatus.BORRADOR : status);
    event.setObservations(normalize(observations));
    event.setParticipants(participants.stream().map(this::participant).toList());
    event.setCreatedAt(now);
    event.setUpdatedAt(now);
    return events.save(event);
  }

  @Transactional
  public SchoolEventEntity update(Long id, String name, int year, LocalDate date,
      String description, EventStatus status, String observations,
      List<ParticipantInput> participants) {
    SchoolEventEntity event = editable(id);
    validateEvent(name, year, date, participants);
    ensureNameAvailable(name, id);
    if (event.getGrossRevenue() != null || !event.getExpenses().isEmpty()) {
      List<String> currentCourses = event.getParticipants().stream()
          .map(item -> item.getCourse().toUpperCase(Locale.ROOT)).sorted().toList();
      List<String> requestedCourses = participants.stream()
          .map(ParticipantInput::course).map(value -> value.trim().toUpperCase(Locale.ROOT))
          .sorted().toList();
      if (!currentCourses.equals(requestedCourses)) {
        throw error(TreasuryErrorCode.CONFLICT,
            "No puedes cambiar los cursos después de registrar movimientos");
      }
    }
    event.setName(name.trim());
    event.setSchoolYear(year);
    event.setEventDate(date);
    event.setDescription(normalize(description));
    event.setStatus(status == null ? event.getStatus() : status);
    event.setObservations(normalize(observations));
    Map<String, SchoolEventParticipantEmbeddable> current = new HashMap<>();
    event.getParticipants().forEach(item ->
        current.put(item.getCourse().toUpperCase(Locale.ROOT), item));
    event.setParticipants(participants.stream().map(input -> {
      SchoolEventParticipantEmbeddable changed = participant(input);
      SchoolEventParticipantEmbeddable previous =
          current.get(changed.getCourse().toUpperCase(Locale.ROOT));
      if (previous != null) {
        changed.setGrossShare(previous.getGrossShare());
        changed.setOwnExpenses(previous.getOwnExpenses());
        changed.setNetProfit(previous.getNetProfit());
        changed.setTransferStatus(previous.getTransferStatus());
        changed.setTransferIncomeId(previous.getTransferIncomeId());
      }
      return changed;
    }).toList());
    event.setUpdatedAt(LocalDateTime.now());
    return events.save(event);
  }

  @Transactional
  public void delete(Long id) {
    delete(id, "system");
  }

  @Transactional
  public void delete(Long id, String user) {
    SchoolEventEntity event = get(id);
    if (event.isSettlementConfirmed() || event.getStatus() == EventStatus.CERRADO) {
      throw error(TreasuryErrorCode.CONFLICT,
          "Primero debes cancelar la liquidación antes de eliminar el evento");
    }
    if (stands.existsByEventId(id)) {
      throw error(TreasuryErrorCode.CONFLICT,
          "Elimina primero los stands asociados antes de eliminar el evento");
    }
    events.deleteById(id);
  }

  @Transactional
  public SchoolEventEntity addExpense(Long eventId, ExpenseInput input, String user) {
    SchoolEventEntity event = editable(eventId);
    if (input.description() == null || input.description().isBlank()
        || input.amount() == null || input.amount().signum() <= 0
        || input.amount().scale() > 0 || input.date() == null || input.type() == null) {
      throw invalid("Descripción, monto entero positivo, fecha y tipo son obligatorios");
    }
    String normalizedCourse = normalize(input.course());
    String course = normalizedCourse == null ? null : normalizedCourse.toUpperCase(Locale.ROOT);
    if (input.type() == EventExpenseType.COURSE
        && (course == null || event.getParticipants().stream()
            .noneMatch(item -> item.getCourse().equalsIgnoreCase(course)))) {
      throw invalid("El gasto de curso requiere un curso participante válido");
    }
    if (input.type() == EventExpenseType.COMMON && course != null) {
      throw invalid("Un gasto común no puede asociarse a un curso");
    }
    SchoolEventExpenseEmbeddable expense = new SchoolEventExpenseEmbeddable();
    expense.setKey(UUID.randomUUID().toString());
    expense.setDescription(input.description().trim());
    expense.setAmount(input.amount().setScale(0, RoundingMode.UNNECESSARY));
    expense.setDate(input.date());
    expense.setType(input.type());
    expense.setCourse(course);
    expense.setCategory(normalize(input.category()));
    expense.setResponsible(normalize(input.responsible()));
    expense.setPaymentMethod(normalize(input.paymentMethod()));
    expense.setReceiptNumber(normalize(input.receiptNumber()));
    expense.setObservations(normalize(input.observations()));
    expense.setDeductFromSettlement(input.deductFromSettlement() == null
        || input.deductFromSettlement());
    expense.setStatus(EventExpenseStatus.ACTIVE);
    expense.setRegisteredBy(user);
    expense.setCreatedAt(LocalDateTime.now());
    event.getExpenses().add(expense);
    event.setUpdatedAt(LocalDateTime.now());
    return events.save(event);
  }

  @Transactional
  public SchoolEventEntity updateExpense(Long eventId, String key, ExpenseInput input) {
    SchoolEventEntity event = editable(eventId);
    SchoolEventExpenseEmbeddable expense = event.getExpenses().stream()
        .filter(item -> item.getKey().equals(key)).findFirst()
        .orElseThrow(() -> error(TreasuryErrorCode.NOT_FOUND, "Gasto de evento no encontrado"));
    if (expense.getStatus() != EventExpenseStatus.ACTIVE) {
      throw error(TreasuryErrorCode.CONFLICT, "Un gasto anulado no puede editarse");
    }
    if (input.description() == null || input.description().isBlank()
        || input.amount() == null || input.amount().signum() <= 0
        || input.amount().scale() > 0 || input.date() == null || input.type() == null) {
      throw invalid("Descripción, monto entero positivo, fecha y tipo son obligatorios");
    }
    String normalizedCourse = normalize(input.course());
    String course = normalizedCourse == null ? null : normalizedCourse.toUpperCase(Locale.ROOT);
    if (input.type() == EventExpenseType.COURSE
        && (course == null || event.getParticipants().stream()
            .noneMatch(item -> item.getCourse().equalsIgnoreCase(course)))) {
      throw invalid("El gasto de curso requiere un curso participante válido");
    }
    if (input.type() == EventExpenseType.COMMON && course != null) {
      throw invalid("Un gasto común no puede asociarse a un curso");
    }
    expense.setDescription(input.description().trim());
    expense.setAmount(input.amount().setScale(0, RoundingMode.UNNECESSARY));
    expense.setDate(input.date());
    expense.setType(input.type());
    expense.setCourse(course);
    expense.setCategory(normalize(input.category()));
    expense.setResponsible(normalize(input.responsible()));
    expense.setPaymentMethod(normalize(input.paymentMethod()));
    expense.setReceiptNumber(normalize(input.receiptNumber()));
    expense.setObservations(normalize(input.observations()));
    expense.setDeductFromSettlement(input.deductFromSettlement() == null
        || input.deductFromSettlement());
    event.setUpdatedAt(LocalDateTime.now());
    return events.save(event);
  }

  @Transactional
  public SchoolEventEntity cancelExpense(Long eventId, String key, String reason, String user) {
    SchoolEventEntity event = editable(eventId);
    SchoolEventExpenseEmbeddable expense = event.getExpenses().stream()
        .filter(item -> item.getKey().equals(key)).findFirst()
        .orElseThrow(() -> error(TreasuryErrorCode.NOT_FOUND, "Gasto de evento no encontrado"));
    if (expense.getStatus() == EventExpenseStatus.CANCELLED) return event;
    if (reason == null || reason.isBlank()) throw invalid("El motivo es obligatorio");
    expense.setStatus(EventExpenseStatus.CANCELLED);
    expense.setCancelledAt(LocalDateTime.now());
    expense.setCancelledBy(user);
    expense.setCancellationReason(reason.trim());
    event.setUpdatedAt(LocalDateTime.now());
    return events.save(event);
  }

  @Transactional
  public SchoolEventEntity deleteExpense(Long eventId, String key) {
    SchoolEventEntity event = editable(eventId);
    boolean removed = event.getExpenses().removeIf(item -> item.getKey().equals(key));
    if (!removed) {
      throw error(TreasuryErrorCode.NOT_FOUND, "Gasto de evento no encontrado");
    }
    event.setUpdatedAt(LocalDateTime.now());
    return events.save(event);
  }

  @Transactional
  public SchoolEventEntity registerRevenue(Long eventId, BigDecimal amount, LocalDate date,
      String description, String paymentMethod, String receipt, String observations) {
    SchoolEventEntity event = editable(eventId);
    if (amount == null || amount.signum() <= 0 || amount.scale() > 0 || date == null) {
      throw invalid("Monto entero positivo y fecha de recaudación son obligatorios");
    }
    event.setGrossRevenue(amount.setScale(0, RoundingMode.UNNECESSARY));
    event.setRevenueDate(date);
    event.setRevenueDescription(normalize(description));
    event.setRevenuePaymentMethod(normalize(paymentMethod));
    event.setRevenueReceipt(normalize(receipt));
    event.setRevenueObservations(normalize(observations));
    event.setStatus(EventStatus.EN_LIQUIDACION);
    event.setSettlementConfirmed(false);
    event.setUpdatedAt(LocalDateTime.now());
    return events.save(event);
  }

  @Transactional
  public SchoolEventEntity deleteRevenue(Long eventId) {
    SchoolEventEntity event = editable(eventId);
    if (event.getGrossRevenue() == null) {
      throw error(TreasuryErrorCode.NOT_FOUND, "Recaudación de evento no encontrada");
    }
    event.setGrossRevenue(null);
    event.setRevenueDate(null);
    event.setRevenueDescription(null);
    event.setRevenuePaymentMethod(null);
    event.setRevenueReceipt(null);
    event.setRevenueObservations(null);
    event.setRemainder(null);
    event.setSettlementConfirmed(false);
    event.setStatus(EventStatus.REALIZADO);
    event.getParticipants().forEach(participant -> {
      participant.setGrossShare(null);
      participant.setOwnExpenses(null);
      participant.setNetProfit(null);
      participant.setTransferStatus(EventTransferStatus.PENDING);
      participant.setTransferIncomeId(null);
    });
    event.setUpdatedAt(LocalDateTime.now());
    return events.save(event);
  }

  @Transactional
  public EventSettlementCalculator.Result calculate(Long eventId) {
    SchoolEventEntity event = get(eventId);
    BigDecimal common = activeExpenses(event, EventExpenseType.COMMON, null);
    List<EventSettlementCalculator.CourseExpense> courses = event.getParticipants().stream()
        .map(item -> new EventSettlementCalculator.CourseExpense(item.getCourse(),
            activeExpenses(event, EventExpenseType.COURSE, item.getCourse()))).toList();
    EventSettlementCalculator.Result result;
    try {
      result = EventSettlementCalculator.calculate(event.getGrossRevenue(), common, courses);
    } catch (IllegalArgumentException exception) {
      throw new DomainException("evento", TreasuryErrorCode.CONFLICT.getStatus(),
          exception.getMessage(), exception);
    }
    Map<String, EventSettlementCalculator.CourseResult> byCourse = new HashMap<>();
    result.courses().forEach(item -> byCourse.put(item.course(), item));
    event.getParticipants().forEach(item -> {
      var calculated = byCourse.get(item.getCourse());
      item.setGrossShare(calculated.grossShare());
      item.setOwnExpenses(calculated.expenses());
      item.setNetProfit(calculated.netProfit());
      item.setTransferStatus(calculated.transferStatus());
    });
    event.setRemainder(result.remainder());
    event.setStatus(EventStatus.EN_LIQUIDACION);
    event.setUpdatedAt(LocalDateTime.now());
    events.save(event);
    return result;
  }

  @Transactional
  public SchoolEventEntity confirm(Long eventId, String user) {
    SchoolEventEntity event = get(eventId);
    if (event.isSettlementConfirmed()) return event;
    String currentManagedCourse = managedCourseService.get();
    if (event.getParticipants().stream()
        .noneMatch(item -> item.getCourse().equalsIgnoreCase(currentManagedCourse))) {
      throw error(TreasuryErrorCode.CONFLICT,
          "El evento no incluye el curso administrado " + currentManagedCourse);
    }
    EventSettlementCalculator.Result result = calculate(eventId);
    if (result.courses().stream().anyMatch(item -> item.netProfit().signum() < 0)) {
      throw error(TreasuryErrorCode.CONFLICT,
          "Debe resolver los saldos negativos antes de confirmar");
    }
    for (SchoolEventParticipantEmbeddable participant : event.getParticipants()) {
      if (!participant.getCourse().equalsIgnoreCase(currentManagedCourse)) continue;
      if (participant.getTransferIncomeId() != null) continue;
      TreasuryIncome income = treasury.createIncome(event.getSchoolYear(),
          "Ganancia " + event.getName() + " " + event.getSchoolYear()
              + " - " + participant.getCourse(),
          participant.getNetProfit(), LocalDate.now(), IncomeCategory.EVENT,
          "EVENT_PROFIT", IncomePaymentMethod.TRANSFER, null, participant.getCourse(),
          null, "Evento #" + event.getId(), user);
      participant.setTransferIncomeId(income.id());
      participant.setTransferStatus(EventTransferStatus.TRANSFERRED);
    }
    event.setSettlementConfirmed(true);
    event.setStatus(EventStatus.CERRADO);
    event.setUpdatedAt(LocalDateTime.now());
    return events.save(event);
  }

  @Transactional
  public SchoolEventEntity cancelSettlement(Long eventId, String user) {
    SchoolEventEntity event = get(eventId);
    if (!event.isSettlementConfirmed() || event.getStatus() != EventStatus.CERRADO) {
      throw error(TreasuryErrorCode.CONFLICT,
          "El evento no tiene una liquidación confirmada");
    }
    for (SchoolEventParticipantEmbeddable participant : event.getParticipants()) {
      if (participant.getTransferIncomeId() != null) {
        treasury.deleteIncome(participant.getTransferIncomeId());
      }
      participant.setTransferIncomeId(null);
      participant.setTransferStatus(EventTransferStatus.PENDING);
    }
    event.setSettlementConfirmed(false);
    event.setStatus(EventStatus.EN_LIQUIDACION);
    event.setUpdatedAt(LocalDateTime.now());
    return events.save(event);
  }

  private SchoolEventEntity editable(Long id) {
    SchoolEventEntity event = get(id);
    if (event.getStatus() == EventStatus.CERRADO || event.getStatus() == EventStatus.CANCELADO
        || event.isSettlementConfirmed()) {
      throw error(TreasuryErrorCode.CONFLICT,
          "El evento cerrado o liquidado no admite modificaciones");
    }
    return event;
  }

  private BigDecimal activeExpenses(SchoolEventEntity event, EventExpenseType type, String course) {
    return event.getExpenses().stream()
        .filter(item -> item.getStatus() == EventExpenseStatus.ACTIVE && item.getType() == type)
        .filter(this::deductsFromSettlement)
        .filter(item -> course == null || course.equalsIgnoreCase(item.getCourse()))
        .map(SchoolEventExpenseEmbeddable::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
  }

  private boolean deductsFromSettlement(SchoolEventExpenseEmbeddable expense) {
    return !Boolean.FALSE.equals(expense.getDeductFromSettlement());
  }

  private void validateEvent(String name, int year, LocalDate date,
      List<ParticipantInput> participants) {
    if (name == null || name.isBlank() || year < MIN_YEAR || date == null
        || participants == null || participants.isEmpty()) {
      throw invalid("Nombre, año, fecha y al menos un curso son obligatorios");
    }
    long uniqueCourses = participants.stream().map(ParticipantInput::course)
        .filter(Objects::nonNull).map(value -> value.trim().toUpperCase(Locale.ROOT))
        .distinct().count();
    if (uniqueCourses != participants.size()) throw invalid("Los cursos no pueden repetirse");
    long uniqueStands = participants.stream().map(ParticipantInput::standName)
        .filter(Objects::nonNull).map(String::trim).filter(value -> !value.isEmpty())
        .map(value -> value.toUpperCase(Locale.ROOT)).distinct().count();
    if (uniqueStands != EXPECTED_UNIQUE_STANDS) {
      throw invalid("Todos los cursos deben compartir el mismo nombre de stand");
    }
  }

  private void ensureNameAvailable(String name, Long currentId) {
    String normalizedName = name.trim();
    boolean exists = currentId == null ? events.existsByNameIgnoreCase(normalizedName)
        : events.existsByNameIgnoreCaseAndIdNot(normalizedName, currentId);
    if (exists) throw error(TreasuryErrorCode.CONFLICT, "Ya existe un evento con ese nombre");
  }

  private SchoolEventParticipantEmbeddable participant(ParticipantInput input) {
    if (input.course() == null || input.course().isBlank()
        || input.standName() == null || input.standName().isBlank()) {
      throw invalid("Curso y nombre del stand son obligatorios");
    }
    SchoolEventParticipantEmbeddable value = new SchoolEventParticipantEmbeddable();
    value.setCourse(input.course().trim().toUpperCase(Locale.ROOT));
    value.setStandName(input.standName().trim());
    value.setStandType(normalize(input.standType()));
    value.setDescription(normalize(input.description()));
    value.setResponsible(normalize(input.responsible()));
    value.setObservations(normalize(input.observations()));
    value.setTransferStatus(EventTransferStatus.PENDING);
    return value;
  }

  private String normalize(String value) {
    return value == null || value.isBlank() ? null : value.trim();
  }

  private DomainException invalid(String message) {
    return error(TreasuryErrorCode.INVALID, message);
  }

  private DomainException error(TreasuryErrorCode code, String message) {
    return new DomainException("evento", code.getStatus(), message);
  }

  public record ParticipantInput(String course, String standName, String standType,
      String description, String responsible, String observations) { }
  public record ExpenseInput(String description, BigDecimal amount, LocalDate date,
      EventExpenseType type, String course, String category, String responsible,
      String paymentMethod, String receiptNumber, String observations,
      Boolean deductFromSettlement) { }
}
