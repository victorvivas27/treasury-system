package user;

import com.tesoreria.shared.domain.exception.DomainException;
import com.tesoreria.user.application.usecase.UserService;
import com.tesoreria.user.core.constant.RoleEnum;
import com.tesoreria.user.core.exception.EmailAlreadyExistsException;
import com.tesoreria.user.core.model.AdminUserUpdate;
import com.tesoreria.user.core.model.User;
import com.tesoreria.user.core.port.out.UserRepositoryOutPort;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SA04UserServiceTest {
    @Mock UserRepositoryOutPort repository;
    @Mock PasswordEncoder encoder;
    private UserService service;
    private User account;

    @BeforeEach
    void setup() {
        service = new UserService(repository, encoder);
        account = new User(10L, "USR-ACCOUNT", "Persona Prueba", "user@mail.com", "$2a$hash",
                RoleEnum.USER, false, false, null, null);
        account.setOrganizationId(1L);
        account.setInvitationAcceptedAt(LocalDateTime.of(2026, 1, 1, 0, 0));
        account.setInvitedGuardianId(42L);
        account.setTotpEnabled(true); account.setTotpSecret("fixturesecret"); account.setBackupCodes("fixturecodes");
    }

    @Test
    void selfProfileUpdatesOnlyNameEvenForDisabledLockedAccount() {
        when(repository.findById(10L)).thenReturn(Optional.of(account));
        when(repository.save(account)).thenReturn(account);
        User result = service.updateSelfProfile(10L, "Nuevo Nombre", 10L);
        assertEquals("NUEVO NOMBRE", result.getNombre());
        assertAll(
                () -> assertFalse(result.getEnabled()), () -> assertFalse(result.getAccountNonLocked()),
                () -> assertEquals(RoleEnum.USER, result.getRol()), () -> assertEquals(1L, result.getOrganizationId()),
                () -> assertEquals(10L, result.getId()), () -> assertEquals("USR-ACCOUNT", result.getCode()),
                () -> assertEquals("user@mail.com", result.getCorreo()), () -> assertEquals("$2a$hash", result.getPassword()),
                () -> assertNull(result.getEmailVerifiedAt()), () -> assertEquals(42L, result.getInvitedGuardianId()),
                () -> assertEquals(LocalDateTime.of(2026, 1, 1, 0, 0), result.getInvitationAcceptedAt()),
                () -> assertTrue(result.getTotpEnabled()), () -> assertEquals("fixturesecret", result.getTotpSecret()),
                () -> assertEquals("fixturecodes", result.getBackupCodes()));
        verifyNoInteractions(encoder);
    }

    @Test
    void selfProfileRejectsDifferentOrMissingAccountIdentityBeforeAccessingRepository() {
        assertThrows(AccessDeniedException.class, () -> service.updateSelfProfile(10L, "Nuevo Nombre", 20L));
        assertThrows(AccessDeniedException.class, () -> service.updateSelfProfile(10L, "Nuevo Nombre", null));
        assertThrows(AccessDeniedException.class, () -> service.updateSelfProfile(null, "Nuevo Nombre", 10L));
        verifyNoInteractions(repository);
    }

    @Test
    void invalidNameCannotPersist() {
        when(repository.findById(10L)).thenReturn(Optional.of(account));
        assertThrows(DomainException.class, () -> service.updateSelfProfile(10L, "123", 10L));
        assertEquals("PERSONA PRUEBA", account.getNombre());
        verify(repository, never()).save(any());
    }

    @Test
    void adminUpdateWithoutStatesPreservesBlockedDisabledAccount() {
        when(repository.findById(10L)).thenReturn(Optional.of(account));
        when(repository.save(account)).thenReturn(account);
        User result = service.update(10L, new AdminUserUpdate("Nuevo Nombre", "USER@mail.com", null, null), 20L);
        assertFalse(result.getEnabled()); assertFalse(result.getAccountNonLocked());
        assertEquals("NUEVO NOMBRE", result.getNombre());
        assertEquals(RoleEnum.USER, result.getRol());
    }

    @Test
    void duplicateAdminEmailIsRejectedBeforeChangingAnyField() {
        when(repository.findById(10L)).thenReturn(Optional.of(account));
        var other = new User(20L, "USR-OTHER", "Otra Persona", "other@mail.com", "$2a$hash", RoleEnum.ADMIN,
                true, true, null, null);
        when(repository.findByCorreoAndOrganizationId("other@mail.com", 1L)).thenReturn(Optional.of(other));
        assertThrows(EmailAlreadyExistsException.class, () -> service.update(10L,
                new AdminUserUpdate("Nuevo Nombre", "other@mail.com", true, true), 20L));
        assertEquals("PERSONA PRUEBA", account.getNombre());
        assertFalse(account.getEnabled()); assertFalse(account.getAccountNonLocked());
        verify(repository, never()).save(any());
    }

    @Test
    void adminPutCannotBypassOwnDeactivationProtection() {
        account.setRol(RoleEnum.ADMIN);
        when(repository.findById(10L)).thenReturn(Optional.of(account));
        assertThrows(DomainException.class, () -> service.update(10L,
                new AdminUserUpdate("Nuevo Nombre", account.getCorreo(), false, true), 10L));
        assertEquals("PERSONA PRUEBA", account.getNombre()); assertFalse(account.getAccountNonLocked());
        verify(repository, never()).save(any());
    }

    @Test
    void adminPutCannotBypassLastAdministratorProtection() {
        account.setRol(RoleEnum.ADMIN); account.setEnabled(true);
        when(repository.findById(10L)).thenReturn(Optional.of(account));
        when(repository.countByRol(RoleEnum.ADMIN)).thenReturn(1L);
        assertThrows(DomainException.class, () -> service.update(10L,
                new AdminUserUpdate("Nuevo Nombre", account.getCorreo(), false, true), 20L));
        assertEquals("PERSONA PRUEBA", account.getNombre()); assertTrue(account.getEnabled());
        verify(repository, never()).save(any());
    }
}
