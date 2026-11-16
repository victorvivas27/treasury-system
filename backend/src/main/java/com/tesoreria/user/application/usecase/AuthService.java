package com.tesoreria.user.application.usecase;

import com.tesoreria.shared.domain.exception.DomainException;
import com.tesoreria.user.config.security.JwtService;
import com.tesoreria.user.core.exception.UserErrorCode;
import com.tesoreria.user.core.model.User;
import com.tesoreria.user.core.port.out.UserRepositoryOutPort;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.LockedException;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;

public class AuthService {
    public static final String CURRENT_TERMS_VERSION = "2026-11-16";
    private static final String BAD_CREDENTIALS = "bad";
    private static final int UNIQUE_ACCOUNT_COUNT = 1;
    private static final Logger LOGGER = LoggerFactory.getLogger(AuthService.class);
    private final UserRepositoryOutPort users;
    private final CustomUserDetailsService userDetailsService;
    private final JwtService jwtService;
    private final LoginRateLimiter rateLimiter;
    private final PasswordEncoder passwordEncoder;
    private final String missingAccountHash;

    public AuthService(
            UserRepositoryOutPort users,
            CustomUserDetailsService userDetailsService,
            JwtService jwtService,
            LoginRateLimiter rateLimiter,
            PasswordEncoder passwordEncoder) {
        this.users = users;
        this.userDetailsService = userDetailsService;
        this.jwtService = jwtService;
        this.rateLimiter = rateLimiter;
        this.passwordEncoder = passwordEncoder;
        this.missingAccountHash = passwordEncoder.encode(UUID.randomUUID().toString());
    }

    public LoginResult login(String correo, String password, Long organizationId) {
        return login(correo, password, organizationId, null);
    }

    public LoginResult login(String correo, String password, Long organizationId, String termsVersion) {
        rateLimiter.checkAllowed(correo);
        try {
            User user = authenticate(correo, password, organizationId);
            rateLimiter.recordSuccess(correo);
            if (user == null) {
                List<LoginOrganizationChoice> choices = organizationChoices(correo, password);
                return new LoginResult(null, null, choices);
            }
            if (!CURRENT_TERMS_VERSION.equals(user.getTermsVersion()) || user.getTermsAcceptedAt() == null) {
                if (!CURRENT_TERMS_VERSION.equals(termsVersion)) {
                    return new LoginResult(null, user.getId(), List.of(), true);
                }
                users.recordTermsAcceptance(user.getId(), CURRENT_TERMS_VERSION, java.time.Instant.now());
            }
            UserDetails userDetails = userDetailsService.loadUserById(user.getId());
            if (LOGGER.isInfoEnabled()) {
                LOGGER.info("Login exitoso para {}", maskEmail(correo));
            }
            return new LoginResult(jwtService.generateToken(userDetails), user.getId());
        } catch (BadCredentialsException | DisabledException | LockedException exception) {
            rateLimiter.recordFailure(correo);
            if (LOGGER.isWarnEnabled()) {
                LOGGER.warn("Login fallido para {}", maskEmail(correo));
            }
            throw new DomainException(
                    UserErrorCode.INVALID_CREDENTIALS.getField(),
                    UserErrorCode.INVALID_CREDENTIALS.getStatus(),
                    "Correo o contraseña inválidos",
                    exception);
        }
    }

    public LoginResult login(String correo, String password) {
        return login(correo, password, null);
    }

    public String refresh(String token) {
        JwtService.ParsedToken parsed = jwtService.parseToken(token);
        if (parsed.userId() == null) throw new BadCredentialsException("Identidad requerida");
        UserDetails userDetails = userDetailsService.loadUserById(parsed.userId());
        if (!jwtService.isTokenValid(token, userDetails)) {
            throw new DomainException(
                    UserErrorCode.INVALID_CREDENTIALS.getField(),
                    UserErrorCode.INVALID_CREDENTIALS.getStatus(),
                    "Token inválido o expirado");
        }
        requireCurrentTerms(users.findById(parsed.userId()).orElseThrow(() -> new BadCredentialsException(BAD_CREDENTIALS)));
        return jwtService.generateToken(userDetails);
    }

