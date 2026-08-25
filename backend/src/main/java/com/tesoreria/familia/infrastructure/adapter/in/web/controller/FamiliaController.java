package com.tesoreria.familia.infrastructure.adapter.in.web.controller;

import com.tesoreria.alumno.application.usecase.AlumnoService;
import com.tesoreria.alumno.core.model.Alumno;
import com.tesoreria.apoderado.application.usecase.ApoderadoService;
import com.tesoreria.apoderado.core.model.Apoderado;
import com.tesoreria.familia.core.model.Familia;
import com.tesoreria.familia.core.port.in.CreateFamiliaUseCase;
import com.tesoreria.familia.core.port.in.DeleteFamiliaUseCase;
import com.tesoreria.familia.core.port.in.GetFamiliaUseCase;
import com.tesoreria.familia.core.port.in.UpdateFamiliaUseCase;
import com.tesoreria.familia.infrastructure.adapter.in.web.dto.FamiliaDetalleResponse;
import com.tesoreria.familia.infrastructure.adapter.in.web.dto.FamiliaRequest;
import com.tesoreria.familia.infrastructure.adapter.in.web.dto.FamiliaResponse;
import com.tesoreria.familia.infrastructure.adapter.in.web.mapper.FamiliaMapper;
import com.tesoreria.shared.domain.pagination.PageRequest;
import com.tesoreria.shared.domain.pagination.PageResponse;
import com.tesoreria.shared.domain.exception.DomainException;
import com.tesoreria.shared.infrastructure.constant.ApiConstants;
import com.tesoreria.shared.infrastructure.web.EstadoActivoRequest;
import com.tesoreria.treasury.core.port.in.TreasuryUseCase;
import com.tesoreria.treasury.application.usecase.TransferPaymentService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping(ApiConstants.FAMILIAS)
public class FamiliaController {

    private final CreateFamiliaUseCase createUseCase;
    private final GetFamiliaUseCase getUseCase;
    private final UpdateFamiliaUseCase updateUseCase;
    private final DeleteFamiliaUseCase deleteUseCase;
    private final FamiliaMapper mapper;
    private final ApoderadoService apoderadoService;
    private final AlumnoService alumnoService;
    private final TreasuryUseCase treasury;
    private final TransferPaymentService transferPayments;

    public FamiliaController(
            AlumnoService alumnoService,
            ApoderadoService apoderadoService,
            CreateFamiliaUseCase createUseCase,
            UpdateFamiliaUseCase updateUseCase,
            DeleteFamiliaUseCase deleteUseCase,
            GetFamiliaUseCase getUseCase,
            FamiliaMapper mapper,
            TreasuryUseCase treasury,
            TransferPaymentService transferPayments) {
        this.alumnoService = alumnoService;
        this.apoderadoService = apoderadoService;
        this.createUseCase = createUseCase;
        this.updateUseCase = updateUseCase;
        this.deleteUseCase = deleteUseCase;
        this.getUseCase = getUseCase;
        this.mapper = mapper;
        this.treasury = treasury;
        this.transferPayments = transferPayments;
    }

    @PostMapping
    public ResponseEntity<FamiliaResponse> crearFamilia(@Valid @RequestBody FamiliaRequest request) {
        validarReferencias(request);
        Familia creada = createUseCase.crearFamilia(mapper.toDomain(null, request));
        return new ResponseEntity<>(mapper.toResponse(creada), HttpStatus.CREATED);
    }

    @GetMapping
    public ResponseEntity<PageResponse<FamiliaDetalleResponse>> listarFamilias(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "5") int size,
            @RequestParam(defaultValue = "") String search) {
        PageResponse<Familia> result = getUseCase.listarFamilia(
                new PageRequest(page, size, null, null, search));

        PageResponse<FamiliaDetalleResponse> response = new PageResponse<>(
                result.content().stream()
                        .map(this::toDetalleResponse)
                        .toList(),
                result.page(),
                result.size(),
                result.totalElements(),
                result.totalPages());

        return ResponseEntity.ok(response);
    }

    @GetMapping("/{familiaId}")
    public ResponseEntity<FamiliaDetalleResponse> obtenerFamilia(@PathVariable Long familiaId) {
        return ResponseEntity.ok(toDetalleResponse(getUseCase.obtenerFamiliaPorId(familiaId)));
    }

    @PutMapping("/{familiaId}")
    public ResponseEntity<FamiliaResponse> actualizarFamilia(
            @PathVariable Long familiaId,
            @Valid @RequestBody FamiliaRequest request) {
        validarReferencias(request);
        Familia actualizada = updateUseCase.actualizarFamilia(familiaId, mapper.toDomain(familiaId, request));
        return ResponseEntity.ok(mapper.toResponse(actualizada));
    }

    @DeleteMapping("/{familiaId}")
    @Transactional
    public ResponseEntity<Void> eliminarFamilia(@PathVariable Long familiaId) {
        transferPayments.deleteFamilyPayments(familiaId);
        treasury.deleteFamilyTreasuryData(familiaId);
        deleteUseCase.eliminarFamilia(familiaId);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{familiaId}/estado")
    public ResponseEntity<FamiliaResponse> cambiarEstado(
            @PathVariable Long familiaId, @RequestBody EstadoActivoRequest request) {
        return ResponseEntity.ok(mapper.toResponse(updateUseCase.cambiarEstado(familiaId, request.activo())));
    }

    private FamiliaDetalleResponse toDetalleResponse(Familia familia) {
        Alumno alumno = alumnoService.findById(familia.getAlumnoId());
        List<Apoderado> apoderados = apoderadoService.findByIds(familia.getApoderadosIds());
        return mapper.toDetalleResponse(familia, alumno, apoderados);
    }

    private void validarReferencias(FamiliaRequest request) {
        Alumno alumno = alumnoService.findById(request.getAlumnoId());
        if (!alumno.isActivo()) {
            throw new DomainException("alumnoId", HttpStatus.CONFLICT,
                    "No se puede vincular un alumno inactivo");
        }
        request.getApoderados().forEach(relacion -> {
            Apoderado apoderado = apoderadoService.findById(relacion.getApoderadoId());
            if (!apoderado.isActivo()) {
                throw new DomainException("apoderados", HttpStatus.CONFLICT,
                        "No se puede vincular un apoderado inactivo");
            }
        });
    }
}
