package user;

import com.tesoreria.organization.application.CurrentOrganizationService;
import com.tesoreria.apoderado.infrastructure.adapter.out.persistence.repository.ApoderadoJpaRepository;
import com.tesoreria.shared.domain.exception.DomainException;
import com.tesoreria.organization.application.OrganizationEmailBranding;
import com.tesoreria.organization.application.OrganizationEmailBrandingService;
import com.tesoreria.user.application.usecase.AccountRecoveryService;
import com.tesoreria.user.application.usecase.AuthFlowRateLimiter;
import com.tesoreria.user.config.security.TokenRevocationService;
import com.tesoreria.user.core.constant.UserTokenType;
import com.tesoreria.user.core.model.User;
import com.tesoreria.user.core.port.out.EmailOutPort;
import com.tesoreria.user.core.port.out.UserRepositoryOutPort;
import com.tesoreria.user.infrastructure.adapter.out.persistence.entity.UserTokenEntity;
import com.tesoreria.user.infrastructure.adapter.out.persistence.repository.UserTokenJpaRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.*;

@ExtendWith(MockitoExtension.class)
class AccountRecoveryServiceTest {
    @Mock
    private UserRepositoryOutPort users;
    @Mock
    private UserTokenJpaRepository tokens;
    @Mock
    private EmailOutPort email;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private AuthFlowRateLimiter rateLimiter;
    @Mock
    private TokenRevocationService revocationService;
    @Mock
    private com.tesoreria.user.application.usecase.RefreshTokenService sessions;
    private AccountRecoveryService service;
    @Mock private com.tesoreria.user.application.usecase.SecurityMailQueue mailQueue;
    @Mock
    private ApoderadoJpaRepository guardians;
    @Mock
    private com.tesoreria.organization.infrastructure.persistence.OrganizationJpaRepository organizations;

    @BeforeEach
    void setUp() {
        service = new AccountRecoveryService(users, tokens, email, passwordEncoder,
                rateLimiter, "https://app.example", null, null, guardians, organizations, sessions);
        service.setMailQueue(mailQueue);
    }

    @Test
    void registerRejectsEvenAnExistingActiveGuardian() {
        User user = new User();
        user.setOrganizationId(5L);
        user.setCorreo("ana@example.com");
        when(guardians.existsActiveMember("ana@example.com", 5L)).thenReturn(true);
        assertThrows(DomainException.class, () -> service.register(user));
        verifyNoInteractions(users, tokens, email, passwordEncoder);
    }

    @Test
    void register_rejectsOutsiderWithoutSavingOrSendingEmail() {
        User user = new User();
        user.setOrganizationId(5L);
        user.setCorreo("outsider@example.com");
        user.setPassword("Password1!");

        assertThrows(DomainException.class, () -> service.register(user));

        verify(guardians).existsActiveMember("outsider@example.com", 5L);
        verifyNoInteractions(users, tokens, email, passwordEncoder);
    }

    @Test
    void verifyEmail_rechecksMembershipBeforeActivatingOldToken() throws Exception {
        User user = new User();
        user.setOrganizationId(5L);
        user.setCorreo("outsider@example.com");
        user.setEnabled(false);
        UserTokenEntity token = verificationToken("old-token");
        when(tokens.findByTokenHashAndType(token.getTokenHash(), UserTokenType.EMAIL_VERIFICATION))
                .thenReturn(Optional.of(token));
        when(users.findById(7L)).thenReturn(Optional.of(user));

        assertThrows(DomainException.class, () -> service.verifyEmail("old-token"));

        assertFalse(user.getEnabled());
        assertNull(user.getEmailVerifiedAt());
        verify(users, never()).save(any());
        verify(tokens, never()).delete(any(UserTokenEntity.class));
    }

