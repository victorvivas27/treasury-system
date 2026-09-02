package apoderado;

import com.tesoreria.apoderado.application.usecase.ApoderadoService;
import com.tesoreria.apoderado.core.model.Apoderado;
import com.tesoreria.apoderado.infrastructure.adapter.in.web.dto.ApoderadoRequest;
import com.tesoreria.apoderado.infrastructure.adapter.in.web.dto.ApoderadoResponse;
import com.tesoreria.apoderado.infrastructure.adapter.in.web.controller.ApoderadoController;
import com.tesoreria.apoderado.infrastructure.adapter.in.web.mapper.ApoderadoMapper;
import com.tesoreria.shared.domain.pagination.PageRequest;
import com.tesoreria.shared.domain.pagination.PageResponse;
import com.tesoreria.user.application.usecase.AccountRecoveryService;
import com.tesoreria.user.core.constant.RoleEnum;
import com.tesoreria.user.core.model.User;
import com.tesoreria.user.core.port.out.UserRepositoryOutPort;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;

import java.util.Optional;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ApoderadoControllerTest {

    private static final String CODE = "AP-ABC12345";
    private static final String EMAIL = "admin@mail.com";

    @Mock
    private ApoderadoService apoderadoService;
    @Mock
    private UserRepositoryOutPort users;
    @Mock
    private AccountRecoveryService accountRecovery;

    private ApoderadoController controller;
    private Apoderado guardian;

    @BeforeEach
    void setUp() {
        controller = new ApoderadoController(
                apoderadoService, new ApoderadoMapper(), users, accountRecovery);
        guardian = new Apoderado(1L, CODE, "Administrador Colegio", EMAIL,
                "+56912345678", null, true, null, null);
    }

    @Test
    void findByCodigo_deberiaMostrarActivoCuandoElApoderadoYaEsAdminHabilitado() {
        when(apoderadoService.findByCodigo(CODE)).thenReturn(guardian);
        when(users.findByCorreo(EMAIL)).thenReturn(Optional.of(user(RoleEnum.ADMIN)));

        ResponseEntity<ApoderadoResponse> result = controller.findByCodigo(CODE);

        assertEquals("ACTIVO", result.getBody().accessStatus());
    }

    @Test
    void create_deberiaMostrarActivoInmediatamenteCuandoElCorreoYaEsAdmin() {
        ApoderadoRequest request = new ApoderadoRequest();
        request.setNombre("Administrador Colegio");
        request.setEmail(EMAIL);
        request.setTelefono("+56912345678");
        when(apoderadoService.create(org.mockito.ArgumentMatchers.any(Apoderado.class)))
                .thenReturn(guardian);
        when(users.findByCorreo(EMAIL)).thenReturn(Optional.of(user(RoleEnum.ADMIN)));

        ResponseEntity<ApoderadoResponse> result = controller.create(request);

        assertEquals("ACTIVO", result.getBody().accessStatus());
    }

    @Test
    void findByCodigo_deberiaMantenerPendienteUnUsuarioComunSinVerificar() {
        when(apoderadoService.findByCodigo(CODE)).thenReturn(guardian);
        when(users.findByCorreo(EMAIL)).thenReturn(Optional.of(user(RoleEnum.USER)));

        ResponseEntity<ApoderadoResponse> result = controller.findByCodigo(CODE);

        assertEquals("INVITACION_PENDIENTE", result.getBody().accessStatus());
    }

    @Test
    void findAll_deberiaResolverEstadosDeAccesoEnUnaConsultaBatch() {
        Apoderado secondGuardian = new Apoderado(2L, "AP-DEF67890", "Apoderado Dos",
                "user@mail.com", "+56987654321", null, true, null, null);
        PageRequest request = new PageRequest(0, 20, null, null, "");
        when(apoderadoService.findAll(request)).thenReturn(new PageResponse<>(
                List.of(guardian, secondGuardian), 0, 20, 2, 1));
        when(users.findByCorreos(argThat(emails ->
                emails.containsAll(List.of(EMAIL, "user@mail.com")) && emails.size() == 2)))
                .thenReturn(List.of(user(RoleEnum.ADMIN), user(RoleEnum.USER)));

        ResponseEntity<PageResponse<ApoderadoResponse>> result = controller.findAll(0, 20, "");

        assertEquals(2, result.getBody().content().size());
        assertEquals("ACTIVO", result.getBody().content().get(0).accessStatus());
        assertEquals("INVITACION_PENDIENTE", result.getBody().content().get(1).accessStatus());
        verify(users).findByCorreos(argThat(emails ->
                emails.containsAll(List.of(EMAIL, "user@mail.com")) && emails.size() == 2));
        verify(users, never()).findByCorreo(anyString());
    }

    private User user(RoleEnum role) {
        return user(role, role == RoleEnum.ADMIN ? EMAIL : "user@mail.com");
    }

    private User user(RoleEnum role, String email) {
        return new User(1L, "US-ABC12345", "Administrador Colegio", email,
                "Password1!", role, true, true, null, null, null);
    }
}
