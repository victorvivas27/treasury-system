package com.tesoreria.stand.application.usecase;

import com.tesoreria.shared.domain.exception.DomainException;
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
import com.tesoreria.treasury.infrastructure.adapter.out.persistence.repository.SchoolEventJpaRepository;
import org.jspecify.annotations.NullMarked;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.*;
import java.util.stream.Collectors;

@Transactional
@NullMarked
@SuppressWarnings({"PMD.AvoidDuplicateLiterals", "PMD.AvoidInstantiatingObjectsInLoops"})
public class StandService {
    private static final BigDecimal ONE_HUNDRED = new BigDecimal("100");
    private static final BigDecimal HALF_UNIT = new BigDecimal("0.5");
    private static final BigDecimal PORTION_UNIT = new BigDecimal("0.125");
    private final StandJpaRepository stands;
    private final StandProductJpaRepository products;
    private final StandSaleJpaRepository sales;
    private final SchoolEventJpaRepository events;
    private final SchoolEventService schoolEvents;

    public StandService(StandJpaRepository stands, StandProductJpaRepository products,
                        StandSaleJpaRepository sales, SchoolEventJpaRepository events,
                        SchoolEventService schoolEvents) {
        this.stands = stands;
        this.products = products;
        this.sales = sales;
        this.events = events;
        this.schoolEvents = schoolEvents;
    }

    @Transactional(readOnly = true)
    public List<StandEntity> list(Long eventId) {
        if (!events.existsById(eventId)) throw notFound("evento", "Evento no encontrado");
        return stands.findByEventIdOrderByDateDesc(eventId);
    }

    @Transactional(readOnly = true)
    public StandEntity get(Long id) {
        return stands.findById(id).orElseThrow(() -> notFound("stand", "Stand no encontrado"));
    }

    public StandEntity create(StandInput input) {
        validateInput(input);
        if (stands.existsByEventIdAndNameIgnoreCase(input.eventId(), input.name().trim())) {
            throw conflict("nombre", "Ya existe un stand con ese nombre para el evento");
        }
        StandEntity value = new StandEntity();
        value.setEvent(events.findById(input.eventId())
                .orElseThrow(() -> notFound("evento", "Evento no encontrado")));
        apply(value, input);
        value.setStatus(StandStatus.PREPARATION);
        return stands.save(value);
    }

    public StandEntity update(Long id, StandInput input) {
        validateInput(input);
        StandEntity value = get(id);
        ensureNotClosed(value);
        if (!value.getEvent().getId().equals(input.eventId())) {
            throw invalid("evento", "No se puede cambiar el evento asociado al stand");
        }
        if (stands.existsByEventIdAndNameIgnoreCaseAndIdNot(
                input.eventId(), input.name().trim(), id)) {
            throw conflict("nombre", "Ya existe un stand con ese nombre para el evento");
        }
        apply(value, input);
        return stands.save(value);
    }

    public void delete(Long id) {
        get(id);
        List<StandSaleEntity> standSales = sales.findByStandIdOrderBySoldAtDesc(id);
        if (standSales.stream().anyMatch(sale -> sale.getStatus() != StandSaleStatus.CANCELLED)) {
            throw conflict("stand",
                    "Anula todas las ventas activas antes de eliminar el stand");
        }
        sales.deleteAll(standSales);
        products.deleteByStandId(id);
        stands.deleteById(id);
    }

    public StandProductEntity addProduct(Long standId, ProductInput input) {
        StandEntity stand = get(standId);
        ensureNotClosed(stand);
        validateProduct(input);
        StandProductEntity product = new StandProductEntity();
        product.setStand(stand);
        apply(product, input, true);
        return products.save(product);
    }

    public StandProductEntity updateProduct(Long standId, Long productId, ProductInput input) {
        StandEntity stand = get(standId);
        ensureNotClosed(stand);
        validateProduct(input);
        StandProductEntity product = product(standId, productId);
        apply(product, input, false);
        return products.save(product);
    }

    public void deleteProduct(Long standId, Long productId) {
        StandEntity stand = get(standId);
        ensureNotClosed(stand);
        StandProductEntity product = product(standId, productId);
        boolean usedInActiveSale = sales.findByStandIdOrderBySoldAtDesc(standId).stream()
                .filter(sale -> sale.getStatus() != StandSaleStatus.CANCELLED)
                .flatMap(sale -> sale.getItems().stream())
                .anyMatch(item -> item.getProductId().equals(productId));
        if (usedInActiveSale) {
            throw conflict("producto",
                    "No puedes eliminar un producto con ventas activas; puedes marcarlo no disponible");
        }
        products.delete(product);
    }

