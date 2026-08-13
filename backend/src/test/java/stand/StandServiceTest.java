package stand;

import org.jspecify.annotations.NullMarked;

import com.tesoreria.shared.domain.exception.DomainException;
import com.tesoreria.stand.application.usecase.StandService;
import com.tesoreria.stand.core.model.StandPaymentMethod;
import com.tesoreria.stand.core.model.StandSaleStatus;
import com.tesoreria.stand.core.model.StandStatus;
import com.tesoreria.stand.infrastructure.adapter.out.persistence.entity.StandEntity;
import com.tesoreria.stand.infrastructure.adapter.out.persistence.entity.StandProductEntity;
import com.tesoreria.stand.infrastructure.adapter.out.persistence.entity.StandSaleEntity;
import com.tesoreria.stand.infrastructure.adapter.out.persistence.entity.StandSaleItemEmbeddable;
import com.tesoreria.stand.infrastructure.adapter.out.persistence.repository.StandJpaRepository;
import com.tesoreria.stand.infrastructure.adapter.out.persistence.repository.StandProductJpaRepository;
import com.tesoreria.stand.infrastructure.adapter.out.persistence.repository.StandSaleJpaRepository;
import com.tesoreria.treasury.application.usecase.SchoolEventService;
import com.tesoreria.treasury.infrastructure.adapter.out.persistence.entity.SchoolEventEntity;
import com.tesoreria.treasury.infrastructure.adapter.out.persistence.repository.SchoolEventJpaRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(org.mockito.junit.jupiter.MockitoExtension.class)
@NullMarked
class StandServiceTest {
    @Mock
    StandJpaRepository stands;
    @Mock
    StandProductJpaRepository products;
    @Mock
    StandSaleJpaRepository sales;
    @Mock
    SchoolEventJpaRepository events;
    @Mock
    SchoolEventService schoolEvents;
    @InjectMocks
    StandService service;
    private SchoolEventEntity event;
    private StandEntity stand;

    @BeforeEach
    void setUp() {
        event = new SchoolEventEntity();
        event.setId(7L);
        event.setName("Fiesta familiar");
        stand = new StandEntity();
        stand.setId(3L);
        stand.setEvent(event);
        stand.setName("Cafetería");
        stand.setDate(LocalDate.of(2026, 7, 29));
        stand.setStatus(StandStatus.OPEN);
        stand.setInitialFund(new BigDecimal("20000"));
        stand.setDebitCommission(new BigDecimal("1.5"));
        stand.setCreditCommission(new BigDecimal("2.5"));
        stand.setTransferCommission(new BigDecimal("1.0"));
        stand.setPaymentMethods(new LinkedHashSet<>(
                List.of(StandPaymentMethod.CASH, StandPaymentMethod.DEBIT)));
    }

