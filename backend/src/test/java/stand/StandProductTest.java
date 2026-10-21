package stand;

import com.tesoreria.shared.domain.exception.DomainException;
import com.tesoreria.stand.application.usecase.StandService;
import com.tesoreria.stand.application.usecase.StandService.ProductInput;
import com.tesoreria.stand.core.model.StandStatus;
import com.tesoreria.stand.infrastructure.adapter.out.persistence.entity.StandEntity;
import com.tesoreria.stand.infrastructure.adapter.out.persistence.entity.StandProductEntity;
import com.tesoreria.stand.infrastructure.adapter.out.persistence.repository.StandJpaRepository;
import com.tesoreria.stand.infrastructure.adapter.out.persistence.repository.StandProductJpaRepository;
import com.tesoreria.stand.infrastructure.adapter.out.persistence.repository.StandSaleJpaRepository;
import com.tesoreria.treasury.application.usecase.SchoolEventService;
import com.tesoreria.treasury.infrastructure.adapter.out.persistence.repository.SchoolEventJpaRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class StandProductTest {
    @Mock private StandJpaRepository stands;
    @Mock private StandProductJpaRepository products;
    @Mock private StandSaleJpaRepository sales;
    @Mock private SchoolEventJpaRepository events;
    @Mock private SchoolEventService schoolEvents;
    private StandService service;
    private StandEntity stand;

    @BeforeEach
    void setUp() {
        service = new StandService(stands, products, sales, events, schoolEvents);
        stand = new StandEntity();
        stand.setId(3L);
        stand.setStatus(StandStatus.OPEN);
    }

    private static ProductInput input(String name, BigDecimal price, BigDecimal cost,
                                      BigDecimal equivalence, Integer stock, boolean available) {
        return new ProductInput(name, "  Comida  ", "  Familiar  ", "  Unidad  ",
                equivalence, price, cost, stock, available);
    }

    private static ProductInput validInput() {
        return input("  Pizza  ", new BigDecimal("1000"), BigDecimal.ZERO, null, 10, true);
    }

    static Stream<Arguments> invalidProducts() {
        Object[][] invalid = {
                {null, BigDecimal.ONE, BigDecimal.ZERO, null, 1, "nombre"},
                {"", BigDecimal.ONE, BigDecimal.ZERO, null, 1, "nombre"},
                {"  ", BigDecimal.ONE, BigDecimal.ZERO, null, 1, "nombre"},
                {"Pizza", null, BigDecimal.ZERO, null, 1, "precio"},
                {"Pizza", BigDecimal.ZERO, BigDecimal.ZERO, null, 1, "precio"},
                {"Pizza", BigDecimal.ONE.negate(), BigDecimal.ZERO, null, 1, "precio"},
                {"Pizza", BigDecimal.ONE, null, null, 1, "costo"},
                {"Pizza", BigDecimal.ONE, BigDecimal.ONE.negate(), null, 1, "costo"},
                {"Pizza", BigDecimal.ONE, BigDecimal.ZERO, BigDecimal.ZERO, 1, "equivalencia"},
                {"Pizza", BigDecimal.ONE, BigDecimal.ZERO, BigDecimal.ONE.negate(), 1, "equivalencia"},
                {"Pizza", BigDecimal.ONE, BigDecimal.ZERO, null, -1, "stock"}
        };
        return Stream.of(false, true).flatMap(update -> Stream.of(invalid).map(values ->
                Arguments.of(update, input((String) values[0], (BigDecimal) values[1],
                        (BigDecimal) values[2], (BigDecimal) values[3], (Integer) values[4], true), values[5])));
    }

    @ParameterizedTest
    @MethodSource("invalidProducts")
    void rejectsInvalidProductsBeforeReadingOrSavingProduct(boolean update, ProductInput input, String field) {
        when(stands.findById(3L)).thenReturn(Optional.of(stand));
        var error = assertThrows(DomainException.class, () -> {
            if (update) service.updateProduct(3L, 10L, input);
            else service.addProduct(3L, input);
        });
        assertEquals(HttpStatus.BAD_REQUEST, error.getStatus());
        assertEquals(field, error.getField());
        verifyNoInteractions(products, sales, events, schoolEvents);
    }

    static Stream<Arguments> stockAvailability() {
        return Stream.of(false, true).flatMap(update -> Stream.of(
                Arguments.of(update, null, true, true), Arguments.of(update, 0, true, false),
                Arguments.of(update, 2, true, true), Arguments.of(update, 2, false, false),
                Arguments.of(update, null, false, false)));
    }

    @ParameterizedTest
    @MethodSource("stockAvailability")
    void savesNormalizedProductAndAvailabilityAccordingToStock(boolean update, Integer stock,
                                                              boolean requested, boolean expected) {
        when(stands.findById(3L)).thenReturn(Optional.of(stand));
        var existing = new StandProductEntity();
        existing.setId(10L);
        existing.setStand(stand);
        var created = LocalDateTime.of(2026, 1, 1, 0, 0);
        existing.setCreatedAt(created);
        existing.setCurrentStock(BigDecimal.ONE);
        if (update) when(products.findById(10L)).thenReturn(Optional.of(existing));
        when(products.save(any())).thenAnswer(call -> call.getArgument(0));
        var payload = input("  Pizza  ", new BigDecimal("1000.50"), BigDecimal.ZERO,
                new BigDecimal("0.125"), stock, requested);
        var result = update ? service.updateProduct(3L, 10L, payload) : service.addProduct(3L, payload);
        assertAll(() -> assertSame(stand, result.getStand()),
                () -> assertEquals("Pizza", result.getName()),
                () -> assertEquals("Comida", result.getCategory()),
                () -> assertEquals("Familiar", result.getVariant()),
                () -> assertEquals("Unidad", result.getPresentation()),
                () -> assertEquals(payload.price(), result.getPrice()),
                () -> assertEquals(BigDecimal.ZERO, result.getUnitCost()),
                () -> assertEquals(payload.unitEquivalence(), result.getUnitEquivalence()),
                () -> assertEquals(stock, result.getInitialStock()),
                () -> assertEquals(stock == null ? null : BigDecimal.valueOf(stock), result.getCurrentStock()),
                () -> assertEquals(expected, result.isAvailable()));
        if (stock == null) assertNull(result.getStockSetAt());
        else assertNotNull(result.getStockSetAt());
        if (update) {
            assertSame(existing, result);
            assertEquals(10L, result.getId());
            assertEquals(created, result.getCreatedAt());
        }
        verify(products).save(result);
        verifyNoInteractions(sales, events, schoolEvents);
    }

    @Test
    void clearsAbsentAndBlankOptionalProductFields() {
        when(stands.findById(3L)).thenReturn(Optional.of(stand));
        when(products.save(any())).thenAnswer(call -> call.getArgument(0));
        var result = service.addProduct(3L, new ProductInput("Pizza", null, "", "  ",
                null, BigDecimal.ONE, BigDecimal.ZERO, null, true));
        assertAll(() -> assertNull(result.getCategory()), () -> assertNull(result.getVariant()),
                () -> assertNull(result.getPresentation()), () -> assertNull(result.getUnitEquivalence()));
    }

    @ParameterizedTest
    @ValueSource(strings = {"add", "update", "delete"})
    void rejectsProductChangesOnClosedStand(String action) {
        stand.setStatus(StandStatus.CLOSED);
        when(stands.findById(3L)).thenReturn(Optional.of(stand));
        var error = assertThrows(DomainException.class, () -> {
            switch (action) {
                case "add" -> service.addProduct(3L, validInput());
                case "update" -> service.updateProduct(3L, 10L, validInput());
                default -> service.deleteProduct(3L, 10L);
            }
        });
        assertEquals(HttpStatus.CONFLICT, error.getStatus());
        assertEquals("estado", error.getField());
        verifyNoInteractions(products, sales, events, schoolEvents);
    }

    @Test
    void rejectsUpdateOfProductFromAnotherStandWithoutMutatingIt() {
        when(stands.findById(3L)).thenReturn(Optional.of(stand));
        var other = new StandEntity();
        other.setId(4L);
        var product = new StandProductEntity();
        product.setStand(other);
        product.setName("Original");
        product.setCurrentStock(BigDecimal.TEN);
        when(products.findById(10L)).thenReturn(Optional.of(product));
        var error = assertThrows(DomainException.class, () -> service.updateProduct(3L, 10L, validInput()));
        assertEquals(HttpStatus.NOT_FOUND, error.getStatus());
        assertEquals("Original", product.getName());
        assertEquals(BigDecimal.TEN, product.getCurrentStock());
        verify(products, never()).save(any());
        verifyNoInteractions(sales, events, schoolEvents);
    }
}
