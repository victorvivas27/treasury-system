package com.tesoreria.alumno.infrastructure.adapter.out.persistence.adapter;

import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;

import com.tesoreria.alumno.core.model.Alumno;
import com.tesoreria.alumno.core.port.out.AlumnoRepositoryOutPort;
import com.tesoreria.alumno.infrastructure.adapter.out.persistence.entity.AlumnoEntity;
import com.tesoreria.alumno.infrastructure.adapter.out.persistence.mapper.AlumnoPersistenceMapper;
import com.tesoreria.alumno.infrastructure.adapter.out.persistence.repository.AlumnoJpaRepository;
import com.tesoreria.apoderado.infrastructure.adapter.out.persistence.repository.ApoderadoJpaRepository;
import com.tesoreria.shared.domain.pagination.PageRequest;
import com.tesoreria.shared.domain.pagination.PageResponse;

@Repository
public class JpaAlumnoRepositoryAdapter implements AlumnoRepositoryOutPort {

  private final AlumnoJpaRepository jpaRepository;
  private final AlumnoPersistenceMapper persistenceMapper;

  public JpaAlumnoRepositoryAdapter(
      AlumnoJpaRepository jpaRepository,
      ApoderadoJpaRepository apoderadoJpaRepository,
      AlumnoPersistenceMapper persistenceMapper) {
    this.jpaRepository = jpaRepository;
    this.persistenceMapper = persistenceMapper;
  }

  @Override
  public Alumno save(Alumno alumno) {
    AlumnoEntity entity = persistenceMapper.toEntity(alumno);
    AlumnoEntity saved = jpaRepository.save(entity);
    return persistenceMapper.toDomain(saved);
  }

  @Override
  public Optional<Alumno> findById(Long alumnoId) {
    return jpaRepository.findById(alumnoId).map(persistenceMapper::toDomain);
  }

  @Override
  public PageResponse<Alumno> findAll(PageRequest pageRequest) {
    Pageable pageable = org.springframework.data.domain.PageRequest.of(
        pageRequest.page(),
        pageRequest.size());

    Page<AlumnoEntity> pageEntity = jpaRepository.findAll(pageable);

    return new PageResponse<>(
        pageEntity.getContent().stream().map(persistenceMapper::toDomain).toList(),
        pageEntity.getNumber(),
        pageEntity.getSize(),
        pageEntity.getTotalElements(),
        pageEntity.getTotalPages());
  }

  @Override
  public void deleteById(Long alumnoId) {
    jpaRepository.deleteById(alumnoId);
  }

  @Override
  public boolean existsById(Long alumnoId) {
    return jpaRepository.existsById(alumnoId);
  }
}
