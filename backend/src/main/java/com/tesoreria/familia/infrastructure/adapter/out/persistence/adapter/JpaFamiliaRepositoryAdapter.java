package com.tesoreria.familia.infrastructure.adapter.out.persistence.adapter;

import com.tesoreria.familia.core.model.Familia;
import com.tesoreria.familia.core.port.out.FamiliaRepositoryOutPort;
import com.tesoreria.familia.infrastructure.adapter.out.persistence.entity.FamiliaEntity;
import com.tesoreria.familia.infrastructure.adapter.out.persistence.mapper.FamiliaPersistenceMapper;
import com.tesoreria.familia.infrastructure.adapter.out.persistence.repository.FamiliaJpaRepository;
import com.tesoreria.shared.domain.pagination.PageRequest;
import com.tesoreria.shared.domain.pagination.PageResponse;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Repository
@Transactional
public class JpaFamiliaRepositoryAdapter implements FamiliaRepositoryOutPort {

    private final FamiliaJpaRepository jpaRepository;
    private final FamiliaPersistenceMapper mapper;

    public JpaFamiliaRepositoryAdapter(FamiliaJpaRepository jpaRepository, FamiliaPersistenceMapper mapper) {
        this.jpaRepository = jpaRepository;
        this.mapper = mapper;
    }

    @Override
    public Familia save(Familia familia) {
        FamiliaEntity entity = mapper.toEntity(familia);
        FamiliaEntity savedEntity = jpaRepository.save(entity);
        return mapper.toDomain(savedEntity);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<Familia> findById(Long familiaId) {
        return jpaRepository.findById(familiaId).map(mapper::toDomain);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<Familia> findDetalleById(Long familiaId) {
        return findById(familiaId);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<Familia> findByAlumnoId(Long alumnoId) {
        return jpaRepository.findByAlumnoId(alumnoId).map(mapper::toDomain);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<Familia> findAll(PageRequest pageRequest) {
        org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(
                pageRequest.page(),
                pageRequest.size());

        org.springframework.data.domain.Page<FamiliaEntity> pageEntity = jpaRepository.findAll(pageable);

        return new PageResponse<>(
                pageEntity.getContent().stream().map(mapper::toDomain).toList(),
                pageEntity.getNumber(),
                pageEntity.getSize(),
                pageEntity.getTotalElements(),
                pageEntity.getTotalPages());
    }

    @Override
    public void delete(Familia familia) {
        jpaRepository.delete(mapper.toEntity(familia));
    }

    @Override
    public void deleteById(Long familiaId) {
        jpaRepository.deleteById(familiaId);
    }

    @Override
    @Transactional(readOnly = true)
    public boolean existsById(Long familiaId) {
        return jpaRepository.existsById(familiaId);
    }

    @Override
    @Transactional(readOnly = true)
    public boolean existsByAlumnoId(Long alumnoId) {
        return jpaRepository.existsByAlumnoId(alumnoId);
    }
}
