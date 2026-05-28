package com.tesoreria.familia.infrastructure.adapter.in.web.controller;

import java.util.List;

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
import org.springframework.web.bind.annotation.RestController;

import com.tesoreria.familia.application.usecase.FamiliaService;
import com.tesoreria.familia.core.model.Familia;
import com.tesoreria.familia.infrastructure.adapter.in.web.dto.AlumnoApoderadoResponse;
import com.tesoreria.familia.infrastructure.adapter.in.web.dto.FamiliaRequest;
import com.tesoreria.familia.infrastructure.adapter.in.web.dto.FamiliaResponse;
import com.tesoreria.familia.infrastructure.adapter.in.web.dto.FamiliaUpdateRequest;
import com.tesoreria.familia.infrastructure.adapter.in.web.mapper.FamiliaMapper;
import com.tesoreria.shared.infrastructure.constant.ApiConstants;

import jakarta.validation.Valid;

@RestController
@RequestMapping(ApiConstants.ALUMNOS)
@CrossOrigin
public class FamiliaController {

  private final FamiliaService familiaService;
  private final FamiliaMapper mapper;

  public FamiliaController(FamiliaService familiaService, FamiliaMapper mapper) {
    this.familiaService = familiaService;
    this.mapper = mapper;
  }

  @PostMapping("/{alumnoId}/apoderados")
  public ResponseEntity<FamiliaResponse> vincular(
      @PathVariable Long alumnoId,
      @Valid @RequestBody FamiliaRequest request) {
    Familia familia = mapper.toDomain(alumnoId, request);
    Familia creada = familiaService.vincular(familia);
    return new ResponseEntity<>(mapper.toResponse(creada), HttpStatus.CREATED);
  }

  @GetMapping("/{alumnoId}/apoderados")
  public ResponseEntity<List<AlumnoApoderadoResponse>> listar(@PathVariable Long alumnoId) {
    List<AlumnoApoderadoResponse> response = familiaService.listarApoderadosPorAlumno(alumnoId)
        .stream()
        .map(mapper::toResponse)
        .toList();
    return ResponseEntity.ok(response);
  }

  @PutMapping("/{alumnoId}/apoderados/{apoderadoId}")
  public ResponseEntity<FamiliaResponse> actualizar(
      @PathVariable Long alumnoId,
      @PathVariable Long apoderadoId,
      @Valid @RequestBody FamiliaUpdateRequest request) {
    Familia familia = mapper.toDomain(alumnoId, apoderadoId, request);
    Familia actualizada = familiaService.actualizar(familia);
    return ResponseEntity.ok(mapper.toResponse(actualizada));
  }

  @DeleteMapping("/{alumnoId}/apoderados/{apoderadoId}")
  public ResponseEntity<Void> eliminar(
      @PathVariable Long alumnoId,
      @PathVariable Long apoderadoId) {
    familiaService.eliminar(alumnoId, apoderadoId);
    return ResponseEntity.noContent().build();
  }
}
