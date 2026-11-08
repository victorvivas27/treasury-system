package com.tesoreria.treasury.application.usecase;

import com.tesoreria.familia.core.port.in.GetFamiliaUseCase;
import com.tesoreria.shared.domain.exception.DomainException;
import com.tesoreria.treasury.core.exception.TreasuryErrorCode;
import com.tesoreria.treasury.core.model.*;
import com.tesoreria.treasury.core.port.in.TreasuryUseCase;
import com.tesoreria.treasury.core.port.out.CollectionRepository;
import com.tesoreria.treasury.core.port.out.TreasuryRepositoryOutPort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

@Service
public class CollectionService {
    private static final String SEPARATOR = " · ";
    private final CollectionRepository campaigns;
    private final GetFamiliaUseCase families;
    private final TreasuryUseCase treasury;
    private final TreasuryRepositoryOutPort audit;

    public CollectionService(CollectionRepository campaigns, GetFamiliaUseCase families,
            TreasuryUseCase treasury, TreasuryRepositoryOutPort audit) {
        this.campaigns = campaigns; this.families = families; this.treasury = treasury; this.audit = audit;
    }

    @Transactional(readOnly = true)
    public List<View> list(int year) {
        validateYear(year);
        var ledger = ledger(year);
        return campaigns.list(year).stream().map(value -> view(value, ledger)).toList();
    }

    @Transactional
    public View create(int year, String title, BigDecimal defaultAmount, LocalDate dueDate,
            List<Long> familyIds, String user) {
        validateYear(year); amount(defaultAmount, false);
        if (title == null || title.isBlank() || title.trim().length() > 120) invalid("Escribe un nombre de hasta 120 caracteres");
        if (dueDate != null && dueDate.getYear() != year) invalid("La fecha debe corresponder al año de la recaudación");
        if (familyIds == null || familyIds.isEmpty() || new HashSet<>(familyIds).size() != familyIds.size()) {
            invalid("Selecciona familias sin repetirlas");
        }
        var available = families.obtenerDatosTesoreria();
        var selected = available.stream().filter(f -> familyIds.contains(f.familyId())).toList();
        if (selected.size() != familyIds.size()) invalid("Hay familias que no están activas en este curso");
        var participants = selected.stream().map(f -> new CollectionCampaign.Participant(f.familyId(),
            f.familyCode(), f.studentName(), f.primaryGuardian(), f.course(), defaultAmount.setScale(0))).toList();
        var saved = campaigns.save(new CollectionCampaign(null, year, title.trim(), defaultAmount.setScale(0),
            dueDate, user, LocalDateTime.now(), null, participants, List.of()));
        recordAudit(saved.id(), "CREAR_RECAUDACION", user, saved.title());
        return view(saved, ledger(year));
    }

    @Transactional
    public View update(Long id, String title, LocalDate dueDate, String user) {
        var campaign = require(id, true);
        if (title == null || title.isBlank() || title.trim().length() > 120) invalid("Escribe un nombre de hasta 120 caracteres");
        if (dueDate != null && dueDate.getYear() != campaign.schoolYear()) invalid("La fecha debe corresponder al año del fondo");
        var updated = campaigns.save(new CollectionCampaign(campaign.id(), campaign.schoolYear(), title.trim(),
            campaign.defaultAmount(), dueDate, campaign.createdBy(), campaign.createdAt(), campaign.incomeId(),
            campaign.participants(), campaign.movements()));
        recordAudit(id, "EDITAR_FONDO", user, campaign.title() + " → " + updated.title() + SEPARATOR + dueDate);
        return view(updated, ledger(campaign.schoolYear()));
    }

    @Transactional
    public void archive(Long id, String reason, String user) {
        var campaign = require(id, true);
        if (reason == null || reason.isBlank() || reason.length() > 500) invalid("Indica el motivo de la eliminación (hasta 500 caracteres)");
        campaigns.archive(id);
        recordAudit(id, "ELIMINAR_FONDO", user, campaign.title() + SEPARATOR + reason.trim());
    }

