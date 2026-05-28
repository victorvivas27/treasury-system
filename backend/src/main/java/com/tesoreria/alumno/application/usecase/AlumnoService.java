package com.tesoreria.alumno.application.usecase;

import com.tesoreria.alumno.core.exception.AlumnoErrorCode;
import com.tesoreria.alumno.core.model.Alumno;
import com.tesoreria.alumno.core.port.in.CreateAlumnoUseCase;
import com.tesoreria.alumno.core.port.in.DeleteAlumnoUseCase;
import com.tesoreria.alumno.core.port.in.GetAlumnoUseCase;
import com.tesoreria.alumno.core.port.in.UpdateAlumnoUseCase;
import com.tesoreria.alumno.core.port.out.AlumnoRepositoryOutPort;
import com.tesoreria.shared.domain.exception.DomainException;
import com.tesoreria.shared.domain.pagination.PageRequest;
import com.tesoreria.shared.domain.pagination.PageResponse;

public class AlumnoService implements
    CreateAlumnoUseCase,
    GetAlumnoUseCase,
    UpdateAlumnoUseCase,
    DeleteAlumnoUseCase {

  private final AlumnoRepositoryOutPort repository;

  public AlumnoService(AlumnoRepositoryOutPort repository) {
    this.repository = repository;
  }

  @Override
  public Alumno create(Alumno alumno) {
    validarApoderadoExiste(alumno.getApoderadoId());
    return repository.save(alumno);
  }

  @Override
  public Alumno findById(Long id) {
    return repository.findById(id)
        .orElseThrow(() -> alumnoNoEncontrado(id));
  }

  @Override
  public PageResponse<Alumno> findAll(PageRequest pageRequest) {
    return repository.findAll(pageRequest);
  }

  @Override
  public Alumno update(Alumno alumno) {
    if (!repository.existsById(alumno.getId())) {
      throw alumnoNoEncontrado(alumno.getId());
    }

    validarApoderadoExiste(alumno.getApoderadoId());
    return repository.save(alumno);
  }

  @Override
  public void deleteById(Long id) {
    if (!repository.existsById(id)) {
      throw alumnoNoEncontrado(id);
    }
    repository.deleteById(id);
  }

  private void validarApoderadoExiste(Long apoderadoId) {
    if (!repository.existsByApoderadoId(apoderadoId)) {
      throw new DomainException(
          AlumnoErrorCode.APODERADO_NOT_FOUND.getCodigo(),
          AlumnoErrorCode.APODERADO_NOT_FOUND.getField(),
          AlumnoErrorCode.APODERADO_NOT_FOUND.getStatus(),
          "Apoderado con id " + apoderadoId + " no encontrado");
    }
  }

  private DomainException alumnoNoEncontrado(Long id) {
    return new DomainException(
        AlumnoErrorCode.NOT_FOUND.getCodigo(),
        AlumnoErrorCode.NOT_FOUND.getField(),
        AlumnoErrorCode.NOT_FOUND.getStatus(),
        "Alumno con id " + id + " no encontrado");
  }
}
