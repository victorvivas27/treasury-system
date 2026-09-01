package com.tesoreria.user.infrastructure.adapter.in.web.controller;

import com.tesoreria.shared.domain.exception.DomainException;
import com.tesoreria.shared.infrastructure.constant.ApiConstants;
import com.tesoreria.shared.infrastructure.performance.LoginPerformanceProbe;
import com.tesoreria.user.application.usecase.AccountRecoveryService;
import com.tesoreria.user.application.usecase.AuthService;
import com.tesoreria.user.application.usecase.RegistrationRateLimiter;
import com.tesoreria.user.application.usecase.RefreshTokenService;
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
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
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
    private final RefreshTokenService refreshTokenService;
    private final boolean refreshCookieSecure;
    private final String refreshCookieSameSite;
    private final String authCookiePath;
    private static final String REFRESH_COOKIE = "treasury_refresh";
    private static final String CSRF_COOKIE = "treasury_csrf";
    private static final String CSRF_HEADER = "X-CSRF-Token";

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
            LoginPerformanceProbe loginPerformance,
            RefreshTokenService refreshTokenService,
            @Value("${app.refresh-token.cookie-secure:true}") boolean refreshCookieSecure,
            @Value("${app.refresh-token.cookie-same-site:Lax}") String refreshCookieSameSite,
            @Value("${server.servlet.context-path:}") String contextPath) {
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
        this.refreshTokenService = refreshTokenService;
        this.refreshCookieSecure = refreshCookieSecure;
        this.refreshCookieSameSite = refreshCookieSameSite;
        this.authCookiePath = normalizeCookiePath(contextPath);
    }

    public AuthController(
            AuthService authService,
            UserService userService,
            UserMapper mapper,
            JwtService jwtService,
            TokenRevocationService revocationService,
            RegistrationRateLimiter registrationRateLimiter) {
        this(authService, userService, mapper, jwtService, revocationService,
                registrationRateLimiter, null, "", false, null, null, false, "Lax", "");
    }

    @Operation(summary = "Iniciar sesión")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Login exitoso"),
            @ApiResponse(responseCode = "401", description = "Credenciales inválidas"),
            @ApiResponse(responseCode = "429", description = "Login temporalmente bloqueado")
    })
    @PostMapping("/login")
    public ResponseEntity<LoginResponseDTO> login(
            @Valid @RequestBody LoginRequestDTO request,
            HttpServletRequest httpRequest) {
        LoginPerformanceProbe.Measurement measurement = loginPerformance == null
                ? null : loginPerformance.start();
        try {
            long startedAt = LoginPerformanceProbe.now();
            String authenticatedToken = authService.login(request.correo(), request.password());
            RefreshTokenService.IssuedTokens issued = refreshTokenService == null
                    ? new RefreshTokenService.IssuedTokens(authenticatedToken, null)
                    : refreshTokenService.issue(request.correo(),
                    httpRequest.getHeader("User-Agent"), clientIp(httpRequest));
            if (measurement != null) loginPerformance.phase(measurement, "authenticateAndJwt", startedAt);
            startedAt = LoginPerformanceProbe.now();
            UserResponseDTO user = mapper.toResponse(userService.findByCorreo(request.correo()));
            if (measurement != null) loginPerformance.phase(measurement, "findUserAndMap", startedAt);
            ResponseEntity.BodyBuilder response = ResponseEntity.ok();
            addSessionCookies(response, issued);
            return response.body(new LoginResponseDTO(
                    issued.accessToken(),
                    "Bearer",
                    jwtService.getExpirationMs() / 1000,
                    issued.csrfToken(),
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
    public ResponseEntity<LoginResponseDTO> verifyEmail(
            @Valid @RequestBody TokenRequestDTO request,
            HttpServletRequest httpRequest) {
        User verifiedUser = accountRecoveryService.verifyEmail(request.token());
        String token = authService.issueTokenForVerifiedEmail(verifiedUser.getCorreo());
        RefreshTokenService.IssuedTokens issued = refreshTokenService == null
                ? new RefreshTokenService.IssuedTokens(token, null)
                : refreshTokenService.issue(verifiedUser.getCorreo(),
                httpRequest.getHeader("User-Agent"), clientIp(httpRequest));
        ResponseEntity.BodyBuilder response = ResponseEntity.ok();
        addSessionCookies(response, issued);
        return response.body(new LoginResponseDTO(
                issued.accessToken(),
                "Bearer",
                jwtService.getExpirationMs() / 1000,
                issued.csrfToken(),
                mapper.toResponse(verifiedUser)));
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
    public ResponseEntity<Void> logout(
            @RequestHeader(value = SecurityConstants.AUTHORIZATION_HEADER, required = false) String authorization,
            @RequestHeader(value = CSRF_HEADER, required = false) String csrfHeader,
            @CookieValue(value = REFRESH_COOKIE, required = false) String refreshToken,
            @CookieValue(value = CSRF_COOKIE, required = false) String csrfCookie) {
        if (authorization != null && authorization.startsWith(SecurityConstants.TOKEN_PREFIX)) {
            String token = authorization.substring(SecurityConstants.TOKEN_PREFIX.length());
            try {
                revocationService.revoke(token, jwtService.extractExpiration(token));
            } catch (io.jsonwebtoken.JwtException ignored) {
                // Un access token expirado no debe impedir revocar la sesión persistente.
            }
        }
        if (refreshTokenService != null) refreshTokenService.revoke(refreshToken,
                csrfFromRequest(refreshToken, csrfHeader, csrfCookie));
        return ResponseEntity.noContent()
                .header(HttpHeaders.SET_COOKIE, refreshCookie("", 0).toString(), csrfCookie("", 0).toString())
                .build();
    }

    @Operation(summary = "Refrescar JWT")
    @PostMapping("/refresh")
    public ResponseEntity<LoginResponseDTO> refresh(
            @RequestHeader(value = CSRF_HEADER, required = false) String csrfHeader,
            @CookieValue(value = REFRESH_COOKIE, required = false) String refreshToken,
            @CookieValue(value = CSRF_COOKIE, required = false) String csrfCookie) {
        if (refreshTokenService == null || refreshToken == null || refreshToken.isBlank()) {
            throw new DomainException(
                    UserErrorCode.INVALID_CREDENTIALS.getField(),
                    UserErrorCode.INVALID_CREDENTIALS.getStatus(),
                    "Refresh token requerido");
        }
        RefreshTokenService.IssuedTokens issued = refreshTokenService.rotate(
                refreshToken, csrfFromRequest(refreshToken, csrfHeader, csrfCookie));
        String correo = jwtService.extractUsername(issued.accessToken());
        ResponseEntity.BodyBuilder response = ResponseEntity.ok();
        addSessionCookies(response, issued);
        return response
                .body(new LoginResponseDTO(
                issued.accessToken(),
                "Bearer",
                jwtService.getExpirationMs() / 1000,
                issued.csrfToken(),
                mapper.toResponse(userService.findByCorreo(correo))));
    }

    private ResponseCookie refreshCookie(String value, long maxAge) {
        return ResponseCookie.from(REFRESH_COOKIE, value)
                .httpOnly(true).secure(refreshCookieSecure).sameSite(refreshCookieSameSite)
                .path(authCookiePath).maxAge(maxAge).build();
    }

    private ResponseCookie csrfCookie(String value, long maxAge) {
        return ResponseCookie.from(CSRF_COOKIE, value)
                .httpOnly(false).secure(refreshCookieSecure).sameSite(refreshCookieSameSite)
                .path("/").maxAge(maxAge).build();
    }

    private void addSessionCookies(ResponseEntity.BodyBuilder response, RefreshTokenService.IssuedTokens issued) {
        if (issued.refreshToken() == null) return;
        long maxAge = refreshTokenService.getExpirationSeconds();
        response.header(HttpHeaders.SET_COOKIE,
                refreshCookie(issued.refreshToken(), maxAge).toString(),
                csrfCookie(issued.csrfToken(), maxAge).toString());
    }

    private String csrfFromRequest(String refreshToken, String csrfHeader, String csrfCookie) {
        if (refreshToken == null || refreshToken.isBlank()) return null;
        if (csrfHeader == null || csrfHeader.isBlank() || csrfCookie == null || csrfCookie.isBlank()
                || !MessageDigest.isEqual(csrfHeader.getBytes(StandardCharsets.UTF_8),
                csrfCookie.getBytes(StandardCharsets.UTF_8))) {
            throw new DomainException("csrf", HttpStatus.FORBIDDEN, "CSRF token inválido");
        }
        return csrfHeader;
    }

    private String normalizeCookiePath(String contextPath) {
        String normalized = contextPath == null || contextPath.isBlank() || "/".equals(contextPath)
                ? ""
                : contextPath.replaceAll("/+$", "");
        return normalized + ApiConstants.AUTH;
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

    private String clientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
