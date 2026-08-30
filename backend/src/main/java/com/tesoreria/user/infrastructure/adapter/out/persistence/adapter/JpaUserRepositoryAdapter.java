package com.tesoreria.user.infrastructure.adapter.out.persistence.adapter;

import com.tesoreria.shared.domain.pagination.PageRequest;
import com.tesoreria.shared.domain.pagination.PageResponse;
import com.tesoreria.user.core.constant.RoleEnum;
import com.tesoreria.user.core.model.User;
import com.tesoreria.user.core.port.out.UserRepositoryOutPort;
import com.tesoreria.user.infrastructure.adapter.out.persistence.mapper.UserPersistenceMapper;
import com.tesoreria.user.infrastructure.adapter.out.persistence.repository.UserJpaRepository;
import com.tesoreria.user.infrastructure.adapter.out.persistence.repository.UserTokenJpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.List;

@Repository
public class JpaUserRepositoryAdapter implements UserRepositoryOutPort {
    private final UserJpaRepository repository;
    private final UserPersistenceMapper mapper;
    private final UserTokenJpaRepository tokens;

    public JpaUserRepositoryAdapter(UserJpaRepository repository, UserPersistenceMapper mapper,
                                    UserTokenJpaRepository tokens) {
        this.repository = repository;
        this.mapper = mapper;
        this.tokens = tokens;
    }

    @Override
    public User save(User user) {
        return mapper.toDomain(repository.save(mapper.toEntity(user)));
    }

    @Override
    public Optional<User> findById(Long id) {
        return repository.findById(id).map(mapper::toDomain);
    }

    @Override
    public Optional<User> findByIdAndOrganizationId(Long id, Long organizationId) {
        return repository.findByIdAndOrganizationId(id, organizationId).map(mapper::toDomain);
    }

    @Override
    public Optional<User> findByCode(String code) {
        return repository.findByCode(code).map(mapper::toDomain);
    }

    @Override
    public Optional<User> findByCodeAndOrganizationId(String code, Long organizationId) {
        return repository.findByCodeAndOrganizationId(code, organizationId).map(mapper::toDomain);
    }

    @Override
    public Optional<User> findByCorreo(String correo) {
        return repository.findByCorreo(correo).map(mapper::toDomain);
    }

    @Override
    public PageResponse<User> findAll(PageRequest request) {
        var pageable = org.springframework.data.domain.PageRequest.of(request.page(), request.size());
        String search = request.search() == null ? "" : request.search().trim();
        var page = search.isEmpty()
                ? repository.findAll(pageable)
                : repository.findByNombreContainingIgnoreCase(search, pageable);
        return new PageResponse<>(
                page.getContent().stream().map(mapper::toDomain).toList(),
                page.getNumber(),
                page.getSize(),
                page.getTotalElements(),
                page.getTotalPages());
    }

    @Override
    public PageResponse<User> findAllByOrganizationId(PageRequest request, Long organizationId) {
        var pageable = org.springframework.data.domain.PageRequest.of(request.page(), request.size());
        String search = request.search() == null ? "" : request.search().trim();
        var page = search.isEmpty()
                ? repository.findAllByOrganizationId(organizationId, pageable)
                : repository.findByOrganizationIdAndNombreContainingIgnoreCase(
                        organizationId, search, pageable);
        return new PageResponse<>(
                page.getContent().stream().map(mapper::toDomain).toList(),
                page.getNumber(), page.getSize(), page.getTotalElements(), page.getTotalPages());
    }

    @Override
    public boolean existsByCode(String code) {
        return repository.existsByCode(code);
    }

    @Override
    public boolean existsByCorreo(String correo) {
        return repository.existsByCorreo(correo);
    }

    @Override
    public long countByRol(RoleEnum rol) {
        return repository.countByRol(rol);
    }

    @Override
    public long countByRolAndOrganizationId(RoleEnum rol, Long organizationId) {
        return repository.countByRolAndOrganizationId(rol, organizationId);
    }

    @Override
    public List<User> findByRolAndOrganizationId(RoleEnum rol, Long organizationId) {
        return repository.findByRolAndOrganizationIdOrderByIdAsc(rol, organizationId).stream()
                .map(mapper::toDomain)
                .toList();
    }

    @Override
    public long count() {
        return repository.count();
    }

    @Override
    public void deleteById(Long id) {
        tokens.deleteByUserId(id);
        repository.deleteById(id);
    }
}
