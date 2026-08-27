package com.tesoreria.alumno.infrastructure.adapter.out.persistence.adapter;

import com.tesoreria.alumno.core.model.Alumno;
import com.tesoreria.alumno.core.model.GeneroAlumno;
import com.tesoreria.alumno.core.port.out.AlumnoRepositoryOutPort;
import com.tesoreria.alumno.infrastructure.adapter.out.persistence.entity.AlumnoEntity;
import com.tesoreria.alumno.infrastructure.adapter.out.persistence.mapper.AlumnoPersistenceMapper;
import com.tesoreria.alumno.infrastructure.adapter.out.persistence.repository.AlumnoJpaRepository;
import com.tesoreria.shared.domain.pagination.PageRequest;
import com.tesoreria.shared.domain.pagination.PageResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;

import java.util.EnumMap;
import java.util.Map;
import java.util.Optional;

@Repository
public class JpaAlumnoRepositoryAdapter implements AlumnoRepositoryOutPort {

    private final AlumnoJpaRepository jpaRepository;
    private final AlumnoPersistenceMapper persistenceMapper;

    public JpaAlumnoRepositoryAdapter(
            AlumnoJpaRepository jpaRepository,
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
    public Optional<Alumno> findByCodigo(String codigo) {
        return jpaRepository.findByCodigo(codigo).map(persistenceMapper::toDomain);
    }

    @Override
    public Optional<Alumno> findById(Long alumnoId) {
        return jpaRepository.findById(alumnoId).map(persistenceMapper::toDomain);
    }

    @Override
    public PageResponse<Alumno> findAll(PageRequest pageRequest) {
        Pageable pageable = org.springframework.data.domain.PageRequest.of(
                pageRequest.page(),
                pageRequest.size(),
                org.springframework.data.domain.Sort.by("alumnoId").ascending());

        String search = pageRequest.search() == null ? "" : pageRequest.search().trim();
        Page<AlumnoEntity> pageEntity = search.isEmpty()
                ? jpaRepository.findAll(pageable)
                : jpaRepository.findByNombreContainingIgnoreCase(search, pageable);

        return new PageResponse<>(
                pageEntity.getContent().stream().map(persistenceMapper::toDomain).toList(),
                pageEntity.getNumber(),
                pageEntity.getSize(),
                pageEntity.getTotalElements(),
                pageEntity.getTotalPages());
    }

    @Override
    public Map<GeneroAlumno, Long> countActiveByGender() {
        Map<GeneroAlumno, Long> result = new EnumMap<>(GeneroAlumno.class);
        jpaRepository.countActiveByGender()
                .forEach(value -> result.put(value.getGender(), value.getTotal()));
        return result;
    }

    @Override
    public void deleteByCodigo(String codigo) {
        jpaRepository.deleteByCodigo(codigo);
    }

    @Override
    public boolean existsByCodigo(String codigo) {
        return jpaRepository.existsByCodigo(codigo);
    }
}