    @Test
    void verifyEmailProvesMailboxWithoutActivatingPendingMember() throws Exception {
        User user = new User();
        user.setOrganizationId(5L);
        user.setCorreo("ana@example.com");
        user.setEnabled(false);
        UserTokenEntity token = verificationToken("member-token");
        when(tokens.findByTokenHashAndType(token.getTokenHash(), UserTokenType.EMAIL_VERIFICATION))
                .thenReturn(Optional.of(token));
        when(users.findById(7L)).thenReturn(Optional.of(user));
        when(guardians.existsActiveMember("ana@example.com", 5L)).thenReturn(true);
        var organization = new com.tesoreria.organization.infrastructure.persistence.OrganizationEntity();
        organization.setType(com.tesoreria.organization.core.model.OrganizationType.COURSE);
        when(organizations.findById(5L)).thenReturn(Optional.of(organization));

        user.setRol(com.tesoreria.user.core.constant.RoleEnum.USER);
        assertThrows(DomainException.class, () -> service.verifyEmail("member-token"));
        assertFalse(user.getEnabled());
        assertNull(user.getEmailVerifiedAt());
        verify(users, never()).save(any());
    }

    @Test
    void verificationOfPreviouslyInvitedMailboxDoesNotReactivateDisabledUser() throws Exception {
        User user = new User();
        user.setOrganizationId(5L);
        user.setCorreo("ana@example.com");
        user.setRol(com.tesoreria.user.core.constant.RoleEnum.USER);
        user.setEnabled(false);
        user.setInvitationAcceptedAt(java.time.LocalDateTime.now().minusDays(1));
        UserTokenEntity token = verificationToken("authorized-mailbox");
        when(tokens.findByTokenHashAndType(token.getTokenHash(), UserTokenType.EMAIL_VERIFICATION))
                .thenReturn(Optional.of(token));
        when(users.findById(7L)).thenReturn(Optional.of(user));
        when(guardians.existsActiveMember("ana@example.com", 5L)).thenReturn(true);
        var organization = new com.tesoreria.organization.infrastructure.persistence.OrganizationEntity();
        organization.setType(com.tesoreria.organization.core.model.OrganizationType.COURSE);
        when(organizations.findById(5L)).thenReturn(Optional.of(organization));

        service.verifyEmail("authorized-mailbox");

        assertFalse(user.getEnabled());
        assertNotNull(user.getEmailVerifiedAt());
        verify(tokens).delete(token);
    }

    @Test
    void invitationCannotActivateRemovedGuardianOrChangePassword() throws Exception {
        User user = new User();
        user.setOrganizationId(5L);
        user.setCorreo("removed@example.com");
        user.setEnabled(false);
        user.setPassword("Original1!");
        UserTokenEntity token = verificationToken("invitation-token");
        token.setType(UserTokenType.ACCOUNT_INVITATION);
        when(tokens.findByTokenHashAndType(token.getTokenHash(), UserTokenType.PASSWORD_RESET))
                .thenReturn(Optional.empty());
        when(tokens.findSessionUserId(token.getTokenHash(), UserTokenType.PASSWORD_RESET))
                .thenReturn(Optional.empty());
        when(tokens.findSessionUserId(token.getTokenHash(), UserTokenType.ACCOUNT_INVITATION))
                .thenReturn(Optional.of(7L));
        when(tokens.findByTokenHashAndType(token.getTokenHash(), UserTokenType.ACCOUNT_INVITATION))
                .thenReturn(Optional.of(token));
        when(users.findById(7L)).thenReturn(Optional.of(user));

        assertThrows(DomainException.class,
                () -> service.resetPassword("invitation-token", "Changed1!"));

        assertFalse(user.getEnabled());
        assertEquals("Original1!", user.getPassword());
        verify(users, never()).save(any());
        verifyNoInteractions(passwordEncoder, email, revocationService);
    }

