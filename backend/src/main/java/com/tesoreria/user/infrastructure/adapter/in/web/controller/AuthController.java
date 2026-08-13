package com.tesoreria.user.infrastructure.adapter.in.web.controller;

import com.tesoreria.shared.domain.exception.DomainException;
import com.tesoreria.shared.infrastructure.constant.ApiConstants;
import com.tesoreria.shared.infrastructure.performance.LoginPerformanceProbe;
import com.tesoreria.user.application.usecase.AccountRecoveryService;
import com.tesoreria.user.application.usecase.AuthService;
import com.tesoreria.user.application.usecase.RegistrationRateLimiter;
import com.tesoreria.user.application.usecase.UserService;
import com.tesoreria.user.config.security.JwtService;
import com.tesoreria.user.config.security.SecurityConstants;
import com.tesoreria.user.config.security.TokenRevocationService;
import com.tesoreria.user.core.constant.RoleEnum;
import com.tesoreria.user.core.exception.UserErrorCode;
import com.tesoreria.user.core.model.User;
import com.tesoreria.user.infrastructure.adapter.in.web.dto.UserRequestDTO;
import com.tesoreria.user.infrastructure.adapter.in.web.dto.UserResponseDTO;
import com.tesoreria.user.infrastructure.adapter.in.web.dto.auth.*;
import com.tesoreria.user.infrastructure.adapter.in.web.mapper.UserMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.net.InetAddress;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

@RestController
@RequestMapping(ApiConstants.AUTH)
public class AuthController {
    private final AuthService authService;
    private final UserService userService;
    private final UserMapper mapper;
    private final JwtService jwtService;
    private final TokenRevocationService revocationService;
    private final RegistrationRateLimiter registrationRateLimiter;
    private final AccountRecoveryService accountRecoveryService;
    private final String bootstrapAdminKey;
    private final boolean allowLocalBootstrapWithoutKey;
    private final LoginPerformanceProbe loginPerformance;

    @Autowired
    public AuthController(
            AuthService authService,
            UserService userService,
            UserMapper mapper,
            JwtService jwtService,
            TokenRevocationService revocationService,
            RegistrationRateLimiter registrationRateLimiter,
            AccountRecoveryService accountRecoveryService,
            @Value("${app.bootstrap.admin-key:}") String bootstrapAdminKey,
            @Value("${app.bootstrap.allow-local-without-key:false}") boolean allowLocalBootstrapWithoutKey,
            LoginPerformanceProbe loginPerformance) {
        this.authService = authService;
        this.userService = userService;
        this.mapper = mapper;
        this.jwtService = jwtService;
        this.revocationService = revocationService;
        this.registrationRateLimiter = registrationRateLimiter;
        this.accountRecoveryService = accountRecoveryService;
        this.bootstrapAdminKey = bootstrapAdminKey;
        this.allowLocalBootstrapWithoutKey = allowLocalBootstrapWithoutKey;
        this.loginPerformance = loginPerformance;
    }

    public AuthController(
            AuthService authService,
            UserService userService,
            UserMapper mapper,
            JwtService jwtService,
            TokenRevocationService revocationService,
            RegistrationRateLimiter registrationRateLimiter) {
        this(authService, userService, mapper, jwtService, revocationService,
                registrationRateLimiter, null, "", false, null);
    }

