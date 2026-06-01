package com.tesoreria.familia.application.usecase;

import java.util.List;

import com.tesoreria.apoderado.core.model.Apoderado;
import com.tesoreria.familia.core.exception.FamiliaErrorCode;
import com.tesoreria.familia.core.model.Familia;
import com.tesoreria.familia.core.port.in.AgregarApoderadoAFamiliaUseCase;
import com.tesoreria.familia.core.port.in.CreateFamiliaUseCase;
import com.tesoreria.familia.core.port.in.DeleteFamiliaUseCase;
import com.tesoreria.familia.core.port.in.GetFamiliaUseCase;
import com.tesoreria.familia.core.port.in.UpdateFamiliaUseCase;
import com.tesoreria.familia.core.port.out.FamiliaRepositoryOutPort;
import com.tesoreria.shared.domain.exception.DomainException;
import com.tesoreria.shared.domain.pagination.PageRequest;
import com.tesoreria.shared.domain.pagination.PageResponse;


public class FamiliaService implements
    CreateFamiliaUseCase,
    GetFamiliaUseCase,
    UpdateFamiliaUseCase,
    DeleteFamiliaUseCase,
    AgregarApoderadoAFamiliaUseCase {

  private final FamiliaRepositoryOutPort familiaRepository;

  // Inyección por constructor (ideal para testing y desacoplado de Spring en el core)
  public FamiliaService(FamiliaRepositoryOutPort familiaRepository) {
    this.familiaRepository = familiaRepository;
  }

  // --- CreateFamiliaUseCase ---
  @Override
  public Familia crearFamilia(Familia familia) {
    // Validar si ya existe una configuración familiar para el alumno
    if (familiaRepository.existsByAlumnoId(familia.getAlumnoId())) {
      throw new DomainException(
          FamiliaErrorCode.DUPLICADO.getCodigo(),
          FamiliaErrorCode.DUPLICADO.getField(),
          FamiliaErrorCode.DUPLICADO.getStatus(),
          "El alumno ya tiene un grupo familiar asignado");
    }

    // Validar regla de negocio de duplicidad de 'principal' a nivel de persistencia si aplica
    if (Boolean.TRUE.equals(familia.getPrincipal()) && familiaRepository.existsPrincipalByAlumnoId(familia.getAlumnoId())) {
      throw new DomainException(
          FamiliaErrorCode.PRINCIPAL_DUPLICADO.getCodigo(),
          FamiliaErrorCode.PRINCIPAL_DUPLICADO.getField(),
          FamiliaErrorCode.PRINCIPAL_DUPLICADO.getStatus(),
          "Ya existe un grupo familiar principal para este alumno");
    }

    return familiaRepository.save(familia);
  }

  // --- GetFamiliaUseCase ---
  @Override
  public Familia obtenerFamiliaPorId(Long id) {
    return familiaRepository.findById(id)
        .orElseThrow(() -> new DomainException(
            FamiliaErrorCode.NOT_FOUND.getCodigo(),
            FamiliaErrorCode.NOT_FOUND.getField(),
            FamiliaErrorCode.NOT_FOUND.getStatus(),
            "No se encontró la configuración familiar con el ID provisto"));
  }

  @Override
  public PageResponse<Familia> listarFamilia(PageRequest pageRequest) {
    return familiaRepository.findAll(pageRequest);
  }

  @Override
  public List<Apoderado> listarApoderadosPorAlumno(Long alumnoId) {
    return familiaRepository.findApoderadosByAlumnoId(alumnoId);
  }

  // --- UpdateFamiliaUseCase ---
  @Override
  public Familia actualizarFamilia(Long id, Familia familia) {
    Familia familiaExistente = obtenerFamiliaPorId(id);

    // Actualizar campos permitidos resguardando las invariantes del dominio
    familiaExistente.setAlumnoId(familia.getAlumnoId());
    familiaExistente.setApoderadosIds(familia.getApoderadosIds());
    familiaExistente.setParentesco(familia.getParentesco());
    familiaExistente.setPrincipal(familia.getPrincipal());
    familiaExistente.setObservaciones(familia.getObservaciones());

    return familiaRepository.save(familiaExistente);
  }

  // --- DeleteFamiliaUseCase ---
  @Override
  public void eliminarFamilia(Long id) {
    if (!familiaRepository.existsById(id)) {
      throw new DomainException(
          FamiliaErrorCode.NOT_FOUND.getCodigo(),
          FamiliaErrorCode.NOT_FOUND.getField(),
          FamiliaErrorCode.NOT_FOUND.getStatus(),
          "No se puede eliminar: la familia no existe");
    }
    familiaRepository.deleteById(id);
  }

  @Override
  public void desvincularApoderado(Long alumnoId, Long apoderadoId) {
    Familia familia = familiaRepository.findByAlumnoId(alumnoId)
        .orElseThrow(() -> new DomainException(
            FamiliaErrorCode.ALUMNO_NOT_FOUND.getCodigo(),
            FamiliaErrorCode.ALUMNO_NOT_FOUND.getField(),
            FamiliaErrorCode.ALUMNO_NOT_FOUND.getStatus(),
            "No se encontró un grupo familiar para el alumno indicado"));

    // Mutar la lista usando las reglas internas del dominio (reconstruir la lista sin el ID)
    List<Long> idsActuales = new java.util.ArrayList<>(familia.getApoderadosIds());
    if (!idsActuales.contains(apoderadoId)) {
      throw new DomainException(
          FamiliaErrorCode.APODERADO_NOT_FOUND.getCodigo(),
          FamiliaErrorCode.APODERADO_NOT_FOUND.getField(),
          FamiliaErrorCode.APODERADO_NOT_FOUND.getStatus(),
          "El apoderado no pertenece a este grupo familiar");
    }

    idsActuales.remove(apoderadoId);

    // Si se queda sin apoderados, el dominio lanzará excepción automáticamente según sus invariantes
    familia.setApoderadosIds(idsActuales);

    familiaRepository.save(familia);
  }

  // --- AgregarApoderadoAFamiliaUseCase ---
  @Override
  public void ejecutar(Long alumnoId, Long nuevoApoderadoId) {
    Familia familia = familiaRepository.findByAlumnoId(alumnoId)
        .orElseThrow(() -> new DomainException(
            FamiliaErrorCode.ALUMNO_NOT_FOUND.getCodigo(),
            FamiliaErrorCode.ALUMNO_NOT_FOUND.getField(),
            FamiliaErrorCode.ALUMNO_NOT_FOUND.getStatus(),
            "No existe un grupo familiar creado para este alumno. Debe vincular uno primero"));

    // El dominio ejecuta y valida la regla 'APODERADO_YA_VINCULADO' internamente
    familia.vincularApoderado(nuevoApoderadoId);

    familiaRepository.save(familia);
  }
}
