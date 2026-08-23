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

import java.time.LocalDateTime;
import java.util.Optional;

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
        when(userRepository.findByCorreo("admin@mail.com")).thenReturn(Optional.of(user));
        when(userDetailsService.loadUserByUsername("admin@mail.com")).thenReturn(details);
        when(jwtService.generateToken(details)).thenReturn("access");

        RefreshTokenService.IssuedTokens issued = service.issue("ADMIN@MAIL.COM");

        assertEquals("access", issued.accessToken());
        assertNotNull(issued.refreshToken());
        assertFalse(issued.refreshToken().isBlank());
        ArgumentCaptor<UserTokenEntity> saved = ArgumentCaptor.forClass(UserTokenEntity.class);
        verify(tokenRepository).save(saved.capture());
        assertEquals(7L, saved.getValue().getUserId());
        assertEquals(UserTokenType.REFRESH_TOKEN, saved.getValue().getType());
        assertEquals(64, saved.getValue().getTokenHash().length());
        assertNotEquals(issued.refreshToken(), saved.getValue().getTokenHash());
    }

    @Test
    void rotate_invalidaTokenAnteriorYEmiteUnoNuevo() {
        UserTokenEntity current = refreshEntity(LocalDateTime.now().plusMinutes(5));
        when(tokenRepository.findByTokenHashAndType(anyString(), eq(UserTokenType.REFRESH_TOKEN)))
                .thenReturn(Optional.of(current));
        when(userRepository.findById(7L)).thenReturn(Optional.of(user));
        when(userRepository.findByCorreo("admin@mail.com")).thenReturn(Optional.of(user));
        when(userDetailsService.loadUserByUsername("admin@mail.com")).thenReturn(details);
        when(jwtService.generateToken(details)).thenReturn("new-access");

        RefreshTokenService.IssuedTokens issued = service.rotate("old-refresh");

        assertEquals("new-access", issued.accessToken());
        assertNotNull(current.getUsedAt());
        verify(tokenRepository, times(2)).save(any(UserTokenEntity.class));
    }

    @Test
    void rotate_rechazaTokenExpirado() {
        UserTokenEntity expired = refreshEntity(LocalDateTime.now().minusSeconds(1));
        when(tokenRepository.findByTokenHashAndType(anyString(), eq(UserTokenType.REFRESH_TOKEN)))
                .thenReturn(Optional.of(expired));

        assertThrows(DomainException.class, () -> service.rotate("expired-refresh"));
        verify(userRepository, never()).findById(anyLong());
    }

    @Test
    void revoke_marcaTokenComoUsadoYAdmiteCookieAusente() {
        UserTokenEntity current = refreshEntity(LocalDateTime.now().plusMinutes(5));
        when(tokenRepository.findByTokenHashAndType(anyString(), eq(UserTokenType.REFRESH_TOKEN)))
                .thenReturn(Optional.of(current));

        service.revoke("refresh");
        service.revoke(null);

        assertNotNull(current.getUsedAt());
        verify(tokenRepository).save(current);
    }

    private UserTokenEntity refreshEntity(LocalDateTime expiresAt) {
        UserTokenEntity token = new UserTokenEntity();
        token.setUserId(7L);
        token.setType(UserTokenType.REFRESH_TOKEN);
        token.setTokenHash("a".repeat(64));
        token.setExpiresAt(expiresAt);
        return token;
    }
}
