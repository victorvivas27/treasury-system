package user;

import com.tesoreria.shared.domain.exception.DomainException;
import com.tesoreria.shared.infrastructure.exception.GlobalExceptionHandler;
import com.tesoreria.user.application.usecase.AuthService;
import com.tesoreria.user.application.usecase.RegistrationRateLimiter;
import com.tesoreria.user.application.usecase.RefreshTokenService;
import com.tesoreria.user.application.usecase.UserService;
import com.tesoreria.user.config.security.JwtService;
import com.tesoreria.user.config.security.TokenRevocationService;
import com.tesoreria.user.core.constant.RoleEnum;
import com.tesoreria.user.core.exception.UserErrorCode;
import com.tesoreria.user.core.model.User;
import com.tesoreria.user.infrastructure.adapter.in.web.controller.AuthController;
import com.tesoreria.user.infrastructure.adapter.in.web.dto.UserResponseDTO;
import com.tesoreria.user.infrastructure.adapter.in.web.mapper.UserMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.mock;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class AuthControllerTest {
    private MockMvc mockMvc;
    private AuthService authService;
    private UserService userService;
    private UserMapper mapper;
    private JwtService jwtService;
    private TokenRevocationService revocationService;
    private RegistrationRateLimiter registrationRateLimiter;
    private RefreshTokenService refreshTokenService;
    private User user;
    private UserResponseDTO response;

    @BeforeEach
    void setUp() {
        authService = mock(AuthService.class);
        userService = mock(UserService.class);
        mapper = mock(UserMapper.class);
        jwtService = mock(JwtService.class);
        revocationService = mock(TokenRevocationService.class);
        registrationRateLimiter = mock(RegistrationRateLimiter.class);
        refreshTokenService = mock(RefreshTokenService.class);
        mockMvc = MockMvcBuilders
                .standaloneSetup(new AuthController(
                        authService, userService, mapper, jwtService, revocationService, registrationRateLimiter,
                        null, "", false, null, refreshTokenService, false, "Lax", "/tesoreria"))
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
        user = new User(
                1L, "USR-001", "Victor Vivas", "admin@mail.com", "$2a$hash",
                RoleEnum.ADMIN, true, true, null, null);
        response = new UserResponseDTO(
                1L, "USR-001", "VICTOR VIVAS", "admin@mail.com",
                RoleEnum.ADMIN, true, true, null, null);
        when(mapper.toResponse(user)).thenReturn(response);
        when(refreshTokenService.getExpirationSeconds()).thenReturn(604800L);
    }

    @Test
    void loginExitoso_deberiaRetornarJwt() throws Exception {
        when(authService.login("admin@mail.com", "Password1!")).thenReturn("jwt");
        when(refreshTokenService.issue(eq("admin@mail.com"), any(), any()))
                .thenReturn(new RefreshTokenService.IssuedTokens("access", "refresh", "csrf"));
        when(userService.findByCorreo("admin@mail.com")).thenReturn(user);
        when(jwtService.getExpirationMs()).thenReturn(900_000L);
        var result = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginBody()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").value("access"))
                .andExpect(jsonPath("$.expiresIn").value(900))
                .andExpect(jsonPath("$.csrfToken").value("csrf"))
                .andReturn();
        var cookies = result.getResponse().getHeaders(HttpHeaders.SET_COOKIE);
        assertTrue(cookies.stream().anyMatch(value -> value.contains("treasury_refresh=refresh")
                && value.contains("HttpOnly")
                && value.contains("Path=/tesoreria/api/v1/auth")
                && value.contains("SameSite=Lax")));
        assertTrue(cookies.stream().anyMatch(value -> value.contains("treasury_csrf=csrf")
                && !value.contains("HttpOnly")
                && value.contains("Path=/")));
    }

    @Test
    void loginFallido_deberiaRetornar401() throws Exception {
        when(authService.login("admin@mail.com", "Password1!"))
                .thenThrow(new DomainException(
                        UserErrorCode.INVALID_CREDENTIALS.getField(),
                        UserErrorCode.INVALID_CREDENTIALS.getStatus(),
                        "Correo o contraseña inválidos"));
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginBody()))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.errors.auth").exists());
    }

    @Test
    void register_deberiaRetornar201() throws Exception {
        when(mapper.toDomain(any())).thenReturn(user);
        when(userService.create(user)).thenReturn(user);
        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(registerBody()))
                .andExpect(status().isCreated());
    }

    @Test
    void me_deberiaRetornarUsuarioAutenticado() throws Exception {
        when(userService.findByCorreo("admin@mail.com")).thenReturn(user);
        mockMvc.perform(get("/api/v1/auth/me")
                        .principal(new UsernamePasswordAuthenticationToken("admin@mail.com", null)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.correo").value("admin@mail.com"));
    }

    @Test
    void logout_deberiaRetornar204() throws Exception {
        when(jwtService.extractExpiration("jwt")).thenReturn(new java.util.Date(System.currentTimeMillis() + 60_000));
        mockMvc.perform(post("/api/v1/auth/logout")
                        .header("Authorization", "Bearer jwt")
                        .header("X-CSRF-Token", "csrf")
                        .cookie(new jakarta.servlet.http.Cookie("treasury_refresh", "refresh"))
                        .cookie(new jakarta.servlet.http.Cookie("treasury_csrf", "csrf")))
                .andExpect(status().isNoContent());
        verify(revocationService).revoke(eq("jwt"), any());
        verify(refreshTokenService).revoke("refresh", "csrf");
    }

    @Test
    void refresh_conCsrfValido_deberiaRotarCookies() throws Exception {
        when(refreshTokenService.rotate("refresh", "csrf"))
                .thenReturn(new RefreshTokenService.IssuedTokens("new-access", "new-refresh", "new-csrf"));
        when(jwtService.extractUsername("new-access")).thenReturn("admin@mail.com");
        when(jwtService.getExpirationMs()).thenReturn(900_000L);
        when(userService.findByCorreo("admin@mail.com")).thenReturn(user);

        var result = mockMvc.perform(post("/api/v1/auth/refresh")
                        .header("X-CSRF-Token", "csrf")
                        .cookie(new jakarta.servlet.http.Cookie("treasury_refresh", "refresh"))
                        .cookie(new jakarta.servlet.http.Cookie("treasury_csrf", "csrf")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").value("new-access"))
                .andExpect(jsonPath("$.csrfToken").value("new-csrf"))
                .andReturn();
        var cookies = result.getResponse().getHeaders(HttpHeaders.SET_COOKIE);
        assertTrue(cookies.stream().anyMatch(value -> value.contains("treasury_refresh=new-refresh")));
        assertTrue(cookies.stream().anyMatch(value -> value.contains("treasury_csrf=new-csrf")));
    }

    @Test
    void refresh_sinCsrf_deberiaRechazar() throws Exception {
        mockMvc.perform(post("/api/v1/auth/refresh")
                        .cookie(new jakarta.servlet.http.Cookie("treasury_refresh", "refresh")))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errors.csrf").exists());
    }

    @Test
    void refresh_conCsrfDistintoALaCookie_deberiaRechazarSinRotar() throws Exception {
        mockMvc.perform(post("/api/v1/auth/refresh")
                        .header("X-CSRF-Token", "csrf-header")
                        .cookie(new jakarta.servlet.http.Cookie("treasury_refresh", "refresh"))
                        .cookie(new jakarta.servlet.http.Cookie("treasury_csrf", "csrf-cookie")))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errors.csrf").exists());
        verify(refreshTokenService, org.mockito.Mockito.never()).rotate(any(), any());
    }

    private String loginBody() {
        return "{\"correo\":\"admin@mail.com\",\"password\":\"Password1!\"}";
    }

    private String registerBody() {
        return """
                {
                  "nombre":"Victor Vivas",
                  "correo":"admin@mail.com",
                  "password":"Password1!",
                  "rol":"ADMIN"
                }
                """;
    }
}
