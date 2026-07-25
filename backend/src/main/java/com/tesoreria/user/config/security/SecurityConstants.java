package com.tesoreria.user.config.security;

public final class SecurityConstants {
  public static final String TOKEN_PREFIX = "Bearer ";
  public static final String AUTHORIZATION_HEADER = "Authorization";
  public static final long TOKEN_EXPIRATION_MS = 900_000L;
  public static final int MAX_LOGIN_ATTEMPTS = 3;
  public static final long LOGIN_BLOCK_MINUTES = 15L;

  private SecurityConstants() {
  }
}
