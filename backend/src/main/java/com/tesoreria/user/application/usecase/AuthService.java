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

public class AuthService {
    private static final Logger LOGGER = LoggerFactory.getLogger(AuthService.class);
    private final UserRepositoryOutPort users;
    private final CustomUserDetailsService userDetailsService;
    private final JwtService jwtService;
    private final LoginRateLimiter rateLimiter;
    private final PasswordEncoder passwordEncoder;

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
    }

    public LoginResult login(String correo, String password, Long organizationId) {
        rateLimiter.checkAllowed(correo);
        try {
            User user = authenticate(correo, password, organizationId);
            rateLimiter.recordSuccess(correo);
            if (user == null) {
                List<LoginOrganizationChoice> choices = organizationChoices(correo, password);
                return new LoginResult(null, null, choices);
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
        String username = jwtService.extractUsername(token);
        UserDetails userDetails = userDetailsService.loadUserByUsername(username);
        if (!jwtService.isTokenValid(token, userDetails)) {
            throw new DomainException(
                    UserErrorCode.INVALID_CREDENTIALS.getField(),
                    UserErrorCode.INVALID_CREDENTIALS.getStatus(),
                    "Token inválido o expirado");
        }
        return jwtService.generateToken(userDetails);
    }

    public String issueTokenForVerifiedEmail(String correo) {
        return jwtService.generateToken(userDetailsService.loadUserByUsername(correo));
    }

    public String issueTokenForUserId(Long userId) {
        return jwtService.generateToken(userDetailsService.loadUserById(userId));
    }

    private User authenticate(String correo, String password, Long organizationId) {
        String normalized = correo == null ? "" : correo.trim().toLowerCase(Locale.ROOT);
        if (organizationId == null) {
            List<User> matchingUsers = matchingEnabledUsers(normalized, password);
            if (matchingUsers.size() > 1) {
                return null;
            }
            return matchingUsers.stream().findFirst()
                    .orElseThrow(() -> new BadCredentialsException("bad"));
        }
        Optional<User> scoped = users.findByCorreoAndOrganizationId(normalized, organizationId);
        User user = scoped.orElseThrow(() -> new BadCredentialsException("bad"));
        if (!passwordEncoder.matches(password, user.getPassword())) {
            throw new BadCredentialsException("bad");
        }
        ensureLoginAllowed(user);
        return user;
    }

    private List<User> matchingEnabledUsers(String correo, String password) {
        return users.findAllByCorreo(correo).stream()
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

    public record LoginResult(String accessToken, Long userId, List<LoginOrganizationChoice> organizationChoices) {
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
