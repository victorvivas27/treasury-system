package com.tesoreria.apoderado.infrastructure.adapter.in.web.controller;

import com.tesoreria.apoderado.application.usecase.ApoderadoService;
import com.tesoreria.apoderado.core.model.Apoderado;
import com.tesoreria.apoderado.infrastructure.adapter.in.web.dto.ApoderadoRequest;
import com.tesoreria.apoderado.infrastructure.adapter.in.web.dto.ApoderadoResponse;
import com.tesoreria.apoderado.infrastructure.adapter.in.web.mapper.ApoderadoMapper;
import com.tesoreria.shared.domain.pagination.PageRequest;
import com.tesoreria.shared.domain.pagination.PageResponse;
import com.tesoreria.shared.infrastructure.constant.ApiConstants;
import com.tesoreria.shared.infrastructure.web.EstadoActivoRequest;
import com.tesoreria.user.application.usecase.AccountRecoveryService;
import com.tesoreria.user.core.constant.RoleEnum;
import com.tesoreria.user.core.model.User;
import com.tesoreria.user.core.port.out.UserRepositoryOutPort;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping(ApiConstants.APODERADOS)
public class ApoderadoController {

    private final ApoderadoService apoderadoService;
    private final ApoderadoMapper mapper;
    private final UserRepositoryOutPort users;
    private final AccountRecoveryService accountRecovery;

    public ApoderadoController(
            ApoderadoService apoderadoService,
            ApoderadoMapper mapper,
            UserRepositoryOutPort users,
            AccountRecoveryService accountRecovery) {
        this.apoderadoService = apoderadoService;
        this.mapper = mapper;
        this.users = users;
        this.accountRecovery = accountRecovery;
    }

    @PostMapping
    public ResponseEntity<ApoderadoResponse> create(@Valid @RequestBody ApoderadoRequest request) {
        Apoderado apoderado = mapper.toDomain(request);
        Apoderado created = apoderadoService.create(apoderado);
        return new ResponseEntity<>(response(created), HttpStatus.CREATED);
    }

    @GetMapping
    public ResponseEntity<PageResponse<ApoderadoResponse>> findAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "5") int size,
            @RequestParam(defaultValue = "") String search) {

        PageRequest pageRequest = new PageRequest(page, size, null, null, search);

        PageResponse<Apoderado> result = apoderadoService.findAll(pageRequest);

        PageResponse<ApoderadoResponse> response = new PageResponse<>(
                result.content()
                        .stream()
                        .map(this::response)
                        .toList(),
                result.page(),
                result.size(),
                result.totalElements(),
                result.totalPages());

        return ResponseEntity.ok(response);
    }

    @GetMapping("/{codigo}")
    public ResponseEntity<ApoderadoResponse> findByCodigo(@PathVariable String codigo) {
        Apoderado apoderado = apoderadoService.findByCodigo(codigo);
        return ResponseEntity.ok(response(apoderado));
    }

    @PutMapping("/{codigo}")
    public ResponseEntity<ApoderadoResponse> updateByCodigo(
            @PathVariable String codigo,
            @Valid @RequestBody ApoderadoRequest request) {
        Apoderado apoderado = mapper.toDomain(request);
        Apoderado updated = apoderadoService.updateByCodigo(codigo, apoderado);
        return ResponseEntity.ok(response(updated));
    }

    @PostMapping("/{codigo}/habilitar-acceso")
    public ResponseEntity<ApoderadoResponse> enableAccess(@PathVariable String codigo) {
        Apoderado guardian = apoderadoService.findByCodigo(codigo);
        accountRecovery.inviteGuardian(guardian.getNombre(), guardian.getEmail());
        return ResponseEntity.ok(response(guardian));
    }

    @DeleteMapping("/{codigo}")
    public ResponseEntity<Void> deleteByCodigo(@PathVariable String codigo) {
        apoderadoService.deleteByCodigo(codigo);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{codigo}/estado")
    public ResponseEntity<ApoderadoResponse> cambiarEstado(
            @PathVariable String codigo, @RequestBody EstadoActivoRequest request) {
        return ResponseEntity.ok(response(apoderadoService.cambiarEstado(codigo, request.activo())));
    }

    private ApoderadoResponse response(Apoderado guardian) {
        String status = users.findByCorreo(guardian.getEmail())
                .map(this::accessStatus).orElse("SIN_ACCESO");
        return mapper.toResponse(guardian, status);
    }

    private String accessStatus(User user) {
        if (!Boolean.TRUE.equals(user.getAccountNonLocked())) return "BLOQUEADO";
        boolean roleCanAccessWithoutVerification = user.getRol() == RoleEnum.ADMIN
                || user.getRol() == RoleEnum.SUPER_ADMIN;
        if (Boolean.TRUE.equals(user.getEnabled())
                && (roleCanAccessWithoutVerification || user.getEmailVerifiedAt() != null)) {
            return "ACTIVO";
        }
        return "INVITACION_PENDIENTE";
    }
}
