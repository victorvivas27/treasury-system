package com.tesoreria.alumno.infrastructure.adapter.in.web.controller;

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

import com.tesoreria.alumno.application.usecase.AlumnoService;
import com.tesoreria.alumno.core.model.Alumno;
import com.tesoreria.alumno.infrastructure.adapter.in.web.dto.AlumnoRequest;
import com.tesoreria.alumno.infrastructure.adapter.in.web.dto.AlumnoResponse;
import com.tesoreria.alumno.infrastructure.adapter.in.web.mapper.AlumnoMapper;
import com.tesoreria.shared.domain.pagination.PageRequest;
import com.tesoreria.shared.domain.pagination.PageResponse;
import com.tesoreria.shared.infrastructure.constant.ApiConstants;

import jakarta.validation.Valid;

@RestController
@RequestMapping(ApiConstants.ALUMNOS)
@CrossOrigin
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
    return new ResponseEntity<>(mapper.toResponse(created), HttpStatus.CREATED);
  }

  @GetMapping
  public ResponseEntity<PageResponse<AlumnoResponse>> findAll(
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "5") int size) {

    PageResponse<Alumno> result = alumnoService.findAll(new PageRequest(page, size, null, null));

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

  @GetMapping("/{id}")
  public ResponseEntity<AlumnoResponse> findById(@PathVariable Long id) {
    Alumno alumno = alumnoService.findById(id);
    AlumnoResponse response = mapper.toResponse(alumno);
    return ResponseEntity.ok(response);
  }

  @PutMapping("/{id}")
  public ResponseEntity<AlumnoResponse> update(
      @PathVariable Long id,
      @Valid @RequestBody AlumnoRequest request) {
    Alumno alumno = mapper.toDomain(request);
    alumno.setId(id);
    Alumno updated = alumnoService.update(alumno);
    return ResponseEntity.ok(mapper.toResponse(updated));
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<Void> delete(@PathVariable Long id) {
    alumnoService.deleteById(id);
    return ResponseEntity.noContent().build();
  }
}
