package com.tesoreria.app.apoderado.C_infrastructure.adapter.out.persistence.adapter;

import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;

import com.tesoreria.app.apoderado.A_domain.model.Apoderado;
import com.tesoreria.app.apoderado.A_domain.port.out.ApoderadoRepositoryOutPort;
import com.tesoreria.app.apoderado.C_infrastructure.adapter.out.persistence.entity.ApoderadoEntity;
import com.tesoreria.app.apoderado.C_infrastructure.adapter.out.persistence.mapper.ApoderadoPersistenceMapper;
import com.tesoreria.app.apoderado.C_infrastructure.adapter.out.persistence.repository.ApoderadoJpaRepository;
import com.tesoreria.app.shared.domain.pagination.PageRequest;
import com.tesoreria.app.shared.domain.pagination.PageResponse;

@Repository
public class JpaApoderadoRepositoryAdapter implements ApoderadoRepositoryOutPort {

  private final ApoderadoJpaRepository jpaRepository;
  private final ApoderadoPersistenceMapper persistenceMapper;

  public JpaApoderadoRepositoryAdapter(
      ApoderadoJpaRepository jpaRepository,
      ApoderadoPersistenceMapper persistenceMapper) {
    this.jpaRepository = jpaRepository;
    this.persistenceMapper = persistenceMapper;
  }

  @Override
  public Apoderado save(Apoderado apoderado) {
    ApoderadoEntity entity = persistenceMapper.toEntity(apoderado);
    ApoderadoEntity saved = jpaRepository.save(entity);
    return persistenceMapper.toDomain(saved);
  }

  @Override
  public Optional<Apoderado> findById(Long id) {
    return jpaRepository.findById(id)
        .map(persistenceMapper::toDomain);
  }

  @Override
  public PageResponse<Apoderado> findAll(PageRequest pageRequest) {
    Pageable pageable = org.springframework.data.domain.PageRequest.of(
        pageRequest.page(),
        pageRequest.size());

    Page<ApoderadoEntity> pageEntity = jpaRepository.findAll(pageable);

    return new PageResponse<>(
        pageEntity.getContent()
            .stream()
            .map(persistenceMapper::toDomain)
            .toList(),
        pageEntity.getNumber(),
        pageEntity.getSize(),
        pageEntity.getTotalElements(),
        pageEntity.getTotalPages());
  }

  @Override
  public void deleteById(Long id) {
    jpaRepository.deleteById(id);
  }

  @Override
  public boolean existsByEmail(String email) {
    return jpaRepository.existsByEmail(email);
  }

  @Override
  public boolean existsById(Long id) {
    return jpaRepository.existsById(id);
  }
}
