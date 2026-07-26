package user;

import com.tesoreria.shared.domain.exception.DomainException;
import com.tesoreria.shared.infrastructure.exception.GlobalExceptionHandler;
import com.tesoreria.user.application.usecase.AuthService;
import com.tesoreria.user.application.usecase.RegistrationRateLimiter;
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
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
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
    private User user;
    private UserResponseDTO response;

    @BeforeEach
    void setUp() {
        authService = org.mockito.Mockito.mock(AuthService.class);
        userService = org.mockito.Mockito.mock(UserService.class);
        mapper = org.mockito.Mockito.mock(UserMapper.class);
        jwtService = org.mockito.Mockito.mock(JwtService.class);
        revocationService = org.mockito.Mockito.mock(TokenRevocationService.class);
        registrationRateLimiter = org.mockito.Mockito.mock(RegistrationRateLimiter.class);
        mockMvc = MockMvcBuilders
                .standaloneSetup(new AuthController(
                        authService, userService, mapper, jwtService, revocationService, registrationRateLimiter))
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
        user = new User(
                1L, "USR-001", "Victor Vivas", "admin@mail.com", "$2a$hash",
                RoleEnum.ADMIN, true, true, null, null);
        response = new UserResponseDTO(
                1L, "USR-001", "VICTOR VIVAS", "admin@mail.com",
                RoleEnum.ADMIN, true, true, null, null);
        when(mapper.toResponse(user)).thenReturn(response);
    }

    @Test
    void loginExitoso_deberiaRetornarJwt() throws Exception {
        when(authService.login("admin@mail.com", "Password1!")).thenReturn("jwt");
        when(userService.findByCorreo("admin@mail.com")).thenReturn(user);
        when(jwtService.getExpirationMs()).thenReturn(86_400_000L);
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginBody()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").value("jwt"));
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
                        .header("Authorization", "Bearer jwt"))
                .andExpect(status().isNoContent());
        org.mockito.Mockito.verify(revocationService)
                .revoke(org.mockito.ArgumentMatchers.eq("jwt"), org.mockito.ArgumentMatchers.any());
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