    @Transactional(readOnly = true)
    public List<StandProductEntity> listProducts(Long standId) {
        get(standId);
        return products.findByStandIdOrderByNameAscVariantAsc(standId);
    }

    public StandEntity open(Long id) {
        StandEntity stand = get(id);
        if (stand.getStatus() != StandStatus.PREPARATION) {
            throw conflict("estado", "Solo un stand en preparación puede abrirse");
        }
        if (stand.getPaymentMethods().isEmpty()) {
            throw invalid("metodosPago", "Configura al menos un método de pago");
        }
        if (products.findByStandIdOrderByNameAscVariantAsc(id).isEmpty()) {
            throw invalid("productos", "Agrega al menos un producto antes de abrir");
        }
        stand.setStatus(StandStatus.OPEN);
        return stands.save(stand);
    }

    public StandEntity close(Long id) {
        StandEntity stand = get(id);
        if (stand.getStatus() != StandStatus.OPEN) {
            throw conflict("estado", "Solo un stand abierto puede cerrarse");
        }
        stand.setStatus(StandStatus.CLOSED);
        StandEntity closed = stands.save(stand);
        synchronizeEventRevenue(closed.getEvent().getId(), closed.getDate());
        return closed;
    }

    public StandEntity reopen(Long id) {
        StandEntity stand = get(id);
        if (stand.getStatus() != StandStatus.CLOSED) {
            throw conflict("estado", "Solo un stand cerrado puede reabrirse");
        }
        stand.setStatus(StandStatus.OPEN);
        StandEntity reopened = stands.save(stand);
        synchronizeEventRevenue(reopened.getEvent().getId(), reopened.getDate());
        return reopened;
    }

    public StandSaleEntity registerSale(Long standId, SaleInput input, String registeredBy) {
        StandEntity stand = get(standId);
        if (stand.getStatus() != StandStatus.OPEN) {
            throw conflict("estado", "El stand debe estar abierto para registrar ventas");
        }
        if (!stand.getPaymentMethods().contains(input.paymentMethod())) {
            throw invalid("metodoPago", "El método de pago no está habilitado");
        }
        if (input.items() == null || input.items().isEmpty()) {
            throw invalid("productos", "La venta debe incluir al menos un producto");
        }
        Set<Long> uniqueIds = new HashSet<>();
        List<StandSaleItemEmbeddable> saleItems = new ArrayList<>();
        BigDecimal total = BigDecimal.ZERO;
        for (SaleItemInput item : input.items()) {
            if (item.quantity() <= 0 || !uniqueIds.add(item.productId())) {
                throw invalid("productos", "Los productos deben ser únicos y tener cantidad positiva");
            }
            StandProductEntity product = product(standId, item.productId());
            if (!product.isAvailable()) throw conflict("producto", "El producto no está disponible");
            consumeStock(standId, product, item.quantity());
            StandSaleItemEmbeddable saleItem = new StandSaleItemEmbeddable();
            saleItem.setProductId(product.getId());
            saleItem.setProductName(product.getName());
            saleItem.setCategory(product.getCategory());
            saleItem.setVariant(product.getVariant());
            saleItem.setPresentation(product.getPresentation());
            saleItem.setUnitEquivalence(product.getUnitEquivalence());
            saleItem.setQuantity(item.quantity());
            saleItem.setUnitPrice(product.getPrice());
            saleItem.setUnitCost(product.getUnitCost());
            saleItem.setSubtotal(product.getPrice().multiply(BigDecimal.valueOf(item.quantity())));
            saleItem.setCostSubtotal(product.getUnitCost()
                    .multiply(BigDecimal.valueOf(item.quantity())));
            total = total.add(saleItem.getSubtotal());
            saleItems.add(saleItem);
        }
        BigDecimal received = input.amountReceived();
        BigDecimal change = null;
        if (input.paymentMethod() == StandPaymentMethod.CASH) {
            if (received == null || received.compareTo(total) < 0) {
                throw invalid("montoRecibido", "El monto recibido no puede ser menor al total");
            }
            change = received.subtract(total);
        } else if (received != null) {
            throw invalid("montoRecibido", "El monto recibido solo corresponde a pagos en efectivo");
        }
        StandSaleEntity sale = new StandSaleEntity();
        sale.setStand(stand);
        sale.setItems(saleItems);
        sale.setPaymentMethod(input.paymentMethod());
        sale.setTotal(total);
        sale.setAmountReceived(received);
        sale.setChangeAmount(change);
        sale.setObservation(clean(input.observation()));
        sale.setRegisteredBy(registeredBy == null ? "system" : registeredBy);
        sale.setSoldAt(LocalDateTime.now());
        sale.setStatus(StandSaleStatus.ACTIVE);
        return sales.save(sale);
    }