    @Transactional
    public View setExpected(Long id, Long familyId, BigDecimal expected, String user) {
        var campaign = require(id, true);
        requireOpen(campaign);
        amount(expected, true);
        var ledger = ledger(campaign.schoolYear());
        var row = row(view(campaign, ledger), familyId);
        if (expected.compareTo(row.paid()) < 0) invalid("El monto no puede ser menor que lo ya recaudado");
        var participants = campaign.participants().stream().map(p -> p.familyId().equals(familyId)
            ? new CollectionCampaign.Participant(p.familyId(), p.familyCode(), p.studentName(), p.guardian(), p.course(), expected.setScale(0)) : p).toList();
        var updated = campaigns.save(copy(campaign, participants, campaign.movements()));
        recordAudit(id, "AJUSTAR_RECAUDACION", user, "Familia " + familyId + ": " + row.expected() + " → " + expected);
        return view(updated, ledger);
    }

    @Transactional
    public View collect(Long id, Long familyId, BigDecimal value, LocalDate date, String reference,
            UUID requestId, String user) {
        var campaign = require(id, true);
        validateMovement(campaign, value, date, reference, requestId);
        var ledger = ledger(campaign.schoolYear());
        if (repeated(campaign, requestId, familyId, value, date, reference, null)) return view(campaign, ledger);
        requireOpen(campaign);
        var row = row(view(campaign, ledger), familyId);
        if (value.compareTo(row.remaining()) > 0) invalid("El abono supera el saldo pendiente de esta familia");
        var movements = new ArrayList<>(campaign.movements());
        movements.add(new CollectionCampaign.Movement(requestId.toString(), familyId, null, null,
            value.setScale(0), date, clean(reference), null, false));
        var updated = campaigns.save(copy(campaign, campaign.participants(), movements));
        recordAudit(id, "REGISTRAR_COBRO_RECAUDACION", user, "Familia " + familyId + SEPARATOR + value + SEPARATOR + requestId);
        return view(updated, ledger(campaign.schoolYear()));
    }

    @Transactional
    public View postIncome(Long id, LocalDate date, String reference, String user) {
        var campaign = require(id, true);
        var ledger = ledger(campaign.schoolYear());
        if (campaign.incomeId() != null && ledger.incomes().containsKey(campaign.incomeId())
                && ledger.incomes().get(campaign.incomeId()).status() == IncomeStatus.ACTIVE) return view(campaign, ledger);
        var total = view(campaign, ledger).collected();
        validateMovement(campaign, total, date, reference, UUID.randomUUID());
        var income = treasury.createIncome(campaign.schoolYear(), "Recaudación #" + id + SEPARATOR + campaign.title(),
            total, date, IncomeCategory.SCHOOL_ACTIVITY, "Recaudación #" + id, IncomePaymentMethod.TRANSFER,
            clean(reference), null, null, "Ingreso consolidado al cierre de la campaña", user);
        var movements = new ArrayList<>(campaign.movements());
        movements.add(new CollectionCampaign.Movement(UUID.randomUUID().toString(), null, income.id(), null,
            total, date, clean(reference), null, false));
        var updated = campaigns.save(new CollectionCampaign(campaign.id(), campaign.schoolYear(), campaign.title(),
            campaign.defaultAmount(), campaign.dueDate(), campaign.createdBy(), campaign.createdAt(), income.id(),
            campaign.participants(), movements));
        recordAudit(id, "CERRAR_RECAUDACION", user, "Ingreso " + income.id() + " · total " + total);
        return view(updated, ledger(campaign.schoolYear()));
    }

    @Transactional
    public View cancelFamilyPayments(Long id, Long familyId, String reason, String user) {
        var campaign = require(id, true);
        requireOpen(campaign);
        if (reason == null || reason.isBlank() || reason.length() > 500) invalid("Indica el motivo de la corrección (hasta 500 caracteres)");
        row(view(campaign, ledger(campaign.schoolYear())), familyId);
        var movements = campaign.movements().stream().map(m -> familyId.equals(m.familyId())
            ? new CollectionCampaign.Movement(m.requestId(), m.familyId(), m.incomeId(), m.expenseId(),
                m.amount(), m.date(), m.reference(), m.recipient(), true) : m).toList();
        var saved = campaigns.save(copy(campaign, campaign.participants(), movements));
        recordAudit(id, "ANULAR_COBROS_RECAUDACION", user, "Familia " + familyId + SEPARATOR + reason.trim());
        return view(saved, ledger(campaign.schoolYear()));
    }