    @Operation(summary = "Iniciar sesión")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Login exitoso"),
            @ApiResponse(responseCode = "401", description = "Credenciales inválidas"),
            @ApiResponse(responseCode = "429", description = "Login temporalmente bloqueado")
    })
    @PostMapping("/login")
    public ResponseEntity<LoginResponseDTO> login(@Valid @RequestBody LoginRequestDTO request) {
        LoginPerformanceProbe.Measurement measurement = loginPerformance == null
                ? null : loginPerformance.start();
        try {
            long startedAt = LoginPerformanceProbe.now();
            String token = authService.login(request.correo(), request.password());
            if (measurement != null) loginPerformance.phase(measurement, "authenticateAndJwt", startedAt);
            startedAt = LoginPerformanceProbe.now();
            UserResponseDTO user = mapper.toResponse(userService.findByCorreo(request.correo()));
            if (measurement != null) loginPerformance.phase(measurement, "findUserAndMap", startedAt);
            return ResponseEntity.ok(new LoginResponseDTO(
                    token,
                    "Bearer",
                    jwtService.getExpirationMs() / 1000,
                    user));
        } finally {
            if (measurement != null) loginPerformance.finish(measurement);
        }
    }

    @Operation(summary = "Registrar usuario")
    @PostMapping("/register")
    public ResponseEntity<UserResponseDTO> register(
            @Valid @RequestBody RegisterRequestDTO request,
            HttpServletRequest httpRequest) {
        registrationRateLimiter.checkAndRecord(httpRequest.getRemoteAddr());
        User newUser = mapper.toDomain(request);
        newUser.setRol(RoleEnum.USER);
        newUser.setEnabled(false);
        newUser.setAccountNonLocked(true);
        User registered = accountRecoveryService == null
                ? userService.create(newUser)
                : accountRecoveryService.register(newUser);
        return ResponseEntity.status(HttpStatus.CREATED).body(mapper.toResponse(registered));
    }

    @Operation(summary = "Inicializar el primer administrador")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Administrador inicial creado"),
            @ApiResponse(responseCode = "403", description = "Clave de inicialización inválida"),
            @ApiResponse(responseCode = "409", description = "Ya existen usuarios")
    })
    @PostMapping("/bootstrap-admin")
    public ResponseEntity<UserResponseDTO> bootstrapAdmin(
            @RequestHeader(value = "X-Bootstrap-Key", required = false) String key,
            HttpServletRequest httpRequest,
            @Valid @RequestBody UserRequestDTO request) {
        if (!validBootstrapKey(key) && !isLocalBootstrapRequest(httpRequest)) {
            throw new DomainException("bootstrap", HttpStatus.FORBIDDEN, "Acceso denegado");
        }
        User user = mapper.toDomain(request);
        user.setRol(RoleEnum.ADMIN);
        user.setEnabled(true);
        user.setAccountNonLocked(true);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(mapper.toResponse(userService.bootstrapAdmin(user)));
    }

    @PostMapping("/verify-email")
    public ResponseEntity<MessageResponseDTO> verifyEmail(@Valid @RequestBody TokenRequestDTO request) {
        accountRecoveryService.verifyEmail(request.token());
        return ResponseEntity.ok(new MessageResponseDTO("Correo verificado correctamente."));
    }

    @PostMapping("/resend-verification")
    public ResponseEntity<MessageResponseDTO> resendVerification(
            @Valid @RequestBody EmailRequestDTO request) {
        return ResponseEntity.ok(new MessageResponseDTO(
                accountRecoveryService.resendVerification(request.email())));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<MessageResponseDTO> forgotPassword(
            @Valid @RequestBody EmailRequestDTO request) {
        return ResponseEntity.ok(new MessageResponseDTO(
                accountRecoveryService.forgotPassword(request.email())));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<MessageResponseDTO> resetPassword(
            @Valid @RequestBody ResetPasswordRequestDTO request) {
        accountRecoveryService.resetPassword(request.token(), request.newPassword());
        return ResponseEntity.ok(new MessageResponseDTO("Contraseña actualizada correctamente."));
    }

    @PatchMapping("/change-password")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<MessageResponseDTO> changePassword(
            Authentication authentication,
            @Valid @RequestBody ChangePasswordRequestDTO request) {
        accountRecoveryService.changePassword(
                authentication.getName(), request.currentPassword(), request.newPassword());
        return ResponseEntity.ok(new MessageResponseDTO("Contraseña actualizada correctamente."));
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

    private boolean validBootstrapKey(String key) {
        return key != null && !bootstrapAdminKey.isBlank()
                && MessageDigest.isEqual(key.getBytes(StandardCharsets.UTF_8),
                bootstrapAdminKey.getBytes(StandardCharsets.UTF_8));
    }

    private boolean isLocalBootstrapRequest(HttpServletRequest request) {
        if (!allowLocalBootstrapWithoutKey) return false;
        try {
            return InetAddress.getByName(request.getRemoteAddr()).isLoopbackAddress();
        } catch (java.net.UnknownHostException exception) {
            return false;
        }
    }
}