    @Test
    void create_deberiaAsociarEventoYQuedarEnPreparacion() {
        when(events.findById(7L)).thenReturn(Optional.of(event));
        when(stands.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        StandEntity result = service.create(new StandService.StandInput(
                7L, " Café ", LocalDate.now(), LocalTime.of(9, 0), LocalTime.of(18, 0),
                "Victor", BigDecimal.ZERO, Set.of(StandPaymentMethod.CASH),
                BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO));
        assertAll(() -> assertEquals(event, result.getEvent()),
                () -> assertEquals("Café", result.getName()),
                () -> assertEquals(StandStatus.PREPARATION, result.getStatus()));
    }

    @Test
    void delete_deberiaEliminarProductosYStandCuandoNoHayVentas() {
        when(stands.findById(3L)).thenReturn(Optional.of(stand));

        service.delete(3L);

        verify(products).deleteByStandId(3L);
        verify(stands).deleteById(3L);
    }

    @Test
    void delete_deberiaRechazarStandConVentas() {
        when(stands.findById(3L)).thenReturn(Optional.of(stand));
        StandSaleEntity activeSale = new StandSaleEntity();
        activeSale.setStatus(StandSaleStatus.ACTIVE);
        when(sales.findByStandIdOrderBySoldAtDesc(3L)).thenReturn(List.of(activeSale));

        DomainException error = assertThrows(DomainException.class, () -> service.delete(3L));

        assertEquals(org.springframework.http.HttpStatus.CONFLICT, error.getStatus());
        verify(sales, never()).deleteAll(any());
        verify(products, never()).deleteByStandId(anyLong());
        verify(stands, never()).deleteById(anyLong());
    }

    @Test
    void delete_deberiaEliminarCuandoTodasLasVentasEstanAnuladas() {
        when(stands.findById(3L)).thenReturn(Optional.of(stand));
        StandSaleEntity cancelledSale = new StandSaleEntity();
        cancelledSale.setStatus(StandSaleStatus.CANCELLED);
        List<StandSaleEntity> cancelledSales = List.of(cancelledSale);
        when(sales.findByStandIdOrderBySoldAtDesc(3L)).thenReturn(cancelledSales);

        service.delete(3L);

        verify(sales).deleteAll(cancelledSales);
        verify(products).deleteByStandId(3L);
        verify(stands).deleteById(3L);
    }

    @Test
    void registerSale_deberiaCalcularTotalVueltoYDescontarStock() {
        StandProductEntity product = new StandProductEntity();
        product.setId(10L);
        product.setStand(stand);
        product.setName("Café");
        product.setPrice(new BigDecimal("1500"));
        product.setUnitCost(new BigDecimal("200"));
        product.setCurrentStock(4);
        product.setAvailable(true);
        when(stands.findById(3L)).thenReturn(Optional.of(stand));
        when(products.findById(10L)).thenReturn(Optional.of(product));
        when(sales.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        StandSaleEntity result = service.registerSale(3L, new StandService.SaleInput(
                List.of(new StandService.SaleItemInput(10L, 2)), StandPaymentMethod.CASH,
                new BigDecimal("5000"), null), "admin");

        assertAll(() -> assertEquals(new BigDecimal("3000"), result.getTotal()),
                () -> assertEquals(new BigDecimal("2000"), result.getChangeAmount()),
                () -> assertEquals(2, product.getCurrentStock()),
                () -> assertEquals("admin", result.getRegisteredBy()));
        verify(products).save(product);
    }

    @Test
    void registerSale_deberiaRechazarStandCerrado() {
        stand.setStatus(StandStatus.CLOSED);
        when(stands.findById(3L)).thenReturn(Optional.of(stand));
        assertThrows(DomainException.class, () -> service.registerSale(3L,
                new StandService.SaleInput(List.of(new StandService.SaleItemInput(10L, 1)),
                        StandPaymentMethod.CASH, BigDecimal.TEN, null), "admin"));
        verify(sales, never()).save(any());
    }

    @Test
    void deleteProduct_deberiaEliminarProductoSinVentas() {
        StandProductEntity product = new StandProductEntity();
        product.setId(10L);
        product.setStand(stand);
        when(stands.findById(3L)).thenReturn(Optional.of(stand));
        when(products.findById(10L)).thenReturn(Optional.of(product));

        service.deleteProduct(3L, 10L);

        verify(products).delete(product);
    }

    @Test
    void deleteProduct_deberiaRechazarProductoConVentasActivas() {
        StandProductEntity product = new StandProductEntity();
        product.setId(10L);
        product.setStand(stand);
        StandSaleEntity activeSale = sale(StandPaymentMethod.CASH, "1500",
                item(10L, "Café", 1, "1500"));
        activeSale.setStatus(StandSaleStatus.ACTIVE);
        when(stands.findById(3L)).thenReturn(Optional.of(stand));
        when(products.findById(10L)).thenReturn(Optional.of(product));
        when(sales.findByStandIdOrderBySoldAtDesc(3L)).thenReturn(List.of(activeSale));

        assertThrows(DomainException.class, () -> service.deleteProduct(3L, 10L));

        verify(products, never()).delete(any());
    }

    @Test
    void close_deberiaConsolidarElNetoEnLaRecaudacionDelEvento() {
        StandSaleEntity cashSale = sale(StandPaymentMethod.CASH, "3000",
                item(10L, "Café", 2, "1500"));
        when(stands.findById(3L)).thenReturn(Optional.of(stand));
        when(stands.save(stand)).thenReturn(stand);
        when(sales.calculateEventNetRevenue(7L)).thenReturn(new BigDecimal("2600"));
        when(schoolEvents.get(7L)).thenReturn(event);

        service.close(3L);

        assertEquals(StandStatus.CLOSED, stand.getStatus());
        verify(schoolEvents).registerRevenue(eq(7L), eq(new BigDecimal("2600")),
                any(), eq("Recaudación automática de stands"), eq("MIXED"),
                isNull(), contains("consolidado"));
    }

    @Test
    void cancelSale_deberiaRestaurarStockYConservarAuditoria() {
        StandProductEntity product = new StandProductEntity();
        product.setId(10L);
        product.setStand(stand);
        product.setName("Café");
        product.setCurrentStock(2);
        product.setAvailable(true);
        StandSaleEntity sale = sale(StandPaymentMethod.CASH, "3000",
                item(10L, "Café", 2, "1500"));
        sale.setId(20L);
        sale.setStatus(StandSaleStatus.ACTIVE);
        when(stands.findById(3L)).thenReturn(Optional.of(stand));
        when(sales.findById(20L)).thenReturn(Optional.of(sale));
        when(products.findById(10L)).thenReturn(Optional.of(product));
        when(sales.save(sale)).thenReturn(sale);

        StandSaleEntity result = service.cancelSale(3L, 20L, "Cantidad incorrecta", "admin");

        assertAll(() -> assertEquals(StandSaleStatus.CANCELLED, result.getStatus()),
                () -> assertEquals("Cantidad incorrecta", result.getCancellationReason()),
                () -> assertEquals("admin", result.getCancelledBy()),
                () -> assertNotNull(result.getCancelledAt()),
                () -> assertEquals(4, product.getCurrentStock()));
        verify(products).save(product);
    }

    @Test
    void updateSale_deberiaAjustarStockTotalYGuardarMotivo() {
        StandProductEntity product = new StandProductEntity();
        product.setId(10L);
        product.setStand(stand);
        product.setName("Café");
        product.setPrice(new BigDecimal("1500"));
        product.setUnitCost(new BigDecimal("200"));
        product.setCurrentStock(2);
        product.setAvailable(true);
        StandSaleEntity sale = sale(StandPaymentMethod.CASH, "3000",
                item(10L, "Café", 2, "1500"));
        sale.setId(20L);
        sale.setStatus(StandSaleStatus.ACTIVE);
        when(stands.findById(3L)).thenReturn(Optional.of(stand));
        when(sales.findById(20L)).thenReturn(Optional.of(sale));
        when(products.findById(10L)).thenReturn(Optional.of(product));
        when(sales.save(sale)).thenReturn(sale);

        StandSaleEntity result = service.updateSale(3L, 20L,
                new StandService.SaleInput(List.of(new StandService.SaleItemInput(10L, 1)),
                        StandPaymentMethod.CASH, new BigDecimal("2000"), "Sin azúcar"),
                "Cantidad incorrecta", "admin");

        assertAll(() -> assertEquals(new BigDecimal("1500"), result.getTotal()),
                () -> assertEquals(new BigDecimal("500"), result.getChangeAmount()),
                () -> assertEquals(3, product.getCurrentStock()),
                () -> assertEquals("Cantidad incorrecta", result.getModificationReason()),
                () -> assertEquals("admin", result.getModifiedBy()),
                () -> assertNotNull(result.getModifiedAt()));
        verify(products, times(2)).save(product);
    }

    @Test
    void summary_deberiaCalcularCajaComisionesYUnidades() {
        StandSaleItemEmbeddable cashItem = item(10L, "Café", 2, "1500");
        StandSaleItemEmbeddable debitItem = item(11L, "Pizza", 1, "5000");
        cashItem.setPresentation("Entera");
        cashItem.setUnitEquivalence(BigDecimal.ONE);
        debitItem.setPresentation("Media");
        debitItem.setUnitEquivalence(new BigDecimal("0.5"));
        StandSaleEntity cashSale = sale(StandPaymentMethod.CASH, "3000", cashItem);
        StandSaleEntity debitSale = sale(StandPaymentMethod.DEBIT, "5000", debitItem);
        StandSaleItemEmbeddable transferItem = item(12L, "Jugo", 1, "2000");
        transferItem.setPresentation("Porción");
        transferItem.setUnitEquivalence(new BigDecimal("0.125"));
        StandSaleEntity transferSale = sale(StandPaymentMethod.TRANSFER, "2000", transferItem);
        when(stands.findById(3L)).thenReturn(Optional.of(stand));
        var saleTotals = List.of(
                saleAggregate(StandPaymentMethod.CASH, "3000", 1),
                saleAggregate(StandPaymentMethod.DEBIT, "5000", 1),
                saleAggregate(StandPaymentMethod.TRANSFER, "2000", 1));
        var itemTotals = List.of(
                itemAggregate(cashItem), itemAggregate(debitItem), itemAggregate(transferItem));
        when(sales.aggregateSales(3L)).thenReturn(saleTotals);
        when(sales.aggregateItems(3L)).thenReturn(itemTotals);
        when(products.findByStandIdOrderByNameAscVariantAsc(3L)).thenReturn(List.of());

        StandService.StandSummary result = service.summary(3L);

        assertAll(() -> assertEquals(new BigDecimal("10000"), result.totalSold()),
                () -> assertEquals(new BigDecimal("23000"), result.expectedCash()),
                () -> assertEquals(new BigDecimal("800"), result.totalCost()),
                () -> assertEquals(new BigDecimal("95.00"), result.commissions()),
                () -> assertEquals(new BigDecimal("75.00"), result.debitCommission()),
                () -> assertEquals(new BigDecimal("0.00"), result.creditCommission()),
                () -> assertEquals(new BigDecimal("20.00"), result.transferCommission()),
                () -> assertEquals(new BigDecimal("9105.00"), result.netProfit()),
                () -> assertEquals(2, result.unitsByPresentation().get("Entera")),
                () -> assertEquals(new BigDecimal("2.625"), result.equivalentUnits()),
                () -> assertEquals(3, result.saleCount()), () -> assertEquals(4, result.unitsSold()));
    }

    @Test
    void summary_deberiaMantenerCerosCuandoNoExistenVentas() {
        when(stands.findById(3L)).thenReturn(Optional.of(stand));
        when(sales.aggregateSales(3L)).thenReturn(List.of());
        when(sales.aggregateItems(3L)).thenReturn(List.of());
        when(products.findByStandIdOrderByNameAscVariantAsc(3L)).thenReturn(List.of());

        StandService.StandSummary result = service.summary(3L);

        assertAll(() -> assertEquals(BigDecimal.ZERO, result.totalSold()),
                () -> assertEquals(BigDecimal.ZERO, result.totalCost()),
                () -> assertEquals(new BigDecimal("20000"), result.expectedCash()),
                () -> assertEquals(0, result.saleCount()),
                () -> assertEquals(0, result.unitsSold()),
                () -> assertTrue(result.salesByProduct().isEmpty()));
    }

    private StandSaleItemEmbeddable item(Long id, String name, int quantity, String price) {
        StandSaleItemEmbeddable item = new StandSaleItemEmbeddable();
        item.setProductId(id);
        item.setProductName(name);
        item.setQuantity(quantity);
        item.setUnitPrice(new BigDecimal(price));
        item.setUnitCost(new BigDecimal("200"));
        item.setSubtotal(item.getUnitPrice().multiply(BigDecimal.valueOf(quantity)));
        item.setCostSubtotal(item.getUnitCost().multiply(BigDecimal.valueOf(quantity)));
        return item;
    }

    private StandSaleEntity sale(StandPaymentMethod method, String total,
                                 StandSaleItemEmbeddable item) {
        StandSaleEntity sale = new StandSaleEntity();
        sale.setStand(stand);
        sale.setPaymentMethod(method);
        sale.setTotal(new BigDecimal(total));
        sale.setItems(List.of(item));
        return sale;
    }

    private StandSaleJpaRepository.SaleAggregate saleAggregate(
            StandPaymentMethod method, String total, long count) {
        StandSaleJpaRepository.SaleAggregate aggregate = mock(StandSaleJpaRepository.SaleAggregate.class);
        when(aggregate.getPaymentMethod()).thenReturn(method);
        when(aggregate.getTotal()).thenReturn(new BigDecimal(total));
        when(aggregate.getSaleCount()).thenReturn(count);
        return aggregate;
    }

    private StandSaleJpaRepository.ItemAggregate itemAggregate(StandSaleItemEmbeddable item) {
        StandSaleJpaRepository.ItemAggregate aggregate = mock(StandSaleJpaRepository.ItemAggregate.class);
        when(aggregate.getProductName()).thenReturn(item.getProductName());
        when(aggregate.getCategory()).thenReturn(item.getCategory());
        when(aggregate.getVariant()).thenReturn(item.getVariant());
        when(aggregate.getPresentation()).thenReturn(item.getPresentation());
        when(aggregate.getUnits()).thenReturn((long) item.getQuantity());
        when(aggregate.getTotal()).thenReturn(item.getSubtotal());
        when(aggregate.getCost()).thenReturn(item.getCostSubtotal());
        BigDecimal equivalent = item.getUnitEquivalence() == null ? BigDecimal.ZERO
                : item.getUnitEquivalence().multiply(BigDecimal.valueOf(item.getQuantity()));
        when(aggregate.getEquivalentUnits()).thenReturn(equivalent);
        return aggregate;
    }
}