    public StandSaleEntity cancelSale(Long standId, Long saleId, String reason,
                                      String cancelledBy) {
        StandEntity stand = get(standId);
        if (reason == null || reason.isBlank()) {
            throw invalid("motivo", "El motivo de anulación es obligatorio");
        }
        StandSaleEntity sale = sales.findById(saleId)
                .orElseThrow(() -> notFound("venta", "Venta no encontrada"));
        if (!sale.getStand().getId().equals(standId)) {
            throw notFound("venta", "Venta no encontrada en el stand");
        }
        if (sale.getStatus() == StandSaleStatus.CANCELLED) {
            throw conflict("venta", "La venta ya está anulada");
        }
        for (StandSaleItemEmbeddable item : sale.getItems()) {
            restoreStock(standId, product(standId, item.getProductId()),
                    item.getUnitEquivalence(), item.getQuantity(), effectiveStockDate(sale));
        }
        sale.setStatus(StandSaleStatus.CANCELLED);
        sale.setCancelledAt(LocalDateTime.now());
        sale.setCancelledBy(cancelledBy == null ? "system" : cancelledBy);
        sale.setCancellationReason(reason.trim());
        StandSaleEntity cancelled = sales.save(sale);
        if (stand.getStatus() == StandStatus.CLOSED) {
            synchronizeEventRevenue(stand.getEvent().getId(), stand.getDate());
        }
        return cancelled;
    }

    public void deleteCancelledSale(Long standId, Long saleId) {
        get(standId);
        StandSaleEntity sale = sales.findById(saleId)
                .orElseThrow(() -> notFound("venta", "Venta no encontrada"));
        if (!sale.getStand().getId().equals(standId)) {
            throw notFound("venta", "Venta no encontrada en el stand");
        }
        if (sale.getStatus() != StandSaleStatus.CANCELLED) {
            throw conflict("venta", "Solo puedes eliminar definitivamente una venta anulada");
        }
        sales.delete(sale);
    }

    public StandSaleEntity updateSale(Long standId, Long saleId, SaleInput input,
                                      String reason, String modifiedBy) {
        StandEntity stand = get(standId);
        if (reason == null || reason.isBlank()) {
            throw invalid("motivo", "El motivo de modificación es obligatorio");
        }
        StandSaleEntity sale = sales.findById(saleId)
                .orElseThrow(() -> notFound("venta", "Venta no encontrada"));
        if (!sale.getStand().getId().equals(standId)) {
            throw notFound("venta", "Venta no encontrada en el stand");
        }
        if (sale.getStatus() == StandSaleStatus.CANCELLED) {
            throw conflict("venta", "Una venta anulada no puede modificarse");
        }
        if (!stand.getPaymentMethods().contains(input.paymentMethod())) {
            throw invalid("metodoPago", "El método de pago no está habilitado");
        }
        if (input.items() == null || input.items().isEmpty()) {
            throw invalid("productos", "La venta debe incluir al menos un producto");
        }
        restoreStock(standId, sale.getItems(), effectiveStockDate(sale));
        SaleCalculation calculation = calculateSale(standId, input);
        sale.setItems(calculation.items());
        sale.setPaymentMethod(input.paymentMethod());
        sale.setTotal(calculation.total());
        sale.setAmountReceived(calculation.amountReceived());
        sale.setChangeAmount(calculation.change());
        sale.setObservation(clean(input.observation()));
        sale.setModifiedAt(LocalDateTime.now());
        sale.setModifiedBy(modifiedBy == null ? "system" : modifiedBy);
        sale.setModificationReason(reason.trim());
        StandSaleEntity updated = sales.save(sale);
        if (stand.getStatus() == StandStatus.CLOSED) {
            synchronizeEventRevenue(stand.getEvent().getId(), stand.getDate());
        }
        return updated;
    }

