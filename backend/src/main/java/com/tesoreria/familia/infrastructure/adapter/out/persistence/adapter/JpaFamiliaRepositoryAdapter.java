package com.tesoreria.familia.infrastructure.adapter.out.persistence.adapter;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Repository;

import com.tesoreria.alumno.infrastructure.adapter.out.persistence.entity.AlumnoEntity;
import com.tesoreria.alumno.infrastructure.adapter.out.persistence.repository.AlumnoJpaRepository;
import com.tesoreria.apoderado.infrastructure.adapter.out.persistence.entity.ApoderadoEntity;
import com.tesoreria.apoderado.infrastructure.adapter.out.persistence.repository.ApoderadoJpaRepository;
import com.tesoreria.familia.core.model.AlumnoVinculado;
import com.tesoreria.familia.core.model.AlumnoApoderadoVinculado;
import com.tesoreria.familia.core.model.Familia;
import com.tesoreria.familia.core.model.FamiliaDetalle;
import com.tesoreria.familia.core.port.out.FamiliaRepositoryOutPort;
import com.tesoreria.familia.infrastructure.adapter.out.persistence.entity.FamiliaEntity;
import com.tesoreria.familia.infrastructure.adapter.out.persistence.mapper.FamiliaPersistenceMapper;
import com.tesoreria.familia.infrastructure.adapter.out.persistence.repository.FamiliaJpaRepository;
import com.tesoreria.shared.domain.pagination.PageResponse;

@Repository
public class JpaFamiliaRepositoryAdapter implements FamiliaRepositoryOutPort {

  private final FamiliaJpaRepository jpaRepository;
  private final AlumnoJpaRepository alumnoJpaRepository;
  private final ApoderadoJpaRepository apoderadoJpaRepository;
  private final FamiliaPersistenceMapper persistenceMapper;

  public JpaFamiliaRepositoryAdapter(
      FamiliaJpaRepository jpaRepository,
      AlumnoJpaRepository alumnoJpaRepository,
      ApoderadoJpaRepository apoderadoJpaRepository,
      FamiliaPersistenceMapper persistenceMapper) {
    this.jpaRepository = jpaRepository;
    this.alumnoJpaRepository = alumnoJpaRepository;
    this.apoderadoJpaRepository = apoderadoJpaRepository;
    this.persistenceMapper = persistenceMapper;
  }

  @Override
  public Familia save(Familia familia) {
    FamiliaEntity entity = persistenceMapper.toEntity(familia);
    FamiliaEntity saved = jpaRepository.save(entity);
    return persistenceMapper.toDomain(saved);
  }

  @Override
  public Optional<Familia> findById(Long id) {
    return jpaRepository.findById(id).map(persistenceMapper::toDomain);
  }

  @Override
  public Optional<FamiliaDetalle> findDetalleById(Long id) {
    return jpaRepository.findById(id).flatMap(this::toDetalle);
  }

  @Override
  public Optional<Familia> findByAlumnoIdAndApoderadoId(Long alumnoId, Long apoderadoId) {
    return jpaRepository.findByAlumnoIdAndApoderadoId(alumnoId, apoderadoId)
        .map(persistenceMapper::toDomain);
  }

  @Override
  public PageResponse<FamiliaDetalle> findAll(
      com.tesoreria.shared.domain.pagination.PageRequest pageRequest) {
    Page<FamiliaEntity> page = jpaRepository.findAll(PageRequest.of(pageRequest.page(), pageRequest.size()));
    List<FamiliaDetalle> content = page.getContent().stream()
        .flatMap(familia -> toDetalle(familia).stream())
        .toList();

    return new PageResponse<>(
        content,
        page.getNumber(),
        page.getSize(),
        page.getTotalElements(),
        page.getTotalPages());
  }