    public String issueTokenForVerifiedEmail(String correo) {
        requireCurrentTerms(users.findByCorreo(correo).orElseThrow(() -> new BadCredentialsException(BAD_CREDENTIALS)));
        return jwtService.generateToken(userDetailsService.loadUserByUsername(correo));
    }

    public String issueTokenForUserId(Long userId) {
        requireCurrentTerms(users.findById(userId).orElseThrow(() -> new BadCredentialsException(BAD_CREDENTIALS)));
        return jwtService.generateToken(userDetailsService.loadUserById(userId));
    }

    private void requireCurrentTerms(User user) {
        if (!CURRENT_TERMS_VERSION.equals(user.getTermsVersion()) || user.getTermsAcceptedAt() == null) {
            throw new DomainException("terms", org.springframework.http.HttpStatus.UNAUTHORIZED,
                    "Acepta los documentos vigentes al iniciar login");
        }
    }

    private User authenticate(String correo, String password, Long organizationId) {
        String normalized = correo == null ? "" : correo.trim().toLowerCase(Locale.ROOT);
        if (organizationId == null) {
            List<User> matchingUsers = matchingEnabledUsers(normalized, password);
            if (matchingUsers.size() > UNIQUE_ACCOUNT_COUNT) {
                return null;
            }
            return matchingUsers.stream().findFirst()
                    .orElseThrow(() -> new BadCredentialsException(BAD_CREDENTIALS));
        }
        Optional<User> scoped = users.findByCorreoAndOrganizationId(normalized, organizationId);
        if (scoped.isEmpty()) {
            passwordEncoder.matches(password, missingAccountHash);
            throw new BadCredentialsException(BAD_CREDENTIALS);
        }
        User user = scoped.orElseThrow();
        if (!passwordEncoder.matches(password, user.getPassword())) {
            throw new BadCredentialsException(BAD_CREDENTIALS);
        }
        ensureLoginAllowed(user);
        return user;
    }

    private List<User> matchingEnabledUsers(String correo, String password) {
        List<User> candidates = users.findAllByCorreo(correo);
        if (candidates.isEmpty()) passwordEncoder.matches(password, missingAccountHash);
        return candidates.stream()
                .filter(user -> passwordEncoder.matches(password, user.getPassword()))
                .filter(user -> {
                    UserDetails details = userDetailsService.loadUserById(user.getId());
                    return details.isAccountNonLocked() && details.isEnabled();
                })
                .toList();
    }

    private List<LoginOrganizationChoice> organizationChoices(String correo, String password) {
        String normalized = correo == null ? "" : correo.trim().toLowerCase(Locale.ROOT);
        return matchingEnabledUsers(normalized, password).stream()
                .map(user -> new LoginOrganizationChoice(user.getOrganizationId()))
                .toList();
    }

    private void ensureLoginAllowed(User user) {
        UserDetails details = userDetailsService.loadUserById(user.getId());
        if (!details.isAccountNonLocked()) {
            throw new LockedException("locked");
        }
        if (!details.isEnabled()) {
            throw new DisabledException("disabled");
        }
    }

    private String maskEmail(String correo) {
        if (correo == null || !correo.contains("@")) {
            return "***";
        }
        int separator = correo.indexOf('@');
        return correo.charAt(0) + "***" + correo.substring(separator);
    }

    public record LoginResult(String accessToken, Long userId, List<LoginOrganizationChoice> organizationChoices,
            boolean termsAcceptanceRequired) {
        public LoginResult(String accessToken, Long userId, List<LoginOrganizationChoice> organizationChoices) {
            this(accessToken, userId, organizationChoices, false);
        }
        public LoginResult(String accessToken, Long userId) {
            this(accessToken, userId, List.of());
        }

        public boolean requiresOrganizationSelection() {
            return organizationChoices != null && !organizationChoices.isEmpty();
        }
    }

    public record LoginOrganizationChoice(Long organizationId) {
    }
}
