package user;

import com.tesoreria.shared.domain.exception.DomainException;
import com.tesoreria.user.application.usecase.CustomUserDetailsService;
import com.tesoreria.user.application.usecase.RefreshTokenService;
import com.tesoreria.user.config.security.JwtService;
import com.tesoreria.user.core.constant.UserTokenType;
import com.tesoreria.user.infrastructure.adapter.out.persistence.entity.UserEntity;
import com.tesoreria.user.infrastructure.adapter.out.persistence.entity.UserTokenEntity;
import com.tesoreria.user.infrastructure.adapter.out.persistence.repository.UserJpaRepository;
import com.tesoreria.user.infrastructure.adapter.out.persistence.repository.UserTokenJpaRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.userdetails.UserDetails;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RefreshTokenServiceTest {
    @Mock UserTokenJpaRepository tokenRepository;
    @Mock UserJpaRepository userRepository;
    @Mock CustomUserDetailsService userDetailsService;
    @Mock JwtService jwtService;
    private RefreshTokenService service;
    private UserEntity user;
    private UserDetails details;

    @BeforeEach
    void setUp() {
        service = new RefreshTokenService(tokenRepository, userRepository, userDetailsService, jwtService, 3600);
        user = new UserEntity();
        user.setId(7L);
        user.setCorreo("admin@mail.com");
        details = org.springframework.security.core.userdetails.User
                .withUsername("admin@mail.com").password("hash").roles("ADMIN").build();
    }

    @Test
    void issue_guardaHashYEntregaTokens() {
        when(userRepository.findFirstByCorreoOrderByIdAsc("admin@mail.com")).thenReturn(Optional.of(user));
        when(userDetailsService.loadUserById(7L)).thenReturn(details);
        when(jwtService.generateToken(eq(details), any(UUID.class))).thenReturn("access");

        RefreshTokenService.IssuedTokens issued = service.issue("ADMIN@MAIL.COM");

        assertEquals("access", issued.accessToken());
        assertNotNull(issued.refreshToken());
        assertFalse(issued.refreshToken().isBlank());
        ArgumentCaptor<UserTokenEntity> saved = ArgumentCaptor.forClass(UserTokenEntity.class);
        verify(tokenRepository).save(saved.capture());
        assertEquals(7L, saved.getValue().getUserId());
        assertEquals(UserTokenType.REFRESH_TOKEN, saved.getValue().getType());
        assertEquals(64, saved.getValue().getTokenHash().length());
        assertEquals(64, saved.getValue().getCsrfTokenHash().length());
        assertNotNull(saved.getValue().getTokenFamilyId());
        assertNotEquals(issued.refreshToken(), saved.getValue().getTokenHash());
        assertNotEquals(issued.csrfToken(), saved.getValue().getCsrfTokenHash());
    }

    @Test
    void rotate_invalidaTokenAnteriorYEmiteUnoNuevo() {
        UserTokenEntity current = refreshEntity(LocalDateTime.now().plusMinutes(5));
        when(tokenRepository.findByTokenHashAndType(anyString(), eq(UserTokenType.REFRESH_TOKEN)))
                .thenReturn(Optional.of(current));
        when(userRepository.findById(7L)).thenReturn(Optional.of(user));
        when(userDetailsService.loadUserById(7L)).thenReturn(details);
        when(jwtService.generateToken(eq(details), any(UUID.class))).thenReturn("new-access");

        RefreshTokenService.IssuedTokens issued = service.rotate("old-refresh");

        assertEquals("new-access", issued.accessToken());
        assertNotNull(current.getUsedAt());
        assertEquals(current.getUsedAt(), current.getLastUsedAt());
        verify(tokenRepository, times(2)).save(any(UserTokenEntity.class));
    }

    @Test
    void rotate_conCsrfInvalido_rechazaSinRotar() {
        UserTokenEntity current = refreshEntity(LocalDateTime.now().plusMinutes(5));
        current.setCsrfTokenHash(sha256("csrf-valido"));
        when(tokenRepository.findByTokenHashAndType(anyString(), eq(UserTokenType.REFRESH_TOKEN)))
                .thenReturn(Optional.of(current));

        DomainException exception = assertThrows(DomainException.class,
                () -> service.rotate("old-refresh", "csrf-invalido"));

        assertEquals(org.springframework.http.HttpStatus.FORBIDDEN, exception.getStatus());
        verify(tokenRepository, never()).save(any());
        verify(tokenRepository, never()).revokeFamily(any(), any(), any());
    }

    @Test
    void revoke_conCsrfValido_revocaFamiliaPersistente() {
        UserTokenEntity current = refreshEntity(LocalDateTime.now().plusMinutes(5));
        current.setCsrfTokenHash(sha256("csrf"));
        when(tokenRepository.findByTokenHashAndType(anyString(), eq(UserTokenType.REFRESH_TOKEN)))
                .thenReturn(Optional.of(current));

        service.revoke("refresh", "csrf");

        assertNotNull(current.getRevokedAt());
        verify(tokenRepository).revokeFamily(eq(current.getTokenFamilyId()), eq(UserTokenType.REFRESH_TOKEN), any());
    }

    @Test
    void rotate_rechazaTokenExpirado() {
        UserTokenEntity expired = refreshEntity(LocalDateTime.now().minusSeconds(1));
        when(tokenRepository.findByTokenHashAndType(anyString(), eq(UserTokenType.REFRESH_TOKEN)))
                .thenReturn(Optional.of(expired));

        assertThrows(DomainException.class, () -> service.rotate("expired-refresh"));
        verify(userRepository, never()).findById(anyLong());
        verify(tokenRepository).revokeFamily(eq(expired.getTokenFamilyId()), eq(UserTokenType.REFRESH_TOKEN), any());
    }

    @Test
    void rotate_reutilizacionFueraDeGraciaInvalidaFamilia() {
        UserTokenEntity reused = refreshEntity(LocalDateTime.now().plusMinutes(5));
        reused.setUsedAt(LocalDateTime.now().minusSeconds(30));
        when(tokenRepository.findByTokenHashAndType(anyString(), eq(UserTokenType.REFRESH_TOKEN)))
                .thenReturn(Optional.of(reused));

        assertThrows(DomainException.class, () -> service.rotate("old-refresh"));

        verify(tokenRepository).revokeFamily(eq(reused.getTokenFamilyId()), eq(UserTokenType.REFRESH_TOKEN), any());
    }

    @Test
    void rotate_reutilizacionConcurrenteDentroDeGraciaNoInvalidaFamilia() {
        UserTokenEntity reused = refreshEntity(LocalDateTime.now().plusMinutes(5));
        reused.setUsedAt(LocalDateTime.now());
        when(tokenRepository.findByTokenHashAndType(anyString(), eq(UserTokenType.REFRESH_TOKEN)))
                .thenReturn(Optional.of(reused));

        assertThrows(DomainException.class, () -> service.rotate("old-refresh"));

        verify(tokenRepository, never()).revokeFamily(any(), any(), any());
    }

    @Test
    void revoke_marcaTokenComoUsadoYAdmiteCookieAusente() {
        UserTokenEntity current = refreshEntity(LocalDateTime.now().plusMinutes(5));
        when(tokenRepository.findByTokenHashAndType(anyString(), eq(UserTokenType.REFRESH_TOKEN)))
                .thenReturn(Optional.of(current));

        service.revoke("refresh");
        service.revoke(null);

        assertNotNull(current.getRevokedAt());
        verify(tokenRepository).save(current);
        verify(tokenRepository).revokeFamily(eq(current.getTokenFamilyId()), eq(UserTokenType.REFRESH_TOKEN), any());
    }

    @Test
    void isFamilyActive_consultaSesionPersistente() {
        UUID familyId = UUID.randomUUID();
        when(tokenRepository.existsByTokenFamilyIdAndTypeAndRevokedAtIsNullAndUsedAtIsNullAndExpiresAtAfter(
                eq(familyId), eq(UserTokenType.REFRESH_TOKEN), any())).thenReturn(true);

        assertTrue(service.isFamilyActive(familyId));
        assertFalse(service.isFamilyActive(null));
    }

    private UserTokenEntity refreshEntity(LocalDateTime expiresAt) {
        UserTokenEntity token = new UserTokenEntity();
        token.setUserId(7L);
        token.setType(UserTokenType.REFRESH_TOKEN);
        token.setTokenHash("a".repeat(64));
        token.setTokenFamilyId(UUID.randomUUID());
        token.setExpiresAt(expiresAt);
        return token;
    }

    private String sha256(String value) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(value.getBytes(StandardCharsets.UTF_8));
            return java.util.HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException(exception);
        }
    }
}
