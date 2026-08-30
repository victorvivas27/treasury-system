package apoderado;

import com.tesoreria.apoderado.application.usecase.ApoderadoService;
import com.tesoreria.apoderado.core.model.Apoderado;
import com.tesoreria.apoderado.infrastructure.adapter.in.web.dto.ApoderadoRequest;
import com.tesoreria.apoderado.infrastructure.adapter.in.web.dto.ApoderadoResponse;
import com.tesoreria.apoderado.infrastructure.adapter.in.web.controller.ApoderadoController;
import com.tesoreria.apoderado.infrastructure.adapter.in.web.mapper.ApoderadoMapper;
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

import static org.junit.jupiter.api.Assertions.assertEquals;
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

    private User user(RoleEnum role) {
        return new User(1L, "US-ABC12345", "Administrador Colegio", EMAIL,
                "Password1!", role, true, true, null, null, null);
    }
}
