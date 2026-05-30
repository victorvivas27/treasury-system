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
@Transactional() // Forzar uso de Spring para readOnly
public class JpaFamiliaRepositoryAdapter implements FamiliaRepositoryOutPort {

    private final FamiliaJpaRepository jpaRepository;
    private final FamiliaPersistenceMapper mapper; // INYECTADO: El mapper real que creamos

    // Constructor con ambas dependencias necesarias
    public JpaFamiliaRepositoryAdapter(FamiliaJpaRepository jpaRepository, FamiliaPersistenceMapper mapper) {
        this.jpaRepository = jpaRepository;
        this.mapper = mapper;
    }

    @Override
    public Familia save(Familia familia) {
        FamiliaEntity entity = mapper.toEntity(familia); // Usa el componente real
        FamiliaEntity savedEntity = jpaRepository.save(entity);
        return mapper.toDomain(savedEntity); // Usa el componente real
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<Familia> findById(Long id) {
        return jpaRepository.findById(id).map(mapper::toDomain);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<Familia> findDetalleById(Long id) {
        return jpaRepository.findById(id).map(mapper::toDomain);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<Familia> findByAlumnoId(Long alumnoId) {
        return jpaRepository.findByAlumnoId(alumnoId).map(mapper::toDomain);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<Familia> findAll(PageRequest pageRequest) {
        throw new UnsupportedOperationException("Implementar paginación acoplada a la especificación de tu infraestructura.");
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
    public void deleteById(Long id) {
        jpaRepository.deleteById(id);
    }

    @Override
    @Transactional(readOnly = true)
    public boolean existsById(Long id) {
        return jpaRepository.existsById(id);
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

    @Override
@Transactional(readOnly = true)
public List<Familia> findAll() {
    return jpaRepository.findAll()
        .stream()
        .map(mapper::toDomain)
        .toList();
}
}
