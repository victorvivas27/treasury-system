package com.tesoreria.shared.infrastructure.observability;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.concurrent.atomic.AtomicBoolean;

@Component
@Order(Ordered.LOWEST_PRECEDENCE)
public class FirstRequestMemoryFilter extends OncePerRequestFilter {
    private final MemoryObservability observability;
    private final AtomicBoolean firstRequestObserved = new AtomicBoolean();

    public FirstRequestMemoryFilter(MemoryObservability observability) {
        this.observability = observability;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        try {
            filterChain.doFilter(request, response);
        } finally {
            if (firstRequestObserved.compareAndSet(false, true)) {
                observability.observe("first_http_request_completed");
            }
        }
    }
}
