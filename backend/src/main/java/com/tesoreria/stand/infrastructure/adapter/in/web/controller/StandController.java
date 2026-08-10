package com.tesoreria.stand.infrastructure.adapter.in.web.controller;

import com.tesoreria.shared.infrastructure.constant.ApiConstants;
import com.tesoreria.stand.application.usecase.StandService;
import com.tesoreria.stand.core.model.*;
import com.tesoreria.stand.infrastructure.adapter.out.persistence.entity.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.security.Principal;
import java.time.*;
import java.util.*;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping(ApiConstants.TREASURY + "/stands")
public class StandController {
  private final StandService service;

  public StandController(StandService service) {
    this.service = service;
  }

  @GetMapping
  public List<StandResponse> list(@RequestParam Long eventId) {
    return service.list(eventId).stream().map(this::standResponse).toList();
  }

  @GetMapping("/{id}")
  public StandResponse get(@PathVariable Long id) {
    return standResponse(service.get(id));
  }

  @PostMapping
  public ResponseEntity<StandResponse> create(@Valid @RequestBody StandRequest request) {
    return ResponseEntity.status(HttpStatus.CREATED)
        .body(standResponse(service.create(input(request))));
  }

  @PutMapping("/{id}")
  public StandResponse update(@PathVariable Long id,
      @Valid @RequestBody StandRequest request) {
    return standResponse(service.update(id, input(request)));
  }

  @DeleteMapping("/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void delete(@PathVariable Long id) {
    service.delete(id);
  }

  @GetMapping("/{id}/productos")
  public List<ProductResponse> products(@PathVariable Long id) {
    return service.listProducts(id).stream().map(this::productResponse).toList();
  }

  @PostMapping("/{id}/productos")
  public ResponseEntity<ProductResponse> addProduct(@PathVariable Long id,
      @Valid @RequestBody ProductRequest request) {
    return ResponseEntity.status(HttpStatus.CREATED)
        .body(productResponse(service.addProduct(id, productInput(request))));
  }

  @PutMapping("/{id}/productos/{productId}")
  public ProductResponse updateProduct(@PathVariable Long id, @PathVariable Long productId,
      @Valid @RequestBody ProductRequest request) {
    return productResponse(service.updateProduct(id, productId, productInput(request)));
  }

  @DeleteMapping("/{id}/productos/{productId}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void deleteProduct(@PathVariable Long id, @PathVariable Long productId) {
    service.deleteProduct(id, productId);
  }

  @PostMapping("/{id}/abrir")
  public StandResponse open(@PathVariable Long id) {
    return standResponse(service.open(id));
  }

  @PostMapping("/{id}/cerrar")
  public StandResponse close(@PathVariable Long id) {
    return standResponse(service.close(id));
  }

  @PostMapping("/{id}/reabrir")
  public StandResponse reopen(@PathVariable Long id) {
    return standResponse(service.reopen(id));
  }

  @GetMapping("/{id}/ventas")
  public List<SaleResponse> sales(@PathVariable Long id) {
    return service.listSales(id).stream().map(this::saleResponse).toList();
  }

  @PostMapping("/{id}/ventas")
  public ResponseEntity<SaleResponse> sale(@PathVariable Long id,
      @Valid @RequestBody SaleRequest request, Principal principal) {
    StandService.SaleInput input = new StandService.SaleInput(
        request.items().stream().map(item ->
            new StandService.SaleItemInput(item.productId(), item.quantity())).toList(),
        request.paymentMethod(), request.amountReceived(), request.observation());
    String user = principal == null ? "system" : principal.getName();
    return ResponseEntity.status(HttpStatus.CREATED)
        .body(saleResponse(service.registerSale(id, input, user)));
  }

  @PatchMapping("/{id}/ventas/{saleId}/anulacion")
  public SaleResponse cancelSale(@PathVariable Long id, @PathVariable Long saleId,
      @Valid @RequestBody CancelSaleRequest request, Principal principal) {
    String user = principal == null ? "system" : principal.getName();
    return saleResponse(service.cancelSale(id, saleId, request.reason(), user));
  }

  @PutMapping("/{id}/ventas/{saleId}")
  public SaleResponse updateSale(@PathVariable Long id, @PathVariable Long saleId,
      @Valid @RequestBody UpdateSaleRequest request, Principal principal) {
    StandService.SaleInput input = new StandService.SaleInput(
        request.items().stream().map(item ->
            new StandService.SaleItemInput(item.productId(), item.quantity())).toList(),
        request.paymentMethod(), request.amountReceived(), request.observation());
    String user = principal == null ? "system" : principal.getName();
    return saleResponse(service.updateSale(id, saleId, input, request.reason(), user));
  }

  @GetMapping("/{id}/resumen")
  public StandService.StandSummary summary(@PathVariable Long id) {
    return service.summary(id);
  }

  private StandService.StandInput input(StandRequest request) {
    return new StandService.StandInput(request.eventId(), request.name(), request.date(),
        request.startTime(), request.endTime(), request.responsible(), request.initialFund(),
        request.paymentMethods(), request.debitCommission(), request.creditCommission(),
        request.transferCommission());
  }

