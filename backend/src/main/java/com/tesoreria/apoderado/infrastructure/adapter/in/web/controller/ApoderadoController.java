package com.tesoreria.apoderado.infrastructure.adapter.in.web.controller;

import com.tesoreria.apoderado.application.usecase.ApoderadoService;
import com.tesoreria.apoderado.core.model.Apoderado;
import com.tesoreria.apoderado.infrastructure.adapter.in.web.dto.ApoderadoRequest;
import com.tesoreria.apoderado.infrastructure.adapter.in.web.dto.ApoderadoResponse;
import com.tesoreria.apoderado.infrastructure.adapter.in.web.mapper.ApoderadoMapper;
import com.tesoreria.shared.domain.pagination.PageRequest;
import com.tesoreria.shared.domain.pagination.PageResponse;
import com.tesoreria.shared.infrastructure.constant.ApiConstants;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping(ApiConstants.APODERADOS)
public class ApoderadoController {

    private final ApoderadoService apoderadoService;
    private final ApoderadoMapper mapper;

    public ApoderadoController(
            ApoderadoService apoderadoService,
            ApoderadoMapper mapper) {
        this.apoderadoService = apoderadoService;
        this.mapper = mapper;
    }

    @PostMapping
    public ResponseEntity<ApoderadoResponse> create(@Valid @RequestBody ApoderadoRequest request) {
        Apoderado apoderado = mapper.toDomain(request);
        Apoderado created = apoderadoService.create(apoderado);
        return new ResponseEntity<>(mapper.toResponse(created), HttpStatus.CREATED);
    }

    @GetMapping
    public ResponseEntity<PageResponse<ApoderadoResponse>> findAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "5") int size) {

        PageRequest pageRequest = new PageRequest(page, size, null, null);

        PageResponse<Apoderado> result = apoderadoService.findAll(pageRequest);

        PageResponse<ApoderadoResponse> response = new PageResponse<>(
                result.content()
                        .stream()
                        .map(mapper::toResponse)
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
        return ResponseEntity.ok(mapper.toResponse(apoderado));
    }

    @PutMapping("/{codigo}")
    public ResponseEntity<ApoderadoResponse> updateByCodigo(
            @PathVariable String codigo,
            @Valid @RequestBody ApoderadoRequest request) {
        Apoderado apoderado = mapper.toDomain(request);
        Apoderado updated = apoderadoService.updateByCodigo(codigo, apoderado);
        return ResponseEntity.ok(mapper.toResponse(updated));
    }

    @DeleteMapping("/{codigo}")
    public ResponseEntity<Void> deleteByCodigo(@PathVariable String codigo) {
        apoderadoService.deleteByCodigo(codigo);
        return ResponseEntity.noContent().build();
    }
}
