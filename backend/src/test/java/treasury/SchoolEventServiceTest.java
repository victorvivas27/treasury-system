package treasury;

import com.tesoreria.shared.domain.exception.DomainException;
import com.tesoreria.stand.infrastructure.adapter.out.persistence.repository.StandJpaRepository;
import com.tesoreria.treasury.application.usecase.ManagedCourseService;
import com.tesoreria.treasury.application.usecase.SchoolEventService;
import com.tesoreria.treasury.core.model.*;
import com.tesoreria.treasury.core.port.in.TreasuryUseCase;
import com.tesoreria.treasury.infrastructure.adapter.out.persistence.entity.SchoolEventEntity;
import com.tesoreria.treasury.infrastructure.adapter.out.persistence.entity.SchoolEventExpenseEmbeddable;
import com.tesoreria.treasury.infrastructure.adapter.out.persistence.entity.SchoolEventParticipantEmbeddable;
import com.tesoreria.treasury.infrastructure.adapter.out.persistence.repository.SchoolEventJpaRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SchoolEventServiceTest {
    @Mock
    private SchoolEventJpaRepository events;
    @Mock
    private TreasuryUseCase treasury;
    @Mock
    private ManagedCourseService managedCourse;
    @Mock
    private StandJpaRepository stands;
    @InjectMocks
    private SchoolEventService service;
    private SchoolEventEntity event;

    @BeforeEach
    void setUp() {
        lenient().when(managedCourse.get()).thenReturn("1° Básico");
        lenient().when(events.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        event = new SchoolEventEntity();
        event.setId(10L);
        event.setName("Fiesta de la Familia");
        event.setSchoolYear(2026);
        event.setEventDate(LocalDate.of(2026, 9, 15));
        event.setStatus(EventStatus.EN_PREPARACION);
        event.setParticipants(new ArrayList<>(List.of(participant("1° Básico", "Hamburguesas"),
                participant("2° Básico", "Hamburguesas"),
                participant("3° Básico", "Hamburguesas"))));
        event.setExpenses(new ArrayList<>());
    }

    @Test
    void crear_deberiaGuardarCursosConfigurables() {
        SchoolEventEntity saved = service.create(" Fiesta ", 2026, LocalDate.now(), "Descripción",
                null, null, List.of(
                        new SchoolEventService.ParticipantInput("1a", "Comida", null, null, null, null),
                        new SchoolEventService.ParticipantInput("1b", "Comida", null, null, null, null)));

        assertAll(() -> assertEquals("Fiesta", saved.getName()),
                () -> assertEquals(EventStatus.BORRADOR, saved.getStatus()),
                () -> assertEquals(2, saved.getParticipants().size()),
                () -> assertEquals("1A", saved.getParticipants().get(0).getCourse()),
                () -> assertDoesNotThrow(() -> saved.getParticipants().clear()));
        verify(events).save(saved);
    }

    @Test
    void crear_deberiaRechazarCursosDuplicadosYDatosInvalidos() {
        var duplicate = List.of(
                new SchoolEventService.ParticipantInput("A", "Uno", null, null, null, null),
                new SchoolEventService.ParticipantInput(" a ", "Dos", null, null, null, null));
        assertAll(
                () -> assertThrows(DomainException.class, () -> service.create("Fiesta", 2026,
                        LocalDate.now(), null, null, null, duplicate)),
                () -> assertThrows(DomainException.class, () -> service.list(1999)));
    }

    @Test
    void actualizarYEliminar_deberiaPermitirBorradorSinMovimientos() {
        event.setStatus(EventStatus.BORRADOR);
        when(events.findById(10L)).thenReturn(Optional.of(event));
        var participants = List.of(
                new SchoolEventService.ParticipantInput("1° Básico", "Completos",
                        "Comida", null, null, null),
                new SchoolEventService.ParticipantInput("2° Básico", "Completos",
                        null, null, null, null));

        SchoolEventEntity updated = service.update(10L, "Fiesta actualizada", 2026,
                LocalDate.of(2026, 10, 1), "Nueva descripción", EventStatus.EN_PREPARACION,
                null, participants);
        updated.setStatus(EventStatus.BORRADOR);
        service.delete(10L);

        assertAll(
                () -> assertEquals("Fiesta actualizada", updated.getName()),
                () -> assertEquals(2, updated.getParticipants().size()),
                () -> assertEquals("Completos", updated.getParticipants().get(0).getStandName()),
                () -> assertDoesNotThrow(() -> updated.getParticipants().clear()));
        verify(events).deleteById(10L);
    }

    @Test
    void eliminar_deberiaBorrarFisicamenteEventoConMovimientos() {
        when(events.findById(10L)).thenReturn(Optional.of(event));
        event.setStatus(EventStatus.BORRADOR);
        event.setGrossRevenue(BigDecimal.TEN);

        service.delete(10L);

        verify(events).deleteById(10L);
        verify(events, never()).save(event);
    }

    @Test
    void eliminar_deberiaPedirEliminarPrimeroLosStands() {
        when(events.findById(10L)).thenReturn(Optional.of(event));
        when(stands.existsByEventId(10L)).thenReturn(true);
        event.setStatus(EventStatus.BORRADOR);

        DomainException error = assertThrows(DomainException.class, () -> service.delete(10L));

        assertEquals(org.springframework.http.HttpStatus.CONFLICT, error.getStatus());
        verify(events, never()).deleteById(anyLong());
    }

    @Test
    void cancelarLiquidacion_deberiaVolverUnPasoAntesDePermitirEliminar() {
        when(events.findById(10L)).thenReturn(Optional.of(event));
        event.setStatus(EventStatus.CERRADO);
        event.setSettlementConfirmed(true);
        long incomeId = 100L;
        for (SchoolEventParticipantEmbeddable participant : event.getParticipants()) {
            participant.setTransferIncomeId(incomeId++);
            participant.setTransferStatus(EventTransferStatus.TRANSFERRED);
        }

        assertThrows(DomainException.class, () -> service.delete(10L, "tesorero"));
        service.cancelSettlement(10L, "tesorero");

        assertAll(
                () -> assertEquals(EventStatus.EN_LIQUIDACION, event.getStatus()),
                () -> assertFalse(event.isSettlementConfirmed()),
                () -> assertTrue(event.getParticipants().stream()
                        .allMatch(item -> item.getTransferStatus() == EventTransferStatus.PENDING
                                && item.getTransferIncomeId() == null)));
        verify(treasury, times(3)).deleteIncome(anyLong());

        service.delete(10L, "tesorero");
        verify(events).deleteById(10L);
        verify(events).save(event);
    }

    @Test
    void gasto_deberiaValidarCursoYExcluirAnuladoDelCalculo() {
        when(events.findById(10L)).thenReturn(Optional.of(event));
        service.addExpense(10L, expense("Sonido", "60000", EventExpenseType.COMMON, null), "tesorero");
        service.addExpense(10L, expense("Ingredientes", "40000",
                EventExpenseType.COURSE, "1° Básico"), "tesorero");
        String commonKey = event.getExpenses().get(0).getKey();
        service.cancelExpense(10L, commonKey, "Duplicado", "tesorero");
        event.setGrossRevenue(new BigDecimal("900000"));

        EventSettlementCalculator.Result result = service.calculate(10L);

        assertAll(() -> assertEquals(BigDecimal.ZERO, result.commonExpenses()),
                () -> assertEquals(new BigDecimal("300000"), result.grossShare()),
                () -> assertEquals(new BigDecimal("286666"), result.courses().get(0).netProfit()),
                () -> assertEquals(new BigDecimal("286666"), result.courses().get(1).netProfit()),
                () -> assertEquals(EventExpenseStatus.CANCELLED,
                        event.getExpenses().get(0).getStatus()));
    }

    @Test
    void gastoDonado_deberiaRegistrarseSinDescontarseDeLaLiquidacion() {
        when(events.findById(10L)).thenReturn(Optional.of(event));
        event.setGrossRevenue(new BigDecimal("9000"));
        var donated = new SchoolEventService.ExpenseInput("Mantel donado", new BigDecimal("2000"),
                LocalDate.now(), EventExpenseType.COURSE, "1° Básico", "MATERIALS",
                "Apoderado", "CASH", null, "Donación del curso", false);

        service.addExpense(10L, donated, "tesorero");
        EventSettlementCalculator.Result result = service.calculate(10L);

        assertAll(
                () -> assertFalse(event.getExpenses().get(0).getDeductFromSettlement()),
                () -> assertEquals(new BigDecimal("9000"), result.distributable()),
                () -> assertEquals(new BigDecimal("3000"), result.grossShare()),
                () -> assertEquals(BigDecimal.ZERO, result.courses().get(0).expenses()));
    }

    @Test
    void gasto_deberiaRechazarAsociacionesIncompatibles() {
        when(events.findById(10L)).thenReturn(Optional.of(event));
        assertAll(
                () -> assertThrows(DomainException.class, () -> service.addExpense(10L,
                        expense("Común", "10", EventExpenseType.COMMON, "1° Básico"), "user")),
                () -> assertThrows(DomainException.class, () -> service.addExpense(10L,
                        expense("Curso", "10", EventExpenseType.COURSE, "4° Básico"), "user")));
    }

    @Test
    void gasto_deberiaPermitirEditarYAnularUnRegistroActivo() {
        when(events.findById(10L)).thenReturn(Optional.of(event));
        SchoolEventEntity created = service.addExpense(10L,
                expense("Ingredientes", "3000", EventExpenseType.COURSE, "1° Básico"), "tesorero");
        String key = created.getExpenses().get(0).getKey();

        SchoolEventEntity updated = service.updateExpense(10L, key,
                expense("Ingredientes corregidos", "3500", EventExpenseType.COURSE, "1° Básico"));
        service.cancelExpense(10L, key, "Eliminado desde el evento", "tesorero");

        SchoolEventExpenseEmbeddable changed = updated.getExpenses().get(0);
        assertAll(
                () -> assertEquals("Ingredientes corregidos", changed.getDescription()),
                () -> assertEquals(new BigDecimal("3500"), changed.getAmount()),
                () -> assertEquals(EventExpenseStatus.CANCELLED, changed.getStatus()),
                () -> assertThrows(DomainException.class, () -> service.updateExpense(10L, key,
                        expense("Otro", "4000", EventExpenseType.COURSE, "1° Básico"))));
    }

    @Test
    void gasto_deberiaEliminarFisicamenteElRegistro() {
        when(events.findById(10L)).thenReturn(Optional.of(event));
        SchoolEventEntity created = service.addExpense(10L,
                expense("Ingredientes", "3000", EventExpenseType.COURSE, "1° Básico"), "tesorero");
        String key = created.getExpenses().get(0).getKey();

        SchoolEventEntity updated = service.deleteExpense(10L, key);

        assertTrue(updated.getExpenses().isEmpty());
        verify(events, times(2)).save(event);
    }

    @Test
    void recaudacion_deberiaPermitirEditarYEliminarElRegistro() {
        when(events.findById(10L)).thenReturn(Optional.of(event));
        service.registerRevenue(10L, new BigDecimal("900000"),
                LocalDate.of(2026, 9, 15), "Recaudación inicial", "CASH", "COMP-1", "Cierre");

        service.registerRevenue(10L, new BigDecimal("850000"),
                LocalDate.of(2026, 9, 16), "Recaudación corregida", "TRANSFER", null, null);
        SchoolEventEntity deleted = service.deleteRevenue(10L);

        assertAll(
                () -> assertNull(deleted.getGrossRevenue()),
                () -> assertNull(deleted.getRevenueDate()),
                () -> assertNull(deleted.getRevenueDescription()),
                () -> assertNull(deleted.getRemainder()),
                () -> assertEquals(EventStatus.REALIZADO, deleted.getStatus()),
                () -> assertFalse(deleted.isSettlementConfirmed()),
                () -> assertTrue(deleted.getParticipants().stream()
                        .allMatch(item -> item.getTransferStatus() == EventTransferStatus.PENDING)));
        verify(events, times(3)).save(event);
    }

    @Test
    void liquidacion_deberiaRegistrarIngresosUnaSolaVez() {
        when(events.findById(10L)).thenReturn(Optional.of(event));
        service.registerRevenue(10L, new BigDecimal("901000"), LocalDate.now(),
                "Cierre", "CASH", null, null);
        service.addExpense(10L, expense("Sonido", "60000", EventExpenseType.COMMON, null), "user");
        service.addExpense(10L, expense("Ingredientes", "40000",
                EventExpenseType.COURSE, "1° Básico"), "user");
        TreasuryIncome income = mock(TreasuryIncome.class);
        when(income.id()).thenReturn(99L);
        when(treasury.createIncome(anyInt(), anyString(), any(), any(), any(), anyString(), any(),
                isNull(), anyString(), isNull(), anyString(), anyString())).thenReturn(income);

        SchoolEventEntity confirmed = service.confirm(10L, "tesorero");
        SchoolEventEntity repeated = service.confirm(10L, "tesorero");

        assertAll(() -> assertTrue(confirmed.isSettlementConfirmed()),
                () -> assertEquals(EventStatus.CERRADO, confirmed.getStatus()),
                () -> assertSame(confirmed, repeated),
                () -> assertEquals(1, confirmed.getParticipants().stream()
                        .filter(item -> item.getTransferStatus() == EventTransferStatus.TRANSFERRED).count()),
                () -> assertEquals("1° Básico", confirmed.getParticipants().stream()
                        .filter(item -> item.getTransferStatus() == EventTransferStatus.TRANSFERRED)
                        .findFirst().orElseThrow().getCourse()));
        ArgumentCaptor<String> descriptions = ArgumentCaptor.forClass(String.class);
        verify(treasury).createIncome(anyInt(), anyString(), any(), any(), any(), anyString(),
                any(), isNull(), anyString(), isNull(), anyString(), anyString());
        verify(treasury).createIncome(anyInt(), descriptions.capture(), any(), any(), any(),
                anyString(), any(), isNull(), anyString(), isNull(), anyString(), anyString());
        assertEquals(1, descriptions.getAllValues().stream().distinct().count());
    }

    @Test
    void liquidacion_deberiaPermitirRemanenteYBloquearGastosMayoresALaRecaudacion() {
        when(events.findById(10L)).thenReturn(Optional.of(event));
        event.setGrossRevenue(new BigDecimal("100000"));
        TreasuryIncome income = mock(TreasuryIncome.class);
        when(income.id()).thenReturn(99L);
        when(treasury.createIncome(anyInt(), anyString(), any(), any(), any(), anyString(), any(),
                isNull(), anyString(), isNull(), anyString(), anyString())).thenReturn(income);

        SchoolEventEntity confirmed = service.confirm(10L, "user");

        assertAll(
                () -> assertTrue(confirmed.isSettlementConfirmed()),
                () -> assertEquals(BigDecimal.ONE, confirmed.getRemainder()));

        confirmed.setSettlementConfirmed(false);
        confirmed.setStatus(EventStatus.EN_LIQUIDACION);
        event.setGrossRevenue(new BigDecimal("100000"));
        service.addExpense(10L, expense("Exceso", "120000",
                EventExpenseType.COURSE, "1° Básico"), "user");
        assertThrows(DomainException.class, () -> service.confirm(10L, "user"));
    }

    @Test
    void corregirCursoConMovimientos_deberiaConservarGastosYPermitirConfirmar() {
        when(events.findById(10L)).thenReturn(Optional.of(event));
        when(managedCourse.get()).thenReturn("1° A BÁSICO");
        event.setGrossRevenue(new BigDecimal("9000"));
        service.addExpense(10L, expense("Ingredientes", "3000", EventExpenseType.COURSE,
                "1° Básico"), "tesorero");
        service.addExpense(10L, expense("Anulado", "1000", EventExpenseType.COURSE,
                "1° Básico"), "tesorero");
        service.cancelExpense(10L, event.getExpenses().get(1).getKey(), "Duplicado", "tesorero");
        service.calculate(10L);
        assertThrows(DomainException.class, () -> service.confirm(10L, "tesorero"));

        service.update(10L, event.getName(), 2026, event.getEventDate(), null, null, null,
                correctedParticipants());

        assertAll(
                () -> assertEquals(new BigDecimal("9000"), event.getGrossRevenue()),
                () -> assertTrue(event.getExpenses().stream()
                        .allMatch(expense -> "1° A BÁSICO".equals(expense.getCourse()))),
                () -> assertEquals(EventExpenseStatus.CANCELLED, event.getExpenses().get(1).getStatus()),
                () -> assertNull(event.getRemainder()),
                () -> assertTrue(event.getParticipants().stream().allMatch(participant ->
                        participant.getGrossShare() == null && participant.getOwnExpenses() == null
                                && participant.getNetProfit() == null
                                && participant.getTransferStatus() == EventTransferStatus.PENDING)));
        TreasuryIncome income = mock(TreasuryIncome.class);
        when(income.id()).thenReturn(99L);
        when(treasury.createIncome(anyInt(), anyString(), any(), any(), any(), anyString(), any(),
                isNull(), anyString(), isNull(), anyString(), anyString())).thenReturn(income);

        service.confirm(10L, "tesorero");
        service.confirm(10L, "tesorero");

        assertTrue(event.isSettlementConfirmed());
        verify(treasury).createIncome(eq(2026), anyString(), eq(new BigDecimal("2000")), any(),
                eq(IncomeCategory.EVENT), eq("EVENT_PROFIT"), eq(IncomePaymentMethod.TRANSFER),
                isNull(), eq("1° A BÁSICO"), isNull(), anyString(), eq("tesorero"));
    }

    @Test
    void corregirCurso_deberiaRechazarEventoConfirmado() {
        when(events.findById(10L)).thenReturn(Optional.of(event));
        event.setSettlementConfirmed(true);

        assertThrows(DomainException.class, () -> service.update(10L, event.getName(), 2026,
                event.getEventDate(), null, null, null, correctedParticipants()));

        verify(events, never()).save(any());
        assertEquals("1° Básico", event.getParticipants().get(0).getCourse());
    }

    @Test
    void corregirCursosConMovimientos_deberiaRechazarCambiosAmbiguos() {
        when(events.findById(10L)).thenReturn(Optional.of(event));
        event.setGrossRevenue(BigDecimal.TEN);
        var requested = new ArrayList<>(correctedParticipants());
        requested.set(1, new SchoolEventService.ParticipantInput("2° A BÁSICO", "Hamburguesas",
                null, null, null, null));

        assertThrows(DomainException.class, () -> service.update(10L, event.getName(), 2026,
                event.getEventDate(), null, null, null, requested));

        verify(events, never()).save(any());
        assertEquals("1° Básico", event.getParticipants().get(0).getCourse());
    }

    @Test
    void ganancias_deberiaMostrarSoloEventosConfirmadosYLaParteTransferidaAlCurso() {
        event.setStatus(EventStatus.CERRADO);
        event.setSettlementConfirmed(true);
        event.getParticipants().get(0).setTransferIncomeId(99L);
        event.getParticipants().get(0).setNetProfit(new BigDecimal("125000"));
        event.getParticipants().get(1).setNetProfit(new BigDecimal("125000"));
        SchoolEventEntity second = new SchoolEventEntity();
        second.setId(11L);
        second.setName("Fiesta — Juegos");
        second.setStatus(EventStatus.CERRADO);
        second.setSettlementConfirmed(true);
        second.setEventDate(LocalDate.of(2026, 9, 16));
        var received = participant("1° A BÁSICO", "Juegos");
        received.setTransferIncomeId(100L);
        received.setNetProfit(new BigDecimal("86000"));
        second.setParticipants(List.of(received));
        SchoolEventEntity pending = new SchoolEventEntity();
        pending.setStatus(EventStatus.CERRADO);
        SchoolEventEntity cancelled = new SchoolEventEntity();
        cancelled.setStatus(EventStatus.CANCELADO);
        cancelled.setSettlementConfirmed(true);
        SchoolEventEntity draft = new SchoolEventEntity();
        draft.setStatus(EventStatus.BORRADOR);
        when(events.findBySchoolYearOrderByEventDateDesc(2026))
                .thenReturn(List.of(second, event, pending, cancelled, draft));

        var profits = service.confirmedProfits(2026);

        assertEquals(List.of(
                new SchoolEventService.EventProfit(11L, second.getName(), second.getEventDate(),
                        new BigDecimal("86000")),
                new SchoolEventService.EventProfit(10L, event.getName(), event.getEventDate(),
                        new BigDecimal("125000"))), profits);
        assertTrue(service.confirmedProfits(2027).isEmpty());
        assertThrows(DomainException.class, () -> service.confirmedProfits(1999));
        verifyNoInteractions(treasury);
    }

    private List<SchoolEventService.ParticipantInput> correctedParticipants() {
        return List.of(
                new SchoolEventService.ParticipantInput("1° A BÁSICO", "Hamburguesas", null, null, null, null),
                new SchoolEventService.ParticipantInput("2° Básico", "Hamburguesas", null, null, null, null),
                new SchoolEventService.ParticipantInput("3° Básico", "Hamburguesas", null, null, null, null));
    }

    private SchoolEventParticipantEmbeddable participant(String course, String stand) {
        SchoolEventParticipantEmbeddable value = new SchoolEventParticipantEmbeddable();
        value.setCourse(course);
        value.setStandName(stand);
        value.setTransferStatus(EventTransferStatus.PENDING);
        return value;
    }

    private SchoolEventService.ExpenseInput expense(String description, String amount,
                                                    EventExpenseType type, String course) {
        return new SchoolEventService.ExpenseInput(description, new BigDecimal(amount),
                LocalDate.now(), type, course, "MATERIALS", null, "CASH", null, null, true);
    }
}
