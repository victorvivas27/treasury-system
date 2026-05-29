package com.tesoreria.familia.application.usecase;

import java.util.List;

import com.tesoreria.familia.core.model.AlumnoVinculado;
import com.tesoreria.familia.core.exception.FamiliaErrorCode;
import com.tesoreria.familia.core.model.AlumnoApoderadoVinculado;
import com.tesoreria.familia.core.model.Familia;
import com.tesoreria.familia.core.model.FamiliaDetalle;
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
    DeleteFamiliaUseCase {

  private static final String NO_ENCONTRADO = " no encontrado";

  private final FamiliaRepositoryOutPort repository;

  public FamiliaService(FamiliaRepositoryOutPort repository) {
    this.repository = repository;
  }

  @Override
  public Familia vincular(Familia familia) {
    validarAlumnoExiste(familia.getAlumnoId());
    validarApoderadoExiste(familia.getApoderadoId());

    if (repository.existsByAlumnoIdAndApoderadoId(familia.getAlumnoId(), familia.getApoderadoId())) {
      throw new DomainException(
          FamiliaErrorCode.DUPLICADO.getCodigo(),
          FamiliaErrorCode.DUPLICADO.getField(),
          FamiliaErrorCode.DUPLICADO.getStatus(),
          "El apoderado ya está vinculado al alumno");
    }

    validarPrincipalDisponible(familia);
    return repository.save(familia);
  }

  @Override
  public FamiliaDetalle obtenerPorId(Long id) {
    validarId(id);
    return repository.findDetalleById(id)
        .orElseThrow(() -> vinculoNoEncontrado(id));
  }

  @Override
  public PageResponse<FamiliaDetalle> listar(PageRequest pageRequest) {
    return repository.findAll(pageRequest);
  }

  @Override
  public List<AlumnoApoderadoVinculado> listarApoderadosPorAlumno(Long alumnoId) {
    validarAlumnoId(alumnoId);
    validarAlumnoExiste(alumnoId);
    return repository.findApoderadosByAlumnoId(alumnoId);
  }

  @Override
  public List<AlumnoVinculado> listarAlumnosPorApoderado(Long apoderadoId) {
    validarApoderadoId(apoderadoId);
    validarApoderadoExiste(apoderadoId);
    return repository.findAlumnosByApoderadoId(apoderadoId);
  }

  @Override
  public Familia actualizar(Familia familia) {
    validarAlumnoExiste(familia.getAlumnoId());
    validarApoderadoExiste(familia.getApoderadoId());

    Familia existente = repository
        .findByAlumnoIdAndApoderadoId(familia.getAlumnoId(), familia.getApoderadoId())
        .orElseThrow(() -> vinculoNoEncontrado(familia.getAlumnoId(), familia.getApoderadoId()));

    existente.setParentesco(familia.getParentesco());
    existente.setPrincipal(familia.getPrincipal());
    existente.setObservaciones(familia.getObservaciones());

    validarPrincipalDisponible(existente);
    return repository.save(existente);
  }

  @Override
  public Familia actualizar(Long id, Familia familia) {
    validarId(id);

    Familia existente = repository.findById(id)
        .orElseThrow(() -> vinculoNoEncontrado(id));

    existente.setParentesco(familia.getParentesco());
    existente.setPrincipal(familia.getPrincipal());
    existente.setObservaciones(familia.getObservaciones());

    validarPrincipalDisponible(existente);
    return repository.save(existente);
  }

  @Override
  public void eliminar(Long alumnoId, Long apoderadoId) {
    validarAlumnoId(alumnoId);
    validarApoderadoId(apoderadoId);
    validarAlumnoExiste(alumnoId);
    validarApoderadoExiste(apoderadoId);

    Familia familia = repository.findByAlumnoIdAndApoderadoId(alumnoId, apoderadoId)
        .orElseThrow(() -> vinculoNoEncontrado(alumnoId, apoderadoId));

    repository.delete(familia);
  }

  @Override
  public void eliminar(Long id) {
    validarId(id);
    if (!repository.existsById(id)) {
      throw vinculoNoEncontrado(id);
    }
    repository.deleteById(id);
  }

  private void validarPrincipalDisponible(Familia familia) {
    if (!Boolean.TRUE.equals(familia.getPrincipal())) {
      return;
    }

    boolean existePrincipal = familia.getId() == null
        ? repository.existsPrincipalByAlumnoId(familia.getAlumnoId())
        : repository.existsPrincipalByAlumnoIdAndApoderadoIdNot(familia.getAlumnoId(), familia.getApoderadoId());

    if (existePrincipal) {
      throw new DomainException(
          FamiliaErrorCode.PRINCIPAL_DUPLICADO.getCodigo(),
          FamiliaErrorCode.PRINCIPAL_DUPLICADO.getField(),
          FamiliaErrorCode.PRINCIPAL_DUPLICADO.getStatus(),
          "El alumno ya tiene un apoderado principal");
    }
  }

  private void validarAlumnoExiste(Long alumnoId) {
    validarAlumnoId(alumnoId);
    if (!repository.existsAlumnoById(alumnoId)) {
      throw new DomainException(
          FamiliaErrorCode.ALUMNO_NOT_FOUND.getCodigo(),
          FamiliaErrorCode.ALUMNO_NOT_FOUND.getField(),
          FamiliaErrorCode.ALUMNO_NOT_FOUND.getStatus(),
          "Alumno con id " + alumnoId + NO_ENCONTRADO);
    }
  }

  private void validarApoderadoExiste(Long apoderadoId) {
    validarApoderadoId(apoderadoId);
    if (!repository.existsApoderadoById(apoderadoId)) {
      throw new DomainException(
          FamiliaErrorCode.APODERADO_NOT_FOUND.getCodigo(),
          FamiliaErrorCode.APODERADO_NOT_FOUND.getField(),
          FamiliaErrorCode.APODERADO_NOT_FOUND.getStatus(),
          "Apoderado con id " + apoderadoId + NO_ENCONTRADO);
    }
  }

  private void validarAlumnoId(Long alumnoId) {
    if (alumnoId == null || alumnoId <= 0) {
      throw new DomainException(
          FamiliaErrorCode.ALUMNO_ID_INVALIDO.getCodigo(),
          FamiliaErrorCode.ALUMNO_ID_INVALIDO.getField(),
          FamiliaErrorCode.ALUMNO_ID_INVALIDO.getStatus(),
          "El alumno ID debe ser un número positivo");
    }
  }

  private void validarApoderadoId(Long apoderadoId) {
    if (apoderadoId == null || apoderadoId <= 0) {
      throw new DomainException(
          FamiliaErrorCode.APODERADO_ID_INVALIDO.getCodigo(),
          FamiliaErrorCode.APODERADO_ID_INVALIDO.getField(),
          FamiliaErrorCode.APODERADO_ID_INVALIDO.getStatus(),
          "El apoderado ID debe ser un número positivo");
    }
  }

  private void validarId(Long id) {
    if (id == null || id <= 0) {
      throw new DomainException(
          FamiliaErrorCode.NOT_FOUND.getCodigo(),
          FamiliaErrorCode.NOT_FOUND.getField(),
          FamiliaErrorCode.NOT_FOUND.getStatus(),
          "Vínculo con id " + id + NO_ENCONTRADO);
    }
  }

  private DomainException vinculoNoEncontrado(Long alumnoId, Long apoderadoId) {
    return new DomainException(
        FamiliaErrorCode.NOT_FOUND.getCodigo(),
        FamiliaErrorCode.NOT_FOUND.getField(),
        FamiliaErrorCode.NOT_FOUND.getStatus(),
        "No existe vínculo entre alumno " + alumnoId + " y apoderado " + apoderadoId);
  }

  private DomainException vinculoNoEncontrado(Long id) {
    return new DomainException(
        FamiliaErrorCode.NOT_FOUND.getCodigo(),
        FamiliaErrorCode.NOT_FOUND.getField(),
        FamiliaErrorCode.NOT_FOUND.getStatus(),
        "Vínculo con id " + id + NO_ENCONTRADO);
  }
}
