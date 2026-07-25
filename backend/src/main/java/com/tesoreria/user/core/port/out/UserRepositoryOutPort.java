package com.tesoreria.user.core.port.out;

import java.util.Optional;

import com.tesoreria.shared.domain.pagination.PageRequest;
import com.tesoreria.shared.domain.pagination.PageResponse;
import com.tesoreria.user.core.constant.RoleEnum;
import com.tesoreria.user.core.model.User;

public interface UserRepositoryOutPort {
  User save(User user);

  Optional<User> findById(Long id);

  Optional<User> findByCode(String code);

  Optional<User> findByCorreo(String correo);

  PageResponse<User> findAll(PageRequest request);

  boolean existsByCode(String code);

  boolean existsByCorreo(String correo);

  long countByRol(RoleEnum rol);

  long count();

  void deleteById(Long id);
}
