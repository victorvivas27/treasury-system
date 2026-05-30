package com.tesoreria.familia.infrastructure.adapter.in.web.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.tesoreria.alumno.application.usecase.AlumnoService;
import com.tesoreria.alumno.core.model.Alumno;
import com.tesoreria.apoderado.application.usecase.ApoderadoService;
import com.tesoreria.apoderado.core.model.Apoderado;
import com.tesoreria.familia.core.model.Familia;
import com.tesoreria.familia.core.port.in.AgregarApoderadoAFamiliaUseCase;
import com.tesoreria.familia.core.port.in.CreateFamiliaUseCase;
import com.tesoreria.familia.core.port.in.DeleteFamiliaUseCase;
import com.tesoreria.familia.core.port.in.GetFamiliaUseCase;
import com.tesoreria.familia.infrastructure.adapter.in.web.dto.FamiliaDetalleResponse;
import com.tesoreria.familia.infrastructure.adapter.in.web.dto.FamiliaRequest;
import com.tesoreria.familia.infrastructure.adapter.in.web.dto.FamiliaResponse;
import com.tesoreria.familia.infrastructure.adapter.in.web.mapper.FamiliaMapper;
import com.tesoreria.shared.infrastructure.constant.ApiConstants;

import jakarta.validation.Valid;

@RestController
@RequestMapping(ApiConstants.FAMILIAS)
@CrossOrigin
public class FamiliaController {

  private final CreateFamiliaUseCase createUseCase;
  private final GetFamiliaUseCase getUseCase;
  private final DeleteFamiliaUseCase deleteUseCase;
  private final AgregarApoderadoAFamiliaUseCase agregarApoderadoUseCase;
  private final FamiliaMapper mapper;
  private final ApoderadoService apoderadoService;
  private final AlumnoService alumnoService;

  public FamiliaController(AgregarApoderadoAFamiliaUseCase agregarApoderadoUseCase, AlumnoService alumnoService,
      ApoderadoService apoderadoService, CreateFamiliaUseCase createUseCase, DeleteFamiliaUseCase deleteUseCase,
      GetFamiliaUseCase getUseCase, FamiliaMapper mapper) {
    this.agregarApoderadoUseCase = agregarApoderadoUseCase;
    this.alumnoService = alumnoService;
    this.apoderadoService = apoderadoService;
    this.createUseCase = createUseCase;
    this.deleteUseCase = deleteUseCase;
    this.getUseCase = getUseCase;
    this.mapper = mapper;
  }

  // 1. Crear un nuevo registro familiar vinculando un alumno con una lista de
  // apoderados (POST)
  @PostMapping("/{alumnoId}")
  public ResponseEntity<FamiliaResponse> crearFamilia(
      @PathVariable Long alumnoId,
      @Valid @RequestBody FamiliaRequest request) {
    Familia familia = mapper.toDomain(null, alumnoId, request);
    Familia creada = createUseCase.vincular(familia);
    return new ResponseEntity<>(mapper.toResponse(creada), HttpStatus.CREATED);
  }
  /**
   * =============================================================================
   * ==================
   */

  // 2. Listar todos los registros familiares con su detalle completo,
  // incluyendo la información del alumno y la lista de apoderados vinculados
  // (GET)
  @GetMapping("/all")
  public ResponseEntity<List<FamiliaDetalleResponse>> listarDetalleFamilias() {
    List<Familia> familias = getUseCase.listarTodas();
    List<FamiliaDetalleResponse> response = familias.stream()
        .map(familia -> {
          Alumno alumno = alumnoService.findById(familia.getAlumnoId());
          List<Apoderado> apoderados = apoderadoService.findByIds(
              familia.getApoderadosIds());
          return mapper.toDetalleResponse(familia, alumno, apoderados);
        })
        .toList();
    return ResponseEntity.ok(response);
  }

  /**
   * =============================================================================
   * ==================
   */

  // 3. Obtener el detalle completo de un registro familiar por su ID,
  // incluyendo la información del alumno y la lista de apoderados vinculados
  // (GET)
  @GetMapping("by-id/{id}")
  public ResponseEntity<FamiliaDetalleResponse> obtenerDetalleFamiliar(@PathVariable Long id) {
    Familia familia = getUseCase.obtenerPorId(id);
    Alumno alumno = alumnoService.findById(familia.getAlumnoId());
    List<Apoderado> apoderados = apoderadoService.findByIds(familia.getApoderadosIds());
    FamiliaDetalleResponse response = mapper.toDetalleResponse(familia, alumno, apoderados);
    return ResponseEntity.ok(response);
  }

  /**
   * =============================================================================
   * ==================
   */

    // 4. Eliminar por completo el registro familiar (DELETE)
  @DeleteMapping("/{id}")
  public ResponseEntity<Void> eliminarPorId(@PathVariable Long id) {
    deleteUseCase.eliminar(id);
    return ResponseEntity.noContent().build();
  }

  /**
   * =============================================================================
   * ==================
   */

  // 5. Agregar un apoderado individual a la lista de la familia existente (POST)
  @PostMapping("/{alumnoId}/familias/apoderados/{apoderadoId}")
  public ResponseEntity<Void> agregarApoderado(
      @PathVariable Long alumnoId,
      @PathVariable Long apoderadoId) {
    agregarApoderadoUseCase.ejecutar(alumnoId, apoderadoId);
    return ResponseEntity.status(HttpStatus.CREATED).build();
  }


  // 5. Desvincular un apoderado de la lista familiar (DELETE)
  @DeleteMapping("/{alumnoId}/familias/apoderados/{apoderadoId}")
  public ResponseEntity<Void> desvincularApoderado(
      @PathVariable Long alumnoId,
      @PathVariable Long apoderadoId) {
    deleteUseCase.desvincularApoderado(alumnoId, apoderadoId);
    return ResponseEntity.noContent().build();
  }

}