  @Override
  public List<AlumnoApoderadoVinculado> findApoderadosByAlumnoId(Long alumnoId) {
    return jpaRepository.findByAlumnoId(alumnoId).stream()
        .flatMap(familia -> apoderadoJpaRepository.findById(familia.getApoderadoId())
            .stream()
            .map(apoderado -> toAlumnoApoderadoVinculado(familia, apoderado)))
        .toList();
  }

  @Override
  public List<AlumnoVinculado> findAlumnosByApoderadoId(Long apoderadoId) {
    return jpaRepository.findByApoderadoId(apoderadoId).stream()
        .flatMap(familia -> alumnoJpaRepository.findById(familia.getAlumnoId())
            .stream()
            .map(alumno -> toAlumnoVinculado(familia, alumno)))
        .toList();
  }

  @Override
  public void delete(Familia familia) {
    jpaRepository.delete(persistenceMapper.toEntity(familia));
  }

  @Override
  public void deleteById(Long id) {
    jpaRepository.deleteById(id);
  }

  @Override
  public boolean existsById(Long id) {
    return jpaRepository.existsById(id);
  }

  @Override
  public boolean existsAlumnoById(Long alumnoId) {
    return alumnoJpaRepository.existsById(alumnoId);
  }

  @Override
  public boolean existsApoderadoById(Long apoderadoId) {
    return apoderadoJpaRepository.existsById(apoderadoId);
  }

  @Override
  public boolean existsByAlumnoIdAndApoderadoId(Long alumnoId, Long apoderadoId) {
    return jpaRepository.existsByAlumnoIdAndApoderadoId(alumnoId, apoderadoId);
  }

  @Override
  public boolean existsPrincipalByAlumnoId(Long alumnoId) {
    return jpaRepository.existsByAlumnoIdAndPrincipalTrue(alumnoId);
  }

  @Override
  public boolean existsPrincipalByAlumnoIdAndApoderadoIdNot(Long alumnoId, Long apoderadoId) {
    return jpaRepository.existsByAlumnoIdAndApoderadoIdNotAndPrincipalTrue(alumnoId, apoderadoId);
  }

  private AlumnoApoderadoVinculado toAlumnoApoderadoVinculado(
      FamiliaEntity familia,
      ApoderadoEntity apoderado) {
    return new AlumnoApoderadoVinculado(
        apoderado.getId(),
        apoderado.getCodigo(),
        apoderado.getNombre(),
        apoderado.getEmail(),
        apoderado.getTelefono(),
        familia.getParentesco(),
        familia.getPrincipal(),
        familia.getObservaciones());
  }

  private AlumnoVinculado toAlumnoVinculado(FamiliaEntity familia, AlumnoEntity alumno) {
    return new AlumnoVinculado(
        alumno.getId(),
        alumno.getCodigo(),
        alumno.getNombre(),
        alumno.getCurso(),
        familia.getParentesco(),
        familia.getPrincipal());
  }

  private Optional<FamiliaDetalle> toDetalle(FamiliaEntity familia) {
    Optional<AlumnoEntity> alumno = alumnoJpaRepository.findById(familia.getAlumnoId());
    Optional<ApoderadoEntity> apoderado = apoderadoJpaRepository.findById(familia.getApoderadoId());

    if (alumno.isEmpty() || apoderado.isEmpty()) {
      return Optional.empty();
    }

    return Optional.of(toDetalle(familia, alumno.get(), apoderado.get()));
  }

  private FamiliaDetalle toDetalle(
      FamiliaEntity familia,
      AlumnoEntity alumno,
      ApoderadoEntity apoderado) {
    return new FamiliaDetalle(
        familia.getId(),
        alumno.getId(),
        alumno.getCodigo(),
        alumno.getNombre(),
        alumno.getCurso(),
        apoderado.getId(),
        apoderado.getCodigo(),
        apoderado.getNombre(),
        familia.getParentesco(),
        familia.getPrincipal(),
        familia.getObservaciones());
  }
}