    @Transactional(readOnly = true)
    public List<StandSaleEntity> listSales(Long standId) {
        get(standId);
        return sales.findByStandIdOrderBySoldAtDesc(standId);
    }

    @Transactional(readOnly = true)
    public StandSummary summary(Long standId) {
        StandEntity stand = get(standId);
        Map<StandPaymentMethod, BigDecimal> byMethod = Arrays.stream(StandPaymentMethod.values())
                .collect(Collectors.toMap(method -> method, method -> BigDecimal.ZERO,
                        (left, right) -> left, LinkedHashMap::new));
        List<StandSaleJpaRepository.SaleAggregate> saleTotals = sales.aggregateSales(standId);
        saleTotals.forEach(value -> byMethod.put(value.getPaymentMethod(), value.getTotal()));
        BigDecimal total = byMethod.values().stream().reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal debitCommission = commission(byMethod.get(StandPaymentMethod.DEBIT), stand.getDebitCommission());
        BigDecimal creditCommission = commission(byMethod.get(StandPaymentMethod.CREDIT), stand.getCreditCommission());
        BigDecimal transferCommission = commission(byMethod.get(StandPaymentMethod.TRANSFER), stand.getTransferCommission());
        BigDecimal commissions = debitCommission.add(creditCommission).add(transferCommission);
        BigDecimal totalCost = BigDecimal.ZERO;
        int units = 0;
        Map<String, ProductSummary> productTotals = new LinkedHashMap<>();
        Map<String, BigDecimal> categoryTotals = new LinkedHashMap<>();
        Map<String, BigDecimal> variantTotals = new LinkedHashMap<>();
        Map<String, BigDecimal> equivalentUnitsByVariant = new LinkedHashMap<>();
        Map<String, Integer> unitsByPresentation = new LinkedHashMap<>();
        BigDecimal equivalentUnits = BigDecimal.ZERO;
        for (StandSaleJpaRepository.ItemAggregate item : sales.aggregateItems(standId)) {
            String key = item.getProductName() + "|" + Objects.toString(item.getCategory(), "")
                    + "|" + Objects.toString(item.getVariant(), "");
            productTotals.compute(key, (ignored, current) -> current == null
                    ? new ProductSummary(item.getProductName(), item.getCategory(), item.getVariant(),
                    Math.toIntExact(item.getUnits()), item.getTotal(), item.getCost(), item.getTotal().subtract(item.getCost()))
                    : new ProductSummary(current.product(), current.category(), current.variant(),
                    current.units() + Math.toIntExact(item.getUnits()), current.total().add(item.getTotal()),
                    current.cost().add(item.getCost()), current.profit().add(item.getTotal().subtract(item.getCost()))));
            categoryTotals.merge(Objects.toString(item.getCategory(), "Sin categoría"), item.getTotal(), BigDecimal::add);
            String variant = Objects.toString(item.getVariant(), "Sin variante");
            variantTotals.merge(variant, item.getTotal(), BigDecimal::add);
            equivalentUnitsByVariant.merge(variant, item.getEquivalentUnits(), BigDecimal::add);
            if (item.getPresentation() != null) {
                unitsByPresentation.merge(item.getPresentation(), Math.toIntExact(item.getUnits()), Integer::sum);
            }
            equivalentUnits = equivalentUnits.add(item.getEquivalentUnits());
            totalCost = totalCost.add(item.getCost());
            units += Math.toIntExact(item.getUnits());
        }
        List<StockAlert> alerts = products.findByStandIdOrderByNameAscVariantAsc(standId).stream()
                .filter(product -> product.getCurrentStock() != null)
                .map(product -> new StockAlert(product.getId(), product.getName(), product.getVariant(),
                        product.getInitialStock(), product.getCurrentStock(),
                        product.getCurrentStock().signum() == 0)).toList();
        BigDecimal cashExpected = stand.getInitialFund().add(byMethod.get(StandPaymentMethod.CASH));
        int saleCount = Math.toIntExact(saleTotals.stream()
                .mapToLong(StandSaleJpaRepository.SaleAggregate::getSaleCount).sum());
        return new StandSummary(total, byMethod, cashExpected, stand.getInitialFund(), totalCost,
                commissions, debitCommission, creditCommission, transferCommission,
                total.subtract(totalCost).subtract(commissions), saleCount, units,
                new ArrayList<>(productTotals.values()), categoryTotals, variantTotals, alerts,
                unitsByPresentation, equivalentUnits, equivalentUnitsByVariant);
    }

