package com.tesoreria.user.application.usecase;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.userdetails.UserDetails;

import com.tesoreria.shared.domain.exception.DomainException;
import com.tesoreria.user.config.security.JwtService;
import com.tesoreria.user.core.exception.UserErrorCode;

public class AuthService {
  private static final Logger LOGGER = LoggerFactory.getLogger(AuthService.class);
  private final AuthenticationManager authenticationManager;
  private final CustomUserDetailsService userDetailsService;
  private final JwtService jwtService;
  private final LoginRateLimiter rateLimiter;

  public AuthService(
      AuthenticationManager authenticationManager,
      CustomUserDetailsService userDetailsService,
      JwtService jwtService,
      LoginRateLimiter rateLimiter) {
    this.authenticationManager = authenticationManager;
    this.userDetailsService = userDetailsService;
    this.jwtService = jwtService;
    this.rateLimiter = rateLimiter;
  }

  public String login(String correo, String password) {
    rateLimiter.checkAllowed(correo);
    try {
      authenticationManager.authenticate(
          new UsernamePasswordAuthenticationToken(correo, password));
      rateLimiter.recordSuccess(correo);
      UserDetails userDetails = userDetailsService.loadUserByUsername(correo);
      if (LOGGER.isInfoEnabled()) {
        LOGGER.info("Login exitoso para {}", maskEmail(correo));
      }
      return jwtService.generateToken(userDetails);
    } catch (AuthenticationException exception) {
      rateLimiter.recordFailure(correo);
      if (LOGGER.isWarnEnabled()) {
        LOGGER.warn("Login fallido para {}", maskEmail(correo));
      }
      throw new DomainException(
          UserErrorCode.INVALID_CREDENTIALS.getField(),
          UserErrorCode.INVALID_CREDENTIALS.getStatus(),
          "Correo o contraseña inválidos",
          exception);
    }
  }

  public String refresh(String token) {
    String username = jwtService.extractUsername(token);
    UserDetails userDetails = userDetailsService.loadUserByUsername(username);
    if (!jwtService.isTokenValid(token, userDetails)) {
      throw new DomainException(
          UserErrorCode.INVALID_CREDENTIALS.getField(),
          UserErrorCode.INVALID_CREDENTIALS.getStatus(),
          "Token inválido o expirado");
    }
    return jwtService.generateToken(userDetails);
  }

  private String maskEmail(String correo) {
    if (correo == null || !correo.contains("@")) {
      return "***";
    }
    int separator = correo.indexOf('@');
    return correo.charAt(0) + "***" + correo.substring(separator);
  }
}
