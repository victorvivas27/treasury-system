package com.tesoreria.user.infrastructure.adapter.in.web.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.tesoreria.shared.infrastructure.constant.ApiConstants;
import com.tesoreria.shared.domain.exception.DomainException;
import com.tesoreria.user.application.usecase.AuthService;
import com.tesoreria.user.core.constant.RoleEnum;
import com.tesoreria.user.core.model.User;
import com.tesoreria.user.application.usecase.UserService;
import com.tesoreria.user.application.usecase.RegistrationRateLimiter;
import com.tesoreria.user.config.security.JwtService;
import com.tesoreria.user.config.security.SecurityConstants;
import com.tesoreria.user.config.security.TokenRevocationService;
import com.tesoreria.user.core.exception.UserErrorCode;
import com.tesoreria.user.infrastructure.adapter.in.web.dto.UserResponseDTO;
import com.tesoreria.user.infrastructure.adapter.in.web.dto.auth.LoginRequestDTO;
import com.tesoreria.user.infrastructure.adapter.in.web.dto.auth.LoginResponseDTO;
import com.tesoreria.user.infrastructure.adapter.in.web.dto.auth.RegisterRequestDTO;
import com.tesoreria.user.infrastructure.adapter.in.web.mapper.UserMapper;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import jakarta.validation.Valid;
import jakarta.servlet.http.HttpServletRequest;

@RestController
@RequestMapping(ApiConstants.AUTH)
public class AuthController {
  private final AuthService authService;
  private final UserService userService;
  private final UserMapper mapper;
  private final JwtService jwtService;
  private final TokenRevocationService revocationService;
  private final RegistrationRateLimiter registrationRateLimiter;

  public AuthController(
      AuthService authService,
      UserService userService,
      UserMapper mapper,
      JwtService jwtService,
      TokenRevocationService revocationService,
      RegistrationRateLimiter registrationRateLimiter) {
    this.authService = authService;
    this.userService = userService;
    this.mapper = mapper;
    this.jwtService = jwtService;
    this.revocationService = revocationService;
    this.registrationRateLimiter = registrationRateLimiter;
  }

  @Operation(summary = "Iniciar sesión")
  @ApiResponses({
      @ApiResponse(responseCode = "200", description = "Login exitoso"),
      @ApiResponse(responseCode = "401", description = "Credenciales inválidas"),
      @ApiResponse(responseCode = "429", description = "Login temporalmente bloqueado")
  })
  @PostMapping("/login")
  public ResponseEntity<LoginResponseDTO> login(@Valid @RequestBody LoginRequestDTO request) {
    String token = authService.login(request.correo(), request.password());
    UserResponseDTO user = mapper.toResponse(userService.findByCorreo(request.correo()));
    return ResponseEntity.ok(new LoginResponseDTO(
        token,
        "Bearer",
        jwtService.getExpirationMs() / 1000,
        user));
  }

  @Operation(summary = "Registrar usuario")
  @PostMapping("/register")
  public ResponseEntity<UserResponseDTO> register(
      @Valid @RequestBody RegisterRequestDTO request,
      HttpServletRequest httpRequest) {
    registrationRateLimiter.checkAndRecord(httpRequest.getRemoteAddr());
    User newUser = mapper.toDomain(request);
    newUser.setRol(RoleEnum.USER);
    newUser.setEnabled(true);
    newUser.setAccountNonLocked(true);
    return ResponseEntity.status(HttpStatus.CREATED)
        .body(mapper.toResponse(userService.create(newUser)));
  }

  @Operation(summary = "Obtener usuario autenticado")
  @GetMapping("/me")
  @PreAuthorize("isAuthenticated()")
  public ResponseEntity<UserResponseDTO> me(Authentication authentication) {
    return ResponseEntity.ok(mapper.toResponse(userService.findByCorreo(authentication.getName())));
  }

  @Operation(summary = "Cerrar sesión")
  @PostMapping("/logout")
  @PreAuthorize("isAuthenticated()")
  public ResponseEntity<Void> logout(
      @RequestHeader(SecurityConstants.AUTHORIZATION_HEADER) String authorization) {
    if (authorization.startsWith(SecurityConstants.TOKEN_PREFIX)) {
      String token = authorization.substring(SecurityConstants.TOKEN_PREFIX.length());
      revocationService.revoke(token, jwtService.extractExpiration(token));
    }
    return ResponseEntity.noContent().build();
  }

  @Operation(summary = "Refrescar JWT")
  @PostMapping("/refresh")
  public ResponseEntity<LoginResponseDTO> refresh(
      @RequestHeader(SecurityConstants.AUTHORIZATION_HEADER) String authorization) {
    if (!authorization.startsWith(SecurityConstants.TOKEN_PREFIX)) {
      throw new DomainException(
          UserErrorCode.INVALID_CREDENTIALS.getField(),
          UserErrorCode.INVALID_CREDENTIALS.getStatus(),
          "Token Bearer requerido");
    }
    String token = authService.refresh(
        requireActiveToken(authorization.substring(SecurityConstants.TOKEN_PREFIX.length())));
    String correo = jwtService.extractUsername(token);
    return ResponseEntity.ok(new LoginResponseDTO(
        token,
        "Bearer",
        jwtService.getExpirationMs() / 1000,
        mapper.toResponse(userService.findByCorreo(correo))));
  }

  private String requireActiveToken(String token) {
    if (revocationService.isRevoked(token)) {
      throw new DomainException(
          UserErrorCode.INVALID_CREDENTIALS.getField(),
          UserErrorCode.INVALID_CREDENTIALS.getStatus(),
          "Token revocado");
    }
    return token;
  }
}
