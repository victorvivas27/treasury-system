package com.tesoreria.user.core.port.in;

import com.tesoreria.shared.domain.pagination.PageRequest;
import com.tesoreria.shared.domain.pagination.PageResponse;
import com.tesoreria.user.core.constant.RoleEnum;
import com.tesoreria.user.core.model.User;

public interface UserUseCase {
  User create(User user);

  User findById(Long id);

  User findByCode(String code);

  User findByCorreo(String correo);

  PageResponse<User> findAll(PageRequest request);

  User update(Long id, User changes, String authenticatedEmail);

  User changeRole(Long id, RoleEnum role, String authenticatedEmail);

  void delete(Long id);
}
