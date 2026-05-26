package com.tesoreria.app.apoderado.C_infrastructure.adapter.in.web.controller;


import com.tesoreria.app.shared.domain.pagination.PageRequest;
import com.tesoreria.app.shared.domain.pagination.PageResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.tesoreria.app.apoderado.B_application.usecase.ApoderadoService;
import com.tesoreria.app.apoderado.C_infrastructure.adapter.in.web.dto.ApoderadoRequest;
import com.tesoreria.app.apoderado.C_infrastructure.adapter.in.web.dto.ApoderadoResponse;
import com.tesoreria.app.apoderado.C_infrastructure.adapter.in.web.mapper.ApoderadoMapper;
import com.tesoreria.app.apoderado.A_domain.model.Apoderado;
import com.tesoreria.app.shared.infrastructure.constant.ApiConstants;

import jakarta.validation.Valid;

@RestController
@RequestMapping(ApiConstants.APODERADOS)
@CrossOrigin
public class ApoderadoController {

    private final ApoderadoService apoderadoService;

    private final ApoderadoMapper mapper;

    public ApoderadoController(ApoderadoService apoderadoService, ApoderadoMapper mapper) {
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
            @RequestParam(defaultValue = "5") int size
    ) {

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
                result.totalPages()
        );

        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApoderadoResponse> findById(@PathVariable Long id) {
        Apoderado apoderado = apoderadoService.findById(id);
        return ResponseEntity.ok(mapper.toResponse(apoderado));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApoderadoResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody ApoderadoRequest request
    ) {
        Apoderado apoderado = mapper.toDomain(request);
        apoderado.setId(id);
        Apoderado updated = apoderadoService.update(apoderado);
        return ResponseEntity.ok(mapper.toResponse(updated));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        apoderadoService.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
