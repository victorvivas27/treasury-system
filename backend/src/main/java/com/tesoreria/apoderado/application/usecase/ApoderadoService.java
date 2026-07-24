package com.tesoreria.apoderado.application.usecase;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.tesoreria.apoderado.core.exception.ApoderadoErrorCode;
import com.tesoreria.apoderado.core.model.Apoderado;
import com.tesoreria.apoderado.core.port.in.CreateApoderadoUseCase;
import com.tesoreria.apoderado.core.port.in.DeleteApoderadoUseCase;
import com.tesoreria.apoderado.core.port.in.GetApoderadoUseCase;
import com.tesoreria.apoderado.core.port.in.UpdateApoderadoUseCase;
import com.tesoreria.apoderado.core.port.out.ApoderadoRepositoryOutPort;
import com.tesoreria.shared.domain.exception.DomainException;
import com.tesoreria.shared.domain.pagination.PageRequest;
import com.tesoreria.shared.domain.pagination.PageResponse;

@Service
public class ApoderadoService implements
    CreateApoderadoUseCase,
    GetApoderadoUseCase,
    UpdateApoderadoUseCase,
    DeleteApoderadoUseCase {
  private static final String CODE_FORMAT = "^AP-[A-Z0-9]{8}$";
  private final ApoderadoRepositoryOutPort repository;

  public ApoderadoService(ApoderadoRepositoryOutPort repository) {
    this.repository = repository;
  }

  @Override
  public Apoderado create(Apoderado apoderado) {
    if (repository.existsByEmail(apoderado.getEmail())) {
      throw emailExistente(apoderado.getEmail());
    }
    return repository.save(apoderado);
  }

  @Override
  public Apoderado findByCodigo(String codigo) {
    if (codigo == null || !codigo.matches(CODE_FORMAT)) {
      throw invalidCodeFormat();
    }
    return repository.findByCodigo(codigo)
        .orElseThrow(() -> apoderadoNoEncontrado(codigo));
  }

  @Override
  public PageResponse<Apoderado> findAll(PageRequest pageRequest) {
    return repository.findAll(pageRequest);
  }

  public Apoderado findById(Long apoderadoId) {
    return repository.findById(apoderadoId)
        .orElseThrow(() -> apoderadoNoEncontrado(String.valueOf(apoderadoId)));
  }

  public List<Apoderado> findByIds(List<Long> apoderadosIds) {
    return repository.findAllByIds(apoderadosIds);
  }

  @Override
  @Transactional
  public Apoderado updateByCodigo(String codigo, Apoderado apoderado) {
    if (codigo == null || !codigo.matches(CODE_FORMAT)) {
      throw invalidCodeFormat();
    }

    Apoderado existing = repository.findByCodigo(codigo)
        .orElseThrow(() -> apoderadoNoEncontrado(codigo));

    if (!existing.getEmail().equals(apoderado.getEmail()) &&
        repository.existsByEmail(apoderado.getEmail())) {
      throw emailExistente(apoderado.getEmail());
    }

    existing.setNombre(apoderado.getNombre());
    existing.setEmail(apoderado.getEmail());
    existing.setTelefono(apoderado.getTelefono());
    existing.setObservaciones(apoderado.getObservaciones());

    return repository.save(existing);
  }

  @Override
  @Transactional
  public void deleteByCodigo(String codigo) {
    if (codigo == null || !codigo.matches(CODE_FORMAT)) {
      throw invalidCodeFormat();
    }
    if (!repository.existsByCodigo(codigo)) {
      throw apoderadoNoEncontrado(codigo);
    }
    repository.deleteByCodigo(codigo);
  }

  private DomainException apoderadoNoEncontrado(String codigo) {
    return new DomainException(
        ApoderadoErrorCode.NOT_FOUND.getField(),
        ApoderadoErrorCode.NOT_FOUND.getStatus(),
        "Apoderado con codigo " + codigo + " no encontrado");
  }

  private DomainException invalidCodeFormat() {
    return new DomainException(
        ApoderadoErrorCode.INVALID_FORMAT.getField(),
        ApoderadoErrorCode.INVALID_FORMAT.getStatus(),
        "Formato de código inválido. Debe ser AP-XXXXXXXX");
  }

  private DomainException emailExistente(String email) {
    return new DomainException(
        ApoderadoErrorCode.EMAIL_EXISTE.getField(),
        ApoderadoErrorCode.EMAIL_EXISTE.getStatus(),
        "El email " + email + " ya está registrado");
  }

}