  private StandService.ProductInput productInput(ProductRequest request) {
    return new StandService.ProductInput(request.name(), request.category(), request.variant(),
        request.presentation(), request.unitEquivalence(), request.price(), request.unitCost(),
        request.stock(), request.available());
  }

  private StandResponse standResponse(StandEntity value) {
    return new StandResponse(value.getId(), value.getEvent().getId(), value.getEvent().getName(),
        value.getName(), value.getDate(), value.getStartTime(), value.getEndTime(),
        value.getResponsible(), value.getInitialFund(), value.getStatus(),
        value.getPaymentMethods(), value.getDebitCommission(), value.getCreditCommission(),
        value.getTransferCommission(), value.getCreatedAt(), value.getUpdatedAt());
  }

  private ProductResponse productResponse(StandProductEntity value) {
    return new ProductResponse(value.getId(), value.getStand().getId(), value.getName(),
        value.getCategory(), value.getVariant(), value.getPresentation(),
        value.getUnitEquivalence(), value.getPrice(), value.getInitialStock(), value.getUnitCost(),
        value.getCurrentStock(), value.isAvailable());
  }

  private SaleResponse saleResponse(StandSaleEntity value) {
    return new SaleResponse(value.getId(), value.getStand().getId(),
        value.getItems().stream().map(item -> new SaleItemResponse(item.getProductId(),
            item.getProductName(), item.getCategory(), item.getVariant(), item.getQuantity(),
            item.getPresentation(), item.getUnitEquivalence(), item.getUnitPrice(),
            item.getUnitCost(), item.getSubtotal(), item.getCostSubtotal())).toList(),
        value.getPaymentMethod(), value.getTotal(), value.getAmountReceived(),
        value.getChangeAmount(), value.getObservation(), value.getRegisteredBy(),
        value.getSoldAt(), value.getStatus() == null ? StandSaleStatus.ACTIVE : value.getStatus(),
        value.getCancelledAt(), value.getCancelledBy(),
        value.getCancellationReason(), value.getModifiedAt(), value.getModifiedBy(),
        value.getModificationReason());
  }

  public record StandRequest(@NotNull Long eventId, @NotBlank @Size(max = 120) String name,
      @NotNull LocalDate date, @NotNull LocalTime startTime, @NotNull LocalTime endTime,
      @NotBlank @Size(max = 150) String responsible,
      @NotNull @PositiveOrZero BigDecimal initialFund,
      @NotEmpty Set<@NotNull StandPaymentMethod> paymentMethods,
      @NotNull @PositiveOrZero BigDecimal debitCommission,
      @NotNull @PositiveOrZero BigDecimal creditCommission,
      @NotNull @PositiveOrZero BigDecimal transferCommission) { }
  public record ProductRequest(@NotBlank @Size(max = 120) String name,
      @Size(max = 80) String category, @Size(max = 100) String variant,
      @Size(max = 80) String presentation, @Positive BigDecimal unitEquivalence,
      @NotNull @Positive BigDecimal price, @NotNull @PositiveOrZero BigDecimal unitCost,
      @PositiveOrZero Integer stock,
      boolean available) { }
  public record SaleItemRequest(@NotNull Long productId, @Positive int quantity) { }
  public record SaleRequest(@NotEmpty List<@Valid SaleItemRequest> items,
      @NotNull StandPaymentMethod paymentMethod, @PositiveOrZero BigDecimal amountReceived,
      @Size(max = 500) String observation) { }
  public record CancelSaleRequest(@NotBlank @Size(max = 500) String reason) { }
  public record UpdateSaleRequest(@NotEmpty List<@Valid SaleItemRequest> items,
      @NotNull StandPaymentMethod paymentMethod, @PositiveOrZero BigDecimal amountReceived,
      @Size(max = 500) String observation,
      @NotBlank @Size(max = 500) String reason) { }
  public record StandResponse(Long id, Long eventId, String eventName, String name, LocalDate date,
      LocalTime startTime, LocalTime endTime, String responsible, BigDecimal initialFund,
      StandStatus status, Set<StandPaymentMethod> paymentMethods, BigDecimal debitCommission,
      BigDecimal creditCommission, BigDecimal transferCommission, LocalDateTime createdAt,
      LocalDateTime updatedAt) { }
  public record ProductResponse(Long id, Long standId, String name, String category,
      String variant, String presentation, BigDecimal unitEquivalence, BigDecimal price,
      Integer initialStock, BigDecimal unitCost, Integer currentStock,
      boolean available) { }
  public record SaleItemResponse(Long productId, String productName, String category,
      String variant, int quantity, String presentation, BigDecimal unitEquivalence,
      BigDecimal unitPrice, BigDecimal unitCost,
      BigDecimal subtotal, BigDecimal costSubtotal) { }
  public record SaleResponse(Long id, Long standId, List<SaleItemResponse> items,
      StandPaymentMethod paymentMethod, BigDecimal total, BigDecimal amountReceived,
      BigDecimal changeAmount, String observation, String registeredBy,
      LocalDateTime soldAt, StandSaleStatus status, LocalDateTime cancelledAt,
      String cancelledBy, String cancellationReason, LocalDateTime modifiedAt,
      String modifiedBy, String modificationReason) { }
}
