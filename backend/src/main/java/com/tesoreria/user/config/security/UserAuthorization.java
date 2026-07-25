package com.tesoreria.user.config.security;

import org.springframework.stereotype.Component;

import com.tesoreria.user.core.port.out.UserRepositoryOutPort;

@Component("userAuthorization")
public class UserAuthorization {
  private final UserRepositoryOutPort repository;

  public UserAuthorization(UserRepositoryOutPort repository) {
    this.repository = repository;
  }

  public boolean isSelf(Long id, String correo) {
    return repository.findById(id)
        .map(user -> user.getCorreo().equalsIgnoreCase(correo))
        .orElse(false);
  }
}