    private UserTokenEntity verificationToken(String raw) throws Exception {
        UserTokenEntity token = new UserTokenEntity();
        token.setUserId(7L);
        token.setType(UserTokenType.EMAIL_VERIFICATION);
        token.setTokenHash(HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                .digest(raw.getBytes(StandardCharsets.UTF_8))));
        token.setExpiresAt(java.time.LocalDateTime.now().plusMinutes(10));
        return token;
    }

    @ParameterizedTest
    @ValueSource(booleans = {false, true})
    void forgotPassword_deberiaConservarCodigosAnteriores(boolean fragments) {
        org.springframework.test.util.ReflectionTestUtils.setField(service, "accountLinkFragmentsEnabled", fragments);
        User user = org.mockito.Mockito.mock(User.class);
        when(user.getId()).thenReturn(7L);
        when(user.getNombre()).thenReturn("User");
        when(user.getAccountNonLocked()).thenReturn(true);
        when(user.getOrganizationId()).thenReturn(null);
        when(users.findAllByCorreo("user@example.com")).thenReturn(List.of(user));
        when(email.sendRecoverySummary(anyString(), anyString(), anyList()))
                .thenReturn(true);

        service.forgotPassword("user@example.com");
        verify(mailQueue).enqueue("password-reset", "user@example.com");
        service.deliverPublicMail("password-reset", "user@example.com");

        verify(tokens, never()).deleteByUserIdAndType(7L, UserTokenType.PASSWORD_RESET);
        verify(tokens).save(any(UserTokenEntity.class));
        verify(email).sendRecoverySummary(eq("user@example.com"), eq("User"), argThat(links ->
                links.size() == 1 && links.get(0).url().startsWith(
                        "https://app.example/restablecer-password" + (fragments ? "#" : "?") + "token=")));
    }

    @ParameterizedTest
    @ValueSource(booleans = {false, true})
    void verificationDeliveryUsesSelectedTransportAndStoresOnlyTheHash(boolean fragments) {
        org.springframework.test.util.ReflectionTestUtils.setField(service, "accountLinkFragmentsEnabled", fragments);
        User user = new User();
        user.setId(7L);
        user.setCorreo("user@example.com");
        user.setNombre("User");
        user.setInvitationAcceptedAt(java.time.LocalDateTime.now());
        when(users.findAllByCorreo(user.getCorreo())).thenReturn(List.of(user));
        when(email.sendVerificationEmail(eq(user.getCorreo()), eq(user.getNombre()), anyString())).thenReturn(true);

        service.deliverPublicMail("verification", user.getCorreo());

        var link = org.mockito.ArgumentCaptor.forClass(String.class);
        var saved = org.mockito.ArgumentCaptor.forClass(UserTokenEntity.class);
        verify(email).sendVerificationEmail(eq(user.getCorreo()), eq(user.getNombre()), link.capture());
        verify(tokens).save(saved.capture());
        var uri = java.net.URI.create(link.getValue());
        if (fragments) assertNull(uri.getRawQuery()); else assertNull(uri.getRawFragment());
        assertEquals("/verificar-correo", uri.getPath());
        String credential = fragments ? uri.getFragment() : uri.getQuery();
        assertTrue(credential.startsWith("token="));
        assertNotEquals(credential.substring(6), saved.getValue().getTokenHash());
        assertEquals(64, saved.getValue().getTokenHash().length());
    }

    @Test
    void resetPassword_deberiaInvalidarTodosLosCodigosDelUsuario() throws Exception {
        String rawToken = "recovery-code";
        String hash = HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                .digest(rawToken.getBytes(StandardCharsets.UTF_8)));
        UserTokenEntity token = new UserTokenEntity();
        token.setUserId(7L);
        token.setType(UserTokenType.PASSWORD_RESET);
        token.setTokenHash(hash);
        token.setExpiresAt(java.time.LocalDateTime.now().plusMinutes(10));
        User user = org.mockito.Mockito.mock(User.class);
        when(user.getCorreo()).thenReturn("user@example.com");
        when(user.getNombre()).thenReturn("User");
        when(user.getPassword()).thenReturn("old-hash");
        when(user.getId()).thenReturn(7L);
        when(tokens.findSessionUserId(hash, UserTokenType.PASSWORD_RESET)).thenReturn(Optional.of(7L));
        when(tokens.findByTokenHashAndType(hash, UserTokenType.PASSWORD_RESET))
                .thenReturn(Optional.of(token));
        when(users.findById(7L)).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("NuevaClave1!", "old-hash")).thenReturn(false);
        when(passwordEncoder.encode("NuevaClave1!")).thenReturn("new-hash");
        when(email.sendPasswordChangedEmail(anyString(), anyString(), any())).thenReturn(true);

        service.resetPassword(rawToken, "NuevaClave1!");

        verify(tokens).markAllUsed(eq(7L), eq(UserTokenType.PASSWORD_RESET), any());
        verify(user).setPassword("new-hash");
    }

    @Test
    void inviteGuardianRequiresAuthenticatedAdministrativeActor() {
        org.springframework.security.core.context.SecurityContextHolder.clearContext();
        assertThrows(DomainException.class, () -> service.inviteGuardian(7L));
        verifyNoInteractions(users, tokens, email, passwordEncoder, guardians);
    }
}
