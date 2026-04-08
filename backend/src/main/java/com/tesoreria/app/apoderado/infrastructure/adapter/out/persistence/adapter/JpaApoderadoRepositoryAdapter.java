package com.tesoreria.app.apoderado.infrastructure.adapter.out.persistence.adapter;

import com.tesoreria.app.apoderado.domain.model.Apoderado;
import com.tesoreria.app.apoderado.domain.port.out.ApoderadoRepositoryOutPort;
import com.tesoreria.app.apoderado.infrastructure.adapter.out.persistence.entity.ApoderadoEntity;
import com.tesoreria.app.apoderado.infrastructure.adapter.out.persistence.mapper.ApoderadoPersistenceMapper;
import com.tesoreria.app.apoderado.infrastructure.adapter.out.persistence.repository.ApoderadoJpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Repository
public class JpaApoderadoRepositoryAdapter implements ApoderadoRepositoryOutPort {

    private final ApoderadoJpaRepository jpaRepository;
    private final ApoderadoPersistenceMapper persistenceMapper;

    public JpaApoderadoRepositoryAdapter(
            ApoderadoJpaRepository jpaRepository,
            ApoderadoPersistenceMapper persistenceMapper
    ) {
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
    public List<Apoderado> findAll() {
        return jpaRepository.findAll()
                .stream()
                .map(persistenceMapper::toDomain)
                .collect(Collectors.toList());
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
