package com.tesoreria.shared.infrastructure.performance;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class DashboardPerformanceFilter extends OncePerRequestFilter {
    private static final String OVERVIEW_PATH = "/api/v1/tesoreria/dashboard/overview";
    private static final String CONTRIBUTION_SUMMARY_PATH = "/api/v1/tesoreria/aportes/resumen";
    private final DashboardPerformanceProbe probe;

    public DashboardPerformanceFilter(DashboardPerformanceProbe probe) {
        this.probe = probe;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        return !path.endsWith(OVERVIEW_PATH) && !path.endsWith(CONTRIBUTION_SUMMARY_PATH);
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        int year = parseYear(request.getParameter("year"));
        DashboardPerformanceProbe.Measurement measurement =
                probe.startRequest(request.getRequestURI(), year);
        probe.measureConnectionAcquisition(measurement);
        try {
            filterChain.doFilter(request, response);
        } finally {
            probe.finishRequest(measurement);
        }
    }

    private int parseYear(String value) {
        if (value == null) return 0;
        try {
            return Integer.parseInt(value);
        } catch (NumberFormatException ignored) {
            return 0;
        }
    }
}
