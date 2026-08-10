package com.tesoreria.alumno.infrastructure.adapter.in.web.controller;

import com.tesoreria.alumno.application.usecase.AlumnoService;
import com.tesoreria.alumno.core.model.Alumno;
import com.tesoreria.alumno.infrastructure.adapter.in.web.dto.AlumnoRequest;
import com.tesoreria.alumno.infrastructure.adapter.in.web.dto.AlumnoResponse;
import com.tesoreria.alumno.infrastructure.adapter.in.web.mapper.AlumnoMapper;
import com.tesoreria.shared.domain.pagination.PageRequest;
import com.tesoreria.shared.domain.pagination.PageResponse;
import com.tesoreria.shared.infrastructure.constant.ApiConstants;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping(ApiConstants.ALUMNOS)
public class AlumnoController {

    private final AlumnoService alumnoService;
    private final AlumnoMapper mapper;

    public AlumnoController(
            AlumnoService alumnoService,
            AlumnoMapper mapper) {
        this.alumnoService = alumnoService;
        this.mapper = mapper;
    }

    @PostMapping
    public ResponseEntity<AlumnoResponse> create(@Valid @RequestBody AlumnoRequest request) {
        Alumno alumno = mapper.toDomain(request);
        Alumno created = alumnoService.create(alumno);
        return ResponseEntity.status(HttpStatus.CREATED).body(mapper.toResponse(created));
    }

    @GetMapping
    public ResponseEntity<PageResponse<AlumnoResponse>> findAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "5") int size,
            @RequestParam(defaultValue = "") String search) {

        PageResponse<Alumno> result = alumnoService.findAll(new PageRequest(page, size, null, null, search));

        PageResponse<AlumnoResponse> response = new PageResponse<>(
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
    public ResponseEntity<AlumnoResponse> findByCodigo(@PathVariable String codigo) {
        Alumno alumno = alumnoService.findByCodigo(codigo);
        return ResponseEntity.ok(mapper.toResponse(alumno));
    }

    @PutMapping("/{codigo}")
    public ResponseEntity<AlumnoResponse> update(
            @PathVariable String codigo,
            @Valid @RequestBody AlumnoRequest request) {

        Alumno alumno = mapper.toDomain(request);
        alumno.setCodigo(codigo);
        Alumno updated = alumnoService.update(alumno);
        return ResponseEntity.ok(mapper.toResponse(updated));
    }

    @DeleteMapping("/{codigo}")
    public ResponseEntity<Void> delete(@PathVariable String codigo) {
        alumnoService.deleteByCodigo(codigo);
        return ResponseEntity.noContent().build();
    }
}