    private void apply(StandEntity value, StandInput input) {
        value.setName(input.name().trim());
        value.setDate(input.date());
        value.setStartTime(input.startTime());
        value.setEndTime(input.endTime());
        value.setResponsible(input.responsible().trim());
        value.setInitialFund(input.initialFund());
        value.setPaymentMethods(new LinkedHashSet<>(input.paymentMethods()));
        value.setDebitCommission(input.debitCommission());
        value.setCreditCommission(input.creditCommission());
        value.setTransferCommission(input.transferCommission());
    }

    private void apply(StandProductEntity value, ProductInput input, boolean creating) {
        value.setName(input.name().trim());
        value.setCategory(clean(input.category()));
        value.setVariant(clean(input.variant()));
        value.setPresentation(clean(input.presentation()));
        value.setUnitEquivalence(input.unitEquivalence());
        value.setPrice(input.price());
        value.setUnitCost(input.unitCost());
        if (creating) {
            value.setInitialStock(input.stock());
            value.setCurrentStock(input.stock() == null ? null : BigDecimal.valueOf(input.stock()));
            value.setStockSetAt(input.stock() == null ? null : LocalDateTime.now());
        } else {
            value.setInitialStock(input.stock());
            value.setCurrentStock(input.stock() == null ? null : BigDecimal.valueOf(input.stock()));
            value.setStockSetAt(input.stock() == null ? null : LocalDateTime.now());
        }
        value.setAvailable(input.available()
                && (value.getCurrentStock() == null || value.getCurrentStock().signum() > 0));
    }

    private void validateInput(StandInput input) {
        if (input.name() == null || input.name().isBlank()) throw invalid("nombre", "Nombre requerido");
        if (input.responsible() == null || input.responsible().isBlank()) {
            throw invalid("responsable", "Responsable requerido");
        }
        if (input.date() == null || input.startTime() == null || input.endTime() == null) {
            throw invalid("horario", "Fecha y horario son requeridos");
        }
        if (!input.endTime().isAfter(input.startTime())) {
            throw invalid("horario", "La hora de término debe ser posterior al inicio");
        }
        if (input.initialFund() == null || input.initialFund().signum() < 0
                || input.debitCommission() == null || input.debitCommission().signum() < 0
                || input.creditCommission() == null || input.creditCommission().signum() < 0
                || input.transferCommission() == null || input.transferCommission().signum() < 0) {
            throw invalid("montos", "Fondos y comisiones no pueden ser negativos");
        }
        if (input.paymentMethods() == null || input.paymentMethods().isEmpty()) {
            throw invalid("metodosPago", "Selecciona al menos un método de pago");
        }
    }

    private void validateProduct(ProductInput input) {
        if (input.name() == null || input.name().isBlank()) {
            throw invalid("nombre", "Nombre del producto requerido");
        }
        if (input.price() == null || input.price().signum() <= 0) {
            throw invalid("precio", "El precio debe ser mayor que cero");
        }
        if (input.unitCost() == null || input.unitCost().signum() < 0) {
            throw invalid("costo", "El costo unitario no puede ser negativo");
        }
        if (input.unitEquivalence() != null && input.unitEquivalence().signum() <= 0) {
            throw invalid("equivalencia", "La equivalencia debe ser mayor que cero");
        }
        if (input.stock() != null && input.stock() < 0) {
            throw invalid("stock", "El stock no puede ser negativo");
        }
    }

    private StandProductEntity product(Long standId, Long productId) {
        StandProductEntity value = products.findById(productId)
                .orElseThrow(() -> notFound("producto", "Producto no encontrado"));
        if (!value.getStand().getId().equals(standId)) {
            throw notFound("producto", "Producto no encontrado en el stand");
        }
        return value;
    }

