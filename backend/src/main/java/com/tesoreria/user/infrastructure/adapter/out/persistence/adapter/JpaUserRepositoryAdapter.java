package com.tesoreria.user.infrastructure.adapter.out.persistence.adapter;

import java.util.Optional;

import org.springframework.stereotype.Repository;

import com.tesoreria.shared.domain.pagination.PageRequest;
import com.tesoreria.shared.domain.pagination.PageResponse;
import com.tesoreria.user.core.constant.RoleEnum;
import com.tesoreria.user.core.model.User;
import com.tesoreria.user.core.port.out.UserRepositoryOutPort;
import com.tesoreria.user.infrastructure.adapter.out.persistence.mapper.UserPersistenceMapper;
import com.tesoreria.user.infrastructure.adapter.out.persistence.repository.UserJpaRepository;

@Repository
public class JpaUserRepositoryAdapter implements UserRepositoryOutPort {
  private final UserJpaRepository repository;
  private final UserPersistenceMapper mapper;

  public JpaUserRepositoryAdapter(UserJpaRepository repository, UserPersistenceMapper mapper) {
    this.repository = repository;
    this.mapper = mapper;
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
  public Optional<User> findByCode(String code) {
    return repository.findByCode(code).map(mapper::toDomain);
  }

  @Override
  public Optional<User> findByCorreo(String correo) {
    return repository.findByCorreo(correo).map(mapper::toDomain);
  }

  @Override
  public PageResponse<User> findAll(PageRequest request) {
    var page = repository.findAll(
        org.springframework.data.domain.PageRequest.of(request.page(), request.size()));
    return new PageResponse<>(
        page.getContent().stream().map(mapper::toDomain).toList(),
        page.getNumber(),
        page.getSize(),
        page.getTotalElements(),
        page.getTotalPages());
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
  public long count() {
    return repository.count();
  }

  @Override
  public void deleteById(Long id) {
    repository.deleteById(id);
  }
}
