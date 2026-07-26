package com.tesoreria.user.application.usecase;

import java.util.Locale;
import java.util.UUID;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;

import com.tesoreria.shared.domain.exception.DomainException;
import com.tesoreria.shared.domain.pagination.PageRequest;
import com.tesoreria.shared.domain.pagination.PageResponse;
import com.tesoreria.user.core.constant.RoleEnum;
import com.tesoreria.user.core.exception.CodeAlreadyExistsException;
import com.tesoreria.user.core.exception.EmailAlreadyExistsException;
import com.tesoreria.user.core.exception.UserErrorCode;
import com.tesoreria.user.core.exception.UserNotFoundException;
import com.tesoreria.user.core.model.User;
import com.tesoreria.user.core.port.in.UserUseCase;
import com.tesoreria.user.core.port.out.UserRepositoryOutPort;

public class UserService implements UserUseCase {
  private final UserRepositoryOutPort repository;
  private final PasswordEncoder passwordEncoder;

  public UserService(UserRepositoryOutPort repository, PasswordEncoder passwordEncoder) {
    this.repository = repository;
    this.passwordEncoder = passwordEncoder;
  }

  @Override
  @Transactional
  public User create(User user) {
    if (repository.existsByCorreo(user.getCorreo())) {
      throw new EmailAlreadyExistsException(user.getCorreo());
    }
    if (user.getCode() == null) {
      user.setCode("USR-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase(Locale.ROOT));
    }
    if (repository.existsByCode(user.getCode())) {
      throw new CodeAlreadyExistsException(user.getCode());
    }
    User.validateRawPassword(user.getPassword());
    user.setPassword(passwordEncoder.encode(user.getPassword()));
    return repository.save(user);
  }

  @Override
  public User findById(Long id) {
    return repository.findById(id)
        .orElseThrow(() -> new UserNotFoundException("Usuario con ID " + id + " no encontrado"));
  }

  @Override
  public User findByCode(String code) {
    return repository.findByCode(code)
        .orElseThrow(() -> new UserNotFoundException("Usuario con código " + code + " no encontrado"));
  }

  @Override
  public User findByCorreo(String correo) {
    return repository.findByCorreo(correo.toLowerCase(Locale.ROOT))
        .orElseThrow(() -> new UserNotFoundException("Usuario con correo " + correo + " no encontrado"));
  }

  @Override
  public PageResponse<User> findAll(PageRequest request) {
    return repository.findAll(request);
  }

  @Override
  @Transactional
  public User update(Long id, User changes, String authenticatedEmail) {
    User existing = findById(id);
    repository.findByCorreo(changes.getCorreo())
        .filter(other -> !other.getId().equals(id))
        .ifPresent(other -> {
          throw new EmailAlreadyExistsException(changes.getCorreo());
        });

    existing.setNombre(changes.getNombre());
    existing.setCorreo(changes.getCorreo());
    if (!passwordEncoder.matches(changes.getPassword(), existing.getPassword())) {
      User.validateRawPassword(changes.getPassword());
      existing.setPassword(passwordEncoder.encode(changes.getPassword()));
    }
    existing.setEnabled(changes.getEnabled());
    existing.setAccountNonLocked(changes.getAccountNonLocked());
    return repository.save(existing);
  }

  @Override
  @Transactional
  public User changeRole(Long id, RoleEnum role, String authenticatedEmail) {
    User existing = findById(id);
    if (existing.getCorreo().equalsIgnoreCase(authenticatedEmail)) {
      throw new DomainException(
          UserErrorCode.OWN_ROLE.getField(),
          UserErrorCode.OWN_ROLE.getStatus(),
          "No puede cambiar el rol del usuario autenticado");
    }
    if (existing.getRol() == RoleEnum.ADMIN && role != RoleEnum.ADMIN
        && repository.countByRol(RoleEnum.ADMIN) <= 1) {
      throw lastAdminError();
    }
    existing.setRol(role);
    return repository.save(existing);
  }

  @Override
  @Transactional
  public void delete(Long id) {
    User existing = findById(id);
    if (existing.getRol() == RoleEnum.ADMIN && repository.countByRol(RoleEnum.ADMIN) <= 1) {
      throw lastAdminError();
    }
    repository.deleteById(id);
  }

  private DomainException lastAdminError() {
    return new DomainException(
        UserErrorCode.LAST_ADMIN.getField(),
        UserErrorCode.LAST_ADMIN.getStatus(),
        "No se puede eliminar o degradar al último administrador");
  }
}
