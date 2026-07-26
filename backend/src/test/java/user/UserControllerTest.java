package user;

import com.tesoreria.shared.domain.pagination.PageResponse;
import com.tesoreria.shared.infrastructure.exception.GlobalExceptionHandler;
import com.tesoreria.user.application.usecase.UserService;
import com.tesoreria.user.core.constant.RoleEnum;
import com.tesoreria.user.core.model.User;
import com.tesoreria.user.infrastructure.adapter.in.web.controller.UserController;
import com.tesoreria.user.infrastructure.adapter.in.web.dto.UserResponseDTO;
import com.tesoreria.user.infrastructure.adapter.in.web.mapper.UserMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class UserControllerTest {
    private MockMvc mockMvc;
    private UserService service;
    private UserMapper mapper;
    private User user;
    private UserResponseDTO response;

    @BeforeEach
    void setUp() {
        service = org.mockito.Mockito.mock(UserService.class);
        mapper = org.mockito.Mockito.mock(UserMapper.class);
        mockMvc = MockMvcBuilders
                .standaloneSetup(new UserController(service, mapper))
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
        user = new User(
                1L, "USR-001", "Victor Vivas", "user@mail.com", "$2a$hash",
                RoleEnum.USER, true, true, null, null);
        response = new UserResponseDTO(
                1L, "USR-001", "VICTOR VIVAS", "user@mail.com",
                RoleEnum.USER, true, true, null, null);
        when(mapper.toResponse(user)).thenReturn(response);
    }

    @Test
    void create_deberiaRetornar201() throws Exception {
        when(mapper.toDomain(any())).thenReturn(user);
        when(service.create(user)).thenReturn(user);
        mockMvc.perform(post("/api/v1/users")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validRequest()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.code").value("USR-001"));
    }

    @Test
    void findAll_deberiaRetornarPagina() throws Exception {
        when(service.findAll(any())).thenReturn(new PageResponse<>(List.of(user), 0, 10, 1, 1));
        mockMvc.perform(get("/api/v1/users"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].correo").value("user@mail.com"));
    }

    @Test
    void findByIdCodeAndEmail_deberianRetornarUsuario() throws Exception {
        when(service.findById(1L)).thenReturn(user);
        when(service.findByCode("USR-001")).thenReturn(user);
        when(service.findByCorreo("user@mail.com")).thenReturn(user);
        mockMvc.perform(get("/api/v1/users/1")).andExpect(status().isOk());
        mockMvc.perform(get("/api/v1/users/code/USR-001")).andExpect(status().isOk());
        mockMvc.perform(get("/api/v1/users/email/user@mail.com")).andExpect(status().isOk());
    }

    @Test
    void update_deberiaRetornarUsuarioActualizado() throws Exception {
        when(mapper.toDomain(any())).thenReturn(user);
        when(service.update(1L, user, "admin@mail.com")).thenReturn(user);
        mockMvc.perform(put("/api/v1/users/1")
                        .principal(new UsernamePasswordAuthenticationToken("admin@mail.com", null))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validRequest()))
                .andExpect(status().isOk());
    }

    @Test
    void changeRole_deberiaRetornarUsuarioActualizado() throws Exception {
        when(service.changeRole(1L, RoleEnum.ADMIN, "admin@mail.com")).thenReturn(user);
        mockMvc.perform(patch("/api/v1/users/1/rol")
                        .principal(new UsernamePasswordAuthenticationToken("admin@mail.com", null))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"rol\":\"ADMIN\"}"))
                .andExpect(status().isOk());
    }

    @Test
    void delete_deberiaRetornar204() throws Exception {
        mockMvc.perform(delete("/api/v1/users/1")).andExpect(status().isNoContent());
        verify(service).delete(1L);
    }

    @Test
    void create_deberiaRetornar400ConPayloadInvalido() throws Exception {
        mockMvc.perform(post("/api/v1/users")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nombre\":\"A\",\"correo\":\"bad\",\"password\":\"123\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.nombre").exists());
    }

    private String validRequest() {
        return """
                {
                  "nombre":"Victor Vivas",
                  "correo":"user@mail.com",
                  "password":"Password1!",
                  "rol":"USER",
                  "enabled":true,
                  "accountNonLocked":true
                }
                """;
    }
}
