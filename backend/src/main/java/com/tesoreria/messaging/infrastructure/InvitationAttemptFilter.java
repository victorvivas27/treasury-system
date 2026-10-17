package com.tesoreria.messaging.infrastructure;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;
import java.time.Duration;
import java.util.concurrent.atomic.AtomicInteger;

@Component
public class InvitationAttemptFilter extends OncePerRequestFilter {
    private static final String POST = "POST";
    private static final String VALIDATE_PATH = "/api/v1/auth/validate-invitation";
    private static final String RESET_PATH = "/api/v1/auth/reset-password";
    private static final int MAX_ATTEMPTS = 20;
    private final Cache<String, AtomicInteger> attempts = Caffeine.newBuilder()
            .maximumSize(10000).expireAfterWrite(Duration.ofMinutes(1)).build();
    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String path = request.getServletPath();
        if (POST.equals(request.getMethod()) && (VALIDATE_PATH.equals(path)
                || RESET_PATH.equals(path))
                && attempts.get(request.getRemoteAddr(), key -> new AtomicInteger()).incrementAndGet() > MAX_ATTEMPTS) {
            response.setStatus(429);
            response.setHeader("Retry-After", "60");
            response.setContentType("application/json");
            response.getWriter().write("{\"status\":429,\"errors\":{\"invitation\":\"Demasiados intentos. Espera un minuto.\"}}");
            return;
        }
        chain.doFilter(request, response);
    }
}
