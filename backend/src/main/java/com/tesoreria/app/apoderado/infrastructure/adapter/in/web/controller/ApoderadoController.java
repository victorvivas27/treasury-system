package com.tesoreria.app.apoderado.infrastructure.adapter.in.web.controller;


import com.tesoreria.app.apoderado.application.usecase.ApoderadoService;
import com.tesoreria.app.apoderado.domain.model.Apoderado;
import com.tesoreria.app.apoderado.infrastructure.adapter.in.web.dto.ApoderadoRequest;
import com.tesoreria.app.apoderado.infrastructure.adapter.in.web.dto.ApoderadoResponse;
import com.tesoreria.app.apoderado.infrastructure.adapter.in.web.mapper.ApoderadoMapper;
import com.tesoreria.app.shared.infrastructure.constant.ApiConstants;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

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
    public ResponseEntity<List<ApoderadoResponse>> findAll() {
        List<ApoderadoResponse> responses = apoderadoService.findAll().stream()
                .map(mapper::toResponse)
                .collect(Collectors.toList());
        return ResponseEntity.ok(responses);
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
