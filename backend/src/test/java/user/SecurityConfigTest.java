package user;

import com.tesoreria.TesoreriaAppApplication;
import com.tesoreria.user.config.security.JwtService;
import com.tesoreria.user.config.security.SecurityConfig;
import com.tesoreria.user.core.constant.RoleEnum;
import com.tesoreria.user.infrastructure.adapter.in.web.controller.UserController;
import com.tesoreria.user.infrastructure.adapter.out.persistence.entity.UserEntity;
import com.tesoreria.user.infrastructure.adapter.out.persistence.repository.UserJpaRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.lang.reflect.Method;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(classes = TesoreriaAppApplication.class)
@AutoConfigureMockMvc
@ActiveProfiles("test")
class SecurityConfigTest {
    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private JwtService jwtService;
    @Autowired
    private UserDetailsService userDetailsService;
    @Autowired
    private UserJpaRepository userRepository;

    @BeforeEach
    void setUpUsers() {
        userRepository.deleteAll();
        createUser("USR-001", "user@mail.com", RoleEnum.USER);
        createUser("ADM-001", "admin@mail.com", RoleEnum.ADMIN);
    }

    @Test
    void securityConfig_deberiaHabilitarSeguridadDeMetodos() {
        assertNotNull(SecurityConfig.class.getAnnotation(
                org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity.class));
    }

    @Test
    void usersCreate_deberiaRequerirAdmin() throws NoSuchMethodException {
        Method method = UserController.class.getMethod(
                "create",
                com.tesoreria.user.infrastructure.adapter.in.web.dto.UserRequestDTO.class);
        PreAuthorize annotation = method.getAnnotation(PreAuthorize.class);
        assertNotNull(annotation);
        assertTrue(annotation.value().contains("ADMIN"));
    }

    @Test
    void users_deberiaRequerirAutenticacion() throws Exception {
        mockMvc.perform(get("/api/v1/users")).andExpect(status().isUnauthorized());
    }

    @Test
    void login_deberiaSerPublico() throws Exception {
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(header().string("Content-Security-Policy",
                        org.hamcrest.Matchers.containsString("default-src 'self'")));
    }

    @Test
    void rutaNoDeclarada_deberiaPermanecerCerrada() throws Exception {
        mockMvc.perform(get("/api/v1/no-declarada"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void swagger_deberiaRequerirAdministrador() throws Exception {
        mockMvc.perform(get("/swagger-ui/index.html"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void dominiosEscolares_deberianRechazarUsuarioNoAdmin() throws Exception {
        String token = tokenFor("user@mail.com");
        for (String path : List.of(
                "/api/v1/alumnos",
                "/api/v1/apoderados",
                "/api/v1/familias",
                "/api/v1/users")) {
            mockMvc.perform(get(path).header("Authorization", "Bearer " + token))
                    .andExpect(status().isForbidden());
        }
    }

    @Test
    void dominiosEscolares_deberianPermitirAdministrador() throws Exception {
        String token = tokenFor("admin@mail.com");
        for (String path : List.of(
                "/api/v1/alumnos",
                "/api/v1/apoderados",
                "/api/v1/familias",
                "/api/v1/users")) {
            mockMvc.perform(get(path).header("Authorization", "Bearer " + token))
                    .andExpect(status().isOk());
        }
    }

    @Test
    void resumenTesoreria_deberiaPermitirUsuarioAutenticado() throws Exception {
        String token = tokenFor("user@mail.com");

        mockMvc.perform(get("/api/v1/tesoreria/dashboard?year=2026")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound());
    }

    @Test
    void administracionTesoreria_deberiaRechazarUsuarioComun() throws Exception {
        String token = tokenFor("user@mail.com");

        mockMvc.perform(get("/api/v1/tesoreria/configuraciones?year=2026")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    private void createUser(String code, String correo, RoleEnum role) {
        UserEntity user = new UserEntity();
        user.setCode(code);
        user.setNombre(role == RoleEnum.ADMIN ? "Administrador Prueba" : "Usuario Prueba");
        user.setCorreo(correo);
        user.setPassword("Test123!");
        user.setRol(role);
        userRepository.save(user);
    }

    private String tokenFor(String correo) {
        return jwtService.generateToken(userDetailsService.loadUserByUsername(correo));
    }
}
