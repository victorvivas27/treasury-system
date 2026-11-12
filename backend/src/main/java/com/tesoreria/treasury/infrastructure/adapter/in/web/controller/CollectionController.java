package com.tesoreria.treasury.infrastructure.adapter.in.web.controller;

import com.tesoreria.familia.core.model.FamilyTreasuryData;
import com.tesoreria.familia.core.port.in.GetFamiliaUseCase;
import com.tesoreria.treasury.application.usecase.CollectionService;
import com.tesoreria.treasury.core.model.ExpenseCategory;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;
import java.security.Principal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/tesoreria/recaudaciones")
@PreAuthorize("hasRole('ADMIN')")
public class CollectionController {
    private final CollectionService service;
    private final GetFamiliaUseCase families;
    public CollectionController(CollectionService service, GetFamiliaUseCase families) { this.service = service; this.families = families; }
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    @GetMapping public List<CollectionService.View> list(@RequestParam int year) { return service.list(year); }
    @GetMapping("/familias") public List<FamilyTreasuryData> familyOptions() { return families.obtenerDatosTesoreria(); }
    @PostMapping public CollectionService.View create(@Valid @RequestBody Create request, Principal principal) {
        return service.create(request.year(), request.title(), request.defaultAmount(), request.dueDate(), request.familyIds(), principal.getName());
    }
    @PutMapping("/{id}/familias/{familyId}") public CollectionService.View expected(@PathVariable Long id,
            @PathVariable Long familyId, @Valid @RequestBody Expected request, Principal principal) {
        return service.setExpected(id, familyId, request.amount(), principal.getName());
    }
    @PutMapping("/{id}") public CollectionService.View update(@PathVariable Long id,
            @Valid @RequestBody Edit request, Principal principal) {
        return service.update(id, request.title(), request.dueDate(), principal.getName());
    }
    @PostMapping("/{id}/eliminacion") public void archive(@PathVariable Long id,
            @Valid @RequestBody Correction request, Principal principal) {
        service.archive(id, request.reason(), principal.getName());
    }
    public record Edit(@NotBlank @Size(max = 120) String title, LocalDate dueDate) { }
    @PostMapping(value = "/{id}/familias/{familyId}/pagos", consumes = "application/json") public CollectionService.View collect(@PathVariable Long id,
            @PathVariable Long familyId, @Valid @RequestBody Payment request, Principal principal) {
        return service.collect(id, familyId, request.amount(), request.date(), request.reference(), request.requestId(), principal.getName());
    }
    @PostMapping(value = "/{id}/proveedor", consumes = "application/json") public CollectionService.View disburse(@PathVariable Long id,
            @Valid @RequestBody ProviderPayment request, Principal principal) {
        return service.disburse(id, request.amount(), request.date(), request.recipient(), request.reference(), request.category(), request.requestId(), principal.getName());
    }
    @PostMapping("/{id}/ingreso") public CollectionService.View postIncome(@PathVariable Long id,
            @Valid @RequestBody Closing request, Principal principal) {
        return service.postIncome(id, request.date(), request.reference(), principal.getName());
    }
    @PostMapping("/{id}/familias/{familyId}/anulacion") public CollectionService.View cancelPayments(@PathVariable Long id,
            @PathVariable Long familyId, @Valid @RequestBody Correction request, Principal principal) {
        return service.cancelFamilyPayments(id, familyId, request.reason(), principal.getName());
    }
    public record Closing(@NotNull LocalDate date, @Size(max = 100) String reference) { }
    public record Correction(@NotBlank @Size(max = 500) String reason) { }
    public record Create(@Min(2026) @Max(2035) int year, @NotBlank @Size(max = 120) String title,
            @NotNull @Positive @Digits(integer = 14, fraction = 0) BigDecimal defaultAmount,
            LocalDate dueDate, @NotEmpty @Size(max = 1000) List<@NotNull @Positive Long> familyIds) { }
    public record Expected(@NotNull @PositiveOrZero @Digits(integer = 14, fraction = 0) BigDecimal amount) { }
    public record Payment(@NotNull @Positive @Digits(integer = 14, fraction = 0) BigDecimal amount,
            @NotNull LocalDate date, @Size(max = 100) String reference, @NotNull UUID requestId) { }
    public record ProviderPayment(@NotNull @Positive @Digits(integer = 14, fraction = 0) BigDecimal amount,
            @NotNull LocalDate date, @NotBlank @Size(max = 150) String recipient, @Size(max = 100) String reference,
            @NotNull ExpenseCategory category, @NotNull UUID requestId) { }
}
