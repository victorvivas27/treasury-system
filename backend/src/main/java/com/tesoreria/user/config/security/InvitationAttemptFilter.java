package com.tesoreria.user.config.security;

import com.tesoreria.organization.config.TenantUserDetails;
import com.tesoreria.shared.domain.exception.DomainException;
import com.tesoreria.user.application.usecase.SharedSecurityLimiter;
import com.tesoreria.user.core.exception.SecurityLimitException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import tools.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.util.Map;

/** Runs after Spring Security: administrative budgets use an authenticated account ID. */
@Component
@Order(Ordered.LOWEST_PRECEDENCE - 10)
public class InvitationAttemptFilter extends OncePerRequestFilter {
    private static final String POST = "POST";
    private static final String PATCH = "PATCH";
    private static final String CHANGE_PASSWORD = "/api/v1/auth/change-password";
    private final SharedSecurityLimiter limits;
    private final ClientIpResolver addresses;
    private final ObjectMapper json;
    public InvitationAttemptFilter(SharedSecurityLimiter limits, ClientIpResolver addresses, ObjectMapper json) {
        this.limits = limits; this.addresses = addresses; this.json = json;
    }
    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        try { protect(request); }
        catch (SecurityLimitException limited) {
            response.setHeader("Retry-After", Long.toString(limited.getRetryAfter()));
            reject(response, limited); return;
        } catch (DomainException failure) { reject(response, failure); return; }
        chain.doFilter(request, response);
    }
    private void reject(HttpServletResponse response, DomainException failure) throws IOException {
        response.setStatus(failure.getStatus().value());
        response.setContentType("application/json"); response.setCharacterEncoding("UTF-8");
        response.getWriter().write(json.writeValueAsString(Map.of("status", failure.getStatus().value(),
                "errors", Map.of("rateLimit", failure.getMessage()))));
    }
    private void protect(HttpServletRequest request) {
        String path = request.getRequestURI().substring(request.getContextPath().length());
        String method = request.getMethod();
        if (POST.equals(method)) {
            String operation = path.startsWith("/api/v1/auth/") ? path.substring("/api/v1/auth/".length()) : "";
            switch (operation) {
                case "login" -> ip("login-ip", 120, 60, request);
                case "forgot-password", "resend-verification" -> {
                    ip("mail-ip-minute", 60, 60, request); ip("mail-ip-hour", 300, 3600, request);
                }
                case "refresh" -> ip("refresh-ip", 600, 60, request);
                case "bootstrap-admin" -> ip("bootstrap-ip", 10, 60, request);
                case "validate-invitation", "reset-password", "verify-email" -> ip("token-ip", 120, 60, request);
                default -> { /* Other endpoints keep their existing authorization and behavior. */ }
            }
        }
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof TenantUserDetails user)) return;
        String identity = Long.toString(user.getUserId());
        if (PATCH.equals(method) && CHANGE_PASSWORD.equals(path)) {
            limits.check("change-password", 5, 60, identity);
        }
        if (POST.equals(method) && path.matches("/api/v1/apoderados/[^/]+/habilitar-acceso")) {
            limits.check("invitation-actor", 120, 3600, identity);
        }
        boolean mutation = POST.equals(method) || "PUT".equals(method) || PATCH.equals(method) || "DELETE".equals(method);
        if (mutation && ("/api/v1/users".equals(path) || path.matches("/api/v1/users/[0-9]+(?:/(?:estado|rol))?")
                || "/api/v1/organizations".equals(path) || path.startsWith("/api/v1/organizations/"))) {
            limits.check("admin-mutations", 60, 60, identity);
        }
    }
    private void ip(String policy, int maximum, long seconds, HttpServletRequest request) {
        limits.check(policy, maximum, seconds, addresses.resolve(request));
    }
}