    @Transactional
    public View disburse(Long id, BigDecimal value, LocalDate date, String recipient, String reference,
            ExpenseCategory category, UUID requestId, String user) {
        var campaign = require(id, true);
        validateMovement(campaign, value, date, reference, requestId);
        if (recipient == null || recipient.isBlank() || recipient.trim().length() > 150 || category == null) {
            invalid("Indica el proveedor y la categoría del gasto");
        }
        var ledger = ledger(campaign.schoolYear());
        if (repeated(campaign, requestId, null, value, date, reference, clean(recipient))) return view(campaign, ledger);
        var posted = campaign.incomeId() == null ? null : ledger.incomes().get(campaign.incomeId());
        if (posted == null || posted.status() != IncomeStatus.ACTIVE) invalid("Primero cierra la campaña y da ingreso al total recaudado");
        if (value.compareTo(view(campaign, ledger).available()) > 0) invalid("El pago supera el dinero disponible en esta recaudación");
        var expense = treasury.createExpense(campaign.schoolYear(), "Recaudación #" + id + SEPARATOR + campaign.title(),
            value, date, category, ExpensePaymentMethod.TRANSFER, clean(recipient), clean(reference),
            "Pago al proveedor de la recaudación #" + id, user);
        var movements = new ArrayList<>(campaign.movements());
        movements.add(new CollectionCampaign.Movement(requestId.toString(), null, null, expense.id(),
            value.setScale(0), date, clean(reference), clean(recipient), false));
        var updated = campaigns.save(copy(campaign, campaign.participants(), movements));
        return view(updated, ledger(campaign.schoolYear()));
    }

    private boolean repeated(CollectionCampaign campaign, UUID requestId, Long familyId, BigDecimal value,
            LocalDate date, String reference, String recipient) {
        var previous = campaign.movements().stream().filter(m -> m.requestId().equals(requestId.toString())).findFirst();
        if (previous.isEmpty()) return false;
        var m = previous.get();
        if (!Objects.equals(m.familyId(), familyId) || m.amount().compareTo(value) != 0 || !m.date().equals(date)
                || !Objects.equals(m.reference(), clean(reference)) || !Objects.equals(m.recipient(), recipient)) {
            throw error("La solicitud ya fue utilizada para otro movimiento", TreasuryErrorCode.CONFLICT);
        }
        return true;
    }

    private View view(CollectionCampaign campaign, Ledger ledger) {
        var movements = campaign.movements().stream().map(m -> {
            var income = ledger.incomes().get(m.incomeId());
            var expense = ledger.expenses().get(m.expenseId());
            boolean active = m.familyId() != null ? !m.cancelled() : income != null ? income.status() == IncomeStatus.ACTIVE
                : expense != null && expense.status() == ExpenseStatus.ACTIVE;
            BigDecimal currentAmount = income != null ? income.amount() : expense != null ? expense.amount() : m.amount();
            return new MovementView(m.requestId(), m.familyId(), m.incomeId(), m.expenseId(), currentAmount,
                m.date(), m.reference(), m.recipient(), active);
        }).toList();
        var rows = campaign.participants().stream().map(p -> {
            var paid = movements.stream().filter(m -> m.active() && p.familyId().equals(m.familyId()))
                .map(MovementView::amount).reduce(BigDecimal.ZERO, BigDecimal::add);
            var remaining = p.expectedAmount().subtract(paid).max(BigDecimal.ZERO);
            var status = p.expectedAmount().signum() == 0 ? "EXEMPT" : remaining.signum() == 0 ? "PAID"
                : paid.signum() > 0 ? "PARTIAL" : "PENDING";
            return new Row(p.familyId(), p.familyCode(), p.studentName(), p.guardian(), p.course(), p.expectedAmount(), paid, remaining, status);
        }).toList();
        var expected = rows.stream().map(Row::expected).reduce(BigDecimal.ZERO, BigDecimal::add);
        var collected = rows.stream().map(Row::paid).reduce(BigDecimal.ZERO, BigDecimal::add);
        var spent = movements.stream().filter(m -> m.active() && m.expenseId() != null)
            .map(MovementView::amount).reduce(BigDecimal.ZERO, BigDecimal::add);
        var posted = campaign.incomeId() == null ? null : ledger.incomes().get(campaign.incomeId());
        var available = campaign.incomeId() == null ? collected.subtract(spent)
            : (posted != null && posted.status() == IncomeStatus.ACTIVE ? posted.amount() : BigDecimal.ZERO).subtract(spent);
        return new View(campaign.id(), campaign.schoolYear(), campaign.title(), campaign.defaultAmount(), campaign.dueDate(), campaign.incomeId(),
            expected, collected, rows.stream().map(Row::remaining).reduce(BigDecimal.ZERO, BigDecimal::add), spent,
            available, rows, movements);
    }

