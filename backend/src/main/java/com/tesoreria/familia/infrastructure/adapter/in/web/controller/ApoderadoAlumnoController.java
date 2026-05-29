package com.tesoreria.familia.infrastructure.adapter.in.web.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.tesoreria.familia.application.usecase.FamiliaService;
import com.tesoreria.familia.infrastructure.adapter.in.web.dto.AlumnoVinculadoResponse;
import com.tesoreria.familia.infrastructure.adapter.in.web.mapper.FamiliaMapper;
import com.tesoreria.shared.infrastructure.constant.ApiConstants;

@RestController
@RequestMapping(ApiConstants.APODERADOS)
@CrossOrigin
public class ApoderadoAlumnoController {

  private final FamiliaService familiaService;
  private final FamiliaMapper mapper;

  public ApoderadoAlumnoController(FamiliaService familiaService, FamiliaMapper mapper) {
    this.familiaService = familiaService;
    this.mapper = mapper;
  }

  @GetMapping("/{apoderadoId}/alumnos")
  public ResponseEntity<List<AlumnoVinculadoResponse>> listar(@PathVariable Long apoderadoId) {
    List<AlumnoVinculadoResponse> response = familiaService.listarAlumnosPorApoderado(apoderadoId)
        .stream()
        .map(mapper::toResponse)
        .toList();
    return ResponseEntity.ok(response);
  }
}
