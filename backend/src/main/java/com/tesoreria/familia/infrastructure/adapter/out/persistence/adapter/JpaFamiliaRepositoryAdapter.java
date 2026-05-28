package com.tesoreria.familia.infrastructure.adapter.out.persistence.adapter;

import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Repository;

import com.tesoreria.alumno.infrastructure.adapter.out.persistence.repository.AlumnoJpaRepository;
import com.tesoreria.apoderado.infrastructure.adapter.out.persistence.entity.ApoderadoEntity;
import com.tesoreria.apoderado.infrastructure.adapter.out.persistence.repository.ApoderadoJpaRepository;
import com.tesoreria.familia.core.model.AlumnoApoderadoVinculado;
import com.tesoreria.familia.core.model.Familia;
import com.tesoreria.familia.core.port.out.FamiliaRepositoryOutPort;
import com.tesoreria.familia.infrastructure.adapter.out.persistence.entity.FamiliaEntity;
import com.tesoreria.familia.infrastructure.adapter.out.persistence.mapper.FamiliaPersistenceMapper;
import com.tesoreria.familia.infrastructure.adapter.out.persistence.repository.FamiliaJpaRepository;

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
  public Optional<Familia> findByAlumnoIdAndApoderadoId(Long alumnoId, Long apoderadoId) {
    return jpaRepository.findByAlumnoIdAndApoderadoId(alumnoId, apoderadoId)
        .map(persistenceMapper::toDomain);
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
  public void delete(Familia familia) {
    jpaRepository.delete(persistenceMapper.toEntity(familia));
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
}
