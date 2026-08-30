package com.tesoreria.familia.infrastructure.adapter.out.persistence.adapter;

import com.tesoreria.organization.application.CurrentOrganizationService;
import com.tesoreria.familia.core.model.Familia;
import com.tesoreria.familia.core.model.FamilyTreasuryData;
import com.tesoreria.familia.core.port.out.FamiliaRepositoryOutPort;
import com.tesoreria.familia.infrastructure.adapter.out.persistence.entity.FamiliaEntity;
import com.tesoreria.familia.infrastructure.adapter.out.persistence.mapper.FamiliaPersistenceMapper;
import com.tesoreria.familia.infrastructure.adapter.out.persistence.repository.FamiliaJpaRepository;
import com.tesoreria.shared.domain.pagination.PageRequest;
import com.tesoreria.shared.domain.pagination.PageResponse;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Repository
@Transactional
public class JpaFamiliaRepositoryAdapter implements FamiliaRepositoryOutPort {

    private final FamiliaJpaRepository jpaRepository;
    private final FamiliaPersistenceMapper mapper;
    private final CurrentOrganizationService currentOrganization;

    public JpaFamiliaRepositoryAdapter(FamiliaJpaRepository jpaRepository,
            FamiliaPersistenceMapper mapper, CurrentOrganizationService currentOrganization) {
        this.jpaRepository = jpaRepository;
        this.mapper = mapper;
        this.currentOrganization = currentOrganization;
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
    public Optional<Familia> findByGuardianId(Long guardianId) {
        return jpaRepository.findByGuardianId(guardianId).map(mapper::toDomain);
    }

    @Override
    @Transactional(readOnly = true)
    public List<FamilyTreasuryData> findTreasuryData() {
        return jpaRepository.findTreasuryData(currentOrganization.getId()).stream()
                .map(value -> new FamilyTreasuryData(value.getFamilyId(), value.getFamilyCode(),
                        value.getStudentId(), value.getStudentName(), value.getCourse(),
                        value.getPrimaryGuardian()))
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<Familia> findAll(PageRequest pageRequest) {
        org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(
                pageRequest.page(),
                pageRequest.size());

        String search = pageRequest.search() == null ? "" : pageRequest.search().trim();
        org.springframework.data.domain.Page<FamiliaEntity> pageEntity = search.isEmpty()
                ? jpaRepository.findAll(pageable)
                : jpaRepository.searchByMemberName(search, currentOrganization.getId(), pageable);

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