    private void restoreStock(Long standId, List<StandSaleItemEmbeddable> items,
                              LocalDateTime saleDate) {
        for (StandSaleItemEmbeddable item : items) {
            restoreStock(standId, product(standId, item.getProductId()),
                    item.getUnitEquivalence(), item.getQuantity(), saleDate);
        }
    }

    private SaleCalculation calculateSale(Long standId, SaleInput input) {
        Set<Long> uniqueIds = new HashSet<>();
        List<StandSaleItemEmbeddable> saleItems = new ArrayList<>();
        BigDecimal total = BigDecimal.ZERO;
        for (SaleItemInput item : input.items()) {
            if (item.quantity() <= 0 || !uniqueIds.add(item.productId())) {
                throw invalid("productos", "Los productos deben ser únicos y tener cantidad positiva");
            }
            StandProductEntity product = product(standId, item.productId());
            consumeStock(standId, product, item.quantity());
            StandSaleItemEmbeddable saleItem = new StandSaleItemEmbeddable();
            saleItem.setProductId(product.getId());
            saleItem.setProductName(product.getName());
            saleItem.setCategory(product.getCategory());
            saleItem.setVariant(product.getVariant());
            saleItem.setPresentation(product.getPresentation());
            saleItem.setUnitEquivalence(product.getUnitEquivalence());
            saleItem.setQuantity(item.quantity());
            saleItem.setUnitPrice(product.getPrice());
            saleItem.setUnitCost(product.getUnitCost());
            saleItem.setSubtotal(product.getPrice().multiply(BigDecimal.valueOf(item.quantity())));
            saleItem.setCostSubtotal(product.getUnitCost()
                    .multiply(BigDecimal.valueOf(item.quantity())));
            total = total.add(saleItem.getSubtotal());
            saleItems.add(saleItem);
        }
        BigDecimal received = input.amountReceived();
        BigDecimal change = null;
        if (input.paymentMethod() == StandPaymentMethod.CASH) {
            if (received == null || received.compareTo(total) < 0) {
                throw invalid("montoRecibido", "El monto recibido no puede ser menor al total");
            }
            change = received.subtract(total);
        } else if (received != null) {
            throw invalid("montoRecibido", "El monto recibido solo corresponde a pagos en efectivo");
        }
        return new SaleCalculation(saleItems, total, received, change);
    }

    private void consumeStock(Long standId, StandProductEntity product, int quantity) {
        StandProductEntity inventory = inventoryProduct(standId, product);
        if (inventory == null || inventory.getCurrentStock() == null) return;
        BigDecimal required = equivalence(product).multiply(BigDecimal.valueOf(quantity));
        if (inventory.getCurrentStock().compareTo(required) < 0) {
            throw conflict("stock", "Stock insuficiente para " + product.getName()
                    + "; quedan " + inventory.getCurrentStock().stripTrailingZeros().toPlainString()
                    + " pizzas enteras equivalentes");
        }
        inventory.setCurrentStock(inventory.getCurrentStock().subtract(required));
        inventory.setAvailable(inventory.getCurrentStock().signum() > 0);
        products.save(inventory);
    }

    private void restoreStock(Long standId, StandProductEntity product,
                              BigDecimal saleEquivalence, int quantity, LocalDateTime saleDate) {
        StandProductEntity inventory = inventoryProduct(standId, product);
        if (inventory == null || inventory.getCurrentStock() == null) return;
        if (inventory.getStockSetAt() != null && saleDate.isBefore(inventory.getStockSetAt())) return;
        BigDecimal restored = (saleEquivalence == null ? equivalence(product) : saleEquivalence)
                .multiply(BigDecimal.valueOf(quantity));
        inventory.setCurrentStock(inventory.getCurrentStock().add(restored));
        inventory.setAvailable(true);
        products.save(inventory);
    }

    private StandProductEntity inventoryProduct(Long standId, StandProductEntity product) {
        if (product.getUnitEquivalence() == null
                || product.getUnitEquivalence().compareTo(BigDecimal.ONE) == 0) {
            return product.getCurrentStock() == null ? null : product;
        }
        if (product.getVariant() == null || product.getVariant().isBlank()) return null;
        return products.findByStandIdOrderByNameAscVariantAsc(standId).stream()
                .filter(candidate -> candidate.getCurrentStock() != null)
                .filter(candidate -> candidate.getVariant() != null
                        && candidate.getVariant().trim().equalsIgnoreCase(product.getVariant().trim()))
                .filter(candidate -> equivalence(candidate).compareTo(BigDecimal.ONE) == 0)
                .findFirst().orElse(null);
    }

