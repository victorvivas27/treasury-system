package user;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.userdetails.UsernameNotFoundException;

import com.tesoreria.user.application.usecase.CustomUserDetailsService;
import com.tesoreria.user.core.constant.RoleEnum;
import com.tesoreria.user.core.model.User;
import com.tesoreria.user.core.port.out.UserRepositoryOutPort;

@ExtendWith(MockitoExtension.class)
class CustomUserDetailsServiceTest {
  @Mock
  private UserRepositoryOutPort repository;

  @Test
  void deberiaMapearUsuarioYAutoridad() {
    User user = new User(
        1L, "USR-001", "Victor Vivas", "admin@mail.com", "$2a$hash",
        RoleEnum.ADMIN, true, false, null, null);
    when(repository.findByCorreo("admin@mail.com")).thenReturn(Optional.of(user));
    var details = new CustomUserDetailsService(repository).loadUserByUsername("ADMIN@MAIL.COM");
    assertEquals("admin@mail.com", details.getUsername());
    assertFalse(details.isAccountNonLocked());
    assertEquals("ROLE_ADMIN", details.getAuthorities().iterator().next().getAuthority());
  }

  @Test
  void deberiaRechazarUsuarioInexistente() {
    when(repository.findByCorreo("none@mail.com")).thenReturn(Optional.empty());
    assertThrows(
        UsernameNotFoundException.class,
        () -> new CustomUserDetailsService(repository).loadUserByUsername("none@mail.com"));
  }
}
