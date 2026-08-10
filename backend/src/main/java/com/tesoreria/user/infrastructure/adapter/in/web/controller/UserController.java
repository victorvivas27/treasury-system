package com.tesoreria.user.infrastructure.adapter.in.web.controller;

import com.tesoreria.shared.domain.pagination.PageRequest;
import com.tesoreria.shared.domain.pagination.PageResponse;
import com.tesoreria.shared.infrastructure.constant.ApiConstants;
import com.tesoreria.user.application.usecase.UserService;
import com.tesoreria.user.infrastructure.adapter.in.web.dto.RoleRequestDTO;
import com.tesoreria.user.infrastructure.adapter.in.web.dto.UserRequestDTO;
import com.tesoreria.user.infrastructure.adapter.in.web.dto.UserResponseDTO;
import com.tesoreria.user.infrastructure.adapter.in.web.mapper.UserMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping(ApiConstants.USERS)
@SuppressWarnings("PMD.AvoidDuplicateLiterals")
public class UserController {
    private final UserService service;
    private final UserMapper mapper;

    public UserController(UserService service, UserMapper mapper) {
        this.service = service;
        this.mapper = mapper;
    }

    @Operation(summary = "Crear usuario")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Usuario creado"),
            @ApiResponse(responseCode = "409", description = "Correo o código duplicado")
    })
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UserResponseDTO> create(@Valid @RequestBody UserRequestDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(mapper.toResponse(service.create(mapper.toDomain(request))));
    }

    @Operation(summary = "Listar usuarios")
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','USER')")
    public ResponseEntity<PageResponse<UserResponseDTO>> findAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "") String search) {
        var result = service.findAll(new PageRequest(page, size, null, null, search));
        return ResponseEntity.ok(new PageResponse<>(
                result.content().stream().map(mapper::toResponse).toList(),
                result.page(),
                result.size(),
                result.totalElements(),
                result.totalPages()));
    }

    @Operation(summary = "Obtener usuario por ID")
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','USER')")
    public ResponseEntity<UserResponseDTO> findById(@PathVariable Long id) {
        return ResponseEntity.ok(mapper.toResponse(service.findById(id)));
    }

    @Operation(summary = "Obtener usuario por código")
    @GetMapping("/code/{code}")
    @PreAuthorize("hasAnyRole('ADMIN','USER')")
    public ResponseEntity<UserResponseDTO> findByCode(@PathVariable String code) {
        return ResponseEntity.ok(mapper.toResponse(service.findByCode(code)));
    }

    @Operation(summary = "Obtener usuario por correo")
    @GetMapping("/email/{email}")
    @PreAuthorize("hasAnyRole('ADMIN','USER')")
    public ResponseEntity<UserResponseDTO> findByEmail(@PathVariable String email) {
        return ResponseEntity.ok(mapper.toResponse(service.findByCorreo(email)));
    }

    @Operation(summary = "Actualizar usuario")
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or @userAuthorization.isSelf(#id, authentication.name)")
    public ResponseEntity<UserResponseDTO> update(
            @PathVariable Long id,
            @Valid @RequestBody UserRequestDTO request,
            Authentication authentication) {
        return ResponseEntity.ok(mapper.toResponse(
                service.update(id, mapper.toUpdateDomain(request), authentication.getName())));
    }

    @Operation(summary = "Eliminar usuario")
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Cambiar rol de usuario")
    @PatchMapping("/{id}/rol")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UserResponseDTO> changeRole(
            @PathVariable Long id,
            @Valid @RequestBody RoleRequestDTO request,
            Authentication authentication) {
        return ResponseEntity.ok(mapper.toResponse(
                service.changeRole(id, request.rol(), authentication.getName())));
    }
}