    private BigDecimal equivalence(StandProductEntity product) {
        if (product.getPresentation() != null) {
            BigDecimal normalized = switch (product.getPresentation().trim().toLowerCase(Locale.ROOT)) {
                case "entera" -> BigDecimal.ONE;
                case "media" -> HALF_UNIT;
                case "porción", "porcion" -> PORTION_UNIT;
                default -> null;
            };
            if (normalized != null) return normalized;
        }
        return product.getUnitEquivalence() == null ? BigDecimal.ONE : product.getUnitEquivalence();
    }

    private LocalDateTime effectiveStockDate(StandSaleEntity sale) {
        return sale.getModifiedAt() == null ? sale.getSoldAt() : sale.getModifiedAt();
    }

    private void ensureNotClosed(StandEntity stand) {
        if (stand.getStatus() == StandStatus.CLOSED) {
            throw conflict("estado", "El stand cerrado no admite modificaciones");
        }
    }

    private BigDecimal commission(BigDecimal amount, BigDecimal percentage) {
        return amount.multiply(percentage).divide(ONE_HUNDRED, 2, RoundingMode.HALF_UP);
    }

    private void synchronizeEventRevenue(Long eventId, LocalDate revenueDate) {
        var schoolEvent = schoolEvents.get(eventId);
        BigDecimal total = sales.calculateEventNetRevenue(eventId)
                .setScale(0, RoundingMode.HALF_UP);
        if (total.signum() > 0) {
            schoolEvents.registerRevenue(eventId, total, revenueDate,
                    "Recaudación automática de stands", "MIXED", null,
                    "Total neto consolidado de los stands cerrados del evento");
        } else if (schoolEvent.getGrossRevenue() != null) {
            schoolEvents.deleteRevenue(eventId);
        }
    }

    private String clean(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private DomainException invalid(String field, String message) {
        return new DomainException(field, HttpStatus.BAD_REQUEST, message);
    }

    private DomainException conflict(String field, String message) {
        return new DomainException(field, HttpStatus.CONFLICT, message);
    }

    private DomainException notFound(String field, String message) {
        return new DomainException(field, HttpStatus.NOT_FOUND, message);
    }

    public record StandInput(Long eventId, String name, LocalDate date, LocalTime startTime,
                             LocalTime endTime, String responsible, BigDecimal initialFund,
                             Set<StandPaymentMethod> paymentMethods, BigDecimal debitCommission,
                             BigDecimal creditCommission, BigDecimal transferCommission) {
    }

    public record ProductInput(String name, String category, String variant, String presentation,
                               BigDecimal unitEquivalence, BigDecimal price, BigDecimal unitCost, Integer stock,
                               boolean available) {
    }

    public record SaleItemInput(Long productId, int quantity) {
    }

    public record SaleInput(List<SaleItemInput> items, StandPaymentMethod paymentMethod,
                            BigDecimal amountReceived, String observation) {
    }

    private record SaleCalculation(List<StandSaleItemEmbeddable> items, BigDecimal total,
                                   BigDecimal amountReceived, BigDecimal change) {
    }

    public record ProductSummary(String product, String category, String variant, int units,
                                 BigDecimal total, BigDecimal cost, BigDecimal profit) {
    }

    public record StockAlert(Long productId, String product, String variant, Integer initialStock,
                             BigDecimal stock, boolean soldOut) {
    }

    public record StandSummary(BigDecimal totalSold,
                               Map<StandPaymentMethod, BigDecimal> salesByPaymentMethod, BigDecimal expectedCash,
                               BigDecimal initialFund, BigDecimal totalCost, BigDecimal commissions,
                               BigDecimal debitCommission, BigDecimal creditCommission, BigDecimal transferCommission,
                               BigDecimal netProfit,
                               int saleCount, int unitsSold, List<ProductSummary> salesByProduct,
                               Map<String, BigDecimal> salesByCategory, Map<String, BigDecimal> salesByVariant,
                               List<StockAlert> stockAlerts, Map<String, Integer> unitsByPresentation,
                               BigDecimal equivalentUnits, Map<String, BigDecimal> equivalentUnitsByVariant) {
    }
}
