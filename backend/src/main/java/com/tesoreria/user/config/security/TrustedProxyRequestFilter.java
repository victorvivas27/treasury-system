package com.tesoreria.user.config.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;

/** Preserve secure transport/HSTS behind an explicitly trusted TLS terminator without rewriting the peer IP. */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 10)
public class TrustedProxyRequestFilter extends OncePerRequestFilter {
    private static final String HTTPS = "https";
    private final ClientIpResolver addresses;
    public TrustedProxyRequestFilter(ClientIpResolver addresses) { this.addresses = addresses; }
    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        if (addresses.isTrustedConnection(request) && HTTPS.equalsIgnoreCase(request.getHeader("X-Forwarded-Proto"))) {
            chain.doFilter(new HttpServletRequestWrapper(request) {
                @Override public boolean isSecure() { return true; }
                @Override public String getScheme() { return HTTPS; }
                @Override public int getServerPort() { return 443; }
            }, response);
        } else chain.doFilter(request, response);
    }
}
