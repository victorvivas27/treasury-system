package com.tesoreria.familia.infrastructure.adapter.in.web.controller;

 import java.util.List;

 import org.springframework.http.HttpStatus;
 import org.springframework.http.ResponseEntity;
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
 import com.tesoreria.shared.infrastructure.constant.ApiConstants;

 import jakarta.validation.Valid;

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

   public FamiliaController(
       AlumnoService alumnoService,
       ApoderadoService apoderadoService,
       CreateFamiliaUseCase createUseCase,
       UpdateFamiliaUseCase updateUseCase,
       DeleteFamiliaUseCase deleteUseCase,
       GetFamiliaUseCase getUseCase,
       FamiliaMapper mapper) {
     this.alumnoService = alumnoService;
     this.apoderadoService = apoderadoService;
     this.createUseCase = createUseCase;
     this.updateUseCase = updateUseCase;
     this.deleteUseCase = deleteUseCase;
     this.getUseCase = getUseCase;
     this.mapper = mapper;
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
       @RequestParam(defaultValue = "5") int size) {
     PageResponse<Familia> result = getUseCase.listarFamilia(new PageRequest(page, size, null, null));

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
   public ResponseEntity<Void> eliminarFamilia(@PathVariable Long familiaId) {
     deleteUseCase.eliminarFamilia(familiaId);
     return ResponseEntity.noContent().build();
   }

   private FamiliaDetalleResponse toDetalleResponse(Familia familia) {
     Alumno alumno = alumnoService.findById(familia.getAlumnoId());
     List<Apoderado> apoderados = apoderadoService.findByIds(familia.getApoderadosIds());
     return mapper.toDetalleResponse(familia, alumno, apoderados);
   }

   private void validarReferencias(FamiliaRequest request) {
     alumnoService.findById(request.getAlumnoId());
     request.getApoderados().forEach(apoderado -> apoderadoService.findById(apoderado.getApoderadoId()));
   }
}
