package com.tesoreria.familia.infrastructure.adapter.in.web.controller;

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

import com.tesoreria.familia.application.usecase.FamiliaService;
import com.tesoreria.familia.core.model.Familia;
import com.tesoreria.familia.core.model.FamiliaDetalle;
import com.tesoreria.familia.infrastructure.adapter.in.web.dto.FamiliaCrudRequest;
import com.tesoreria.familia.infrastructure.adapter.in.web.dto.FamiliaDetalleResponse;
import com.tesoreria.familia.infrastructure.adapter.in.web.dto.FamiliaResponse;
import com.tesoreria.familia.infrastructure.adapter.in.web.dto.FamiliaUpdateRequest;
import com.tesoreria.familia.infrastructure.adapter.in.web.mapper.FamiliaMapper;
import com.tesoreria.shared.domain.pagination.PageRequest;
import com.tesoreria.shared.domain.pagination.PageResponse;
import com.tesoreria.shared.infrastructure.constant.ApiConstants;

import jakarta.validation.Valid;

@RestController
@RequestMapping(ApiConstants.FAMILIAS + "/alumno-apoderado")
@CrossOrigin
public class FamiliaCrudController {

  private final FamiliaService familiaService;
  private final FamiliaMapper mapper;

  public FamiliaCrudController(FamiliaService familiaService, FamiliaMapper mapper) {
    this.familiaService = familiaService;
    this.mapper = mapper;
  }

  @PostMapping
  public ResponseEntity<FamiliaResponse> crear(@Valid @RequestBody FamiliaCrudRequest request) {
    Familia familia = mapper.toDomain(request);
    Familia creada = familiaService.vincular(familia);
    return new ResponseEntity<>(mapper.toResponse(creada), HttpStatus.CREATED);
  }

  @GetMapping
  public ResponseEntity<PageResponse<FamiliaDetalleResponse>> listar(
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "5") int size) {
    PageResponse<FamiliaDetalle> result = familiaService.listar(new PageRequest(page, size, null, null));
    PageResponse<FamiliaDetalleResponse> response = new PageResponse<>(
        result.content().stream().map(mapper::toResponse).toList(),
        result.page(),
        result.size(),
        result.totalElements(),
        result.totalPages());

    return ResponseEntity.ok(response);
  }

  @GetMapping("/{id}")
  public ResponseEntity<FamiliaDetalleResponse> obtener(@PathVariable Long id) {
    return ResponseEntity.ok(mapper.toResponse(familiaService.obtenerPorId(id)));
  }

  @PutMapping("/{id}")
  public ResponseEntity<FamiliaResponse> actualizar(
      @PathVariable Long id,
      @Valid @RequestBody FamiliaUpdateRequest request) {
    Familia cambios = mapper.toDomain(request);
    Familia actualizada = familiaService.actualizar(id, cambios);
    return ResponseEntity.ok(mapper.toResponse(actualizada));
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<Void> eliminar(@PathVariable Long id) {
    familiaService.eliminar(id);
    return ResponseEntity.noContent().build();
  }
}