    private Ledger ledger(int year) {
        var incomes = new HashMap<Long, TreasuryIncome>();
        treasury.listIncomes(year).forEach(income -> incomes.put(income.id(), income));
        var expenses = new HashMap<Long, TreasuryExpense>();
        treasury.listExpenses(year).forEach(expense -> expenses.put(expense.id(), expense));
        return new Ledger(incomes, expenses);
    }
    private CollectionCampaign require(Long id, boolean lock) {
        return campaigns.find(id, lock).orElseThrow(() -> error("Recaudación no encontrada", TreasuryErrorCode.NOT_FOUND));
    }
    private Row row(View view, Long familyId) {
        return view.families().stream().filter(f -> f.familyId().equals(familyId)).findFirst()
            .orElseThrow(() -> error("La familia no participa en esta recaudación", TreasuryErrorCode.NOT_FOUND));
    }
    private CollectionCampaign copy(CollectionCampaign c, List<CollectionCampaign.Participant> participants,
            List<CollectionCampaign.Movement> movements) {
        return new CollectionCampaign(c.id(), c.schoolYear(), c.title(), c.defaultAmount(), c.dueDate(),
            c.createdBy(), c.createdAt(), c.incomeId(), participants, movements);
    }
    private void requireOpen(CollectionCampaign campaign) {
        if (campaign.incomeId() != null) invalid("La campaña ya tiene su ingreso consolidado; los cobros están cerrados");
    }
    private void validateMovement(CollectionCampaign c, BigDecimal value, LocalDate date, String reference, UUID requestId) {
        amount(value, false);
        if (date == null || date.getYear() != c.schoolYear() || date.isAfter(LocalDate.now())) invalid("Revisa la fecha del movimiento");
        if (reference != null && reference.length() > 100) invalid("La referencia admite hasta 100 caracteres");
        if (requestId == null) invalid("Falta el identificador de la solicitud");
    }
    private void amount(BigDecimal value, boolean zeroAllowed) {
        if (value == null || value.signum() < (zeroAllowed ? 0 : 1) || value.stripTrailingZeros().scale() > 0
                || value.compareTo(new BigDecimal("99999999999999")) > 0) invalid("Usa un monto válido en pesos enteros");
    }
    private void validateYear(int year) { if (year < 2026 || year > 2035) invalid("Año escolar inválido"); }
    private String clean(String text) { return text == null || text.isBlank() ? null : text.trim(); }
    private DomainException error(String message, TreasuryErrorCode code) { return new DomainException("recaudacion", code.getStatus(), message); }
    private void invalid(String message) { throw error(message, TreasuryErrorCode.INVALID); }
    private void recordAudit(Long id, String action, String user, String detail) {
        audit.saveAudit(new TreasuryAudit(null, action, "RECAUDACION", String.valueOf(id), user, detail, LocalDateTime.now()));
    }
    private record Ledger(Map<Long, TreasuryIncome> incomes, Map<Long, TreasuryExpense> expenses) { }
    public record Row(Long familyId, String familyCode, String studentName, String guardian, String course,
            BigDecimal expected, BigDecimal paid, BigDecimal remaining, String status) { }
    public record MovementView(String requestId, Long familyId, Long incomeId, Long expenseId, BigDecimal amount,
            LocalDate date, String reference, String recipient, boolean active) { }
    public record View(Long id, int schoolYear, String title, BigDecimal defaultAmount, LocalDate dueDate, Long incomeId,
            BigDecimal expected, BigDecimal collected, BigDecimal remaining, BigDecimal spent, BigDecimal available,
            List<Row> families, List<MovementView> movements) { }
}
