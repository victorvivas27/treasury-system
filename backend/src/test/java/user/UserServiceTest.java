package user;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.tesoreria.shared.domain.exception.DomainException;
import com.tesoreria.shared.domain.pagination.PageRequest;
import com.tesoreria.shared.domain.pagination.PageResponse;
import com.tesoreria.user.application.usecase.UserService;
import com.tesoreria.user.core.constant.RoleEnum;
import com.tesoreria.user.core.exception.EmailAlreadyExistsException;
import com.tesoreria.user.core.model.User;
import com.tesoreria.user.core.port.out.UserRepositoryOutPort;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {
  @Mock
  private UserRepositoryOutPort repository;
  @Mock
  private PasswordEncoder encoder;
  private UserService service;
  private User user;

  @BeforeEach
  void setUp() {
    service = new UserService(repository, encoder);
    user = user(1L, "admin@mail.com", RoleEnum.ADMIN);
  }

  private User user(Long id, String correo, RoleEnum role) {
    return new User(
        id, id == null ? null : "USR-001", "Victor Vivas", correo,
        "Password1!", role, true, true, null, null);
  }

  @Nested
  class CreateTests {
    @Test
    void create_deberiaGenerarCodigoEncriptarYGuardar() {
      User newUser = user(null, "user@mail.com", RoleEnum.USER);
      when(encoder.encode("Password1!")).thenReturn("$2a$hash");
      when(repository.save(newUser)).thenReturn(newUser);

      User result = service.create(newUser);

      assertTrue(result.getCode().matches("^USR-[A-Z0-9]{8}$"));
      assertEquals("$2a$hash", result.getPassword());
      verify(repository).save(newUser);
    }

    @Test
    void create_deberiaRechazarCorreoDuplicado() {
      when(repository.existsByCorreo(user.getCorreo())).thenReturn(true);
      assertThrows(EmailAlreadyExistsException.class, () -> service.create(user));
      verify(repository, never()).save(user);
    }

  }

  @Nested
  class FindAndListTests {
    @Test
    void findById_deberiaRetornarUsuario() {
      when(repository.findById(1L)).thenReturn(Optional.of(user));
      assertEquals(user, service.findById(1L));
    }

    @Test
    void findById_deberiaRechazarUsuarioInexistente() {
      when(repository.findById(1L)).thenReturn(Optional.empty());
      assertThrows(DomainException.class, () -> service.findById(1L));
    }

    @Test
    void findAll_deberiaRetornarPagina() {
      PageRequest request = new PageRequest(0, 10, null, null);
      PageResponse<User> page = new PageResponse<>(List.of(user), 0, 10, 1, 1);
      when(repository.findAll(request)).thenReturn(page);
      assertEquals(page, service.findAll(request));
    }
  }

  @Nested
  class UpdateTests {
    @Test
    void update_deberiaPermitirMismoCorreoYActualizarPassword() {
      User changes = user(null, "admin@mail.com", RoleEnum.USER);
      when(repository.findById(1L)).thenReturn(Optional.of(user));
      when(repository.findByCorreo(changes.getCorreo())).thenReturn(Optional.of(user));
      when(encoder.matches(changes.getPassword(), user.getPassword())).thenReturn(false);
      when(encoder.encode(changes.getPassword())).thenReturn("$2a$new");
      when(repository.save(user)).thenReturn(user);

      User result = service.update(1L, changes, user.getCorreo());

      assertEquals("$2a$new", result.getPassword());
      verify(repository).save(user);
    }

    @Test
    void changeRole_deberiaRechazarUsuarioAutenticado() {
      when(repository.findById(1L)).thenReturn(Optional.of(user));
      assertThrows(
          DomainException.class,
          () -> service.changeRole(1L, RoleEnum.USER, "admin@mail.com"));
    }
  }

  @Nested
  class DeleteTests {
    @Test
    void delete_deberiaImpedirEliminarUltimoAdmin() {
      when(repository.findById(1L)).thenReturn(Optional.of(user));
      when(repository.countByRol(RoleEnum.ADMIN)).thenReturn(1L);
      assertThrows(DomainException.class, () -> service.delete(1L));
      verify(repository, never()).deleteById(1L);
    }

    @Test
    void delete_deberiaEliminarUsuarioNormal() {
      User normal = user(2L, "user@mail.com", RoleEnum.USER);
      when(repository.findById(2L)).thenReturn(Optional.of(normal));
      service.delete(2L);
      verify(repository).deleteById(2L);
    }
  }
}
