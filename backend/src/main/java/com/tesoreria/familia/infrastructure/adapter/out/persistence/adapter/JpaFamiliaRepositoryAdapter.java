package com.tesoreria.familia.infrastructure.adapter.out.persistence.adapter;


import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import com.tesoreria.alumno.core.model.Alumno;
import com.tesoreria.apoderado.core.model.Apoderado;

import com.tesoreria.familia.core.model.Familia;
import com.tesoreria.familia.core.port.out.FamiliaRepositoryOutPort;
import com.tesoreria.familia.infrastructure.adapter.out.persistence.entity.FamiliaEntity;
import com.tesoreria.familia.infrastructure.adapter.out.persistence.mapper.FamiliaPersistenceMapper;
import com.tesoreria.familia.infrastructure.adapter.out.persistence.repository.FamiliaJpaRepository;
import com.tesoreria.shared.domain.pagination.PageRequest;
import com.tesoreria.shared.domain.pagination.PageResponse;


@Repository
@Transactional()
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
        return jpaRepository.findById(familiaId).map(mapper::toDomain);
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
        pageEntity.getContent()
            .stream()
            .map(mapper::toDomain) // Usando tu mapper de familia
            .toList(),
        pageEntity.getNumber(),
        pageEntity.getSize(),
        pageEntity.getTotalElements(),
        pageEntity.getTotalPages());
}

    @Override
    @Transactional(readOnly = true)
    public List<Apoderado> findApoderadosByAlumnoId(Long alumnoId) {
        return jpaRepository.findApoderadosByAlumnoId(alumnoId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Alumno> findAlumnosByApoderadoId(Long apoderadoId) {
        return jpaRepository.findAlumnosByApoderadoId(apoderadoId);
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

    @Override
    @Transactional(readOnly = true)
    public boolean existsPrincipalByAlumnoId(Long alumnoId) {
        return jpaRepository.existsByAlumnoIdAndPrincipalTrue(alumnoId);
    }
}
